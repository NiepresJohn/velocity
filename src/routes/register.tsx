import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentSession, register } from '#/server/auth/functions'
import { passwordProblem } from '#/lib/redirect'
import { Alert, AuthCard, Field, SubmitButton, errorMessage } from '#/components/auth-ui'

export const Route = createFileRoute('/register')({
  beforeLoad: async () => { if (await getCurrentSession()) throw redirect({ to: '/app' }) },
  component: Register,
})

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(false)
  const [pending, setPending] = useState(false)
  const pwError = password ? passwordProblem(password) : null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setNotice(false)
    if (name.trim().length < 2) return setError('Enter your full name.')
    if (passwordProblem(password)) return setError(passwordProblem(password)!)
    setPending(true)
    try {
      await register({ data: { name, email, password } })
      // Same response for new and existing emails: only a real new account has a session.
      if (await getCurrentSession()) { window.location.assign('/app'); return }
      setNotice(true)
    } catch (err) { setError(errorMessage(err, 'Registration failed. Check your details and try again.')) }
    setPending(false)
  }

  return (
    <AuthCard title="Create your account" subtitle="Free to start. You get your own workspace.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert kind="info">We could not create a new account with these details. If you already have one, <a href="/login" className="font-medium underline">log in</a> or <a href="/forgot-password" className="font-medium underline">reset your password</a>.</Alert>}
        <Field label="Full name" id="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
        <Field label="Work email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
        <Field label="Password" id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending}
          hint="At least 8 characters, with a letter and a number." error={pwError} />
        <SubmitButton pending={pending} pendingText="Creating account...">Create account</SubmitButton>
      </form>
      <p className="mt-4 text-sm text-ink-soft">Already have an account? <a href="/login" className="text-jira hover:underline">Log in</a></p>
    </AuthCard>
  )
}
