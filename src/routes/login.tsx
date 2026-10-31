import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentSession, login } from '#/server/auth/functions'
import { safeRedirect } from '#/lib/redirect'
import { Alert, AuthCard, Field, SubmitButton, errorMessage } from '#/components/auth-ui'

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s.redirect === 'string' ? { redirect: s.redirect } : {}),
  beforeLoad: async ({ search }) => { if (await getCurrentSession()) throw redirect({ href: safeRedirect(search.redirect) }) },
  component: Login,
})

function Login() {
  const { redirect: target } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const qs = target ? `?redirect=${encodeURIComponent(safeRedirect(target))}` : ''

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setPending(true)
    try {
      const res = await login({ data: { email, password } })
      if (!res.ok) { setError(res.error); setPending(false); return }
      window.location.assign(safeRedirect(target)) // full load so the new session cookie is used everywhere
    } catch (err) { setError(errorMessage(err, 'Sign in failed. Please try again.')); setPending(false) }
  }

  return (
    <AuthCard title="Log in to Velocity">
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
        <Field label="Password" id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} />
        <SubmitButton pending={pending} pendingText="Signing in...">Log in</SubmitButton>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <a href="/forgot-password" className="text-jira hover:underline">Forgot password?</a>
        <a href={`/register${qs}`} className="text-jira hover:underline">Create an account</a>
      </div>
    </AuthCard>
  )
}
