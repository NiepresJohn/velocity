import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import {
  projects as projectsTable, issues, issueLabels, issueLabelLinks, projectSequences as seqTable, activityEvents,
  notifications, users as usersTable, issueComments as issueCommentsTable, sprints as sprintsTable,
} from '../db/schema'
import { eq, and, or, asc, desc, ilike, inArray, isNull, ne, sql } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '#/lib/errors'
import { renderMarkdown } from '#/lib/markdown'
import { logger } from '#/lib/logger'
import { midRank, needsRebalance, RANK_STEP } from '#/lib/rank'

const WRITE_ROLES = ['owner', 'admin', 'member']
const issueType = z.enum(['story', 'task', 'bug', 'epic'])
const issuePriority = z.enum(['lowest', 'low', 'medium', 'high', 'highest'])
const dateInput = z.string().date().or(z.date())
// dueDate is a Postgres `date` column: always hand it a YYYY-MM-DD string, never a Date.
const normDate = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString().slice(0, 10))

// --- Access helpers (getMembership returns null; it never throws) ---

async function requireWorkspace(workspaceId: string, write = false) {
  const { userId } = await requireSession()
  const m = await getMembership(userId, workspaceId)
  if (!m) throw new UnauthorizedError()
  if (write && !WRITE_ROLES.includes(m.role)) throw new ForbiddenError('Viewers cannot modify issues.')
  return { userId, role: m.role }
}

// Resolve an issue's workspace from its id alone, then require membership (and write role if asked).
async function requireIssueAccess(issueId: string, write = false) {
  const { userId } = await requireSession()
  const [row] = await db.select({ workspaceId: issues.workspaceId, projectId: issues.projectId }).from(issues).where(eq(issues.id, issueId)).limit(1)
  const m = row ? await getMembership(userId, row.workspaceId) : null
  if (!row || !m) throw new NotFoundError('Issue not found.')
  if (write && !WRITE_ROLES.includes(m.role)) throw new ForbiddenError('Viewers cannot modify issues.')
  return { userId, role: m.role, ...row }
}

// Labels carry only projectId; resolve the owning workspace and require membership.
async function requireProjectAccess(projectId: string, write = false) {
  const { userId } = await requireSession()
  const [p] = await db.select({ workspaceId: projectsTable.workspaceId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1)
  const m = p ? await getMembership(userId, p.workspaceId) : null
  if (!p || !m) throw new NotFoundError('Project not found.')
  if (write && !WRITE_ROLES.includes(m.role)) throw new ForbiddenError('Viewers cannot modify issues.')
  return { userId, role: m.role, workspaceId: p.workspaceId }
}

async function loadIssue(issueId: string, workspaceId: string) {
  const [row] = await db.select().from(issues).where(and(eq(issues.id, issueId), eq(issues.workspaceId, workspaceId))).limit(1)
  if (!row) throw new NotFoundError('Issue not found.')
  return row
}

async function assertAssignee(workspaceId: string, assigneeId: string | null | undefined) {
  if (assigneeId && !await getMembership(assigneeId, workspaceId)) throw new ValidationError('Assignee is not a member of this workspace.')
}

async function assertSprintInProject(sprintId: string | null | undefined, projectId: string) {
  if (!sprintId) return
  const [s] = await db.select({ id: sprintsTable.id }).from(sprintsTable).where(and(eq(sprintsTable.id, sprintId), eq(sprintsTable.projectId, projectId))).limit(1)
  if (!s) throw new NotFoundError('Sprint not found.')
}

const statusFields = (existing: { status: string; completedAt: Date | null }, status: string) => ({
  status,
  completedAt: status === 'done' ? (existing.status === 'done' && existing.completedAt ? existing.completedAt : new Date()) : null,
})

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
    await requireWorkspace(data.workspaceId)
    // workspaceId in the filter stops a member of workspace A from reading project B by id.
    const wheres = [eq(issues.projectId, data.projectId), eq(issues.workspaceId, data.workspaceId), isNull(issues.archivedAt)]
    if (data.status?.length) wheres.push(inArray(issues.status, data.status))
    if (data.priority?.length) wheres.push(inArray(issues.priority, data.priority as any))
    if (data.type?.length) wheres.push(inArray(issues.type, data.type as any))
    if (data.assigneeId) wheres.push(eq(issues.assigneeId, data.assigneeId))
    if (data.sprintId) wheres.push(eq(issues.sprintId, data.sprintId))
    if (data.labelIds?.length) {
      wheres.push(inArray(issues.id, db.select({ id: issueLabelLinks.issueId }).from(issueLabelLinks).where(inArray(issueLabelLinks.labelId, data.labelIds))))
    }
    if (data.q) {
      const pat = `%${data.q.replace(/[\\%_]/g, '\\$&')}%`
      wheres.push(or(ilike(issues.title, pat), ilike(issues.description, pat)) as any)
    }
    const fieldMap: Record<string, any> = {
      rank: issues.rank, priority: issues.priority, created_at: issues.createdAt, updated_at: issues.updatedAt, due_date: issues.dueDate, estimate_points: issues.estimatePoints,
    }
    const orderFn = data.sortOrder === 'asc' ? asc : desc
    const where = and(...wheres)
    const [rows, [{ count }]] = await Promise.all([
      db.select({ issue: issues, assigneeName: usersTable.name }).from(issues)
        .leftJoin(usersTable, eq(usersTable.id, issues.assigneeId))
        .where(where)
        .orderBy(orderFn(fieldMap[data.sortField] || issues.rank), asc(issues.rank), asc(issues.number))
        .limit(data.pageSize).offset((data.page - 1) * data.pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(issues).where(where),
    ])
    // Labels in a second query so the page size counts issues, not issue x label rows.
    const ids = rows.map((r) => r.issue.id)
    const labelRows = ids.length
      ? await db.select({ issueId: issueLabelLinks.issueId, label: issueLabels }).from(issueLabelLinks)
        .innerJoin(issueLabels, eq(issueLabels.id, issueLabelLinks.labelId)).where(inArray(issueLabelLinks.issueId, ids))
      : []
    const issuesList = rows.map((r) => ({
      ...r.issue, assigneeName: r.assigneeName,
      labels: labelRows.filter((l) => l.issueId === r.issue.id).map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
    }))
    return { issues: issuesList, total: count, page: data.page, pageSize: data.pageSize }
  })

