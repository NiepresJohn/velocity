import 'dotenv/config'
import { db, pool } from './index'
import { users, workspaces, workspaceMembers, projects, projectSequences, sprints, issues } from './schema'
import { hashPassword } from '#/server/auth/password'

const demoUrl = new URL(process.env.DATABASE_URL!)
if (!['localhost', '127.0.0.1'].includes(demoUrl.hostname)) throw new Error('seed only runs against a local database')

const [user] = await db.insert(users).values({ email: 'demo@velocity.dev', name: 'Demo User', passwordHash: await hashPassword('demo-password-1') }).onConflictDoNothing().returning()
if (!user) { console.log('already seeded'); await pool.end(); process.exit(0) }
const [ws] = await db.insert(workspaces).values({ name: 'Demo Workspace', slug: 'demo', createdBy: user.id }).returning()
await db.insert(workspaceMembers).values({ workspaceId: ws.id, userId: user.id, role: 'owner' })
const [proj] = await db.insert(projects).values({ workspaceId: ws.id, name: 'Velocity', key: 'VEL', createdBy: user.id }).returning()
const [sprint] = await db.insert(sprints).values({ workspaceId: ws.id, projectId: proj.id, name: 'Sprint 1', goal: 'Ship the board', createdBy: user.id }).returning()
const rows = [
  ['Set up CI', 'task', 'done', 2], ['Board drag and drop', 'story', 'in_progress', 5], ['Fix login redirect', 'bug', 'todo', 1], ['Burndown chart', 'story', 'todo', 3],
] as const
await db.insert(issues).values(rows.map(([title, type, status, pts], i) => ({
  projectId: proj.id, workspaceId: ws.id, number: i + 1, title, type, status, estimatePoints: pts,
  reporterId: user.id, assigneeId: user.id, sprintId: i < 3 ? sprint.id : null, rank: (i + 1) * 1000,
})))
await db.insert(projectSequences).values({ projectId: proj.id, nextIssueNumber: rows.length + 1 })
console.log('seeded: demo@velocity.dev / demo-password-1')
await pool.end()
