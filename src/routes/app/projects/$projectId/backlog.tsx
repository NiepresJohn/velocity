import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { createIssue, listIssues, moveToSprint } from '#/server/services/issues'
import { createSprint, listSprints, startSprint } from '#/server/services/sprints'
import { IssueTypeIcon, PriorityIcon, StatusLozenge } from '#/components/ui'
import type { IssueRow } from '#/components/IssueCard'

export const Route = createFileRoute('/app/projects/$projectId/backlog')({
  loader: async ({ context, params }) => {
    const workspaceId = context.workspaceId!
    const [res, sprints] = await Promise.all([
      listIssues({ data: { projectId: params.projectId, workspaceId, pageSize: 100 } }),
      listSprints({ data: { projectId: params.projectId, workspaceId } }),
    ])
    return { issues: res.issues as IssueRow[], sprints }
  },
  component: BacklogPage,
})

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10)

function BacklogPage() {
  const { issues, sprints } = Route.useLoaderData()
  const { workspaceId, projects } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const key = projects.find((p) => p.id === projectId)?.key ?? ''
  const [dragId, setDragId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const refresh = () => router.invalidate()
  const drop = async (sprintId: string | null) => { if (dragId) { await moveToSprint({ data: { issueId: dragId, sprintId } }); setDragId(null); await refresh() } }
  const wrap = async (fn: () => Promise<unknown>) => { try { await fn(); setError(''); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') } }

  const Row = ({ i }: { i: IssueRow }) => (
    <li draggable onDragStart={() => setDragId(i.id)} className="flex items-center gap-3 border-b border-line bg-white px-3 py-2 text-sm hover:bg-surface">
      <IssueTypeIcon type={i.type} />
      <span className="w-20 shrink-0 text-ink-soft">{key}-{i.number}</span>
      <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: i.id }} className="min-w-0 flex-1 truncate hover:text-jira hover:underline">{i.title}</Link>
      <StatusLozenge status={i.status} />
      {i.estimatePoints != null && <span className="rounded-full bg-[#dfe1e6] px-1.5 text-[11px] font-medium">{i.estimatePoints}</span>}
      <PriorityIcon priority={i.priority} />
    </li>
  )
  const Section = ({ name, sub, sprintId, actions }: { name: string; sub?: string; sprintId: string | null; actions?: React.ReactNode }) => {
    const items = issues.filter((i) => (i.sprintId ?? null) === sprintId)
    return (
      <section aria-label={name} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void drop(sprintId) }} className="rounded-sm bg-surface p-2">
        <div className="flex items-center gap-3 px-1 pb-2"><h2 className="font-semibold">{name}</h2><span className="text-xs text-ink-soft">{sub} ({items.length} issues)</span><span className="flex-1" />{actions}</div>
        <ul className="min-h-[36px]">{items.map((i) => <Row key={i.id} i={i} />)}</ul>
        {items.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-soft">Drag issues here</p>}
      </section>
    )
  }
  const btn = 'rounded-sm bg-[#dfe1e6] px-3 py-1 text-sm font-medium hover:bg-[#c1c7d0]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Backlog</h1>
        <button className={btn} onClick={() => workspaceId && wrap(() => createSprint({ data: { projectId, workspaceId, name: `Sprint ${sprints.length + 1}`, startDate: day(0), endDate: day(14) } }))}>Create sprint</button>
      </div>
      {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
      {sprints.map((s) => (
        <Section key={s.id} name={s.name} sprintId={s.id} sub={s.state} actions={s.state === 'planned' && workspaceId
          ? <button className={btn} onClick={() => wrap(() => startSprint({ data: { sprintId: s.id, workspaceId } }))}>Start sprint</button> : null} />
      ))}
      <Section name="Backlog" sprintId={null} />
      <form onSubmit={(e) => { e.preventDefault(); if (workspaceId) void wrap(async () => { await createIssue({ data: { projectId, workspaceId, title } }); setTitle('') }) }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="+ Create issue" minLength={3} maxLength={200} required className="w-full rounded-sm border-2 border-transparent bg-surface px-3 py-2 text-sm focus:border-jira focus:bg-white" />
      </form>
    </div>
  )
}
