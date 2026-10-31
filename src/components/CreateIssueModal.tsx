import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { createIssue } from '#/server/services/issues'
import { listSprints } from '#/server/services/sprints'
import { listMembers } from '#/server/services/workspaces'
import { PRIORITY_OPTIONS, TYPE_OPTIONS, type Member } from './ui'

type Sprint = { id: string; name: string; state: string }
const field = 'w-full rounded-sm border-2 border-line bg-white px-2 py-1.5 text-sm focus:border-jira'
const lbl = 'block text-xs font-bold text-ink-soft'

export function CreateIssueModal({ open, onClose, workspaceId, projects, defaultProjectId, defaultSprintId, defaultStatus }: {
  open: boolean; onClose: () => void; workspaceId: string
  projects: { id: string; name: string; key: string }[]
  defaultProjectId?: string; defaultSprintId?: string; defaultStatus?: string
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')
  const [members, setMembers] = useState<Member[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [f, setF] = useState({ title: '', type: 'task', priority: 'medium', description: '', assigneeId: '', points: '', dueDate: '', sprintId: defaultSprintId ?? '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => { if (open) setProjectId(defaultProjectId ?? projects[0]?.id ?? '') }, [open, defaultProjectId, projects])
  useEffect(() => { if (open) setF((p) => ({ ...p, sprintId: defaultSprintId ?? '' })) }, [open, defaultSprintId])
  useEffect(() => {
    if (!open) return
    let live = true
    listMembers({ data: { workspaceId } }).then((m) => live && setMembers(m as Member[])).catch(() => {})
    return () => { live = false }
  }, [open, workspaceId])
  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    setF((p) => ({ ...p, sprintId: projectId === defaultProjectId ? (defaultSprintId ?? '') : '' }))
    Promise.all([listSprints({ data: { projectId, workspaceId } })]).then(([s]) => live && setSprints(s as Sprint[])).catch(() => {})
    return () => { live = false }
  }, [open, projectId, workspaceId, defaultProjectId, defaultSprintId])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await createIssue({ data: {
        projectId, workspaceId, title: f.title, type: f.type as any, priority: f.priority as any, description: f.description,
        assigneeId: f.assigneeId || undefined, sprintId: f.sprintId || undefined,
        estimatePoints: f.points === '' ? undefined : Number(f.points), dueDate: f.dueDate || undefined,
        status: defaultStatus ?? 'todo',
      } })
      setF({ title: '', type: 'task', priority: 'medium', description: '', assigneeId: '', points: '', dueDate: '', sprintId: defaultSprintId ?? '' })
      setError('')
      await router.invalidate()
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create issue') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-issue-title" className="w-full max-w-xl rounded-sm bg-white shadow-xl">
        <form onSubmit={submit}>
          <div className="border-b border-line px-5 py-3"><h2 id="create-issue-title" className="text-lg font-medium">Create issue</h2></div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
            {projects.length > 1 && (
              <label className={lbl}>Project
                <select className={field} value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}</select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={lbl}>Type<select className={field} value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className={lbl}>Priority<select className={field} value={f.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITY_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></label>
            </div>
            <label className={lbl}>Summary *
              <input autoFocus required minLength={3} maxLength={200} className={field} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to be done?" />
            </label>
            <label className={lbl}>Description
              <textarea rows={4} maxLength={10000} className={field} value={f.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={lbl}>Assignee
                <select className={field} value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
                  <option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className={lbl}>Sprint
                <select className={field} value={f.sprintId} onChange={(e) => set('sprintId', e.target.value)}>
                  <option value="">Backlog</option>{sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state})</option>)}
                </select>
              </label>
              <label className={lbl}>Story points<input type="number" min={0} max={100} className={field} value={f.points} onChange={(e) => set('points', e.target.value)} /></label>
              <label className={lbl}>Due date<input type="date" className={field} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></label>
            </div>
            {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-sm px-3 py-1.5 text-sm hover:bg-surface">Cancel</button>
            <button disabled={busy || !projectId} className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark disabled:opacity-60">{busy ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
