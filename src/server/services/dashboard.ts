import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues, sprints, projects } from '../db/schema'
import { eq, count, and } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { NotFoundError } from '#/lib/errors'

export const getWorkspaceDashboard = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data: _data }) => {
    await requireSession()
    return { totalIssues: 0, todoCount: 0, inProgressCount: 0, doneCount: 0, overdueCount: 0, recentActivity: [] as string[] }
  })

export const getProjectDashboard = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    const rows = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1)
    if (!rows[0]) throw new NotFoundError('Project not found.')
    const p = rows[0]
    const activeSprint = await db.select().from(sprints).where(and(eq(sprints.projectId, data.projectId), eq(sprints.state, 'active'))).limit(1)
    const statusCounts = await db.select({ status: issues.status, c: count() }).from(issues).where(eq(issues.projectId, data.projectId)).groupBy(issues.status)
    return { project: { ...p, workflowConfig: null as any }, activeSprint: activeSprint[0] ?? null, statusCounts: statusCounts.map(r => ({ ...r, c: Number(r.c) })) }
  })

export const getMyWork = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid(), assigneeId: z.string().uuid() }))
  .handler(async () => {
    return { overdue: [], upcoming: [], recentlyUpdated: [] }
  })
