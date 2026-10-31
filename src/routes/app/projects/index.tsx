import { createFileRoute, Link } from '@tanstack/react-router'
import { listProjects } from '#/server/services/projects'

export const Route = createFileRoute('/app/projects/')({
  loader: async ({ context }) => context.workspaceId ? listProjects({ data: { workspaceId: context.workspaceId } }) : [],
  component: ProjectsPage,
})

function ProjectsPage() {
  const projects = Route.useLoaderData()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Link to="/app/projects/new" className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark">Create project</Link>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-sm border-2 border-dashed border-line p-10 text-center text-ink-soft">No projects yet. Create one to begin.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b-2 border-line text-left text-xs uppercase text-ink-soft"><tr><th className="py-2">Name</th><th>Key</th><th>Type</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-line hover:bg-surface">
                <td className="py-2"><Link to="/app/projects/$projectId/board" params={{ projectId: p.id }} className="flex items-center gap-2 font-medium text-jira hover:underline"><span className="flex h-6 w-6 items-center justify-center rounded-sm bg-jira text-[10px] font-bold text-white">{p.key.slice(0, 2)}</span>{p.name}</Link></td>
                <td>{p.key}</td><td className="text-ink-soft">Software</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
