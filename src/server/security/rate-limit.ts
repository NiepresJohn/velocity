import { env, isProduction } from '#/lib/env'

/** Counter backend. Keys are already prefixed; windows are fixed-length. */
export interface RateStore {
  count(key: string, windowMs: number): Promise<number>
  incr(key: string, windowMs: number): Promise<void>
}

/** Process-local store (dev/test, single instance). */
export class MemoryStore implements RateStore {
  private buckets = new Map<string, { count: number; resetAt: number }>()
  async count(key: string) {
    const b = this.buckets.get(key)
    if (!b) return 0
    if (Date.now() > b.resetAt) { this.buckets.delete(key); return 0 }
    return b.count
  }
  async incr(key: string, windowMs: number) {
    const now = Date.now()
    const b = this.buckets.get(key)
    if (!b || now > b.resetAt) this.buckets.set(key, { count: 1, resetAt: now + windowMs })
    else b.count++
  }
  clear() { this.buckets.clear() }
}

/** Shared store backed by the rate_limits table (fixed windows, atomic upsert). */
export class PgStore implements RateStore {
  private windowStart(windowMs: number) { return new Date(Math.floor(Date.now() / windowMs) * windowMs) }
  async count(key: string, windowMs: number) {
    const [{ db }, { rateLimits }, { and, eq }] = await Promise.all([import('../db'), import('../db/schema'), import('drizzle-orm')])
    const rows = await db.select({ c: rateLimits.count }).from(rateLimits)
      .where(and(eq(rateLimits.bucket, key), eq(rateLimits.windowStart, this.windowStart(windowMs))))
    return rows[0]?.c ?? 0
  }
  async incr(key: string, windowMs: number) {
    const [{ db }, { rateLimits }, { sql, lt }] = await Promise.all([import('../db'), import('../db/schema'), import('drizzle-orm')])
    await db.insert(rateLimits).values({ bucket: key, windowStart: this.windowStart(windowMs), count: 1 })
      .onConflictDoUpdate({ target: [rateLimits.bucket, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    // Cheap housekeeping: ~1% of hits prune rows older than a day.
    if (Math.random() < 0.01) await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 86_400_000)))
  }
}

export class RateLimiter {
  constructor(
    private windowMs = 60_000,
    private maxRequests = 20,
    private store: RateStore = new MemoryStore(),
  ) {}

  getKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`.slice(0, 320)
  }

  async isLimited(prefix: string, identifier: string): Promise<boolean> {
    return (await this.store.count(this.getKey(prefix, identifier), this.windowMs)) >= this.maxRequests
  }

  async hit(prefix: string, identifier: string): Promise<void> {
    await this.store.incr(this.getKey(prefix, identifier), this.windowMs)
  }

  clear(): void {
    if (this.store instanceof MemoryStore) this.store.clear()
  }
}

export const rateLimiter = new RateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX, isProduction ? new PgStore() : new MemoryStore())