export const getIssue = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireWorkspace(data.workspaceId)
    const row = await db.select({ issue: issues, reporter: usersTable }).from(issues)
      .leftJoin(usersTable, eq(usersTable.id, issues.reporterId))
      .where(and(eq(issues.id, data.issueId), eq(issues.workspaceId, data.workspaceId)))
      .limit(1)
    if (!row[0]) throw new NotFoundError('Issue not found.')
    const { issue, reporter } = row[0]
    const [labels, parentRows, children, assignee] = await Promise.all([
      db.select({ id: issueLabels.id, name: issueLabels.name, color: issueLabels.color }).from(issueLabelLinks)
        .innerJoin(issueLabels, eq(issueLabels.id, issueLabelLinks.labelId)).where(eq(issueLabelLinks.issueId, issue.id)),
      issue.parentIssueId
        ? db.select({ id: issues.id, number: issues.number, title: issues.title, type: issues.type }).from(issues).where(eq(issues.id, issue.parentIssueId)).limit(1)
        : Promise.resolve([]),
      db.select({ id: issues.id, number: issues.number, title: issues.title, type: issues.type, status: issues.status }).from(issues)
        .where(and(eq(issues.parentIssueId, issue.id), isNull(issues.archivedAt))).orderBy(asc(issues.rank), asc(issues.number)),
      issue.assigneeId ? db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, issue.assigneeId)).limit(1) : Promise.resolve([]),
    ])
    return {
      ...issue, renderedDescription: renderMarkdown(issue.description || ''), reporterName: reporter?.name,
      assigneeName: assignee[0]?.name ?? null, labels, parent: parentRows[0] ?? null, children,
    }
  })

