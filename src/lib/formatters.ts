export function issueKey(projectKey: string, number: number) {
  return `${projectKey.toUpperCase()}-${number}`
}

export function plural(n: number, singular: string, pluralForm?: string) {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`)
}

export function pointsLabel(points: number | null | undefined) {
  return points == null ? '—' : String(points)
}
