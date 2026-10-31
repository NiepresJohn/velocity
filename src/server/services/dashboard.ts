import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues, sprints, projects } from '../db/schema'
import { eq, count, and, lt, gte, lte, ne, desc } from 'drizzle-orm'
import { getMembership } from '#/server/permissions/index'
import { requireSession } from '#/server/auth/guard'
import { NotFoundError, UnauthorizedError } from '#/lib/errors'

export const getWorkspaceDashboard = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const rows = await db.select({ status: issues.status, c: count() }).from(issues).where(eq(issues.workspaceId, data.workspaceId)).groupBy(issues.status)
    const by = (st: string) => Number(rows.find((r) => r.status === st)?.c ?? 0)
    const today = new Date().toISOString().slice(0, 10)
    const [od] = await db.select({ c: count() }).from(issues).where(and(eq(issues.workspaceId, data.workspaceId), ne(issues.status, 'done'), lt(issues.dueDate, today)))
    return { totalIssues: rows.reduce((t, r) => t + Number(r.c), 0), todoCount: by('todo'), inProgressCount: by('in_progress'), doneCount: by('done'), overdueCount: Number(od?.c ?? 0) }
  })

export const getProjectDashboard = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const rows = await db.select().from(projects).where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId))).limit(1)
    if (!rows[0]) throw new NotFoundError('Project not found.')
    const p = rows[0]
    const activeSprint = await db.select().from(sprints).where(and(eq(sprints.projectId, data.projectId), eq(sprints.state, 'active'))).limit(1)
    const statusCounts = await db.select({ status: issues.status, c: count() }).from(issues).where(eq(issues.projectId, data.projectId)).groupBy(issues.status)
    return { project: { ...p, workflowConfig: null as any }, activeSprint: activeSprint[0] ?? null, statusCounts: statusCounts.map(r => ({ ...r, c: Number(r.c) })) }
  })

export const getMyWork = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const mine = and(eq(issues.workspaceId, data.workspaceId), eq(issues.assigneeId, userId), ne(issues.status, 'done'))
    const today = new Date().toISOString().slice(0, 10)
    const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
    const pick = { id: issues.id, projectId: issues.projectId, number: issues.number, title: issues.title, status: issues.status, type: issues.type, priority: issues.priority, dueDate: issues.dueDate }
    const [overdue, upcoming, recent] = await Promise.all([
      db.select(pick).from(issues).where(and(mine, lt(issues.dueDate, today))).orderBy(issues.dueDate).limit(50),
      db.select(pick).from(issues).where(and(mine, gte(issues.dueDate, today), lte(issues.dueDate, soon))).orderBy(issues.dueDate).limit(50),
      db.select(pick).from(issues).where(mine).orderBy(desc(issues.updatedAt)).limit(20),
    ])
    return { overdue, upcoming, recentlyUpdated: recent }
  })
