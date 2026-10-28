import { createFileRoute } from '@tanstack/react-router'
import { requestPasswordReset } from '#/server/auth/functions'
import { useState } from 'react'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={async e => { e.preventDefault(); await requestPasswordReset({ data: { email } }); setSent(true); }} className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        {sent ? (
          <p className="text-green-600 text-center">If an account exists, a reset link has been sent.</p>
        ) : (
          <>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required type="email" className="w-full px-4 py-2 border rounded" />
            <button type="submit" className="w-full py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Send Reset Link</button>
            <p className="text-center"><a href="/login" className="text-indigo-600 underline">Back to Login</a></p>
          </>
        )}
      </form>
    </div>
  )
}
