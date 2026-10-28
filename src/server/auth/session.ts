import { db } from '../db'
import { sessions, users } from '../db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { env } from '#/lib/env'

export const SESSION_COOKIE = env.SESSION_COOKIE_NAME
export const WORKSPACE_COOKIE = env.WORKSPACE_COOKIE_NAME

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Pure WebCrypto implementation — works in both Node.js 18+ and all modern browsers
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomBytesHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(userId: string) {
  const token = generateToken()
  const tokenHash = await hashToken(token)
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
  const tokenHash = await hashToken(token)
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
  const tokenHash = await hashToken(token)
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
