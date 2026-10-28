import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { activityEvents } from '../db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { requireSession } from '#/server/auth/functions'

export const getActivityFeed = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    await requireSession()
    const wheres = [eq(activityEvents.workspaceId, data.workspaceId)]
    if (data.projectId) wheres.push(eq(activityEvents.projectId, data.projectId))
    return (await db.select().from(activityEvents).where(and(...wheres)).orderBy(desc(activityEvents.createdAt)).limit(100)).map((r) => ({
      id: r.id, workspaceId: r.workspaceId, projectId: r.projectId, actorId: r.actorId, entityType: r.entityType, entityId: r.entityId, eventType: r.eventType, createdAt: r.createdAt.toISOString(),
    }))
  })

export const getIssueActivity = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return (await db.select().from(activityEvents)
      .where(and(eq(activityEvents.workspaceId, data.workspaceId), eq(activityEvents.entityType, 'issue'), eq(activityEvents.entityId, data.issueId)))
      .orderBy(asc(activityEvents.createdAt))).map((r) => ({ id: r.id, entityType: r.entityType, eventType: r.eventType, createdAt: r.createdAt.toISOString() }))
  })
