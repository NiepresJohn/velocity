import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { workspaces, workspaceMembers, workspaceInvitations } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireSession } from '#/server/auth/functions'
import { getMembership, getUserWorkspaces, requireWorkspaceRole } from '#/server/permissions/index'
import { slugify } from '#/lib/utils'
import { randomBytes, createHash } from 'crypto'
import { emailAdapter } from '../email'
import { ConflictError, NotFoundError, UnauthorizedError } from '#/lib/errors'
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
    const slug = slugify(data.name) + '-' + randomBytes(2).toString('hex')
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
    setCookie(WORKSPACE_COOKIE, data.workspaceId, cookieOpts())
    return { ok: true }
  })

export const inviteMember = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid(), email: z.string().transform(v => v.toLowerCase().trim()).pipe(z.string().email()), role: z.enum(['member', 'viewer']).default('member') }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await db.insert(workspaceInvitations).values({ workspaceId: data.workspaceId, emailNormalized: data.email, role: data.role, tokenHash, invitedBy: userId, expiresAt: new Date(Date.now() + 7*24*60*60*1000) })
    const link = `${env.APP_URL}/invite/${token}`
    await emailAdapter.sendInvite(data.email, 'your workspace', 'Admin', link)
    if (isDev) logger.info('invitation.link', { email: data.email, link })
    return { ok: true, link: isDev ? link : undefined }
  })

import { WORKSPACE_COOKIE } from '#/server/auth/session'
import { setCookie, deleteCookie } from '@tanstack/react-start/server'

function cookieOpts() { return { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', maxAge: 60*60*24*7 } }
