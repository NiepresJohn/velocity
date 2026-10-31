import { Outlet, createFileRoute, redirect, Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentSession, logout } from '#/server/auth/functions'
import { getAppContext } from '#/server/services/workspaces'
import { Avatar } from '#/components/ui'
import { GlobalSearch } from '#/components/GlobalSearch'
import { CreateIssueModal } from '#/components/CreateIssueModal'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const result = await getCurrentSession()
    if (!result) throw redirect({ to: '/login' })
    const ctx = await getAppContext()
    return { userId: result.user.id, user: { id: result.user.id, name: result.user.name, email: result.user.email }, ...ctx }
  },
  component: AppLayout,
})

const topLink = 'px-3 py-1.5 text-sm font-medium text-white/90 rounded-sm hover:bg-white/15'
const sideLink = 'flex items-center gap-2 px-3 py-2 text-sm rounded-sm text-ink hover:bg-black/5'
const sideActive = { className: 'bg-[#deebff] text-jira font-medium' }

function AppLayout() {
  const { user, projects, workspaceName, workspaceId } = Route.useRouteContext()
  const [creating, setCreating] = useState(false)
  const { projectId } = useParams({ strict: false }) as { projectId?: string }
  const [menu, setMenu] = useState<'projects' | 'user' | null>(null)
  const project = projects.find((p) => p.id === projectId)

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex h-12 shrink-0 items-center gap-1 bg-nav px-3">
        <Link to="/app" className="mr-2 flex items-center gap-2 px-2 text-base font-bold text-white"><span className="inline-block h-5 w-5 rounded-sm bg-white/90" />Velocity</Link>
        <Link to="/app/my-work" className={topLink}>Your work</Link>
        <div className="relative">
          <button onClick={() => setMenu(menu === 'projects' ? null : 'projects')} className={topLink} aria-expanded={menu === 'projects'}>Projects ▾</button>
          {menu === 'projects' && (
            <div className="absolute left-0 top-9 z-20 w-64 rounded-sm border border-line bg-white py-1 shadow-lg" onClick={() => setMenu(null)}>
              {projects.map((p) => (
                <Link key={p.id} to="/app/projects/$projectId/board" params={{ projectId: p.id }} className="block px-3 py-2 text-sm hover:bg-surface">{p.name} <span className="text-ink-soft">({p.key})</span></Link>
              ))}
              <Link to="/app/projects" className="block border-t border-line px-3 py-2 text-sm text-jira hover:bg-surface">View all projects</Link>
            </div>
          )}
        </div>
        <Link to="/app/team" className={topLink}>Teams</Link>
        {projects.length > 0 && workspaceId
          ? <button onClick={() => setCreating(true)} className="ml-2 rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark ring-1 ring-white/30">Create</button>
          : <Link to="/app/projects/new" className="ml-2 rounded-sm bg-jira px-3 py-1.5 text-sm font-medium text-white hover:bg-jira-dark ring-1 ring-white/30">Create</Link>}
        <div className="flex-1" />
        <GlobalSearch workspaceId={workspaceId} />
        <Link to="/app/notifications" aria-label="Notifications" className={topLink}>🔔</Link>
        <div className="relative">
          <button onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-label="Account menu"><Avatar name={user.name} size={28} /></button>
          {menu === 'user' && (
            <div className="absolute right-0 top-9 z-20 w-60 rounded-sm border border-line bg-white py-1 shadow-lg" onClick={() => setMenu(null)}>
              <div className="border-b border-line px-3 py-2"><div className="text-sm font-medium">{user.name}</div><div className="text-xs text-ink-soft">{user.email}</div></div>
              <Link to="/app/settings/profile" className="block px-3 py-2 text-sm hover:bg-surface">Profile</Link>
              <Link to="/app/settings/preferences" className="block px-3 py-2 text-sm hover:bg-surface">Settings</Link>
              <button className="block w-full px-3 py-2 text-left text-sm hover:bg-surface" onClick={async () => { await logout(); window.location.href = '/login' }}>Log out</button>
            </div>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 overflow-y-auto border-r border-line bg-surface/60 p-2">
          {project ? (
            <>
              <div className="mb-2 flex items-center gap-2 px-3 py-2"><span className="flex h-8 w-8 items-center justify-center rounded-sm bg-jira text-xs font-bold text-white">{project.key.slice(0, 2)}</span><div><div className="text-sm font-semibold leading-tight">{project.name}</div><div className="text-xs text-ink-soft">Software project</div></div></div>
              {([['board', 'Board'], ['backlog', 'Backlog'], ['sprints', 'Sprints']] as const).map(([k, label]) => (
                <Link key={k} to={`/app/projects/$projectId/${k}`} params={{ projectId: project.id }} className={sideLink} activeProps={sideActive}>{label}</Link>
              ))}
            </>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-bold uppercase text-ink-soft">{workspaceName}</div>
              <Link to="/app" activeOptions={{ exact: true }} className={sideLink} activeProps={sideActive}>Overview</Link>
              <Link to="/app/my-work" className={sideLink} activeProps={sideActive}>Your work</Link>
              <Link to="/app/projects" className={sideLink} activeProps={sideActive}>Projects</Link>
              <Link to="/app/team" className={sideLink} activeProps={sideActive}>Team</Link>
              <Link to="/app/settings/preferences" className={sideLink} activeProps={sideActive}>Settings</Link>
            </>
          )}
        </aside>
        {workspaceId && <CreateIssueModal open={creating} onClose={() => setCreating(false)} workspaceId={workspaceId} projects={projects} defaultProjectId={projectId} />}
        <main className="min-w-0 flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
