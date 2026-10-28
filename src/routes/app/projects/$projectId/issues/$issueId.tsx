import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/app/projects/$projectId/issues/$issueId')({ component: IssueDetailPage })
function IssueDetailPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold"><span className="text-sm text-gray-500 font-normal">#—</span></h1>
      <div className="bg-white p-6 rounded shadow space-y-4">
        <textarea placeholder="Description" rows={6} className="w-full px-4 py-2 border rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select className="px-4 py-2 border rounded"><option>Task</option><option>Bug</option><option>Story</option></select>
          <select className="px-4 py-2 border rounded"><option>Lowest</option><option>Medium</option><option>High</option></select>
          <select className="px-4 py-2 border rounded"><option>To Do</option><option>In Progress</option><option>Done</option></select>
          <input type="date" className="px-4 py-2 border rounded" />
        </div>
        <button className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Save</button>
      </div>
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold mb-3">Comments</h3>
        <textarea placeholder="Add a comment..." rows={3} className="w-full px-4 py-2 border rounded mb-2" />
        <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded">Comment</button>
      </div>
    </div>
  )
}
