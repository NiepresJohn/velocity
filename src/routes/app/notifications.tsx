import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/notifications')({ component: NotificationsPage })

function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">No notifications yet.</div>
    </div>
  )
}