export const createIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), title: z.string().min(3).max(200).trim(), description: z.string().max(10000).optional().default(''), type: issueType.default('task'), priority: issuePriority.default('medium'), status: z.string().default('todo'), assigneeId: z.string().uuid().optional(), sprintId: z.string().uuid().optional(), estimatePoints: z.number().int().min(0).max(100).optional(), dueDate: dateInput.optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    const [project] = await db.select({ id: projectsTable.id }).from(projectsTable).where(and(eq(projectsTable.id, data.projectId), eq(projectsTable.workspaceId, data.workspaceId))).limit(1)
    if (!project) throw new NotFoundError('Project not found.')
    await assertAssignee(data.workspaceId, data.assigneeId)
    await assertSprintInProject(data.sprintId, data.projectId)
    let issueNumber = 1
    let issueId = ''
    await db.transaction(async (tx) => {
      const seq = await tx.select().from(seqTable).where(eq(seqTable.projectId, data.projectId)).for('update').limit(1)
      if (!seq[0]) await tx.insert(seqTable).values({ projectId: data.projectId, nextIssueNumber: 1 }).onConflictDoNothing()
      const nextSeq = await tx.select().from(seqTable).where(eq(seqTable.projectId, data.projectId)).for('update').limit(1)
      issueNumber = nextSeq[0].nextIssueNumber
      await tx.update(seqTable).set({ nextIssueNumber: issueNumber + 1 }).where(eq(seqTable.projectId, data.projectId))
      // New issues go to the bottom; the sequence lock above serialises this per project.
      const [{ maxRank }] = await tx.select({ maxRank: sql<number | null>`max(${issues.rank})` }).from(issues).where(eq(issues.projectId, data.projectId))
      const now = new Date()
      const [issue] = await tx.insert(issues).values({
        projectId: data.projectId, workspaceId: data.workspaceId, number: issueNumber, title: data.title,
        description: data.description, type: data.type, priority: data.priority, status: data.status,
        assigneeId: data.assigneeId ?? null, sprintId: data.sprintId ?? null, estimatePoints: data.estimatePoints ?? null,
        dueDate: data.dueDate ? normDate(data.dueDate) : null, rank: midRank(maxRank, null), createdAt: now, updatedAt: now, reporterId: userId,
        completedAt: data.status === 'done' ? now : null,
      }).returning()
      issueId = issue.id
      await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: data.projectId, actorId: userId, entityType: 'issue', entityId: issue.id, eventType: 'created', metadata: { title: data.title } })
      if (data.assigneeId && data.assigneeId !== userId) {
        await tx.insert(notifications).values({ workspaceId: data.workspaceId, recipientId: data.assigneeId, actorId: userId, type: 'issue_assigned', entityType: 'issue', entityId: issue.id, dedupeKey: `assign:${issue.id}:${userId}` })
      }
    })
    logger.info('issue.created', { userId, issueNumber, projectId: data.projectId })
    return { id: issueId, issueNumber }
  })

const FIELD_LABEL: Record<string, string> = {
  title: 'title', description: 'description', type: 'type', priority: 'priority', assigneeId: 'assignee',
  estimatePoints: 'story points', dueDate: 'due date', parentIssueId: 'parent',
}

export const updateIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid(), title: z.string().min(3).max(200).trim().optional(), description: z.string().max(10000).optional(), type: issueType.optional(), priority: issuePriority.optional(), status: z.string().min(2).max(32).optional(), assigneeId: z.string().uuid().nullable().optional(), estimatePoints: z.number().int().min(0).max(100).nullable().optional(), dueDate: dateInput.nullable().optional(), parentIssueId: z.string().uuid().nullable().optional() }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    const existing = await loadIssue(data.issueId, data.workspaceId)
    await assertAssignee(data.workspaceId, data.assigneeId)
    if (data.parentIssueId) {
      if (data.parentIssueId === existing.id) throw new ValidationError('An issue cannot be its own parent.')
      // Walk up from the candidate parent: same project, and no path back to this issue (cycle).
      let cur: string | null = data.parentIssueId
      for (let depth = 0; cur && depth < 50; depth++) {
        if (cur === existing.id) throw new ValidationError('That would create a parent/child cycle.')
        const [p] = await db.select({ parent: issues.parentIssueId, projectId: issues.projectId }).from(issues).where(and(eq(issues.id, cur), eq(issues.workspaceId, data.workspaceId))).limit(1)
        if (!p || p.projectId !== existing.projectId) throw new NotFoundError('Parent issue not found.')
        cur = p.parent
      }
    }
    const next: Record<string, unknown> = {}
    if (data.title !== undefined) next.title = data.title
    if (data.description !== undefined) next.description = data.description
    if (data.type) next.type = data.type
    if (data.priority) next.priority = data.priority
    if (data.assigneeId !== undefined) next.assigneeId = data.assigneeId
    if (data.estimatePoints !== undefined) next.estimatePoints = data.estimatePoints
    if (data.dueDate !== undefined) next.dueDate = data.dueDate ? normDate(data.dueDate) : null
    if (data.parentIssueId !== undefined) next.parentIssueId = data.parentIssueId
    const before = existing as unknown as Record<string, unknown>
    const changed = Object.keys(next).filter((k) => before[k] !== next[k])
    const statusChanged = data.status !== undefined && data.status !== existing.status
    if (!changed.length && !statusChanged) return { ok: true }

    // Readable from/to values for the activity feed (names instead of ids; description text is not copied).
    const ids = [...new Set(['assigneeId'].flatMap((k) => (changed.includes(k) ? [before[k], next[k]] : [])).filter(Boolean) as string[])]
    const names = new Map((ids.length ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, ids)) : []).map((u) => [u.id, u.name]))
    const show = (k: string, v: unknown) => (v == null ? null : k === 'assigneeId' ? (names.get(v as string) ?? 'Unknown') : k === 'description' || k === 'parentIssueId' ? undefined : String(v))
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const k of changed) changes[k] = { from: show(k, before[k]), to: show(k, next[k]) }

    await db.transaction(async (tx) => {
      const set: Record<string, unknown> = { ...next, updatedAt: new Date() }
      if (statusChanged) Object.assign(set, statusFields(existing, data.status!))
      await tx.update(issues).set(set).where(eq(issues.id, data.issueId))
      if (changed.length) await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: existing.projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'updated', metadata: { changedFields: changed, changes } })
      if (statusChanged) await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: existing.projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'status_changed', metadata: { from: existing.status, to: data.status } })
      // Only notify when the assignee actually changed.
      if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== userId) {
        await tx.insert(notifications).values({ workspaceId: data.workspaceId, recipientId: data.assigneeId, actorId: userId, type: 'issue_assigned', entityType: 'issue', entityId: data.issueId, dedupeKey: `assign:${data.issueId}:${userId}` })
      }
    })
    return { ok: true }
  })

