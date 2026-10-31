import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { resetPassword } from '#/server/auth/functions'
import { passwordProblem } from '#/lib/redirect'
import { Alert, AuthCard, Field, SubmitButton, errorMessage } from '#/components/auth-ui'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === 'string' ? s.token : '' }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const pwError = password ? passwordProblem(password) : null
  const mismatch = confirm && confirm !== password ? 'Passwords do not match.' : null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (passwordProblem(password) || password !== confirm) return setError(passwordProblem(password) ?? 'Passwords do not match.')
    setPending(true)
    try { await resetPassword({ data: { token, password } }); setDone(true) }
    catch (err) { setError(errorMessage(err, 'Could not reset your password.')) }
    setPending(false)
  }

  if (!token) return (
    <AuthCard title="Reset link missing">
      <Alert>This reset link is incomplete. <a href="/forgot-password" className="font-medium underline">Request a new one</a>.</Alert>
    </AuthCard>
  )
  return (
    <AuthCard title="Choose a new password">
      {done ? <Alert kind="success">Password updated. All other sessions were signed out. <a href="/login" className="font-medium underline">Log in</a></Alert> : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error} {/expired|invalid/i.test(error) && <a href="/forgot-password" className="font-medium underline">Request a new link</a>}</Alert>}
          <Field label="New password" id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending}
            hint="At least 8 characters, with a letter and a number." error={pwError} />
          <Field label="Confirm new password" id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={pending} error={mismatch} />
          <SubmitButton pending={pending} pendingText="Saving...">Reset password</SubmitButton>
        </form>
      )}
    </AuthCard>
  )
}
