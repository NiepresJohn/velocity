import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  addComment, addLabelToIssue, archiveIssue, createLabel, deleteComment, deleteIssue, editComment, getIssue, listComments,
  listIssues, listLabels, moveToSprint, removeLabelFromIssue, updateIssue,
} from '#/server/services/issues'
import { getIssueActivity } from '#/server/services/activity'
import { listSprints } from '#/server/services/sprints'
import { listMembers } from '#/server/services/workspaces'
import { Avatar, IssueTypeIcon, LabelChip, PRIORITY_OPTIONS, STATUS_OPTIONS, StatusLozenge, TYPE_OPTIONS, type Member } from '#/components/ui'

export const Route = createFileRoute('/app/projects/$projectId/issues/$issueId')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [issue, comments, activity, members, labels, sprints, epics] = await Promise.all([
      getIssue({ data: { issueId: params.issueId, workspaceId } }),
      listComments({ data: { issueId: params.issueId } }),
      getIssueActivity({ data: { issueId: params.issueId, workspaceId } }),
      listMembers({ data: { workspaceId } }),
      listLabels({ data: { projectId: params.projectId } }),
      listSprints({ data: { projectId: params.projectId, workspaceId } }),
      listIssues({ data: { projectId: params.projectId, workspaceId, type: ['epic'], pageSize: 100 } }),
    ])
    return { issue, comments, activity, members: members as Member[], labels, sprints, epics: epics.issues }
  },
  component: IssuePage,
})

const select = 'w-full rounded-sm border-2 border-transparent bg-surface px-2 py-1.5 text-sm hover:bg-[#ebecf0] focus:border-jira focus:bg-white'
const LABEL_COLORS = ['#6366f1', '#0052cc', '#36b37e', '#ff991f', '#e5493a', '#904ee2', '#5e6c84']
const fmt = (d: string | Date) => new Date(d).toLocaleString()

