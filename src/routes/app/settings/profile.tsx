import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getProfile, updateProfile } from '#/server/services/settings'
import { Avatar } from '#/components/ui'

export const Route = createFileRoute('/app/settings/profile')({ loader: () => getProfile(), component: ProfileSettings })

const input = 'w-full rounded-sm border-2 border-line px-3 py-1.5 text-sm focus:border-jira'
function ProfileSettings() {
  const p = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState(p.name)
  const [timezone, setTimezone] = useState(p.timezone)
  const [avatarUrl, setAvatarUrl] = useState(p.avatarUrl)
  const [msg, setMsg] = useState('')
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-medium">Profile</h1>
      <div className="flex items-center gap-3">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <Avatar name={name} size={48} />}
        <span className="text-sm text-ink-soft">{p.email}</span>
      </div>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault()
        try { await updateProfile({ data: { name, timezone, avatarUrl } }); setMsg('Saved.'); await router.invalidate() }
        catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save') }
      }}>
        <label className="block text-sm font-medium">Display name<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} /></label>
        <label className="block text-sm font-medium">Timezone<input required value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/New_York" className={input} /></label>
        <label className="block text-sm font-medium">Avatar URL<input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className={input} /></label>
        <button className="rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark">Save changes</button>
      </form>
      {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
    </div>
  )
}
