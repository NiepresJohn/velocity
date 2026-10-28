import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/projects/$projectId/sprints/new')({ component: NewSprintPage })
function NewSprintPage() {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Sprint</h1>
      <form onSubmit={e => { e.preventDefault(); }} className="max-w-md space-y-4 bg-white p-6 rounded shadow">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Sprint Name" required className="w-full px-4 py-2 border rounded" />
        <div className="grid grid-cols-2 gap-4"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required className="px-4 py-2 border rounded" /><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} required className="px-4 py-2 border rounded" /></div>
        <button type="submit" className="px-6 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Create Sprint</button>
        <a href="#" className="ml-4 text-sm underline">Cancel</a>
      </form>
    </div>
  )
}
