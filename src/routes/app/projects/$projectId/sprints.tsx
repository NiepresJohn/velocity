import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/projects/$projectId/sprints')({ component: SprintsPage })

function SprintsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sprints</h1>
        <a href="#" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">+ New Sprint</a>
      </div>
      <p className="text-gray-600">Plan and execute work in time-boxed iterations.</p>
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">No sprints yet — create one to begin planning.</div>
    </div>
  )
}
