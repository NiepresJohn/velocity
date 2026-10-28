import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/app/projects/$projectId/sprints/$sprintId')({ component: SprintDetailPage })

function SprintDetailPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sprint Detail</h1>
      <div className="bg-white p-6 rounded shadow space-y-4">
        <p className="text-gray-600">View sprint goal, dates, progress, and linked issues.</p>
      </div>
    </div>
  )
}
