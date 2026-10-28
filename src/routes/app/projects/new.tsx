import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/projects/new')({ component: NewProjectPage })
function NewProjectPage() {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Project</h1>
      <form onSubmit={async (e) => { e.preventDefault(); window.location.href = '/app/projects' }} className="max-w-md space-y-4 bg-white p-6 rounded shadow">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Project Name" required maxLength={100} className="w-full px-4 py-2 border rounded" />
        <input value={key} onChange={e=>setKey(e.target.value.toUpperCase())} placeholder="Project Key (e.g. PROJ)" required maxLength={10} pattern="[A-Z0-9]+" className="w-full px-4 py-2 border rounded uppercase" />
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Create</button>
        <a href="/app/projects" className="ml-4 text-sm underline">Cancel</a>
      </form>
    </div>
  )
}
