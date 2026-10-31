import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { createIssue, listIssues, transitionIssue } from '#/server/services/issues'
import { listSprints } from '#/server/services/sprints'
import { IssueCard, type IssueRow } from '#/components/IssueCard'

export const Route = createFileRoute('/app/projects/$projectId/board')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [res, sprints] = await Promise.all([
      listIssues({ data: { projectId: params.projectId, workspaceId, pageSize: 100 } }),
      listSprints({ data: { projectId: params.projectId, workspaceId, state: 'active' } }),
    ])
    return { issues: res.issues as IssueRow[], sprint: sprints[0] ?? null }
  },
  component: BoardPage,
})

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]

function BoardPage() {
  const { issues, sprint } = Route.useLoaderData()
  const { workspaceId, projects } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const key = projects.find((p) => p.id === projectId)?.key ?? ''
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  // Board shows the active sprint when there is one, otherwise everything.
  const visible = sprint ? issues.filter((i) => i.sprintId === sprint.id) : issues

  async function move(id: string, status: string) {
    if (!workspaceId) return
    await transitionIssue({ data: { issueId: id, workspaceId, status } })
    await router.invalidate()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium">{sprint ? sprint.name : 'Board'}</h1>
        {sprint?.goal && <p className="text-sm text-ink-soft">{sprint.goal}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((i) => i.status === col.key)
          return (
            <section key={col.key} aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key) }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragId) void move(dragId, col.key); setDragId(null) }}
              className={`min-h-[320px] rounded-sm p-2 ${over === col.key ? 'bg-[#deebff]' : 'bg-surface'}`}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase text-ink-soft">{col.label} <span className="font-normal">{items.length}</span></h2>
              <div className="space-y-2">
                {items.map((i) => <IssueCard key={i.id} issue={i} projectKey={key} projectId={projectId} draggable onDragStart={() => setDragId(i.id)} />)}
              </div>
              {col.key === 'todo' && (adding ? (
                <form className="mt-2" onSubmit={async (e) => {
                  e.preventDefault()
                  if (!workspaceId) return
                  try {
                    await createIssue({ data: { projectId, workspaceId, title, sprintId: sprint?.id } })
                    setTitle(''); setAdding(false); setError('')
                    await router.invalidate()
                  } catch (err) { setError(err instanceof Error ? err.message : 'Could not create issue') }
                }}>
                  <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" minLength={3} maxLength={200} required className="w-full rounded-sm border-2 border-jira bg-white px-2 py-1.5 text-sm" />
                  {error && <p role="alert" className="mt-1 text-xs text-[#bf2600]">{error}</p>}
                </form>
              ) : <button onClick={() => setAdding(true)} className="mt-2 w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-soft hover:bg-black/5">+ Create issue</button>)}
            </section>
          )
        })}
      </div>
    </div>
  )
}
