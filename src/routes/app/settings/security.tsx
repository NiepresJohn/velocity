import { createFileRoute } from '@tanstack/react-router'
import { changePassword } from '#/server/auth/functions'
import { useState } from 'react'

export const Route = createFileRoute('/app/settings/security')({ component: SecuritySettings })
function SecuritySettings() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security</h1>
      <form onSubmit={async (e) => { e.preventDefault(); await changePassword({ data: { currentPassword: currentPw, newPassword: newPw } }) }} className="max-w-md space-y-4 bg-white p-6 rounded shadow">
        <label className="block text-sm font-medium">Change Password</label>
        <input type="password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="Current Password" required className="w-full px-4 py-2 border rounded" />
        <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New Password" required minLength={8} className="w-full px-4 py-2 border rounded" />
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Update Password</button>
      </form>
      <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded">
        <h3 className="font-medium text-red-700">Danger Zone</h3>
        <p className="text-sm text-red-600 mt-1">Deactivating your account is irreversible.</p>
        <button onClick={() => window.confirm('Type DELETE to confirm')} className="mt-2 px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700">Delete Account</button>
      </div>
    </div>
  )
}
