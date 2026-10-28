interface RateBucket {
  count: number
  resetAt: number
}

export class RateLimiter {
  private buckets = new Map<string, RateBucket>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs = 60_000, maxRequests = 20) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  getKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`
  }

  isLimited(prefix: string, identifier: string): boolean {
    const key = this.getKey(prefix, identifier)
    const bucket = this.buckets.get(key)
    if (!bucket) return false
    if (Date.now() > bucket.resetAt) {
      this.buckets.delete(key)
      return false
    }
    return bucket.count >= this.maxRequests
  }

  hit(prefix: string, identifier: string): void {
    const key = this.getKey(prefix, identifier)
    const now = Date.now()
    let bucket = this.buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + this.windowMs }
      this.buckets.set(key, bucket)
    } else {
      bucket.count++
    }
  }

  clear(): void {
    this.buckets.clear()
  }
}

import { env } from '#/lib/env'
export const rateLimiter = new RateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX)
