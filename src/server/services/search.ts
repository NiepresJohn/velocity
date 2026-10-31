import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { issues as issuesTable, sprints as sprintsTable, projects as projectsTable } from '../db/schema'
import { like, and, eq } from 'drizzle-orm'
import { requireSession } from '#/server/auth/guard'
import { getMembership } from '#/server/permissions/index'
import { UnauthorizedError } from '#/lib/errors'

export const search = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().min(2).max(100), workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    if (!await getMembership(userId, data.workspaceId)) throw new UnauthorizedError()
    const q = '%' + data.q.toLowerCase() + '%'
    const issueResults = await db.select({ issue: issuesTable, projectKey: projectsTable.key, projectName: projectsTable.name })
      .from(issuesTable)
      .innerJoin(projectsTable, eq(projectsTable.id, issuesTable.projectId))
      .where(and(eq(issuesTable.workspaceId, data.workspaceId), like(issuesTable.title, q)))
      .limit(20)
    const sprintResults = await db.select({ sprint: sprintsTable, projectKey: projectsTable.key })
      .from(sprintsTable)
      .innerJoin(projectsTable, eq(projectsTable.id, sprintsTable.projectId))
      .where(and(eq(sprintsTable.workspaceId, data.workspaceId), like(sprintsTable.name, q)))
      .limit(10)
    return {
      issues: issueResults.map(r => ({ id: r.issue.id, number: r.issue.number, title: r.issue.title, key: r.projectKey + '-' + r.issue.number })),
      sprints: sprintResults.map(r => ({ id: r.sprint.id, name: r.sprint.name, state: r.sprint.state })),
    }
  })
