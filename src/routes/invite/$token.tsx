import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { getInvitePreview, acceptInvite } from '#/server/services/settings'

export const Route = createFileRoute('/invite/$token')({
  loader: async ({ params }) => {
    const p = await getInvitePreview({ data: { token: params.token } })
    if (p.ok && !p.loggedIn) throw redirect({ to: '/login', search: { redirect: `/invite/${params.token}` } })
    return p
  },
  component: InvitePage,
})

function InvitePage() {
  const p = Route.useLoaderData()
  const { token } = Route.useParams()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-md space-y-4 rounded-sm border border-line bg-white p-8 text-center">
        {!p.ok ? <p role="alert" className="text-sm text-red-700">{p.error}</p> : (
          <>
            <h1 className="text-xl font-medium">Join {p.workspaceName}</h1>
            <p className="text-sm text-ink-soft">You were invited as <b>{p.role}</b> ({p.email}).</p>
            {!p.emailMatches && <p role="alert" className="text-sm text-red-700">You are signed in with a different email. Log out and sign in as {p.email} to accept.</p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={busy || !p.emailMatches} className="rounded-sm bg-jira px-4 py-1.5 text-sm font-medium text-white hover:bg-jira-dark disabled:opacity-50" onClick={async () => {
              setBusy(true)
              try { await acceptInvite({ data: { token } }); window.location.href = '/app' } catch (e) { setError(e instanceof Error ? e.message : 'Could not accept'); setBusy(false) }
            }}>Accept invitation</button>
          </>
        )}
      </div>
    </div>
  )
}
