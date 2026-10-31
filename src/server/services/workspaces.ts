import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { workspaces, workspaceMembers, workspaceInvitations, projects } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { hashToken, randomBytesHex } from '#/server/auth/session'
import { requireMembership, getUserWorkspaces, requireWorkspaceRole } from '#/server/permissions/index'
import { ConflictError } from '#/lib/errors'
import { slugify } from '#/lib/utils'
import { emailAdapter } from '../email'
import { NotFoundError, UnauthorizedError } from '#/lib/errors'
import { env, isDev } from '#/lib/env'
import { logger } from '#/lib/logger'

export const listWorkspaces = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await requireSession()
  return (await getUserWorkspaces(userId)).map((m) => ({ id: m.workspaceId, role: m.role }))
})

export const createWorkspace = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(2).max(80).trim() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const slug = slugify(data.name) + '-' + randomBytesHex(2)
    const [workspace] = await db.insert(workspaces).values({ name: data.name, slug, createdBy: userId }).returning()
    await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: 'owner' })
    logger.info('workspace.created', { userId, workspaceId: workspace.id })
    return { id: workspace.id, name: workspace.name, slug: workspace.slug }
  })

export const updateWorkspace = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid(), name: z.string().min(2).max(80).trim().optional(), description: z.string().max(500).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (Object.keys(updates).length > 0) updates.updatedAt = new Date()
    if (Object.keys(updates).length > 0) await db.update(workspaces).set(updates).where(and(eq(workspaces.id, data.workspaceId), isNull(workspaces.deletedAt)))
    return { ok: true }
  })

export const switchWorkspace = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    await (await import('@tanstack/react-start/server')).setCookie(WORKSPACE_COOKIE, data.workspaceId, cookieOpts())
    return { ok: true }
  })

export const inviteMember = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid(), email: z.string().transform(v => v.toLowerCase().trim()).pipe(z.string().email()), role: z.enum(['member', 'viewer']).default('member') }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    const token = randomBytesHex(32)
    const tokenHash = await hashToken(token)
    await db.insert(workspaceInvitations).values({ workspaceId: data.workspaceId, emailNormalized: data.email, role: data.role, tokenHash, invitedBy: userId, expiresAt: new Date(Date.now() + 7*24*60*60*1000) })
    const link = `${env.APP_URL}/invite/${token}`
    await emailAdapter.sendInvite(data.email, 'your workspace', 'Admin', link)
    if (isDev) logger.info('invitation.link', { email: data.email, link })
    return { ok: true, link: isDev ? link : undefined }
  })

import { WORKSPACE_COOKIE } from '#/server/auth/session'
function cookieOpts() { return { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', maxAge: 60*60*24*7 } }

// Active workspace (cookie, falling back to first membership) + its projects, for the app shell.
export const getAppContext = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await requireSession()
  const { getCookie } = await import('@tanstack/react-start/server')
  const memberships = await getUserWorkspaces(userId)
  const wanted = getCookie(WORKSPACE_COOKIE)
  const active = memberships.find((m) => m.workspaceId === wanted) ?? memberships[0]
  if (!active) return { workspaceId: null, workspaceName: null, projects: [] as { id: string; name: string; key: string }[] }
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, active.workspaceId))
  const rows = await db.select({ id: projects.id, name: projects.name, key: projects.key }).from(projects)
    .where(and(eq(projects.workspaceId, active.workspaceId), isNull(projects.archivedAt))).orderBy(projects.name)
  return { workspaceId: active.workspaceId, workspaceName: ws?.name ?? '', projects: rows }
})

export const listMembers = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireMembership(userId, data.workspaceId)
    const { users } = await import('../db/schema')
    return db.select({ id: users.id, name: users.name, email: users.email, role: workspaceMembers.role })
      .from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, data.workspaceId)).orderBy(users.name)
  })
