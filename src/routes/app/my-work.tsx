import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/my-work')({ component: MyWorkPage })
function MyWorkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Work</h1>
      <p className="text-gray-600">Assigned issues, overdue tasks, and recently updated work items.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold text-orange-600">Overdue</h3><p className="text-3xl mt-2 text-gray-400">—</p></div>
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold text-blue-600">Due Soon</h3><p className="text-3xl mt-2 text-gray-400">—</p></div>
        <div className="p-6 bg-white rounded shadow"><h3 className="font-semibold text-green-600">In Progress</h3><p className="text-3xl mt-2 text-gray-400">—</p></div>
      </div>
    </div>
  )
}
