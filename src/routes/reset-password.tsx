import { createFileRoute } from '@tanstack/react-router'
import { useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { resetPassword } from '#/server/auth/functions'

export const Route = createFileRoute('/reset-password')({ component: ResetPasswordPage })
function ResetPasswordPage() {
  const search = useLocation().search as Record<string, unknown> | undefined
  const token = (search?.token as string) ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={async (e) => { e.preventDefault(); if(password !== confirm) return; await resetPassword({ data: { token, password } }); setDone(true); }} className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold text-center">Reset Password</h1>
        {done ? <p className="text-green-600 text-center">Password reset successfully. <a href="/login" className="underline">Sign in</a>.</p> : <>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New Password" required minLength={8} className="w-full px-4 py-2 border rounded" />
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm New Password" required minLength={8} className="w-full px-4 py-2 border rounded" />
          <button type="submit" className="w-full py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Reset Password</button>
        </>}
      </form>
    </div>
  )
}
