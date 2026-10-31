import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues, issueLabels, issueLabelLinks, projectSequences as seqTable, activityEvents, notifications, users as usersTable } from '../db/schema'
import { eq, and, or, asc, desc, like, inArray, isNull } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { ConflictError, NotFoundError, UnauthorizedError } from '#/lib/errors'
import { renderMarkdown } from '#/lib/markdown'
import { logger } from '#/lib/logger'

// --- Issue CRUD ---

export const listIssues = createServerFn({ method: 'GET' })
  .validator(z.object({
    projectId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    type: z.array(z.string()).optional(),
    assigneeId: z.string().uuid().optional(),
    labelIds: z.array(z.string().uuid()).optional(),
    sprintId: z.string().uuid().optional(),
    q: z.string().max(200).optional(),
    sortField: z.enum(['rank', 'priority', 'created_at', 'updated_at', 'due_date', 'estimate_points']).default('rank'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    // Build where clauses
    const wheres = [eq(issues.projectId, data.projectId)]
    if (data.status?.length) wheres.push(inArray(issues.status, data.status as any))
    if (data.priority?.length) wheres.push(inArray(issues.priority, data.priority as any))
    if (data.type?.length) wheres.push(inArray(issues.type, data.type as any))
    if (data.assigneeId) wheres.push(eq(issues.assigneeId, data.assigneeId))
    if (data.sprintId) wheres.push(eq(issues.sprintId, data.sprintId))
    if (data.q) {
      const qLower = `%${data.q.toLowerCase()}%`
      wheres.push(or(like(issues.title, qLower), like(issues.description, qLower)) as any)
    }
    const fieldMap: Record<string, any> = {
      rank: issues.rank, priority: issues.priority, created_at: issues.createdAt, updated_at: issues.updatedAt, due_date: issues.dueDate, estimate_points: issues.estimatePoints,
    }
    const orderFn = data.sortOrder === 'asc' ? asc : desc
    const queryBuilder = db.select({ issue: issues, labels: issueLabels })
      .from(issues)
      .leftJoin(issueLabelLinks, eq(issueLabelLinks.issueId, issues.id))
      .leftJoin(issueLabels, eq(issueLabels.id, issueLabelLinks.labelId))
      .where(and(...wheres))
      .orderBy(orderFn(fieldMap[data.sortField] || issues.rank))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize)
    const rows = await queryBuilder
    // Group by issue
    const issuesMap = new Map<string, any>()
    for (const row of rows) {
      const key = row.issue.id
      if (!issuesMap.has(key)) issuesMap.set(key, { ...row.issue, labels: [] })
      if (row.labels) issuesMap.get(key).labels.push(row.labels)
    }
    const issuesList = Array.from(issuesMap.values())
    return { issues: issuesList, total: issuesList.length, page: data.page, pageSize: data.pageSize }
  })

export const getIssue = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const row = await db.select({ issue: issues, reporter: usersTable }).from(issues)
      .leftJoin(usersTable, eq(usersTable.id, issues.reporterId))
      .where(and(eq(issues.id, data.issueId), eq(issues.workspaceId, data.workspaceId)))
      .limit(1)
    if (!row[0]) throw new NotFoundError('Issue not found.')
    const { issue, reporter } = row[0]
    return { ...issue, renderedDescription: renderMarkdown(issue.description || ''), reporterName: reporter?.name }
  })

