import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { listIssues, rankIssue, transitionIssue, updateIssue, listLabels } from '#/server/services/issues'
import { listSprints } from '#/server/services/sprints'
import { listMembers } from '#/server/services/workspaces'
import { IssueCard, type IssueRow } from '#/components/IssueCard'
import { CreateIssueModal } from '#/components/CreateIssueModal'
import { Avatar, STATUS_OPTIONS, TYPE_OPTIONS, type Member } from '#/components/ui'

export const Route = createFileRoute('/app/projects/$projectId/board')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [res, sprints, members, labels] = await Promise.all([
      listIssues({ data: { projectId: params.projectId, workspaceId, pageSize: 100 } }),
      listSprints({ data: { projectId: params.projectId, workspaceId, state: 'active' } }),
      listMembers({ data: { workspaceId } }),
      listLabels({ data: { projectId: params.projectId } }),
    ])
    return { issues: res.issues as IssueRow[], sprint: sprints[0] ?? null, members: members as Member[], labels }
  },
  component: BoardPage,
})

const COLUMNS = STATUS_OPTIONS
const input = 'rounded-sm border-2 border-line bg-white px-2 py-1 text-sm focus:border-jira'

function BoardPage() {
  const { issues, sprint, members, labels } = Route.useLoaderData()
  const { workspaceId, projects, userId } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const key = projects.find((p) => p.id === projectId)?.key ?? ''
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? null
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [target, setTarget] = useState<{ id: string; pos: 'before' | 'after' } | null>(null)
  const [createIn, setCreateIn] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [f, setF] = useState({ q: '', assignee: '', type: '', label: '', mine: false })

  // Board shows the active sprint when there is one, otherwise everything.
  const q = f.q.trim().toLowerCase()
  const visible = (sprint ? issues.filter((i) => i.sprintId === sprint.id) : issues).filter((i) =>
    (!q || i.title.toLowerCase().includes(q) || `${key}-${i.number}`.toLowerCase() === q) &&
    (!f.mine || i.assigneeId === userId) &&
    (!f.assignee || (f.assignee === 'none' ? !i.assigneeId : i.assigneeId === f.assignee)) &&
    (!f.type || i.type === f.type) &&
    (!f.label || i.labels.some((l) => l.id === f.label)))
  const filtering = !!(q || f.mine || f.assignee || f.type || f.label)

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') }
    await router.invalidate() // always reconcile with the canonical server order, even after a failure
  }

  function drop(status: string) {
    const id = dragId
    const t = target
    setOver(null); setTarget(null); setDragId(null)
    if (!id || !workspaceId) return
    const items = visible.filter((i) => i.status === status && i.id !== id)
    let before: string | undefined
    let after: string | undefined
    const ti = t && t.id !== id ? items.findIndex((i) => i.id === t.id) : -1
    if (ti >= 0) {
      const at = t!.pos === 'before' ? ti : ti + 1
      before = items[at - 1]?.id; after = items[at]?.id
    } else before = items[items.length - 1]?.id
    void run(() => rankIssue({ data: { issueId: id, workspaceId, beforeId: before, afterId: after, status } }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium">{sprint ? sprint.name : 'Board'}</h1>
        {sprint?.goal && <p className="text-sm text-ink-soft">{sprint.goal}</p>}
      </div>
      <div role="search" aria-label="Filter board" className="flex flex-wrap items-center gap-2">
        <input aria-label="Search issues" type="search" placeholder="Search this board" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className={`${input} w-48`} />
        <select aria-label="Filter by assignee" value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} className={input}>
          <option value="">All assignees</option><option value="none">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select aria-label="Filter by type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={input}>
          <option value="">All types</option>{TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Filter by label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={input}>
          <option value="">All labels</option>{labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button type="button" aria-pressed={f.mine} onClick={() => setF({ ...f, mine: !f.mine })} className={`flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium ${f.mine ? 'bg-[#deebff] text-jira' : 'bg-[#dfe1e6] hover:bg-[#c1c7d0]'}`}>
          <Avatar name={nameOf(userId) ?? 'Me'} size={18} />Only my issues
        </button>
        {filtering && <button type="button" onClick={() => setF({ q: '', assignee: '', type: '', label: '', mine: false })} className="text-sm text-jira hover:underline">Clear filters</button>}
      </div>
      {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((i) => i.status === col.key)
          return (
            <section key={col.key} aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
              onDrop={(e) => { e.preventDefault(); drop(col.key) }}
              className={`min-h-[320px] rounded-sm p-2 ${over === col.key ? 'bg-[#deebff]' : 'bg-surface'}`}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase text-ink-soft">{col.label} <span className="font-normal">{items.length}</span></h2>
              <div className="space-y-2">
                {items.map((i) => (
                  <IssueCard key={i.id} issue={i} projectKey={key} projectId={projectId} assigneeName={nameOf(i.assigneeId)} draggable
                    dropMarker={dragId && target?.id === i.id && i.id !== dragId ? target.pos : null}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragId(i.id) }}
                    onDragEnd={() => { setDragId(null); setOver(null); setTarget(null) }}
                    onDragOver={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTarget({ id: i.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' }) }}
                    onAssignMe={workspaceId ? () => run(() => updateIssue({ data: { issueId: i.id, workspaceId, assigneeId: userId } })) : undefined}
                    onStatus={workspaceId ? (status) => run(() => transitionIssue({ data: { issueId: i.id, workspaceId, status } })) : undefined} />
                ))}
              </div>
              <button onClick={() => setCreateIn(col.key)} className="mt-2 w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-soft hover:bg-black/5">+ Create issue</button>
            </section>
          )
        })}
      </div>
      {workspaceId && <CreateIssueModal open={createIn !== null} onClose={() => setCreateIn(null)} workspaceId={workspaceId} projects={projects} defaultProjectId={projectId} defaultSprintId={sprint?.id} defaultStatus={createIn ?? undefined} />}
    </div>
  )
}
