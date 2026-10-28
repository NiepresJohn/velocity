import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/app/settings/workspace')({ component: WorkspaceSettings })
function WorkspaceSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>
      <form className="max-w-md space-y-4 bg-white p-6 rounded shadow" onSubmit={e => e.preventDefault()}>
        <input type="text" placeholder="Workspace Name" className="w-full px-4 py-2 border rounded" />
        <textarea placeholder="Description" rows={3} className="w-full px-4 py-2 border rounded" />
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Save</button>
      </form>
    </div>
  )
}