export const createIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), title: z.string().min(3).max(200).trim(), description: z.string().max(10000).optional().default(''), type: z.enum(['story', 'task', 'bug', 'epic']).default('task'), priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).default('medium'), status: z.string().default('todo'), assigneeId: z.string().uuid().optional(), sprintId: z.string().uuid().optional(), estimatePoints: z.number().int().min(0).optional(), dueDate: z.string().date().or(z.date()).optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    let issueNumber = 1
    let issueId = ''
    await db.transaction(async (tx) => {
      const seq = await tx.select().from(seqTable).where(eq(seqTable.projectId, data.projectId)).for('update').limit(1)
      if (!seq[0]) await tx.insert(seqTable).values({ projectId: data.projectId, nextIssueNumber: 1 })
      const nextSeq = await tx.select().from(seqTable).where(eq(seqTable.projectId, data.projectId)).for('update').limit(1)
      issueNumber = nextSeq[0].nextIssueNumber
      await tx.update(seqTable).set({ nextIssueNumber: issueNumber + 1 }).where(eq(seqTable.projectId, data.projectId))
      const now = new Date()
      const [issue] = await tx.insert(issues).values({
        projectId: data.projectId, workspaceId: data.workspaceId, number: issueNumber, title: data.title,
        description: data.description, type: data.type, priority: data.priority, status: data.status,
        assigneeId: data.assigneeId ?? null, sprintId: data.sprintId ?? null, estimatePoints: data.estimatePoints ?? null,
        dueDate: typeof data.dueDate === 'string' ? data.dueDate : (data.dueDate instanceof Date ? data.dueDate.toISOString().slice(0, 10) : null), rank: 0, createdAt: now, updatedAt: now, reporterId: userId,
      }).returning()
      issueId = issue.id
      // Insert activity event
      await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: data.projectId, actorId: userId, entityType: 'issue', entityId: issue.id, eventType: 'created', metadata: { title: data.title } })
      // Notify assignee
      if (data.assigneeId && data.assigneeId !== userId) {
        await tx.insert(notifications).values({ workspaceId: data.workspaceId, recipientId: data.assigneeId, actorId: userId, type: 'issue_assigned', entityType: 'issue', entityId: issue.id, dedupeKey: `assign:${issue.id}:${userId}` })
      }
    })
    logger.info('issue.created', { userId, issueNumber, projectId: data.projectId })
    return { id: issueId, issueNumber }
  })

export const updateIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid(), title: z.string().min(3).max(200).trim().optional(), description: z.string().max(10000).optional(), type: z.enum(['story', 'task', 'bug', 'epic']).optional(), priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).optional(), status: z.string().min(2).max(32).optional(), assigneeId: z.string().uuid().nullable().optional(), estimatePoints: z.number().int().min(0).nullable().optional(), dueDate: z.string().date().or(z.date()).nullable().optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(issues).where(and(eq(issues.id, data.issueId), eq(issues.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Issue not found.')
    const updates: Record<string, unknown> = {}
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.type) updates.type = data.type
    if (data.priority) updates.priority = data.priority
    if (data.status) updates.status = data.status
    if (data.assigneeId !== undefined) updates.assigneeId = data.assigneeId
    if (data.estimatePoints !== undefined) updates.estimatePoints = data.estimatePoints
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date()
      await db.transaction(async (tx) => {
        await tx.update(issues).set(updates).where(eq(issues.id, data.issueId))
        // Activity event for changes
        const changedFields = Object.keys(updates).filter(k => k !== 'updatedAt')
        if (changedFields.length > 0) {
          await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: existing[0].projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'updated', metadata: { changedFields } })
        }
        // Notify new assignee
        if (data.assigneeId && data.assigneeId !== userId) {
          await tx.insert(notifications).values({ workspaceId: data.workspaceId, recipientId: data.assigneeId, actorId: userId, type: 'issue_assigned', entityType: 'issue', entityId: data.issueId, dedupeKey: `assign:${data.issueId}:${userId}` })
        }
      })
    }
    return { ok: true }
  })

export const transitionIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid(), status: z.string().min(2).max(32) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const existing = await db.select().from(issues).where(and(eq(issues.id, data.issueId), eq(issues.workspaceId, data.workspaceId))).limit(1)
    if (!existing[0]) throw new NotFoundError('Issue not found.')
    const wasDone = existing[0].status === 'done'
    const isDone = data.status === 'done'
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ status: data.status, updatedAt: new Date(), completedAt: isDone && !wasDone ? new Date() : null })
        .where(eq(issues.id, data.issueId))
      await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: existing[0].projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'status_changed', metadata: { from: existing[0].status, to: data.status } })
    })
    return { ok: true }
  })

// --- Labels ---

export const listLabels = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    const rows = await db.select().from(issueLabels).where(eq(issueLabels.projectId, data.projectId)).orderBy(asc(issueLabels.name))
    return rows
  })

