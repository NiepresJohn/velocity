import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { changePassword, deactivateAccount } from '#/server/auth/functions'
import { listSessions, revokeOtherSessions } from '#/server/services/settings'

export const Route = createFileRoute('/app/settings/security')({ loader: () => listSessions(), component: SecuritySettings })

const input = 'w-full rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira'
const btn = 'rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark'
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

function SecuritySettings() {
  const sessions = Route.useLoaderData()
  const router = useRouter()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [sessMsg, setSessMsg] = useState('')
  const [delPw, setDelPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [delMsg, setDelMsg] = useState('')
  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-2xl font-medium">Security</h1>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault()
        try { await changePassword({ data: { currentPassword: currentPw, newPassword: newPw } }); setPwMsg('Password updated.'); setCurrentPw(''); setNewPw('') }
        catch (err) { setPwMsg(errMsg(err)) }
      }}>
        <h2 className="text-lg font-medium">Change password</h2>
        <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" aria-label="Current password" required className={input} />
        <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 8)" aria-label="New password" required minLength={8} className={input} />
        <button className={btn}>Update password</button>
        {pwMsg && <p role="status" className="text-sm text-ink-soft">{pwMsg}</p>}
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Active sessions</h2>
        <ul>{sessions.map((s) => (
          <li key={s.id} className="border-b border-line py-2 text-sm">
            Signed in {new Date(s.createdAt).toLocaleString()} {s.current && <span className="ml-1 text-xs font-bold uppercase text-jira">This device</span>}
            <div className="text-xs text-ink-soft">Last active {new Date(s.lastSeenAt).toLocaleString()}</div>
          </li>
        ))}</ul>
        <button className={btn} disabled={sessions.length < 2} onClick={async () => {
          try { await revokeOtherSessions(); setSessMsg('Other sessions signed out.'); await router.invalidate() } catch (err) { setSessMsg(errMsg(err)) }
        }}>Sign out all other sessions</button>
        {sessMsg && <p role="status" className="text-sm text-ink-soft">{sessMsg}</p>}
      </section>

      <form className="space-y-3 rounded-sm border border-red-300 bg-red-50 p-4" onSubmit={async (e) => {
        e.preventDefault()
        if (!window.confirm('Deactivate your account? You will lose access to all workspaces.')) return
        try { await deactivateAccount({ data: { password: delPw, confirmText: confirm } }); window.location.href = '/login' }
        catch (err) { setDelMsg(errMsg(err)) }
      }}>
        <h2 className="font-medium text-red-700">Deactivate account</h2>
        <p className="text-sm text-red-700">Removes you from all workspaces and disables sign-in. Enter your password and type DELETE.</p>
        <input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="Password" aria-label="Password to confirm" required className={input} />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type DELETE" aria-label="Type DELETE" required className={input} />
        <button disabled={confirm !== 'DELETE'} className="rounded-sm bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Deactivate account</button>
        {delMsg && <p role="alert" className="text-sm text-red-700">{delMsg}</p>}
      </form>
    </div>
  )
}
