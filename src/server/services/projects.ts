import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq, and, or, asc, like, isNull } from 'drizzle-orm'
import { requireSession } from '#/server/auth/functions'
import { requireMembership } from '#/server/permissions/index'
import { ConflictError, NotFoundError, UnauthorizedError } from '#/lib/errors'
import { logger } from '#/lib/logger'

export const listProjects = createServerFn({ method: 'GET' })
  .validator(z.object({
    workspaceId: z.string().uuid(),
    status: z.enum(['active', 'archived']).optional(),
    q: z.string().max(100).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await requireMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const whereClauses = [eq(projects.workspaceId, data.workspaceId)]
    if (data.status) whereClauses.push(eq(projects.status, data.status))
    else whereClauses.push(isNull(projects.archivedAt))
    if (data.q) whereClauses.push(or(like(projects.name, `%${data.q}%`), like(projects.key, `%${data.q.toUpperCase()}%`)) as any)
    const offset = (data.page - 1) * data.pageSize
    const rows = await db.select().from(projects)
      .where(and(...whereClauses))
      .orderBy(asc(projects.name))
      .limit(data.pageSize)
      .offset(offset)
    return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), archivedAt: r.archivedAt?.toISOString() ?? null, workflowConfig: null } as const))
  })

export const getProject = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await requireMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const row = await db.select().from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
      .limit(1)
    if (!row[0]) throw new NotFoundError('Project not found.')
    const p = row[0]
    return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), archivedAt: p.archivedAt?.toISOString() ?? null, workflowConfig: null }
  })

export const createProject = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid(), name: z.string().min(2).max(100).trim(), key: z.string().min(2).max(10).toUpperCase(), description: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    // Check uniqueness
    const existing = await db.select().from(projects)
      .where(and(eq(projects.workspaceId, data.workspaceId), eq(projects.key, data.key.toUpperCase())))
    if (existing.length > 0) throw new ConflictError('Project key already exists.')
    const [project] = await db.insert(projects).values({
      workspaceId: data.workspaceId, name: data.name, key: data.key.toUpperCase(), description: data.description, createdBy: userId,
    }).returning()
    // Create sequence
    await db.insert(projectSequencesTable).values({ projectId: project.id, nextIssueNumber: 1 })
    logger.info('project.created', { userId, projectId: project.id })
    return { ...project, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(), archivedAt: project.archivedAt?.toISOString() ?? null, workflowConfig: null }
  })

export const updateProject = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), name: z.string().min(2).max(100).trim().optional(), description: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (Object.keys(updates).length > 0) updates.updatedAt = new Date()
    if (Object.keys(updates).length === 0) return { ok: true }
    await db.update(projects).set(updates)
      .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
    return { ok: true }
  })

export const archiveProject = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    await db.transaction(async (tx) => {
      await tx.update(projects).set({ status: 'archived', archivedAt: new Date() }).where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
    })
    logger.info('project.archived', { userId, projectId: data.projectId })
    return { ok: true }
  })

export const restoreProject = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    await db.update(projects).set({ status: 'active', archivedAt: null }).where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
    return { ok: true }
  })

// Import needed tables inline
import { projectSequences as projectSequencesTable } from '../db/schema'