export const createLabel = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(50).trim(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1') }))
  .handler(async ({ data }) => {
    await requireSession()
    const existing = await db.select().from(issueLabels).where(and(eq(issueLabels.projectId, data.projectId), eq(issueLabels.normalizedName, data.name.toLowerCase().replace(/\s+/g, '-'))))
    if (existing.length > 0) throw new ConflictError('Label already exists.')
    const [label] = await db.insert(issueLabels).values({ projectId: data.projectId, name: data.name, normalizedName: data.name.toLowerCase().replace(/\s+/g, '-'), color: data.color }).returning()
    return label
  })

export const deleteLabel = createServerFn({ method: 'POST' })
  .validator(z.object({ labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await db.delete(issueLabels).where(eq(issueLabels.id, data.labelId))
    return { ok: true }
  })

export const addLabelToIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const link = await db.select().from(issueLabelLinks).where(and(eq(issueLabelLinks.issueId, data.issueId), eq(issueLabelLinks.labelId, data.labelId))).limit(1)
    if (link.length > 0) return { ok: true }
    await db.insert(issueLabelLinks).values({ issueId: data.issueId, labelId: data.labelId })
    return { ok: true }
  })

export const removeLabelFromIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await db.delete(issueLabelLinks).where(and(eq(issueLabelLinks.issueId, data.issueId), eq(issueLabelLinks.labelId, data.labelId)))
    return { ok: true }
  })

// --- Comments ---

export const addComment = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), body: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const issueRow = await db.select({ issue: issues, workspaceId: workspacesTable.id }).from(issues).innerJoin(workspacesTable as any, eq(issues.workspaceId, workspacesTable.id)).where(eq(issues.id, data.issueId)).limit(1)
    if (!issueRow[0]) throw new NotFoundError('Issue not found.')
    const [comment] = await db.insert(issueCommentsTable).values({ issueId: data.issueId, authorId: userId, body: data.body, createdAt: new Date(), updatedAt: new Date() }).returning()
    return comment
  })

export const editComment = createServerFn({ method: 'POST' })
  .validator(z.object({ commentId: z.string().uuid(), body: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => {
    await db.update(issueCommentsTable).set({ body: data.body, updatedAt: new Date() }).where(eq(issueCommentsTable.id, data.commentId))
    return { ok: true }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .validator(z.object({ commentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await db.update(issueCommentsTable).set({ deletedAt: new Date() }).where(eq(issueCommentsTable.id, data.commentId))
    return { ok: true }
  })

export const listComments = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    const rows = await db.select({ comment: issueCommentsTable, author: usersTable }).from(issueCommentsTable)
      .leftJoin(usersTable, eq(usersTable.id, issueCommentsTable.authorId))
      .where(and(eq(issueCommentsTable.issueId, data.issueId), isNull(issueCommentsTable.deletedAt)))
      .orderBy(asc(issueCommentsTable.createdAt))
    return rows.map(r => ({ ...r.comment, renderedBody: renderMarkdown(r.comment.body), authorName: r.author?.name }))
  })

// Import helper tables used inline
import { workspaces as workspacesTable } from '../db/schema'
import { issueComments as issueCommentsTable } from '../db/schema'

// --- Sprint Assignment ---

export const moveToSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), sprintId: z.string().uuid().nullable() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const [issueRow] = await db.select().from(issues).where(eq(issues.id, data.issueId)).limit(1)
    if (!issueRow) throw new NotFoundError('Issue not found.')
    if (!await getMembership(userId, issueRow.workspaceId)) throw new UnauthorizedError()
    if (data.sprintId) {
      const sprintRow = await db.select().from(sprintsTable).where(and(eq(sprintsTable.id, data.sprintId), eq(sprintsTable.projectId, issueRow.projectId))).limit(1)
      if (!sprintRow[0]) throw new NotFoundError('Sprint not found.')
    }
    await db.update(issues).set({ sprintId: data.sprintId, updatedAt: new Date() }).where(eq(issues.id, data.issueId))
    return { ok: true }
  })

import { sprints as sprintsTable } from '../db/schema'
