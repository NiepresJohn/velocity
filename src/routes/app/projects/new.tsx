import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { createProject } from '#/server/services/projects'

export const Route = createFileRoute('/app/projects/new')({ component: NewProjectPage })

const input = 'w-full rounded-sm border-2 border-line bg-surface px-3 py-2 text-sm focus:bg-white'

function NewProjectPage() {
  const { workspaceId } = Route.useRouteContext()
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-medium">Create project</h1>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault()
        if (!workspaceId) return
        try {
          await createProject({ data: { workspaceId, name, key } })
          await router.invalidate()
          await router.navigate({ to: '/app/projects' })
        } catch (err) { setError(err instanceof Error ? err.message : 'Could not create project') }
      }}>
        <label className="block text-xs font-bold text-ink-soft">Name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={input} /></label>
        <label className="block text-xs font-bold text-ink-soft">Key<input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} required minLength={2} maxLength={10} pattern="[A-Z0-9]+" className={input} /></label>
        {error && <p role="alert" className="text-sm text-[#bf2600]">{error}</p>}
        <div className="flex items-center gap-3"><button type="submit" className="rounded-sm bg-jira px-4 py-2 text-sm font-medium text-white hover:bg-jira-dark">Create</button><a href="/app/projects" className="text-sm text-jira hover:underline">Cancel</a></div>
      </form>
    </div>
  )
}
