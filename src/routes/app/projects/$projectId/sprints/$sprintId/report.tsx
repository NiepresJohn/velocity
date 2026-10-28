import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/app/projects/$projectId/sprints/$sprintId/report')({ component: SprintReportPage })

function SprintReportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sprint Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold">Committed Issues</h3><p className="text-3xl mt-2 text-gray-500">—</p></div>
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold">Completed</h3><p className="text-3xl mt-2 text-gray-500">—</p></div>
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold">Completion Rate</h3><p className="text-3xl mt-2 text-gray-500">—</p></div>
      </div>
    </div>
  )
}
