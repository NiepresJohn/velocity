import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getPreferences, updatePreferences } from '#/server/services/settings'

export const Route = createFileRoute('/app/settings/preferences')({ loader: () => getPreferences(), component: PreferencesPage })

function PreferencesPage() {
  const p = Route.useLoaderData()
  const router = useRouter()
  const [theme, setTheme] = useState(p.theme as 'system' | 'light' | 'dark')
  const [compact, setCompact] = useState(p.compactDensity)
  const [msg, setMsg] = useState('')
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-medium">Preferences</h1>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault()
        try { await updatePreferences({ data: { theme, compactDensity: compact } }); setMsg('Saved.'); await router.invalidate() }
        catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save') }
      }}>
        <label className="block text-sm font-medium">Theme
          <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)} className="w-full rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira">
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />Compact density</label>
        <button className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark">Save</button>
      </form>
      {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
    </div>
  )
}
