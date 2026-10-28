import { Outlet, createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getCurrentSession, logout } from '#/server/auth/functions'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    const result = await getCurrentSession()
    if (!result) throw redirect({ to: '/login' })
    return { userId: result.user.id, user: { id: result.user.id, name: result.user.name, email: result.user.email } }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-slate-900 text-white flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700 font-bold">Velocity</div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          <Link to="/app" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">Overview</Link>
          <Link to="/app/my-work" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">My Work</Link>
          <Link to="/app/projects" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">Projects</Link>
          <Link to="/app/team" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">Team</Link>
          <Link to="/app/notifications" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">Notifications</Link>
          <Link to="/app/settings/preferences" className="block px-3 py-2 rounded hover:bg-slate-700 text-sm">Settings</Link>
        </nav>
        <form onSubmit={async (e) => { e.preventDefault(); await logout(); window.location.href = '/login' }}>
          <button type="submit" className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-700">Logout</button>
        </form>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white"><h1 className="text-lg font-semibold">Velocity</h1></header>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  )
}
