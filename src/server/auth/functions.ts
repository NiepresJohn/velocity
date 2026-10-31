import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { users, workspaces, workspaceMembers, passwordResetTokens, sessions as sessionsTable } from '../db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { hashPassword, verifyPassword } from './password'
import { createSession, deleteSession, getSession, SESSION_COOKIE, WORKSPACE_COOKIE, hashToken, randomBytesHex } from './session'
import { env, isProduction, isDev } from '#/lib/env'
import { UnauthenticatedError, NotFoundError, ValidationError, RateLimitedError } from '#/lib/errors'
import { normalizeEmail, normalizeName, slugify } from '#/lib/utils'
import { requireSession } from './guard'
import { rateLimiter } from '../security/rate-limit'
import { logger } from '#/lib/logger'
// lazy so the server-only module never lands in the client graph
const getCookie = async (n: string) => (await import('@tanstack/react-start/server')).getCookie(n)
const setCookie = async (n: string, v: string, o: Parameters<typeof import('@tanstack/react-start/server').setCookie>[2]) => (await import('@tanstack/react-start/server')).setCookie(n, v, o)
const deleteCookie = async (n: string) => (await import('@tanstack/react-start/server')).deleteCookie(n)

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().transform(normalizeEmail).pipe(z.string().email()), password: z.string().min(8).max(128) })
const loginSchema = z.object({ email: z.string().transform(normalizeEmail).pipe(z.string().email()), password: z.string().min(1) })

export const register = createServerFn({ method: 'POST' }).validator(registerSchema).handler(async ({ data }) => {
  if (rateLimiter.isLimited('register', data.email)) throw new RateLimitedError()
  rateLimiter.hit('register', data.email)
  const existing = await db.select().from(users).where(eq(users.email, data.email))
  if (existing.length > 0) return { ok: true as const, requiresLogin: true }
  const passwordHash = await hashPassword(data.password)
  const [user] = await db.insert(users).values({ email: data.email, name: normalizeName(data.name), passwordHash }).returning()
  const slug = slugify(data.name) + '-' + randomBytesHex(2)
  const [workspace] = await db.insert(workspaces).values({ name: `${data.name}'s Workspace`, slug, createdBy: user.id }).returning()
  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'owner' })
  const { token } = await createSession(user.id)
  await setCookie(SESSION_COOKIE, token, cookieOptions())
  await setCookie(WORKSPACE_COOKIE, workspace.id, workspaceCookieOptions())
  logger.info('user.registered', { userId: user.id, workspaceId: workspace.id })
  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name }, workspaceId: workspace.id }
})

export const login = createServerFn({ method: 'POST' }).validator(loginSchema).handler(async ({ data }) => {
  if (rateLimiter.isLimited('login', data.email)) throw new RateLimitedError()
  rateLimiter.hit('login', data.email)
  const rows = await db.select().from(users).where(eq(users.email, data.email))
  const user = rows[0]
  if (!user || user.disabledAt) return { ok: false as const, error: 'Invalid email or password.' }
  const valid = await verifyPassword(data.password, user.passwordHash)
  if (!valid) return { ok: false as const, error: 'Invalid email or password.' }
  await deleteSession(await getCookie(SESSION_COOKIE) ?? '')
  const { token } = await createSession(user.id)
  await setCookie(SESSION_COOKIE, token, cookieOptions())
  const memberships = await db.select({ workspaceId: workspaceMembers.workspaceId }).from(workspaceMembers).where(eq(workspaceMembers.userId, user.id))
  if (memberships.length > 0) await setCookie(WORKSPACE_COOKIE, memberships[0].workspaceId, workspaceCookieOptions())
  logger.info('user.login', { userId: user.id })
  return { ok: true as const, user: { id: user.id, email: user.email, name: user.name } }
})

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  await deleteSession(await getCookie(SESSION_COOKIE) ?? '')
  await deleteCookie(SESSION_COOKIE); await deleteCookie(WORKSPACE_COOKIE)
  return { ok: true }
})

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(async () => {
  return getSession(await getCookie(SESSION_COOKIE) ?? '')
})

export const requestPasswordReset = createServerFn({ method: 'POST' }).validator(z.object({ email: z.string().transform(normalizeEmail).pipe(z.string().email()) })).handler(async ({ data }) => {
  if (rateLimiter.isLimited('reset-request', data.email)) throw new RateLimitedError()
  rateLimiter.hit('reset-request', data.email)
  const rows = await db.select().from(users).where(eq(users.email, data.email))
  const user = rows[0]
  if (user && !user.disabledAt) {
    const token = randomBytesHex(32)
    const tokenHash = await hashToken(token)
    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60*60*1000) })
    if (isDev) logger.info('password.reset-link', { email: data.email, link: `${env.APP_URL}/reset-password?token=${token}` })
  }
  return { ok: true }
})

export const resetPassword = createServerFn({ method: 'POST' }).validator(z.object({ token: z.string(), password: z.string().min(8).max(128) })).handler(async ({ data }) => {
  const tokenHash = await hashToken(data.token)
  const rows = await db.select({ token: passwordResetTokens, user: users }).from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
  const row = rows[0]
  if (!row) throw new NotFoundError('Invalid or expired reset link.')
  const passwordHash = await hashPassword(data.password)
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, row.user.id))
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.token.id))
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, row.user.id))
  })
  logger.info('password.reset', { userId: row.user.id })
  return { ok: true }
})

export const changePassword = createServerFn({ method: 'POST' }).validator(z.object({ currentPassword: z.string(), newPassword: z.string().min(8).max(128) })).handler(async ({ data }) => {
  const { userId } = await requireSession()
  const rows = await db.select().from(users).where(eq(users.id, userId))
  if (!rows[0]) throw new NotFoundError()
  const valid = await verifyPassword(data.currentPassword, rows[0].passwordHash)
  if (!valid) throw new ValidationError('Current password is incorrect.')
  const passwordHash = await hashPassword(data.newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  return { ok: true }
})

export const deactivateAccount = createServerFn({ method: 'POST' }).validator(z.object({ password: z.string(), confirmText: z.string() })).handler(async ({ data }) => {
  if (data.confirmText !== 'DELETE') throw new ValidationError('Type DELETE to confirm.')
  const { userId } = await requireSession()
  const rows = await db.select().from(users).where(eq(users.id, userId))
  if (!rows[0]) throw new NotFoundError()
  const valid = await verifyPassword(data.password, rows[0].passwordHash)
  if (!valid) throw new ValidationError('Password is incorrect.')
  await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId))
  await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, userId))
  const token = await getCookie(SESSION_COOKIE)
  if (token) await deleteSession(token)
  await deleteCookie(SESSION_COOKIE); await deleteCookie(WORKSPACE_COOKIE)
  return { ok: true }
})


function cookieOptions() { return { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: isProduction, maxAge: 60*60*24*7 } }
function workspaceCookieOptions() { return { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: isProduction, maxAge: 60*60*24*7 } }
