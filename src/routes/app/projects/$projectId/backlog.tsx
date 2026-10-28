import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/projects/$projectId/backlog')({ component: BacklogPage })
function BacklogPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Backlog</h1><button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700">+ New Issue</button></div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search issues..." className="w-full max-w-md px-4 py-2 border rounded" />
      {showCreate && (
        <form onSubmit={e => { e.preventDefault(); setShowCreate(false); setTitle(''); }} className="space-y-3 bg-white p-4 rounded shadow">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required maxLength={200} className="w-full px-4 py-2 border rounded" />
          <select defaultValue="task" className="px-4 py-2 border rounded"><option value="task">Task</option><option value="bug">Bug</option><option value="story">Story</option></select>
          <textarea placeholder="Description" rows={3} className="w-full px-4 py-2 border rounded" />
          <div className="flex gap-2"><button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded">Create</button><button type="button" onClick={()=>setShowCreate(false)} className="px-4 py-2 text-gray-600 underline">Cancel</button></div>
        </form>
      )}
      <p className="text-gray-500">No issues yet — create one above.</p>
    </div>
  )
}