export const transitionIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid(), status: z.string().min(2).max(32) }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    const existing = await loadIssue(data.issueId, data.workspaceId)
    if (existing.status === data.status) return { ok: true }
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ ...statusFields(existing, data.status), updatedAt: new Date() }).where(eq(issues.id, data.issueId))
      await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: existing.projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'status_changed', metadata: { from: existing.status, to: data.status } })
    })
    return { ok: true }
  })

// Place an issue between two neighbours using a midpoint rank. beforeId = the issue that will sit directly
// ABOVE it, afterId = the issue directly BELOW it (either may be omitted at a list edge). Optionally changes
// status and/or sprint in the same transaction (board column drop, backlog section drop).
export const rankIssue = createServerFn({ method: 'POST' })
  .validator(z.object({
    issueId: z.string().uuid(), workspaceId: z.string().uuid(),
    beforeId: z.string().uuid().optional(), afterId: z.string().uuid().optional(),
    status: z.string().min(2).max(32).optional(), sprintId: z.string().uuid().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    const issue = await loadIssue(data.issueId, data.workspaceId)
    if (data.beforeId === issue.id || data.afterId === issue.id) throw new ValidationError('Cannot rank an issue relative to itself.')
    if (data.sprintId !== undefined) await assertSprintInProject(data.sprintId, issue.projectId)
    const neighbours = async (tx: typeof db) => {
      const wanted = [data.beforeId, data.afterId].filter(Boolean) as string[]
      // Neighbours must be in the same project (and workspace): never trust client-supplied ids.
      const rows = wanted.length
        ? await tx.select({ id: issues.id, rank: issues.rank }).from(issues).where(and(inArray(issues.id, wanted), eq(issues.projectId, issue.projectId), eq(issues.workspaceId, data.workspaceId)))
        : []
      if (rows.length !== wanted.length) throw new NotFoundError('Neighbouring issue not found.')
      return { prev: rows.find((r) => r.id === data.beforeId)?.rank ?? null, next: rows.find((r) => r.id === data.afterId)?.rank ?? null }
    }
    await db.transaction(async (tx) => {
      // Serialise concurrent reorders within a project.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${issue.projectId}))`)
      let { prev, next } = await neighbours(tx as any)
      if (needsRebalance(prev, next)) {
        // Ranks collided or ran out of precision: renumber the whole project once (ties broken by number), then retry.
        await tx.execute(sql`update issues set rank = sub.rn * ${RANK_STEP} from (select id, row_number() over (order by rank, number) as rn from issues where project_id = ${issue.projectId}) sub where issues.id = sub.id`)
        ;({ prev, next } = await neighbours(tx as any))
      }
      if (prev != null && next != null && prev >= next) throw new ConflictError('The board changed underneath you. Refresh and try again.')
      let rank: number
      if (prev == null && next == null) {
        const [{ maxRank }] = await tx.select({ maxRank: sql<number | null>`max(${issues.rank})` }).from(issues).where(eq(issues.projectId, issue.projectId))
        rank = midRank(maxRank, null)
      } else rank = midRank(prev, next)
      const set: Record<string, unknown> = { rank, updatedAt: new Date() }
      const statusChanged = data.status !== undefined && data.status !== issue.status
      if (statusChanged) Object.assign(set, statusFields(issue, data.status!))
      const sprintChanged = data.sprintId !== undefined && data.sprintId !== issue.sprintId
      if (sprintChanged) set.sprintId = data.sprintId
      await tx.update(issues).set(set).where(eq(issues.id, issue.id))
      const log = (eventType: string, metadata: unknown) => tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: issue.projectId, actorId: userId, entityType: 'issue', entityId: issue.id, eventType, metadata })
      if (statusChanged) await log('status_changed', { from: issue.status, to: data.status })
      if (sprintChanged) await log('sprint_changed', { from: issue.sprintId, to: data.sprintId })
    })
    return { ok: true }
  })

