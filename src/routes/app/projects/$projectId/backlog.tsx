import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { listIssues, listLabels, moveIssuesToSprint, rankIssue, updateIssue } from '#/server/services/issues'
import { completeSprint, createSprint, listSprints, startSprint } from '#/server/services/sprints'
import { listMembers } from '#/server/services/workspaces'
import { Avatar, IssueTypeIcon, LabelChip, PriorityIcon, StatusLozenge, TYPE_OPTIONS, type Member } from '#/components/ui'
import { CreateIssueModal } from '#/components/CreateIssueModal'
import type { IssueRow } from '#/components/IssueCard'

export const Route = createFileRoute('/app/projects/$projectId/backlog')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [res, sprints, members, labels] = await Promise.all([
      listIssues({ data: { projectId: params.projectId, workspaceId, pageSize: 100 } }),
      listSprints({ data: { projectId: params.projectId, workspaceId } }),
      listMembers({ data: { workspaceId } }),
      listLabels({ data: { projectId: params.projectId } }),
    ])
    return { issues: res.issues as IssueRow[], sprints, members: members as Member[], labels }
  },
  component: BacklogPage,
})

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10)
const btn = 'rounded-sm bg-[#dfe1e6] px-3 py-1 text-sm font-medium hover:bg-[#c1c7d0]'
const input = 'rounded-sm border-2 border-line bg-white px-2 py-1 text-sm focus:border-jira'
type Sprint = { id: string; name: string; state: string; goal: string | null }

