import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { users, sessions, workspaces, workspaceMembers, workspaceInvitations, userPreferences } from '../db/schema'
import { eq, and, isNull, gt, ne } from 'drizzle-orm'
import { requireSession, getAuthenticatedUser } from '#/server/auth/guard'
import { hashToken, WORKSPACE_COOKIE } from '#/server/auth/session'
import { requireMembership, requireWorkspaceRole } from '#/server/permissions/index'
import { checkRoleChange } from '#/lib/roles'
import { ForbiddenError, NotFoundError, ValidationError } from '#/lib/errors'
import { env } from '#/lib/env'

const ws = z.object({ workspaceId: z.string().uuid() })

// ---- profile ----
export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { user } = await requireSession()
  return { name: user.name, email: user.email, timezone: user.timezone ?? 'UTC', avatarUrl: user.avatarUrl ?? '' }
})

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string().trim().min(2).max(80),
    timezone: z.string().max(64).refine((tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false } }, 'Unknown timezone'),
    avatarUrl: z.string().trim().max(500).refine((u) => u === '' || /^https?:\/\//i.test(u), 'Avatar must be an http(s) URL'),
  }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await db.update(users).set({ name: data.name, timezone: data.timezone, avatarUrl: data.avatarUrl || null, updatedAt: new Date() }).where(eq(users.id, userId))
    return { ok: true }
  })

// ---- preferences ----
export const getPreferences = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await requireSession()
  const [p] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
  return { theme: p?.theme ?? 'system', compactDensity: p?.compactDensity ?? false }
})

export const updatePreferences = createServerFn({ method: 'POST' })
  .validator(z.object({ theme: z.enum(['system', 'light', 'dark']), compactDensity: z.boolean() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await db.insert(userPreferences).values({ userId, ...data })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { ...data, updatedAt: new Date() } })
    return { ok: true }
  })

// ---- sessions ----
export const listSessions = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, sessionId } = await requireSession()
  const rows = await db.select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt })
    .from(sessions).where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date()))).orderBy(sessions.createdAt)
  return rows.map((r) => ({ ...r, current: r.id === sessionId }))
})

export const revokeOtherSessions = createServerFn({ method: 'POST' }).handler(async () => {
  const { userId, sessionId } = await requireSession()
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, sessionId)))
  return { ok: true }
})

// ---- members ----
export const listMembersDetailed = createServerFn({ method: 'GET' }).validator(ws).handler(async ({ data }) => {
  const { userId } = await requireSession()
  const me = await requireMembership(userId, data.workspaceId)
  const members = await db.select({ userId: users.id, name: users.name, email: users.email, role: workspaceMembers.role, joinedAt: workspaceMembers.joinedAt })
    .from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, data.workspaceId)).orderBy(users.name)
  const canManage = me.role === 'owner' || me.role === 'admin'
  const invitations = canManage
    ? await db.select({ id: workspaceInvitations.id, email: workspaceInvitations.emailNormalized, role: workspaceInvitations.role, expiresAt: workspaceInvitations.expiresAt })
        .from(workspaceInvitations).where(and(eq(workspaceInvitations.workspaceId, data.workspaceId), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date())))
    : []
  return { myUserId: userId, myRole: me.role, members, invitations }
})

async function loadTarget(tx: Pick<typeof db, 'select'>, workspaceId: string, targetUserId: string) {
  // FOR UPDATE serialises concurrent owner changes
  const rows = await tx.select({ userId: workspaceMembers.userId, role: workspaceMembers.role }).from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId)).for('update')
  const target = rows.find((r) => r.userId === targetUserId)
  if (!target) throw new NotFoundError('Member not found.')
  return { target, ownerCount: rows.filter((r) => r.role === 'owner').length }
}

export const changeMemberRole = createServerFn({ method: 'POST' })
  .validator(ws.extend({ targetUserId: z.string().uuid(), role: z.enum(['admin', 'member', 'viewer']) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const me = await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    await db.transaction(async (tx) => {
      const { target, ownerCount } = await loadTarget(tx, data.workspaceId, data.targetUserId)
      const err = checkRoleChange(me.role, target.role, data.role, ownerCount)
      if (err) throw new ForbiddenError(err)
      await tx.update(workspaceMembers).set({ role: data.role, updatedAt: new Date() })
        .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, data.targetUserId)))
    })
    return { ok: true }
  })

