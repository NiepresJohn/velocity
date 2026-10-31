import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { activityEvents, users } from '../db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { UnauthorizedError } from '#/lib/errors'

export const getActivityFeed = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const wheres = [eq(activityEvents.workspaceId, data.workspaceId)]
    if (data.projectId) wheres.push(eq(activityEvents.projectId, data.projectId))
    return (await db.select().from(activityEvents).where(and(...wheres)).orderBy(desc(activityEvents.createdAt)).limit(100)).map((r) => ({
      id: r.id, workspaceId: r.workspaceId, projectId: r.projectId, actorId: r.actorId, entityType: r.entityType, entityId: r.entityId, eventType: r.eventType, createdAt: r.createdAt.toISOString(),
    }))
  })

const FIELD: Record<string, string> = { title: 'title', description: 'description', type: 'type', priority: 'priority', assigneeId: 'assignee', estimatePoints: 'story points', dueDate: 'due date', parentIssueId: 'parent' }
const pretty = (v: unknown) => (v == null || v === '' ? 'none' : String(v).replace('_', ' '))

function describeEvent(eventType: string, m: any): string {
  switch (eventType) {
    case 'created': return 'created the issue'
    case 'status_changed': return `changed status from ${pretty(m?.from)} to ${pretty(m?.to)}`
    case 'sprint_changed': return m?.to ? 'moved the issue into a sprint' : 'moved the issue to the backlog'
    case 'archived': return 'archived the issue'
    case 'unarchived': return 'restored the issue'
    case 'updated': {
      const parts = (m?.changedFields ?? []).map((k: string) => {
        const c = m?.changes?.[k]
        const label = FIELD[k] ?? k
        return c && c.from !== undefined && c.to !== undefined ? `${label} from ${pretty(c.from)} to ${pretty(c.to)}` : `${label}`
      })
      return parts.length ? `changed ${parts.join(', ')}` : 'updated the issue'
    }
    default: return eventType.replace(/_/g, ' ')
  }
}

export const getIssueActivity = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const rows = await db.select({ e: activityEvents, actorName: users.name }).from(activityEvents)
      .leftJoin(users, eq(users.id, activityEvents.actorId))
      .where(and(eq(activityEvents.workspaceId, data.workspaceId), eq(activityEvents.entityType, 'issue'), eq(activityEvents.entityId, data.issueId)))
      .orderBy(desc(activityEvents.createdAt))
    return rows.map(({ e, actorName }) => ({
      id: e.id, entityType: e.entityType, eventType: e.eventType, actorName: actorName ?? 'Someone',
      text: describeEvent(e.eventType, e.metadata), createdAt: e.createdAt.toISOString(),
    }))
  })