export const archiveIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid(), archived: z.boolean().default(true) }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    const issue = await loadIssue(data.issueId, data.workspaceId)
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ archivedAt: data.archived ? new Date() : null, updatedAt: new Date() }).where(eq(issues.id, issue.id))
      await tx.insert(activityEvents).values({ workspaceId: data.workspaceId, projectId: issue.projectId, actorId: userId, entityType: 'issue', entityId: issue.id, eventType: data.archived ? 'archived' : 'unarchived', metadata: null })
    })
    return { ok: true }
  })

// Hard delete: admin/owner, or the reporter if they are a member. Children are detached, not deleted.
export const deleteIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId, role } = await requireWorkspace(data.workspaceId, true)
    const issue = await loadIssue(data.issueId, data.workspaceId)
    if (!['owner', 'admin'].includes(role) && issue.reporterId !== userId) throw new ForbiddenError('Only admins or the reporter can delete an issue.')
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ parentIssueId: null }).where(eq(issues.parentIssueId, issue.id))
      await tx.delete(issues).where(eq(issues.id, issue.id))
    })
    logger.info('issue.deleted', { userId, issueId: issue.id })
    return { ok: true }
  })

// --- Labels ---

const normLabel = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-')

export const listLabels = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireProjectAccess(data.projectId)
    return db.select().from(issueLabels).where(eq(issueLabels.projectId, data.projectId)).orderBy(asc(issueLabels.name))
  })

export const createLabel = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(50).trim(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1') }))
  .handler(async ({ data }) => {
    await requireProjectAccess(data.projectId, true)
    const existing = await db.select().from(issueLabels).where(and(eq(issueLabels.projectId, data.projectId), eq(issueLabels.normalizedName, normLabel(data.name))))
    if (existing.length > 0) throw new ConflictError('Label already exists.')
    const [label] = await db.insert(issueLabels).values({ projectId: data.projectId, name: data.name, normalizedName: normLabel(data.name), color: data.color }).returning()
    return label
  })

export const deleteLabel = createServerFn({ method: 'POST' })
  .validator(z.object({ labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const [l] = await db.select({ projectId: issueLabels.projectId }).from(issueLabels).where(eq(issueLabels.id, data.labelId)).limit(1)
    if (!l) throw new NotFoundError('Label not found.')
    await requireProjectAccess(l.projectId, true)
    await db.delete(issueLabels).where(eq(issueLabels.id, data.labelId))
    return { ok: true }
  })

export const addLabelToIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { projectId } = await requireIssueAccess(data.issueId, true)
    const [lbl] = await db.select({ id: issueLabels.id }).from(issueLabels).where(and(eq(issueLabels.id, data.labelId), eq(issueLabels.projectId, projectId))).limit(1)
    if (!lbl) throw new NotFoundError('Label not found.')
    await db.insert(issueLabelLinks).values({ issueId: data.issueId, labelId: data.labelId }).onConflictDoNothing()
    return { ok: true }
  })

export const removeLabelFromIssue = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), labelId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireIssueAccess(data.issueId, true)
    await db.delete(issueLabelLinks).where(and(eq(issueLabelLinks.issueId, data.issueId), eq(issueLabelLinks.labelId, data.labelId)))
    return { ok: true }
  })

