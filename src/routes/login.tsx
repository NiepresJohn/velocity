import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { login } from '#/server/auth/functions'

export const Route = createFileRoute('/login')({ component: Login })

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={async (e) => {
        e.preventDefault(); setError('')
        try { const res = await login({ data: { email, password } }); if (!res.ok) setError(res.error!); else window.location.href = '/app' }
        catch (err: any) { setError(err.message || 'Login failed.') }
      }} className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-2 border rounded" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-2 border rounded" />
        <button type="submit" className="w-full py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Sign In</button>
        <p className="text-center"><a href="/register" className="text-indigo-600 underline">No account? Register</a></p>
        <p className="text-center text-xs text-gray-500"><a href="/forgot-password" className="underline">Forgot password?</a></p>
      </form>
    </div>
  )
}
