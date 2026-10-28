import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to Velocity</h1>
      <p className="text-gray-600">Select a workspace or create your first project to get started.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <a href="/app/projects/new" className="p-6 bg-white rounded shadow hover:shadow-md transition"><h3 className="font-semibold mb-2">Create Project</h3><p className="text-gray-500 text-sm">Track issues and sprints for your team.</p></a>
        <a href="/app/team" className="p-6 bg-white rounded shadow hover:shadow-md transition"><h3 className="font-semibold mb-2">Invite Team</h3><p className="text-gray-500 text-sm">Bring your team members on board.</p></a>
        <a href="/app/notifications" className="p-6 bg-white rounded shadow hover:shadow-md transition"><h3 className="font-semibold mb-2">Activity Feed</h3><p className="text-gray-500 text-sm">Stay up to date with team updates.</p></a>
      </div>
    </div>
  )
}
