import { db } from '../db'
import { workspaceMembers } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { ForbiddenError } from '#/lib/errors'

export interface Membership { id: string; workspaceId: string; userId: string; role: string }

export async function getMembership(userId: string, workspaceId: string): Promise<Membership | null> {
  const rows = await db.select().from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
  return (rows[0] as unknown as Membership) ?? null
}

export function canRole(role: string, ...allowed: string[]): boolean { return allowed.includes(role) }

export async function requireWorkspaceRole(userId: string, workspaceId: string, roles: string[]) {
  const membership = await getMembership(userId, workspaceId)
  if (!membership || !canRole(membership.role, ...roles)) throw new ForbiddenError('Insufficient permissions.')
  return membership
}

export async function requireMembership(userId: string, workspaceId: string): Promise<Membership> {
  const m = await getMembership(userId, workspaceId)
  if (!m) throw new Error('Access denied.')
  return m
}

export async function getUserWorkspaces(userId: string): Promise<Membership[]> {
  const rows = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, userId))
  return rows as unknown as Membership[]
}
