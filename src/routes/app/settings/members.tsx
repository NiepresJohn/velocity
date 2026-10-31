import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { listMembersDetailed, changeMemberRole, removeMember, transferOwnership, revokeInvitation } from '#/server/services/settings'
import { inviteMember } from '#/server/services/workspaces'
import { Avatar } from '#/components/ui'

export const Route = createFileRoute('/app/settings/members')({
  loader: ({ context }) => (context.workspaceId ? listMembersDetailed({ data: { workspaceId: context.workspaceId } }) : null),
  component: MembersPage,
})

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')
const link = 'text-xs text-jira hover:underline'

function MembersPage() {
  const data = Route.useLoaderData()
  const { workspaceId } = Route.useRouteContext()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'viewer'>('member')
  const [msg, setMsg] = useState('')
  if (!data || !workspaceId) return <p className="text-sm text-ink-soft">No workspace selected.</p>
  const isOwner = data.myRole === 'owner'
  const canManage = isOwner || data.myRole === 'admin'
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg(ok); await router.invalidate() } catch (err) { setMsg(errMsg(err)) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-medium">Members</h1>
      {canManage && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await inviteMember({ data: { workspaceId, email, role } }); setEmail(''); if (r.link) setMsg(`Invite link: ${r.link}`) }, `Invitation sent to ${email}`) }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email" aria-label="Invite by email" className="flex-1 rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira" />
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Invite role" className="rounded-sm border-2 border-line px-2 py-1.5 text-sm"><option value="member">Member</option><option value="viewer">Viewer</option></select>
          <button className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark">Invite</button>
        </form>
      )}
      {msg && <p role="status" className="break-all text-sm text-ink-soft">{msg}</p>}
      <ul>{data.members.map((m) => {
        const self = m.userId === data.myUserId
        const locked = !canManage || (m.role === 'owner' && !isOwner)
        return (
          <li key={m.userId} className="flex items-center gap-3 border-b border-line py-2 text-sm">
            <Avatar name={m.name} />
            <div className="flex-1"><div className="font-medium">{m.name}{self && ' (you)'}</div><div className="text-xs text-ink-soft">{m.email}</div></div>
            {locked || m.role === 'owner' ? <span className="text-xs uppercase text-ink-soft">{m.role}</span> : (
              <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => run(() => changeMemberRole({ data: { workspaceId, targetUserId: m.userId, role: e.target.value as 'admin' | 'member' | 'viewer' } }), 'Role updated.')} className="rounded-sm border border-line px-1 py-1 text-xs">
                <option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option>
              </select>
            )}
            {!locked && !self && <button className={link} onClick={() => window.confirm(`Remove ${m.name}?`) && run(() => removeMember({ data: { workspaceId, targetUserId: m.userId } }), 'Member removed.')}>Remove</button>}
            {isOwner && !self && <button className={link} onClick={() => window.confirm(`Transfer ownership to ${m.name}? You will become an admin.`) && run(() => transferOwnership({ data: { workspaceId, targetUserId: m.userId } }), 'Ownership transferred.')}>Make owner</button>}
          </li>
        )
      })}</ul>
      {canManage && (
        <section>
          <h2 className="mb-1 text-lg font-medium">Pending invitations</h2>
          {data.invitations.length === 0 ? <p className="text-sm text-ink-soft">None.</p> : (
            <ul>{data.invitations.map((i) => (
              <li key={i.id} className="flex items-center gap-3 border-b border-line py-2 text-sm">
                <span className="flex-1">{i.email}</span><span className="text-xs uppercase text-ink-soft">{i.role}</span>
                <span className="text-xs text-ink-soft">expires {new Date(i.expiresAt).toLocaleDateString()}</span>
                <button className={link} onClick={() => run(() => revokeInvitation({ data: { workspaceId, invitationId: i.id } }), 'Invitation revoked.')}>Revoke</button>
              </li>
            ))}</ul>
          )}
        </section>
      )}
    </div>
  )
}
