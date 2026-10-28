import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/logs')({
  component: Logs,
})

function Logs() {
  return <div>Logs</div>
}
