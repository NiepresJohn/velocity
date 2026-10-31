import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues, sprints, sprintSnapshots as snapshotsTable } from '../db/schema'
import { eq, and, asc, desc, count } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { NotFoundError, UnauthorizedError } from '#/lib/errors'

export const getSprintReport = createServerFn({ method: 'GET' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const [sprint] = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId)))
    if (!sprint) throw new NotFoundError('Sprint not found.')
    // Committed issues at start (snapshots)
    const commitments = await db.select({ id: snapshotsTable.issueId, points: snapshotsTable.estimatePoints }).from(snapshotsTable).where(and(eq(snapshotsTable.sprintId, data.sprintId), eq(snapshotsTable.eventType, 'commitment'))).orderBy(asc(snapshotsTable.createdAt))
    const completedIssues = await db.select({ id: issues.id, estimatePoints: issues.estimatePoints, status: issues.status, number: issues.number }).from(issues)
      .where(eq(issues.sprintId, data.sprintId))
    // Count completed by final status
    const totalCommitted = commitments.length
    const totalCommittedPoints = commitments.reduce((s, c) => s + (c.points ?? 0), 0)
    const completedCount = completedIssues.filter(i => i.status === 'done').length
    const completedPoints = completedIssues.filter(i => i.status === 'done').reduce((s, i) => s + (i.estimatePoints ?? 0), 0)
    const completionRate = totalCommittedPoints > 0 ? (completedPoints / totalCommittedPoints * 100) : 0
    return {
      name: sprint.name, state: sprint.state, goal: sprint.goal,
      startedAt: sprint.startedAt, completedAt: sprint.completedAt,
      committedIssues: totalCommitted, completedIssues: completedCount,
      committedPoints: totalCommittedPoints, completedPoints,
      completionRate: isNaN(completionRate) ? NaN : completionRate,
      incompleteIssues: completedIssues.filter(i => i.status !== 'done'),
    }
  })

export const getVelocityHistory = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const completedSprints = await db.select({ id: sprints.id, name: sprints.name, completedAt: sprints.completedAt, startDate: sprints.startDate, endDate: sprints.endDate }).from(sprints)
      .where(and(eq(sprints.projectId, data.projectId), eq(sprints.state, 'completed')))
      .orderBy(asc(sprints.startedAt)).limit(20)
    const velocity = []
    for (const sprint of completedSprints) {
      // Estimate from snapshot vs completion - simplified: use difference in snapshots
      const sprintCompletion = await db.select({ id: issues.id, estimatePoints: issues.estimatePoints, status: issues.status }).from(issues)
        .where(eq(issues.sprintId, sprint.id))
      const completedPts = sprintCompletion.filter(i => i.status === 'done').reduce((s, i) => s + (i.estimatePoints ?? 0), 0)
      velocity.push({ sprintName: sprint.name, completedAt: sprint.completedAt?.toISOString() || '', completedPoints: completedPts })
    }
    return velocity
  })

export const getBurndown = createServerFn({ method: 'GET' })
  .validator(z.object({ sprintId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const [sprint] = await db.select().from(sprints).where(and(eq(sprints.id, data.sprintId), eq(sprints.workspaceId, data.workspaceId))).limit(1)
    if (!sprint) throw new NotFoundError('Sprint not found.')
    // Remaining points per day = points in sprint minus points completed on or before that day (no future days for actual).
    const rows = await db.select({ points: issues.estimatePoints, completedAt: issues.completedAt }).from(issues).where(eq(issues.sprintId, data.sprintId))
    const total = rows.reduce((t, r) => t + (r.points ?? 0), 0)
    const dailyData: { date: string; ideal: number; actual: number | null }[] = []
    if (sprint.startDate && sprint.endDate) {
      const start = new Date(sprint.startDate)
      const end = new Date(sprint.endDate)
      const span = Math.max(1, end.getTime() - start.getTime())
      const today = new Date().toISOString().slice(0, 10)
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const iso = d.toISOString().slice(0, 10)
        const ideal = Math.round(total * (1 - (d.getTime() - start.getTime()) / span))
        const done = rows.filter((r) => r.completedAt && r.completedAt.toISOString().slice(0, 10) <= iso).reduce((t, r) => t + (r.points ?? 0), 0)
        dailyData.push({ date: iso, ideal, actual: iso > today ? null : total - done })
      }
    }
    return dailyData
  })

export const getIssueDistribution = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), groupBy: z.enum(['status', 'priority', 'type', 'assignee']).default('status') }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const cols: Record<string, any> = {
      status: issues.status, priority: issues.priority, type: issues.type, assignee: issues.assigneeId,
    }
    const result = await db.select({ value: cols[data.groupBy] as any, c: count() }).from(issues).where(eq(issues.projectId, data.projectId)).groupBy(cols[data.groupBy] as any)
    return result.map(r => ({ value: r.value as string, count: Number(r.c) }))
  })
