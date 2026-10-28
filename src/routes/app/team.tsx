import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/team')({ component: TeamPage })

function TeamPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-gray-600">Manage team members, roles, and invitations.</p>
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">Invite members to get started.</div>
    </div>
  )
}
