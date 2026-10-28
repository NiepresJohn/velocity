import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/board')({
  component: Board,
})

function Board() {
  return <div>Board</div>
}
