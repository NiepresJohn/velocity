import { createFileRoute, Link } from '@tanstack/react-router'
import { StatusPage, btnPrimary, btnSecondary } from '#/components/auth-ui'

export const Route = createFileRoute('/unauthorized')({ component: UnauthorizedPage })
function UnauthorizedPage() {
  return (
    <StatusPage code="403" title="No access" text="You do not have permission to view this page. Ask a workspace admin for access, or sign in with a different account.">
      <Link to="/app" className={btnPrimary}>Back to Velocity</Link>
      <Link to="/login" className={btnSecondary}>Switch account</Link>
    </StatusPage>
  )
}
