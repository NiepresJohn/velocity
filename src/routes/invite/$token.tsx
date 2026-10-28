import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/invite/$token')({ component: InvitePage })
function InvitePage() {
  const [status] = useState<'loading' | 'success'>('loading')
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'loading' && <p>Loading invitation...</p>}
      </div>
    </div>
  )
}
