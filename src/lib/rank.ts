export const RANK_STEP = 1024
export const MIN_GAP = 1e-6

/** Rank for an item placed between `prev` (above) and `next` (below). Either may be missing (list edge). */
export function midRank(prev?: number | null, next?: number | null): number {
  if (prev == null && next == null) return RANK_STEP
  if (prev == null) return next! - RANK_STEP
  if (next == null) return prev + RANK_STEP
  return (prev + next) / 2
}

/** True when there is no room left between two neighbours (equal or precision-exhausted ranks). */
export function needsRebalance(prev?: number | null, next?: number | null): boolean {
  return prev != null && next != null && next - prev < MIN_GAP
}
