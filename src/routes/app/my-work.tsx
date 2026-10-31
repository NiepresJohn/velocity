import { createFileRoute, Link } from '@tanstack/react-router'
import { getMyWork } from '#/server/services/dashboard'
import { IssueTypeIcon, StatusLozenge } from '#/components/ui'

export const Route = createFileRoute('/app/my-work')({
  loader: async ({ context }) => context.workspaceId ? getMyWork({ data: { workspaceId: context.workspaceId } }) : { overdue: [], upcoming: [], recentlyUpdated: [] },
  component: MyWorkPage,
})

function MyWorkPage() {
  const data = Route.useLoaderData()
  const { projects } = Route.useRouteContext()
  const key = (id: string) => projects.find((p) => p.id === id)?.key ?? ''
  const group = (title: string, rows: typeof data.overdue) => (
    <section>
      <h2 className="mb-1 font-semibold">{title} <span className="font-normal text-ink-soft">{rows.length}</span></h2>
      {rows.length === 0 ? <p className="text-sm text-ink-soft">Nothing here.</p> : (
        <ul>{rows.map((i) => (
          <li key={i.id} className="flex items-center gap-3 border-b border-line px-2 py-2 text-sm">
            <IssueTypeIcon type={i.type} /><span className="w-20 text-ink-soft">{key(i.projectId)}-{i.number}</span>
            <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId: i.projectId, issueId: i.id }} className="flex-1 hover:text-jira hover:underline">{i.title}</Link>
            {i.dueDate && <span className="text-xs text-ink-soft">{i.dueDate}</span>}<StatusLozenge status={i.status} />
          </li>))}
        </ul>
      )}
    </section>
  )
  return <div className="space-y-6"><h1 className="text-2xl font-medium">Your work</h1>{group('Overdue', data.overdue)}{group('Due this week', data.upcoming)}{group('Assigned to you', data.recentlyUpdated)}</div>
}
