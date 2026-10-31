import { createFileRoute, useRouter } from '@tanstack/react-router'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '#/server/services/notifications'

export const Route = createFileRoute('/app/notifications')({
  loader: async ({ context }) => context.workspaceId ? listNotifications({ data: { workspaceId: context.workspaceId } }) : [],
  component: NotificationsPage,
})

function NotificationsPage() {
  const items = Route.useLoaderData() as { id: string; type: string; readAt: string | null; createdAt: string }[]
  const { workspaceId } = Route.useRouteContext()
  const router = useRouter()
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center"><h1 className="flex-1 text-2xl font-medium">Notifications</h1>
        {workspaceId && items.some((n) => !n.readAt) && <button className="text-sm text-jira hover:underline" onClick={async () => { await markAllNotificationsRead({ data: { workspaceId } }); await router.invalidate() }}>Mark all as read</button>}
      </div>
      {items.length === 0 ? <p className="text-ink-soft">You're all caught up.</p> : (
        <ul>{items.map((n) => (
          <li key={n.id} className={`flex items-center gap-3 border-b border-line px-2 py-3 text-sm ${n.readAt ? 'text-ink-soft' : 'font-medium'}`}>
            <span className="flex-1 capitalize">{n.type.replace(/_/g, ' ')}</span><time className="text-xs font-normal text-ink-soft">{new Date(n.createdAt).toLocaleString()}</time>
            {!n.readAt && <button className="text-xs font-normal text-jira hover:underline" onClick={async () => { await markNotificationRead({ data: { notificationId: n.id } }); await router.invalidate() }}>Mark read</button>}
          </li>))}
        </ul>
      )}
    </div>
  )
}