function BacklogPage() {
  const { issues, sprints, members, labels } = Route.useLoaderData()
  const { workspaceId, projects } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const key = projects.find((p) => p.id === projectId)?.key ?? ''
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? null
  const [dragId, setDragId] = useState<string | null>(null)
  const [target, setTarget] = useState<{ id: string; pos: 'before' | 'after' } | null>(null)
  const [overSection, setOverSection] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState('')
  const [completing, setCompleting] = useState<Sprint | null>(null)
  const [moveIncomplete, setMoveIncomplete] = useState(true)
  const [createIn, setCreateIn] = useState<{ sprintId?: string } | null>(null)
  const [f, setF] = useState({ q: '', assignee: '', type: '', label: '' })

  // Drop selections for issues that no longer exist after a refresh.
  useEffect(() => { setSelected((s) => new Set([...s].filter((id) => issues.some((i) => i.id === id)))) }, [issues])
  useEffect(() => {
    if (!completing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCompleting(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [completing])

  const q = f.q.trim().toLowerCase()
  const matches = (i: IssueRow) =>
    (!q || i.title.toLowerCase().includes(q) || `${key}-${i.number}`.toLowerCase().includes(q)) &&
    (!f.assignee || (f.assignee === 'none' ? !i.assigneeId : i.assigneeId === f.assignee)) &&
    (!f.type || i.type === f.type) && (!f.label || i.labels.some((l) => l.id === f.label))
  const filtering = !!(q || f.assignee || f.type || f.label)

  const wrap = async (fn: () => Promise<unknown>) => {
    try { await fn(); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') }
    await router.invalidate()
  }
  const sectionItems = (sprintId: string | null) => issues.filter((i) => (i.sprintId ?? null) === sprintId && matches(i))

  // Neighbours (among the visible, ordered section items) for placing `id` at index `at` of the list without it.
  const place = (id: string, sprintId: string | null, at: (rest: IssueRow[]) => number) => {
    if (!workspaceId) return
    const rest = sectionItems(sprintId).filter((i) => i.id !== id)
    const idx = Math.max(0, Math.min(at(rest), rest.length))
    return wrap(() => rankIssue({ data: { issueId: id, workspaceId, beforeId: rest[idx - 1]?.id, afterId: rest[idx]?.id, sprintId } }))
  }
  function drop(sprintId: string | null) {
    const id = dragId; const t = target
    setDragId(null); setTarget(null); setOverSection(null)
    if (!id) return
    void place(id, sprintId, (rest) => {
      const ti = t && t.id !== id ? rest.findIndex((i) => i.id === t.id) : -1
      return ti < 0 ? rest.length : t!.pos === 'before' ? ti : ti + 1
    })
  }
  const nudge = (i: IssueRow, items: IssueRow[], dir: -1 | 1) => {
    const cur = items.findIndex((x) => x.id === i.id)
    return place(i.id, i.sprintId ?? null, () => cur + dir)
  }

  function renderRow(i: IssueRow, items: IssueRow[], n: number) {
    const marker = dragId && target?.id === i.id && i.id !== dragId ? target.pos : null
    return (
      <li key={i.id} draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragId(i.id) }}
        onDragEnd={() => { setDragId(null); setTarget(null); setOverSection(null) }}
        onDragOver={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTarget({ id: i.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' }) }}
        className={`flex items-center gap-2 border-b border-line bg-white px-3 py-2 text-sm hover:bg-surface ${marker === 'before' ? 'border-t-2 !border-t-jira' : ''} ${marker === 'after' ? '!border-b-2 !border-b-jira' : ''}`}>
        <input type="checkbox" aria-label={`Select ${key}-${i.number}`} checked={selected.has(i.id)} onChange={(e) => setSelected((s) => { const x = new Set(s); e.target.checked ? x.add(i.id) : x.delete(i.id); return x })} />
        <span className="flex flex-col leading-none">
          <button type="button" aria-label={`Move ${key}-${i.number} up`} disabled={n === 0} onClick={() => nudge(i, items, -1)} className="text-[10px] text-ink-soft hover:text-ink disabled:opacity-30">▲</button>
          <button type="button" aria-label={`Move ${key}-${i.number} down`} disabled={n === items.length - 1} onClick={() => nudge(i, items, 1)} className="text-[10px] text-ink-soft hover:text-ink disabled:opacity-30">▼</button>
        </span>
        <IssueTypeIcon type={i.type} />
        <span className="w-20 shrink-0 text-ink-soft">{key}-{i.number}</span>
        <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: i.id }} className="min-w-0 flex-1 truncate hover:text-jira hover:underline">{i.title}</Link>
        <span className="hidden gap-1 md:flex">{i.labels.map((l) => <LabelChip key={l.id} label={l} />)}</span>
        <StatusLozenge status={i.status} />
        <input type="number" min={0} max={100} aria-label={`Estimate for ${key}-${i.number}`} placeholder="–" defaultValue={i.estimatePoints ?? ''} key={`${i.id}-${i.estimatePoints}`}
          onBlur={(e) => {
            const v = e.target.value
            if (v === String(i.estimatePoints ?? '') || !workspaceId) return
            void wrap(() => updateIssue({ data: { issueId: i.id, workspaceId, estimatePoints: v === '' ? null : Number(v) } }))
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-12 rounded-full border border-transparent bg-[#dfe1e6] px-1 text-center text-[11px] font-medium hover:border-line focus:border-jira focus:bg-white" />
        <PriorityIcon priority={i.priority} />
        {i.assigneeId ? <Avatar name={nameOf(i.assigneeId) ?? '?'} size={22} /> : <span className="inline-block w-[22px]" />}
      </li>
    )
  }

  function renderSection(name: string, sprint: Sprint | null) {
    const sprintId = sprint?.id ?? null
    const all = issues.filter((i) => (i.sprintId ?? null) === sprintId)
    const items = sectionItems(sprintId)
    const points = all.reduce((s, i) => s + (i.estimatePoints ?? 0), 0)
    return (
      <section key={sprintId ?? 'backlog'} aria-label={name}
        onDragOver={(e) => { e.preventDefault(); setOverSection(sprintId ?? 'backlog') }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverSection(null) }}
        onDrop={(e) => { e.preventDefault(); drop(sprintId) }}
        className={`rounded-sm p-2 ${overSection === (sprintId ?? 'backlog') ? 'bg-[#deebff]' : 'bg-surface'}`}>
        <div className="flex items-center gap-3 px-1 pb-2">
          <h2 className="font-semibold">{name}</h2>
          <span className="text-xs text-ink-soft">{sprint?.state} ({all.length} issues{filtering ? `, ${items.length} shown` : ''} · {points} pts)</span>
          <span className="flex-1" />
          {sprint?.state === 'planned' && workspaceId && <button className={btn} onClick={() => wrap(() => startSprint({ data: { sprintId: sprint.id, workspaceId } }))}>Start sprint</button>}
          {sprint?.state === 'active' && <button className={btn} onClick={() => { setMoveIncomplete(true); setCompleting(sprint) }}>Complete sprint</button>}
        </div>
        <ul className="min-h-[36px]">{items.map((i, n) => renderRow(i, items, n))}</ul>
        {items.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-soft">{filtering ? 'No matching issues' : 'Drag issues here'}</p>}
        <button onClick={() => setCreateIn({ sprintId: sprint?.id })} className="mt-1 w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-soft hover:bg-black/5">+ Create issue</button>
      </section>
    )
  }

  const incompleteIn = (s: Sprint) => issues.filter((i) => i.sprintId === s.id && i.status !== 'done').length
  const targets = sprints.filter((s) => s.state !== 'completed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Backlog</h1>
        <button className={btn} onClick={() => workspaceId && wrap(() => createSprint({ data: { projectId, workspaceId, name: `Sprint ${Math.max(0, ...sprints.map((x) => Number(/^Sprint (\d+)/.exec(x.name)?.[1] ?? 0))) + 1}`, startDate: day(0), endDate: day(14) } }))}>Create sprint</button>
      </div>
      <div role="search" aria-label="Filter backlog" className="flex flex-wrap items-center gap-2">
        <input aria-label="Search backlog" type="search" placeholder="Search backlog" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className={`${input} w-48`} />
        <select aria-label="Filter by assignee" value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} className={input}>
          <option value="">All assignees</option><option value="none">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select aria-label="Filter by type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={input}>
          <option value="">All types</option>{TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Filter by label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={input}>
          <option value="">All labels</option>{labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {filtering && <button type="button" onClick={() => setF({ q: '', assignee: '', type: '', label: '' })} className="text-sm text-jira hover:underline">Clear filters</button>}
      </div>
      {selected.size > 0 && workspaceId && (
        <div role="region" aria-label="Bulk actions" className="flex items-center gap-2 rounded-sm bg-[#deebff] px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <select aria-label="Move selected to" value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className={input}>
            <option value="">Choose destination…</option><option value="backlog">Backlog</option>{targets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className={btn} disabled={!bulkTarget} onClick={() => wrap(async () => {
            await moveIssuesToSprint({ data: { issueIds: [...selected], sprintId: bulkTarget === 'backlog' ? null : bulkTarget, workspaceId, projectId } })
            setSelected(new Set()); setBulkTarget('')
          })}>Move</button>
          <button className="text-jira hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
      {sprints.map((s) => renderSection(s.name, s))}
      {renderSection('Backlog', null)}
      {completing && workspaceId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" onMouseDown={(e) => e.target === e.currentTarget && setCompleting(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="complete-sprint-title" className="w-full max-w-md rounded-sm bg-white shadow-xl">
            <div className="border-b border-line px-5 py-3"><h2 id="complete-sprint-title" className="text-lg font-medium">Complete {completing.name}</h2></div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <p>{issues.filter((i) => i.sprintId === completing.id && i.status === 'done').length} issues done, {incompleteIn(completing)} not done.</p>
              <label className="flex items-start gap-2"><input type="checkbox" autoFocus checked={moveIncomplete} onChange={(e) => setMoveIncomplete(e.target.checked)} className="mt-1" />
                <span>Move the {incompleteIn(completing)} incomplete issues back to the backlog<span className="block text-xs text-ink-soft">Otherwise they stay attached to this completed sprint.</span></span></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
              <button className="rounded-sm px-3 py-1.5 text-sm hover:bg-surface" onClick={() => setCompleting(null)}>Cancel</button>
              <button className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark" onClick={() => wrap(async () => { await completeSprint({ data: { sprintId: completing.id, workspaceId, moveIncompleteToBacklog: moveIncomplete } }); setCompleting(null) })}>Complete sprint</button>
            </div>
          </div>
        </div>
      )}
      {workspaceId && <CreateIssueModal open={createIn !== null} onClose={() => setCreateIn(null)} workspaceId={workspaceId} projects={projects} defaultProjectId={projectId} defaultSprintId={createIn?.sprintId} />}
    </div>
  )
}
