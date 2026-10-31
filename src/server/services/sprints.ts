import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { projects as projectsTable, sprints, issues, issueEvents, sprintSnapshots } from '../db/schema'
import { eq, and, asc, desc, isNull, inArray, sql, or, ne } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { ConflictError, NotFoundError, UnauthorizedError } from '#/lib/errors'
import { logger } from '#/lib/logger'

export const listSprints = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), state: z.enum(['planned', 'active', 'completed', 'cancelled']).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const wheres = [eq(sprints.projectId, data.projectId), eq(sprints.workspaceId, data.workspaceId)]
    if (data.state) wheres.push(eq(sprints.state, data.state))
    else wheres.push(or(eq(sprints.state, 'active'), eq(sprints.state, 'planned')) as any)
    return await db.select().from(sprints).where(and(...wheres)).orderBy(desc(sprints.createdAt))
  })

export const getSprint = createServerFn({ method: 'GET' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const row = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!row[0]) throw new NotFoundError('Sprint not found.')
    return row[0]
  })

export const createSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), name: z.string().min(2).max(100).trim(), goal: z.string().max(500).optional(), startDate: z.string().date().or(z.date()), endDate: z.string().date().or(z.date()) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const [proj] = await db.select({ id: projectsTable.id }).from(projectsTable).where(and(eq(projectsTable.id, data.projectId), eq(projectsTable.workspaceId, data.workspaceId))).limit(1)
    if (!proj) throw new NotFoundError('Project not found.')
    // Check: at most one active/planned sprint per project
    const active = await db.select().from(sprints).where(and(eq(sprints.projectId, data.projectId), or(eq(sprints.state, 'active'), eq(sprints.state, 'planned'))))
    if (active.length >= 3) throw new ConflictError('Maximum 3 concurrent planned/sprint sprints allowed.')
    const [sprint] = await db.insert(sprints).values({
      workspaceId: data.workspaceId, projectId: data.projectId, name: data.name, goal: data.goal || null,
      startDate: typeof data.startDate === 'string' ? data.startDate : data.startDate.toISOString().slice(0,10),
      endDate: typeof data.endDate === 'string' ? data.endDate : data.endDate.toISOString().slice(0,10),
      state: 'planned', createdBy: userId,
    }).returning()
    logger.info('sprint.created', { userId, sprintId: sprint.id })
    return sprint
  })

export const updateSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid(), name: z.string().min(2).max(100).trim().optional(), goal: z.string().max(500).optional(), startDate: z.string().date().or(z.date()).optional(), endDate: z.string().date().or(z.date()).optional(), retrospectiveNotes: z.string().max(5000).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Sprint not found.')
    if (existing[0].state !== 'planned') throw new ConflictError('Only planned sprints can be edited.')
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.goal !== undefined) updates.goal = data.goal
    if (data.startDate !== undefined) updates.startDate = new Date(data.startDate)
    if (data.endDate !== undefined) updates.endDate = new Date(data.endDate)
    if (data.retrospectiveNotes !== undefined) updates.retrospectiveNotes = data.retrospectiveNotes
    if (Object.keys(updates).length > 0) updates.updatedAt = new Date()
    if (Object.keys(updates).length === 0) return { ok: true }
    await db.update(sprints).set(updates).where(eq(sprints.id, data.sprintId))
    return { ok: true }
  })

export const startSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Sprint not found.')
    if (existing[0].state !== 'planned') throw new ConflictError('Only planned sprints can be started.')
    // Create snapshot of current commitment
    const committedIssues = await db.select({ id: issues.id, estimatePoints: issues.estimatePoints }).from(issues)
      .where(eq(issues.sprintId, data.sprintId))
    await db.transaction(async (tx) => {
      await tx.update(sprints).set({ state: 'active', startedAt: new Date(), updatedAt: new Date() }).where(eq(sprints.id, data.sprintId))
      // Snapshot each committed issue
      for (const iss of committedIssues) {
        await tx.insert(sprintSnapshotsTable).values({ sprintId: data.sprintId, issueId: iss.id, eventType: 'commitment', estimatePoints: iss.estimatePoints ?? 0 })
      }
      await tx.insert(issueEvents).values({
        workspaceId: data.workspaceId, projectId: existing[0].projectId, issueId: data.sprintId, actorId: userId,
        eventType: 'sprint_started', payload: null,
      })
    })
    logger.info('sprint.started', { userId, sprintId: data.sprintId })
    return { ok: true }
  })

export const completeSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid(), moveIncompleteToBacklog: z.boolean().default(true) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Sprint not found.')
    if (existing[0].state !== 'active') throw new ConflictError('Only active sprints can be completed.')
    // "Incomplete" = anything not done (the old code only counted status 'todo').
    const incomplete = await db.select({ id: issues.id }).from(issues).where(and(eq(issues.sprintId, data.sprintId), ne(issues.status, 'done')))
    await db.transaction(async (tx) => {
      for (const iss of incomplete) {
        await tx.insert(sprintSnapshotsTable).values({ sprintId: data.sprintId, issueId: iss.id, eventType: 'incomplete_snapshot', estimatePoints: 0 })
      }
      await tx.update(sprints).set({ state: 'completed', completedAt: new Date(), updatedAt: new Date() }).where(eq(sprints.id, data.sprintId))
      if (data.moveIncompleteToBacklog && incomplete.length) {
        await tx.update(issues).set({ sprintId: null, updatedAt: new Date() }).where(and(eq(issues.sprintId, data.sprintId), ne(issues.status, 'done')))
      }
    })
    logger.info('sprint.completed', { userId, sprintId: data.sprintId })
    return { ok: true, incompleteCount: incomplete.length }
  })

export const cancelSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Sprint not found.')
    await db.update(sprints).set({ state: 'cancelled', updatedAt: new Date() }).where(eq(sprints.id, data.sprintId))
    return { ok: true }
  })

// Import helper table
import { sprintSnapshots as sprintSnapshotsTable } from '../db/schema'
