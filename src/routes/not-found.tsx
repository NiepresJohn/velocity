import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/not-found')({ component: NotFoundPage })
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-gray-600">Page not found.</p>
        <a href="/" className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 inline-block">Go Home</a>
      </div>
    </div>
  )
}
