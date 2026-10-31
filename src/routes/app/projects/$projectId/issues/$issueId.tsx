import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { addComment, getIssue, listComments, updateIssue } from '#/server/services/issues'
import { Avatar, IssueTypeIcon, StatusLozenge } from '#/components/ui'

export const Route = createFileRoute('/app/projects/$projectId/issues/$issueId')({
  loader: async ({ context, params }) => {
    const [issue, comments] = await Promise.all([
      getIssue({ data: { issueId: params.issueId, workspaceId: context.workspaceId! } }),
      listComments({ data: { issueId: params.issueId } }),
    ])
    return { issue, comments: comments as { comment: { id: string; body: string; createdAt: string | Date }; renderedBody?: string; authorName?: string | null }[] | any[] }
  },
  component: IssuePage,
})

const select = 'w-full rounded-sm border-2 border-transparent bg-surface px-2 py-1.5 text-sm hover:bg-[#ebecf0] focus:border-jira focus:bg-white'

function IssuePage() {
  const { issue, comments } = Route.useLoaderData()
  const { workspaceId, projects } = Route.useRouteContext()
  const { projectId } = Route.useParams()
  const router = useRouter()
  const project = projects.find((p) => p.id === projectId)
  const [title, setTitle] = useState(issue.title)
  const [desc, setDesc] = useState(issue.description ?? '')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const save = async (patch: Record<string, unknown>) => {
    if (!workspaceId) return
    try { await updateIssue({ data: { issueId: issue.id, workspaceId, ...patch } }); setError(''); await router.invalidate() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save') }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <nav className="text-sm text-ink-soft"><Link to="/app/projects" className="hover:underline">Projects</Link> / <Link to="/app/projects/$projectId/board" params={{ projectId }} className="hover:underline">{project?.name}</Link> / <span className="inline-flex items-center gap-1"><IssueTypeIcon type={issue.type} />{project?.key}-{issue.number}</span></nav>
      {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
      <div className="grid gap-8 md:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== issue.title && title.length >= 3 && save({ title })} className="w-full rounded-sm border-2 border-transparent px-2 py-1 text-2xl font-medium hover:bg-surface focus:border-jira focus:bg-white" />
          <div>
            <h2 className="mb-1 text-sm font-semibold">Description</h2>
            <textarea aria-label="Description" rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== (issue.description ?? '') && save({ description: desc })} placeholder="Add a description…" className="w-full rounded-sm border-2 border-transparent bg-surface px-2 py-1.5 text-sm hover:bg-[#ebecf0] focus:border-jira focus:bg-white" />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Comments</h2>
            <form className="mb-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await addComment({ data: { issueId: issue.id, body } }); setBody(''); await router.invalidate() }}>
              <Avatar name="Me" />
              <div className="flex-1 space-y-2">
                <textarea aria-label="Add a comment" rows={2} value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Add a comment…" className="w-full rounded-sm border-2 border-line px-2 py-1.5 text-sm focus:border-jira" />
                <button className="rounded-sm bg-jira px-3 py-1 text-sm font-medium text-white hover:bg-jira-dark">Save</button>
              </div>
            </form>
            <ul className="space-y-3">
              {comments.map((c: any) => (
                <li key={c.comment?.id ?? c.id} className="flex gap-2 text-sm">
                  <Avatar name={c.authorName ?? c.author?.name} />
                  <div><div className="font-medium">{c.authorName ?? c.author?.name ?? 'Unknown'} <span className="font-normal text-ink-soft">{new Date(c.comment?.createdAt ?? c.createdAt).toLocaleString()}</span></div><p className="whitespace-pre-wrap">{c.comment?.body ?? c.body}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-3 text-sm">
          <div><StatusLozenge status={issue.status} /></div>
          <div className="rounded-sm border border-line">
            <div className="border-b border-line bg-surface px-3 py-2 font-semibold">Details</div>
            <div className="space-y-3 p-3">
              {([
                ['Status', 'status', ['todo', 'in_progress', 'in_review', 'done']],
                ['Type', 'type', ['story', 'task', 'bug', 'epic']],
                ['Priority', 'priority', ['lowest', 'low', 'medium', 'high', 'highest']],
              ] as const).map(([label, field, opts]) => (
                <label key={field} className="block text-xs font-bold text-ink-soft">{label}
                  <select className={select} value={issue[field]} onChange={(e) => save({ [field]: e.target.value })}>{opts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select>
                </label>
              ))}
              <label className="block text-xs font-bold text-ink-soft">Story points
                <input type="number" min={0} defaultValue={issue.estimatePoints ?? ''} onBlur={(e) => e.target.value !== String(issue.estimatePoints ?? '') && save({ estimatePoints: e.target.value === '' ? undefined : Number(e.target.value) })} className={select} />
              </label>
              <div className="text-xs"><span className="font-bold text-ink-soft">Reporter</span><div className="mt-1 flex items-center gap-2 text-sm"><Avatar name={issue.reporterName} size={20} />{issue.reporterName ?? 'Unknown'}</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
