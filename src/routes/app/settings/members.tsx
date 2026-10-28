import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/app/settings/members')({ component: MembersPage })
function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded">Invite Member</button>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead><tr className="border-b"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th></tr></thead>
        <tbody><tr className="border-b"><td colSpan={3} className="p-8 text-center text-gray-500">No members yet.</td></tr></tbody>
      </table>
    </div>
  )
}
