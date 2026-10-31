import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues as issuesTable, sprints as sprintsTable, projects as projectsTable } from '../db/schema'
import { ilike, and, eq, isNull, or, desc } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { UnauthorizedError } from '#/lib/errors'

export const search = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().min(2).max(100), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const q = '%' + data.q.replace(/[\\%_]/g, '\\$&') + '%'
    // "ABC-12" style identifiers: match key + number as well as titles.
    const ident = /^([a-z0-9]+)-(\d+)$/i.exec(data.q.trim())
    const issueResults = await db.select({ issue: issuesTable, projectKey: projectsTable.key })
      .from(issuesTable)
      .innerJoin(projectsTable, eq(projectsTable.id, issuesTable.projectId))
      .where(and(eq(issuesTable.workspaceId, data.workspaceId), isNull(issuesTable.archivedAt),
        ident ? or(ilike(issuesTable.title, q), and(ilike(projectsTable.key, ident[1]), eq(issuesTable.number, Number(ident[2])))) : ilike(issuesTable.title, q)))
      .orderBy(desc(issuesTable.updatedAt))
      .limit(20)
    const sprintResults = await db.select({ sprint: sprintsTable })
      .from(sprintsTable)
      .where(and(eq(sprintsTable.workspaceId, data.workspaceId), ilike(sprintsTable.name, q)))
      .limit(10)
    return {
      issues: issueResults.map((r) => ({ id: r.issue.id, number: r.issue.number, title: r.issue.title, projectId: r.issue.projectId, type: r.issue.type, status: r.issue.status, key: r.projectKey + '-' + r.issue.number })),
      sprints: sprintResults.map((r) => ({ id: r.sprint.id, name: r.sprint.name, state: r.sprint.state, projectId: r.sprint.projectId })),
    }
  })
