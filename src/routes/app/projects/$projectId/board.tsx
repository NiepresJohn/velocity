import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { transitionIssue } from '#/server/services/issues'

export const Route = createFileRoute('/app/projects/$projectId/board')({ component: BoardPage })

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'border-blue-400 bg-blue-50/50' },
  { key: 'in_progress', label: 'In Progress', color: 'border-yellow-400 bg-yellow-50/50' },
  { key: 'in_review', label: 'In Review', color: 'border-purple-400 bg-purple-50/50' },
  { key: 'done', label: 'Done', color: 'border-green-400 bg-green-50/50' },
]

function BoardPage() {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kanban Board</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (draggingId) { transitionIssue({ data: { issueId: draggingId, workspaceId: '', status: col.key } }).catch(() => {}); setDraggingId(null) } }}
            className={`min-h-[400px] rounded-lg border-2 ${col.color} p-3 space-y-2`}>
            <h2 className="font-semibold text-sm">{col.label}</h2>
            <button className="w-full px-3 py-2 text-xs text-gray-500 bg-white/50 rounded hover:bg-white/80">+ Add card</button>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-500">Create issues and drag them between columns to change status.</p>
    </div>
  )
}
