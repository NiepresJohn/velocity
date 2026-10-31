import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getWorkspaceSettings } from '#/server/services/settings'
import { updateWorkspace, createWorkspace, switchWorkspace } from '#/server/services/workspaces'

export const Route = createFileRoute('/app/settings/workspace')({
  loader: ({ context }) => (context.workspaceId ? getWorkspaceSettings({ data: { workspaceId: context.workspaceId } }) : null),
  component: WorkspaceSettings,
})

const input = 'w-full rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira'
const btn = 'rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark'
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

function WorkspaceSettings() {
  const data = Route.useLoaderData()
  const { workspaceId } = Route.useRouteContext()
  const router = useRouter()
  const [name, setName] = useState(data?.name ?? '')
  const [description, setDescription] = useState(data?.description ?? '')
  const [newName, setNewName] = useState('')
  const [msg, setMsg] = useState('')
  const canEdit = data?.myRole === 'owner' || data?.myRole === 'admin'

  // switching changes the cookie read by the /app beforeLoad, so reload fully
  const switchTo = async (id: string) => { await switchWorkspace({ data: { workspaceId: id } }); window.location.href = '/app/settings/workspace' }

  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-2xl font-medium">Workspace</h1>
      {data && workspaceId && (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault()
          try { await updateWorkspace({ data: { workspaceId, name, description } }); setMsg('Saved.'); await router.invalidate() } catch (err) { setMsg(errMsg(err)) }
        }}>
          <label className="block text-sm font-medium">Name<input required minLength={2} maxLength={80} disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
          <label className="block text-sm font-medium">Description<textarea rows={3} maxLength={500} disabled={!canEdit} value={description} onChange={(e) => setDescription(e.target.value)} className={input} /></label>
          {canEdit ? <button className={btn}>Save</button> : <p className="text-sm text-ink-soft">Only owners and admins can edit workspace details.</p>}
        </form>
      )}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Your workspaces</h2>
        <ul>{data?.workspaces.map((w) => (
          <li key={w.id} className="flex items-center gap-3 border-b border-line py-2 text-sm">
            <span className="flex-1">{w.name} <span className="text-xs uppercase text-ink-soft">{w.role}</span></span>
            {w.id === workspaceId ? <span className="text-xs font-bold uppercase text-jira">Current</span> : <button className="text-jira hover:underline" onClick={() => switchTo(w.id).catch((err) => setMsg(errMsg(err)))}>Switch</button>}
          </li>
        ))}</ul>
      </section>
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault()
        try { const w = await createWorkspace({ data: { name: newName } }); await switchTo(w.id) } catch (err) { setMsg(errMsg(err)) }
      }}>
        <input required minLength={2} maxLength={80} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New workspace name" aria-label="New workspace name" className="flex-1 rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira" />
        <button className={btn}>Create</button>
      </form>
      {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
    </div>
  )
}
