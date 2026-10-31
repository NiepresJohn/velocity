import { createFileRoute } from '@tanstack/react-router'
import { getBurndown, getSprintReport } from '#/server/services/reports'

export const Route = createFileRoute('/app/projects/$projectId/sprints/$sprintId/report')({
  loader: async ({ context, params }) => {
    const data = { sprintId: params.sprintId, workspaceId: context.workspaceId! }
    const [report, burndown] = await Promise.all([getSprintReport({ data }), getBurndown({ data })])
    return { report, burndown }
  },
  component: ReportPage,
})

function Burndown({ points }: { points: { date: string; ideal: number; actual: number | null }[] }) {
  if (points.length < 2) return <p className="text-ink-soft">Set start and end dates to see a burndown.</p>
  const W = 640, H = 220, P = 32
  const max = Math.max(1, ...points.map((p) => Math.max(p.ideal, p.actual ?? 0)))
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P)
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = (get: (p: (typeof points)[number]) => number | null) =>
    points.flatMap((p, i) => { const v = get(p); return v == null ? [] : [`${x(i)},${y(v)}`] }).join(' ')
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Burndown chart" className="w-full max-w-2xl">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#c1c7d0" /><line x1={P} y1={P} x2={P} y2={H - P} stroke="#c1c7d0" />
        <polyline points={line((p) => p.ideal)} fill="none" stroke="#97a0af" strokeDasharray="4 4" strokeWidth="2" />
        <polyline points={line((p) => p.actual)} fill="none" stroke="#0052cc" strokeWidth="2.5" />
        <text x={P} y={14} fontSize="11" fill="#5e6c84">{max} pts</text>
      </svg>
      <figcaption className="text-xs text-ink-soft"><span className="text-jira">━</span> Remaining <span className="ml-3">╍</span> Guideline</figcaption>
    </figure>
  )
}

function ReportPage() {
  const { report, burndown } = Route.useLoaderData()
  const stat = (label: string, v: string | number) => <div className="rounded-sm border border-line p-4"><div className="text-2xl font-medium">{v}</div><div className="text-xs uppercase text-ink-soft">{label}</div></div>
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">{report.name} report</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat('Committed issues', report.committedIssues)}{stat('Completed issues', report.completedIssues)}
        {stat('Committed points', report.committedPoints)}{stat('Completed points', report.completedPoints)}
      </div>
      <section><h2 className="mb-2 font-semibold">Burndown</h2><Burndown points={burndown} /></section>
    </div>
  )
}
