import { createFileRoute, Link } from '@tanstack/react-router'
import { getWorkspaceDashboard } from '#/server/services/dashboard'

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => context.workspaceId ? getWorkspaceDashboard({ data: { workspaceId: context.workspaceId } }) : null,
  component: DashboardPage,
})

function DashboardPage() {
  const d = Route.useLoaderData()
  const { projects, workspaceName } = Route.useRouteContext()
  const tile = (label: string, v: number, tone = 'text-ink') => <div className="rounded-sm border border-line p-4"><div className={`text-3xl font-medium ${tone}`}>{v}</div><div className="text-xs uppercase text-ink-soft">{label}</div></div>
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">{workspaceName}</h1>
      {d && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tile('Issues', d.totalIssues)}{tile('To do', d.todoCount)}{tile('In progress', d.inProgressCount, 'text-jira')}{tile('Done', d.doneCount, 'text-[#006644]')}{tile('Overdue', d.overdueCount, d.overdueCount ? 'text-[#bf2600]' : 'text-ink')}
      </div>}
      <section>
        <h2 className="mb-2 font-semibold">Projects</h2>
        {projects.length === 0 ? <Link to="/app/projects/new" className="text-jira hover:underline">Create your first project</Link> : (
          <ul className="grid gap-2 md:grid-cols-3">{projects.map((p) => (
            <li key={p.id}><Link to="/app/projects/$projectId/board" params={{ projectId: p.id }} className="flex items-center gap-3 rounded-sm border border-line p-3 hover:bg-surface"><span className="flex h-8 w-8 items-center justify-center rounded-sm bg-jira text-xs font-bold text-white">{p.key.slice(0, 2)}</span><span className="font-medium">{p.name}</span></Link></li>
          ))}</ul>
        )}
      </section>
    </div>
  )
}
