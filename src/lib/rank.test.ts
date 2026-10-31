import { describe, expect, it } from 'vitest'
import { midRank, needsRebalance, RANK_STEP } from './rank'

describe('rank', () => {
  it('handles empty list and edges', () => {
    expect(midRank()).toBe(RANK_STEP)
    expect(midRank(null, 10)).toBe(10 - RANK_STEP)
    expect(midRank(10, null)).toBe(10 + RANK_STEP)
  })
  it('midpoint is strictly between neighbours', () => {
    const r = midRank(1000, 2000)
    expect(r).toBe(1500)
    expect(r > 1000 && r < 2000).toBe(true)
  })
  it('detects exhausted gaps', () => {
    expect(needsRebalance(5, 5)).toBe(true)
    expect(needsRebalance(1, 1 + 1e-9)).toBe(true)
    expect(needsRebalance(1, 2)).toBe(false)
    expect(needsRebalance(null, 2)).toBe(false)
  })
  it('repeated halving eventually needs rebalance', () => {
    let lo = 0; const hi = 1024
    let n = 0
    while (!needsRebalance(lo, hi)) { lo = midRank(lo, hi); n++ }
    expect(n).toBeGreaterThan(20)
  })
})
