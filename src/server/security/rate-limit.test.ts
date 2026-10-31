import { describe, expect, it, vi } from 'vitest'
vi.mock('#/lib/env', () => ({ env: { RATE_LIMIT_WINDOW_MS: 60000, RATE_LIMIT_MAX: 2 }, isProduction: false }))
import { RateLimiter } from './rate-limit'

describe('RateLimiter (memory)', () => {
  it('limits after max hits per key and isolates keys', async () => {
    const r = new RateLimiter(60_000, 2)
    await r.hit('login', 'a'); expect(await r.isLimited('login', 'a')).toBe(false)
    await r.hit('login', 'a'); expect(await r.isLimited('login', 'a')).toBe(true)
    expect(await r.isLimited('login', 'b')).toBe(false)
    expect(await r.isLimited('register', 'a')).toBe(false)
  })
})
