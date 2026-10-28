import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/app/settings/profile')({ component: ProfileSettings })
function ProfileSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <form className="max-w-md space-y-4 bg-white p-6 rounded shadow" onSubmit={e => e.preventDefault()}>
        <input type="text" placeholder="Display Name" className="w-full px-4 py-2 border rounded" />
        <input type="email" disabled className="w-full px-4 py-2 border rounded bg-gray-100" />
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Save Changes</button>
      </form>
    </div>
  )
}