export const removeMember = createServerFn({ method: 'POST' })
  .validator(ws.extend({ targetUserId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const me = await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    await db.transaction(async (tx) => {
      const { target, ownerCount } = await loadTarget(tx, data.workspaceId, data.targetUserId)
      const err = checkRoleChange(me.role, target.role, null, ownerCount)
      if (err) throw new ForbiddenError(err)
      await tx.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, data.targetUserId)))
    })
    return { ok: true }
  })

export const transferOwnership = createServerFn({ method: 'POST' })
  .validator(ws.extend({ targetUserId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireWorkspaceRole(userId, data.workspaceId, ['owner'])
    if (data.targetUserId === userId) throw new ValidationError('You already own this workspace.')
    await db.transaction(async (tx) => {
      await loadTarget(tx, data.workspaceId, data.targetUserId)
      const set = (role: 'owner' | 'admin', uid: string) => tx.update(workspaceMembers).set({ role, updatedAt: new Date() })
        .where(and(eq(workspaceMembers.workspaceId, data.workspaceId), eq(workspaceMembers.userId, uid)))
      await set('owner', data.targetUserId)
      await set('admin', userId)
    })
    return { ok: true }
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .validator(ws.extend({ invitationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await requireWorkspaceRole(userId, data.workspaceId, ['owner', 'admin'])
    await db.update(workspaceInvitations).set({ revokedAt: new Date() })
      .where(and(eq(workspaceInvitations.id, data.invitationId), eq(workspaceInvitations.workspaceId, data.workspaceId), isNull(workspaceInvitations.acceptedAt)))
    return { ok: true }
  })

// ---- workspace settings ----
export const getWorkspaceSettings = createServerFn({ method: 'GET' }).validator(ws).handler(async ({ data }) => {
  const { userId } = await requireSession()
  const me = await requireMembership(userId, data.workspaceId)
  const [w] = await db.select({ name: workspaces.name, description: workspaces.description }).from(workspaces).where(eq(workspaces.id, data.workspaceId))
  const mine = await db.select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.role }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt))).orderBy(workspaces.name)
  return { name: w?.name ?? '', description: w?.description ?? '', myRole: me.role, workspaces: mine }
})

// ---- invitations (accept flow) ----
async function findInvite(token: string) {
  const [row] = await db.select({ inv: workspaceInvitations, wsName: workspaces.name }).from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(eq(workspaceInvitations.tokenHash, await hashToken(token)))
  return row
}
function inviteProblem(row: Awaited<ReturnType<typeof findInvite>>): string | null {
  if (!row) return 'This invitation link is not valid.'
  if (row.inv.revokedAt) return 'This invitation was revoked.'
  if (row.inv.acceptedAt) return 'This invitation was already used.'
  if (row.inv.expiresAt < new Date()) return 'This invitation has expired.'
  return null
}

export const getInvitePreview = createServerFn({ method: 'GET' }).validator(z.object({ token: z.string().max(200) })).handler(async ({ data }) => {
  const row = await findInvite(data.token)
  const user = await getAuthenticatedUser()
  const problem = inviteProblem(row)
  if (problem || !row) return { ok: false as const, error: problem ?? 'Invalid invitation.' }
  return { ok: true as const, loggedIn: !!user, workspaceName: row.wsName, email: row.inv.emailNormalized, role: row.inv.role, emailMatches: user?.email.toLowerCase() === row.inv.emailNormalized }
})

export const acceptInvite = createServerFn({ method: 'POST' }).validator(z.object({ token: z.string().max(200) })).handler(async ({ data }) => {
  const { user } = await requireSession()
  const row = await findInvite(data.token)
  const problem = inviteProblem(row)
  if (problem || !row) throw new ValidationError(problem ?? 'Invalid invitation.')
  if (user.email.toLowerCase() !== row.inv.emailNormalized) throw new ForbiddenError(`This invitation was sent to ${row.inv.emailNormalized}. Sign in with that account.`)
  await db.transaction(async (tx) => {
    // conditional update makes a double-submit accept only once
    const claimed = await tx.update(workspaceInvitations).set({ acceptedAt: new Date() })
      .where(and(eq(workspaceInvitations.id, row.inv.id), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt))).returning({ id: workspaceInvitations.id })
    if (claimed.length === 0) throw new ValidationError('This invitation was already used.')
    await tx.insert(workspaceMembers).values({ workspaceId: row.inv.workspaceId, userId: user.id, role: row.inv.role }).onConflictDoNothing()
  })
  const { setCookie } = await import('@tanstack/react-start/server')
  setCookie(WORKSPACE_COOKIE, row.inv.workspaceId, { httpOnly: true, path: '/', sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 })
  return { ok: true }
})
