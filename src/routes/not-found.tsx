import { createFileRoute, Link } from '@tanstack/react-router'
import { StatusPage, btnPrimary, btnSecondary } from '#/components/auth-ui'

export function NotFoundPage() {
  return (
    <StatusPage code="404" title="Page not found" text="The page you are looking for does not exist or you do not have access to it.">
      <Link to="/app" className={btnPrimary}>Go to your work</Link>
      <Link to="/" className={btnSecondary}>Home</Link>
    </StatusPage>
  )
}
export const Route = createFileRoute('/not-found')({ component: NotFoundPage })
