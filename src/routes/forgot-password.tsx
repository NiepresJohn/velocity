import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { requestPasswordReset } from '#/server/auth/functions'
import { Alert, AuthCard, Field, SubmitButton, errorMessage } from '#/components/auth-ui'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setPending(true)
    try { await requestPasswordReset({ data: { email } }); setSent(true) }
    catch (err) { setError(errorMessage(err, 'Could not send the reset link. Please try again.')) }
    setPending(false)
  }

  return (
    <AuthCard title="Reset your password" subtitle="We will email you a link to choose a new one.">
      {sent ? <Alert kind="success">If an account exists for that email, a reset link is on its way. It expires in 1 hour.</Alert> : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
          <SubmitButton pending={pending} pendingText="Sending...">Send reset link</SubmitButton>
        </form>
      )}
      <p className="mt-4 text-sm"><a href="/login" className="text-jira hover:underline">Back to log in</a></p>
    </AuthCard>
  )
}