function IssuePage() {
  const { issue, comments, activity, members, labels, sprints, epics } = Route.useLoaderData()
  const { workspaceId, projects, userId } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const navigate = useNavigate()
  const project = projects.find((p) => p.id === projectId)
  const [title, setTitle] = useState(issue.title)
  const [desc, setDesc] = useState(issue.description ?? '')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'comments' | 'activity'>('comments')
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [newLabel, setNewLabel] = useState({ name: '', color: LABEL_COLORS[0] })

  const act = async (fn: () => Promise<unknown>, fallback = 'Could not save') => {
    try { await fn(); setError(''); await router.invalidate() }
    catch (e) { setError(e instanceof Error ? e.message : fallback) }
  }
  const save = (patch: Record<string, unknown>) => workspaceId ? act(() => updateIssue({ data: { issueId: issue.id, workspaceId, ...patch } })) : undefined
  const key = `${project?.key}-${issue.number}`
  const archived = !!issue.archivedAt
  const attached = new Set(issue.labels.map((l) => l.id))
  const available = labels.filter((l) => !attached.has(l.id))
  const sprintKnown = !issue.sprintId || sprints.some((s) => s.id === issue.sprintId)
  const parentOptions = epics.filter((e) => e.id !== issue.id)

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-soft">
        <span><Link to="/app/projects" className="hover:underline">Projects</Link> / <Link to="/app/projects/$projectId/board" params={{ projectId }} className="hover:underline">{project?.name}</Link>
          {issue.parent && <> / <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: issue.parent.id }} className="inline-flex items-center gap-1 hover:underline"><IssueTypeIcon type={issue.parent.type} />{project?.key}-{issue.parent.number}</Link></>}
          {' / '}<span className="inline-flex items-center gap-1"><IssueTypeIcon type={issue.type} />{key}</span></span>
        <span className="flex-1" />
        <button type="button" disabled={!workspaceId} onClick={() => workspaceId && act(() => archiveIssue({ data: { issueId: issue.id, workspaceId, archived: !archived } }))} className="rounded-sm bg-[#dfe1e6] px-3 py-1 font-medium text-ink hover:bg-[#c1c7d0]">{archived ? 'Restore' : 'Archive'}</button>
        <button type="button" disabled={!workspaceId} onClick={async () => {
          if (!workspaceId || !window.confirm(`Delete ${key} permanently? This cannot be undone.`)) return
          try { await deleteIssue({ data: { issueId: issue.id, workspaceId } }); await router.invalidate(); void navigate({ to: '/app/projects/$projectId/backlog', params: { projectId } }) }
          catch (e) { setError(e instanceof Error ? e.message : 'Could not delete') }
        }} className="rounded-sm bg-[#dfe1e6] px-3 py-1 font-medium text-[#bf2600] hover:bg-[#ffebe6]">Delete</button>
      </nav>
      {archived && <p role="status" className="rounded-sm bg-[#fffae6] px-3 py-2 text-sm">This issue is archived and hidden from the board and backlog.</p>}
      {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== issue.title && title.trim().length >= 3 && save({ title })} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className="w-full rounded-sm border-2 border-transparent px-2 py-1 text-2xl font-medium hover:bg-surface focus:border-jira focus:bg-white" />
          <div>
            <h2 className="mb-1 text-sm font-semibold">Description</h2>
            <textarea aria-label="Description" rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== (issue.description ?? '') && save({ description: desc })} placeholder="Add a description…" className="w-full rounded-sm border-2 border-transparent bg-surface px-2 py-1.5 text-sm hover:bg-[#ebecf0] focus:border-jira focus:bg-white" />
          </div>
          {issue.children.length > 0 && (
            <div>
              <h2 className="mb-1 text-sm font-semibold">Child issues ({issue.children.filter((c) => c.status === 'done').length}/{issue.children.length} done)</h2>
              <ul className="rounded-sm border border-line">
                {issue.children.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-b-0">
                    <IssueTypeIcon type={c.type} /><span className="w-20 text-ink-soft">{project?.key}-{c.number}</span>
                    <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: c.id }} className="min-w-0 flex-1 truncate hover:text-jira hover:underline">{c.title}</Link>
                    <StatusLozenge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div role="tablist" aria-label="Issue history" className="mb-3 flex gap-1 border-b border-line">
              {(['comments', 'activity'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? 'border-jira text-jira' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                  {t}{t === 'comments' ? ` (${comments.length})` : ''}
                </button>
              ))}
            </div>
            {tab === 'comments' ? (
              <div role="tabpanel">
                <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void act(async () => { await addComment({ data: { issueId: issue.id, body } }); setBody('') }, 'Could not comment') }}>
                  <Avatar name={members.find((m) => m.id === userId)?.name ?? 'Me'} />
                  <div className="flex-1 space-y-2">
                    <textarea aria-label="Add a comment" rows={2} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Add a comment…" className="w-full rounded-sm border-2 border-line px-2 py-1.5 text-sm focus:border-jira" />
                    <button className="rounded-sm bg-jira px-3 py-1 text-sm font-medium text-white hover:bg-jira-dark">Save</button>
                  </div>
                </form>
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-2 text-sm">
                      <Avatar name={c.authorName} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{c.authorName ?? 'Unknown'} <span className="font-normal text-ink-soft">{fmt(c.createdAt)}{c.updatedAt !== c.createdAt && ' (edited)'}</span></div>
                        {editing?.id === c.id ? (
                          <form className="mt-1 space-y-2" onSubmit={(e) => { e.preventDefault(); void act(async () => { await editComment({ data: { commentId: c.id, body: editing.body } }); setEditing(null) }) }}>
                            <textarea aria-label="Edit comment" autoFocus rows={3} required maxLength={5000} value={editing.body} onChange={(e) => setEditing({ id: c.id, body: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} className="w-full rounded-sm border-2 border-jira px-2 py-1.5 text-sm" />
                            <div className="flex gap-2"><button className="rounded-sm bg-jira px-3 py-1 text-sm font-medium text-white">Save</button><button type="button" onClick={() => setEditing(null)} className="rounded-sm px-3 py-1 text-sm hover:bg-surface">Cancel</button></div>
                          </form>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap">{c.body}</p>
                            {c.authorId === userId && (
                              <div className="mt-1 flex gap-3 text-xs text-ink-soft">
                                <button type="button" className="hover:underline" onClick={() => setEditing({ id: c.id, body: c.body })}>Edit</button>
                                <button type="button" className="hover:underline" onClick={() => window.confirm('Delete this comment?') && void act(() => deleteComment({ data: { commentId: c.id } }))}>Delete</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                  {comments.length === 0 && <li className="text-sm text-ink-soft">No comments yet.</li>}
                </ul>
              </div>
            ) : (
              <ol role="tabpanel" className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm"><Avatar name={a.actorName} size={24} /><div><span className="font-medium">{a.actorName}</span> {a.text}<div className="text-xs text-ink-soft">{fmt(a.createdAt)}</div></div></li>
                ))}
                {activity.length === 0 && <li className="text-sm text-ink-soft">No activity yet.</li>}
              </ol>
            )}
          </div>
        </div>
        <aside className="space-y-3 text-sm" aria-label="Issue details">
          <div><StatusLozenge status={issue.status} /></div>
          <div className="rounded-sm border border-line">
            <div className="border-b border-line bg-surface px-3 py-2 font-semibold">Details</div>
            <div className="space-y-3 p-3">
              <label className="block text-xs font-bold text-ink-soft">Status
                <select className={select} value={issue.status} onChange={(e) => save({ status: e.target.value })}>{STATUS_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
              </label>
              <label className="block text-xs font-bold text-ink-soft">Type
                <select className={select} value={issue.type} onChange={(e) => save({ type: e.target.value })}>{TYPE_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select>
              </label>
              <label className="block text-xs font-bold text-ink-soft">Priority
                <select className={select} value={issue.priority} onChange={(e) => save({ priority: e.target.value })}>{PRIORITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select>
              </label>
              <label className="block text-xs font-bold text-ink-soft">Assignee
                <select className={select} value={issue.assigneeId ?? ''} onChange={(e) => save({ assigneeId: e.target.value || null })}>
                  <option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              {issue.assigneeId !== userId && <button type="button" className="text-xs text-jira hover:underline" onClick={() => save({ assigneeId: userId })}>Assign to me</button>}
              <label className="block text-xs font-bold text-ink-soft">Sprint
                <select className={select} value={issue.sprintId ?? ''} onChange={(e) => act(() => moveToSprint({ data: { issueId: issue.id, sprintId: e.target.value || null } }))}>
                  <option value="">Backlog</option>
                  {!sprintKnown && <option value={issue.sprintId!}>Completed sprint</option>}
                  {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-ink-soft">Due date
                <input type="date" className={select} defaultValue={issue.dueDate ?? ''} key={issue.dueDate ?? 'none'} onChange={(e) => save({ dueDate: e.target.value || null })} />
              </label>
              <label className="block text-xs font-bold text-ink-soft">Story points
                <input type="number" min={0} max={100} defaultValue={issue.estimatePoints ?? ''} key={`p${issue.estimatePoints}`} onBlur={(e) => e.target.value !== String(issue.estimatePoints ?? '') && save({ estimatePoints: e.target.value === '' ? null : Number(e.target.value) })} className={select} />
              </label>
              {issue.type !== 'epic' && (
                <label className="block text-xs font-bold text-ink-soft">Parent epic
                  <select className={select} value={issue.parentIssueId ?? ''} onChange={(e) => save({ parentIssueId: e.target.value || null })}>
                    <option value="">None</option>{parentOptions.map((e) => <option key={e.id} value={e.id}>{project?.key}-{e.number} {e.title}</option>)}
                  </select>
                </label>
              )}
              <div className="text-xs">
                <span className="font-bold text-ink-soft">Labels</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {issue.labels.map((l) => <LabelChip key={l.id} label={l} onRemove={() => act(() => removeLabelFromIssue({ data: { issueId: issue.id, labelId: l.id } }))} />)}
                  {issue.labels.length === 0 && <span className="text-ink-soft">None</span>}
                </div>
                {available.length > 0 && (
                  <select aria-label="Add label" className={`${select} mt-2`} value="" onChange={(e) => e.target.value && act(() => addLabelToIssue({ data: { issueId: issue.id, labelId: e.target.value } }))}>
                    <option value="">Add label…</option>{available.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
                <form className="mt-2 flex items-center gap-1" onSubmit={(e) => {
                  e.preventDefault()
                  void act(async () => {
                    const lbl = await createLabel({ data: { projectId, name: newLabel.name, color: newLabel.color } })
                    await addLabelToIssue({ data: { issueId: issue.id, labelId: lbl.id } })
                    setNewLabel({ ...newLabel, name: '' })
                  }, 'Could not create label')
                }}>
                  <input aria-label="New label name" maxLength={50} required placeholder="New label" value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} className="min-w-0 flex-1 rounded-sm border-2 border-line px-2 py-1 text-xs focus:border-jira" />
                  <select aria-label="Label color" value={newLabel.color} onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })} style={{ background: newLabel.color }} className="w-8 rounded-sm text-transparent">{LABEL_COLORS.map((c) => <option key={c} value={c} style={{ background: c }}>{c}</option>)}</select>
                  <button className="rounded-sm bg-[#dfe1e6] px-2 py-1 text-xs font-medium hover:bg-[#c1c7d0]">Add</button>
                </form>
              </div>
              <div className="text-xs"><span className="font-bold text-ink-soft">Reporter</span><div className="mt-1 flex items-center gap-2 text-sm"><Avatar name={issue.reporterName} size={20} />{issue.reporterName ?? 'Unknown'}</div></div>
              <div className="space-y-0.5 text-xs text-ink-soft"><div>Created {fmt(issue.createdAt)}</div><div>Updated {fmt(issue.updatedAt)}</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
