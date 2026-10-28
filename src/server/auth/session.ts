import { db } from '../db'
import { sessions, users } from '../db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { randomBytes, createHash } from 'crypto'
import { env } from '#/lib/env'

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken() {
  return randomBytes(32).toString('hex')
}

export const SESSION_COOKIE = env.SESSION_COOKIE_NAME
export const WORKSPACE_COOKIE = env.WORKSPACE_COOKIE_NAME

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(userId: string) {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.insert(sessions).values({ userId, tokenHash, expiresAt })
  return { token, expiresAt }
}

export interface SessionResult {
  session: typeof sessions.$inferSelect
  user: typeof users.$inferSelect
}

export async function getSession(token: string): Promise<SessionResult | null> {
  if (!token) return null
  const tokenHash = hashToken(token)
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
  if (rows.length === 0) return null
  const { session, user } = rows[0]
  if (user.disabledAt) return null
  return { session, user }
}

export async function rotateSession(oldToken: string, userId: string) {
  await deleteSession(oldToken)
  return createSession(userId)
}

export async function deleteSession(token: string) {
  if (!token) return
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
