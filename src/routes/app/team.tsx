import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { inviteMember, listMembers } from '#/server/services/workspaces'
import { Avatar } from '#/components/ui'

export const Route = createFileRoute('/app/team')({
  loader: async ({ context }) => context.workspaceId ? listMembers({ data: { workspaceId: context.workspaceId } }) : [],
  component: TeamPage,
})

function TeamPage() {
  const members = Route.useLoaderData()
  const { workspaceId } = Route.useRouteContext()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-medium">Team</h1>
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault()
        if (!workspaceId) return
        try { await inviteMember({ data: { workspaceId, email, role: 'member' } }); setMsg(`Invitation sent to ${email}`); setEmail(''); await router.invalidate() }
        catch (err) { setMsg(err instanceof Error ? err.message : 'Could not invite') }
      }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email" aria-label="Invite by email" className="flex-1 rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira" />
        <button className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark">Invite</button>
      </form>
      {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
      <ul>{members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 border-b border-line py-2 text-sm"><Avatar name={m.name} /><div className="flex-1"><div className="font-medium">{m.name}</div><div className="text-xs text-ink-soft">{m.email}</div></div><span className="text-xs uppercase text-ink-soft">{m.role}</span></li>
      ))}</ul>
    </div>
  )
}
