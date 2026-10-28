import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/projects/')({ component: ProjectsPage })

function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <a href="/app/projects/new" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">+ New Project</a>
      </div>
      <p className="text-gray-600">Create your first project to start tracking issues, sprints, and team velocity.</p>
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">No projects yet — create one to begin!</div>
    </div>
  )
}
