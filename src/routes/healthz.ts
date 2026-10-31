import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '#/server/db'

// Readiness probe: reports only up/down, never config or error details.
export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: async () => {
        try { await db.execute(sql`select 1`); return Response.json({ ok: true }) }
        catch { return Response.json({ ok: false }, { status: 503 }) }
      },
    },
  },
})
