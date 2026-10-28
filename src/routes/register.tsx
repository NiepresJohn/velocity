import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { register } from '#/server/auth/functions'

export const Route = createFileRoute('/register')({ component: Register })
function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={async (e) => { e.preventDefault(); setError(''); try { await register({ data: { name, email, password } }); window.location.href = '/app' } catch (err: any) { setError(err.message || 'Registration failed.') } }} className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center">Create Account</h1>
        {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-2 border rounded" />
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-2 border rounded" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min 8)" required minLength={8} className="w-full px-4 py-2 border rounded" />
        <button type="submit" className="w-full py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Register</button>
        <p className="text-center"><a href="/login" className="text-indigo-600 underline">Already have an account?</a></p>
      </form>
    </div>
  )
}
