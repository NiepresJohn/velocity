import { Outlet, createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app/settings')({ component: SettingsLayout })

const tabs = [
  { to: '/app/settings/profile', label: 'Profile' },
  { to: '/app/settings/preferences', label: 'Preferences' },
  { to: '/app/settings/security', label: 'Security' },
  { to: '/app/settings/workspace', label: 'Workspace' },
  { to: '/app/settings/members', label: 'Members' },
] as const

function SettingsLayout() {
  return (
    <div className="flex gap-8">
      <nav aria-label="Settings" className="w-44 shrink-0 space-y-0.5">
        <h2 className="mb-2 px-3 text-xs font-bold uppercase text-ink-soft">Settings</h2>
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className="block rounded-sm px-3 py-2 text-sm text-ink hover:bg-black/5" activeProps={{ className: 'bg-[#deebff] text-jira font-medium' }}>{t.label}</Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1"><Outlet /></div>
    </div>
  )
}