// --- Comments ---

export const addComment = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), body: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => {
    const { userId } = await requireIssueAccess(data.issueId, true)
    const [comment] = await db.insert(issueCommentsTable).values({ issueId: data.issueId, authorId: userId, body: data.body, createdAt: new Date(), updatedAt: new Date() }).returning()
    return comment
  })

export const editComment = createServerFn({ method: 'POST' })
  .validator(z.object({ commentId: z.string().uuid(), body: z.string().min(1).max(5000) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const res = await db.update(issueCommentsTable).set({ body: data.body, updatedAt: new Date() })
      .where(and(eq(issueCommentsTable.id, data.commentId), eq(issueCommentsTable.authorId, userId), isNull(issueCommentsTable.deletedAt))).returning({ id: issueCommentsTable.id })
    if (!res.length) throw new NotFoundError('Comment not found.')
    return { ok: true }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .validator(z.object({ commentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const res = await db.update(issueCommentsTable).set({ deletedAt: new Date() })
      .where(and(eq(issueCommentsTable.id, data.commentId), eq(issueCommentsTable.authorId, userId), isNull(issueCommentsTable.deletedAt))).returning({ id: issueCommentsTable.id })
    if (!res.length) throw new NotFoundError('Comment not found.')
    return { ok: true }
  })

export const listComments = createServerFn({ method: 'GET' })
  .validator(z.object({ issueId: z.string().uuid(), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    await requireIssueAccess(data.issueId)
    const rows = await db.select({ comment: issueCommentsTable, author: usersTable }).from(issueCommentsTable)
      .leftJoin(usersTable, eq(usersTable.id, issueCommentsTable.authorId))
      .where(and(eq(issueCommentsTable.issueId, data.issueId), isNull(issueCommentsTable.deletedAt)))
      .orderBy(asc(issueCommentsTable.createdAt))
    return rows.map((r) => ({
      id: r.comment.id, authorId: r.comment.authorId, body: r.comment.body, authorName: r.author?.name ?? null,
      createdAt: r.comment.createdAt.toISOString(), updatedAt: r.comment.updatedAt.toISOString(),
    }))
  })

// --- Sprint assignment ---

export const moveToSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ issueId: z.string().uuid(), sprintId: z.string().uuid().nullable() }))
  .handler(async ({ data }) => {
    const { userId, projectId, workspaceId } = await requireIssueAccess(data.issueId, true)
    await assertSprintInProject(data.sprintId, projectId)
    const [cur] = await db.select({ sprintId: issues.sprintId }).from(issues).where(eq(issues.id, data.issueId))
    if (cur?.sprintId === data.sprintId) return { ok: true }
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ sprintId: data.sprintId, updatedAt: new Date() }).where(eq(issues.id, data.issueId))
      await tx.insert(activityEvents).values({ workspaceId, projectId, actorId: userId, entityType: 'issue', entityId: data.issueId, eventType: 'sprint_changed', metadata: { from: cur?.sprintId ?? null, to: data.sprintId } })
    })
    return { ok: true }
  })

export const moveIssuesToSprint = createServerFn({ method: 'POST' })
  .validator(z.object({ issueIds: z.array(z.string().uuid()).min(1).max(100), sprintId: z.string().uuid().nullable(), workspaceId: z.string().uuid(), projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireWorkspace(data.workspaceId, true)
    await assertSprintInProject(data.sprintId, data.projectId)
    const rows = await db.select({ id: issues.id, sprintId: issues.sprintId }).from(issues)
      .where(and(inArray(issues.id, data.issueIds), eq(issues.projectId, data.projectId), eq(issues.workspaceId, data.workspaceId), data.sprintId ? ne(sql`coalesce(${issues.sprintId}, '00000000-0000-0000-0000-000000000000'::uuid)`, data.sprintId) : sql`${issues.sprintId} is not null`))
    if (!rows.length) return { moved: 0 }
    await db.transaction(async (tx) => {
      await tx.update(issues).set({ sprintId: data.sprintId, updatedAt: new Date() }).where(inArray(issues.id, rows.map((r) => r.id)))
      await tx.insert(activityEvents).values(rows.map((r) => ({ workspaceId: data.workspaceId, projectId: data.projectId, actorId: userId, entityType: 'issue', entityId: r.id, eventType: 'sprint_changed', metadata: { from: r.sprintId, to: data.sprintId } })))
    })
    return { moved: rows.length }
  })
