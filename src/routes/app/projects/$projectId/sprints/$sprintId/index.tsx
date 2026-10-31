import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getSprint, startSprint, completeSprint } from '#/server/services/sprints'
import { listIssues } from '#/server/services/issues'
import { IssueTypeIcon, StatusLozenge } from '#/components/ui'

export const Route = createFileRoute('/app/projects/$projectId/sprints/$sprintId/')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [sprint, res] = await Promise.all([
      getSprint({ data: { sprintId: params.sprintId, workspaceId } }),
      listIssues({ data: { projectId: params.projectId, workspaceId, sprintId: params.sprintId, pageSize: 100 } }),
    ])
    return { sprint, issues: res.issues }
  },
  component: SprintPage,
})

function SprintPage() {
  const { sprint, issues } = Route.useLoaderData()
  const { workspaceId, projects } = Route.useRouteContext()
  const { projectId, sprintId } = Route.useParams()
  const router = useRouter()
  const key = projects.find((p) => p.id === projectId)?.key
  const btn = 'rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark'
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium">{sprint.name}</h1><span className="text-sm capitalize text-ink-soft">{sprint.state}</span><span className="flex-1" />
        {sprint.state === 'planned' && workspaceId && <button className={btn} onClick={async () => { await startSprint({ data: { sprintId, workspaceId } }); await router.invalidate() }}>Start sprint</button>}
        {sprint.state === 'active' && workspaceId && <button className={btn} onClick={async () => { await completeSprint({ data: { sprintId, workspaceId } }); await router.invalidate() }}>Complete sprint</button>}
        <Link to="/app/projects/$projectId/sprints/$sprintId/report" params={{ projectId, sprintId }} className="text-sm text-jira hover:underline">Report</Link>
      </div>
      {sprint.goal && <p className="text-ink-soft">{sprint.goal}</p>}
      <ul>{issues.map((i: any) => (
        <li key={i.id} className="flex items-center gap-3 border-b border-line px-2 py-2 text-sm"><IssueTypeIcon type={i.type} /><span className="w-20 text-ink-soft">{key}-{i.number}</span><Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: i.id }} className="flex-1 hover:text-jira hover:underline">{i.title}</Link><StatusLozenge status={i.status} /></li>
      ))}</ul>
      {issues.length === 0 && <p className="text-ink-soft">No issues in this sprint.</p>}
    </div>
  )
}
