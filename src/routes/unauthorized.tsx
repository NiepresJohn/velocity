import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/unauthorized')({ component: UnauthorizedPage })
function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Unauthorized</h1>
        <p className="text-gray-600">You do not have access to this resource.</p>
        <a href="/app" className="text-indigo-600 underline">Go Home</a>
      </div>
    </div>
  )
}
