import { createFileRoute, Link } from '@tanstack/react-router'
import { listSprints } from '#/server/services/sprints'

export const Route = createFileRoute('/app/projects/$projectId/sprints/')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [open, done] = await Promise.all([
      listSprints({ data: { projectId: params.projectId, workspaceId } }),
      listSprints({ data: { projectId: params.projectId, workspaceId, state: 'completed' } }),
    ])
    return [...open, ...done]
  },
  component: SprintsPage,
})

function SprintsPage() {
  const sprints = Route.useLoaderData()
  const { projectId } = Route.useParams()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-medium">Sprints</h1>
      {sprints.length === 0 ? <p className="text-ink-soft">No sprints yet. Create one from the backlog.</p> : (
        <table className="w-full text-sm">
          <thead className="border-b-2 border-line text-left text-xs uppercase text-ink-soft"><tr><th className="py-2">Sprint</th><th>State</th><th>Dates</th><th /></tr></thead>
          <tbody>{sprints.map((s) => (
            <tr key={s.id} className="border-b border-line hover:bg-surface">
              <td className="py-2"><Link to="/app/projects/$projectId/sprints/$sprintId" params={{ projectId, sprintId: s.id }} className="font-medium text-jira hover:underline">{s.name}</Link></td>
              <td className="capitalize">{s.state}</td>
              <td className="text-ink-soft">{s.startDate} → {s.endDate}</td>
              <td className="text-right"><Link to="/app/projects/$projectId/sprints/$sprintId/report" params={{ projectId, sprintId: s.id }} className="text-jira hover:underline">Report</Link></td>
            </tr>))}
          </tbody>
        </table>
      )}
    </div>
  )
}
