import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { db, pool } from './index'
import {
  users, workspaces, workspaceMembers, projects, projectSequences, sprints, issues,
  issueLabels, issueLabelLinks, issueComments, notifications, activityEvents,
} from './schema'
import { hashPassword } from '#/server/auth/password'

const demoUrl = new URL(process.env.DATABASE_URL!)
if (!['localhost', '127.0.0.1'].includes(demoUrl.hostname)) throw new Error('seed only runs against a local database')

// Idempotent: skip if the demo workspace exists. To reset, see README ("Reset demo data").
if ((await db.select().from(workspaces).where(sql`slug = 'demo'`)).length) { console.log('already seeded (see README to reset)'); await pool.end(); process.exit(0) }

const DAY = 86_400_000
const ago = (d: number, h = 10) => new Date(Date.now() - d * DAY + (h - 12) * 3_600_000)
const dateOnly = (d: Date) => d.toISOString().slice(0, 10)
const pw = await hashPassword('demo-password-1')

const [alice, bob, cara] = await db.insert(users).values([
  { email: 'demo@velocity.dev', name: 'Alice Owner', passwordHash: pw },
  { email: 'bob@velocity.dev', name: 'Bob Builder', passwordHash: pw },
  { email: 'cara@velocity.dev', name: 'Cara Viewer', passwordHash: pw },
]).returning()
const [ws] = await db.insert(workspaces).values({ name: 'Demo Workspace', slug: 'demo', createdBy: alice.id }).returning()
await db.insert(workspaceMembers).values([
  { workspaceId: ws.id, userId: alice.id, role: 'owner' },
  { workspaceId: ws.id, userId: bob.id, role: 'member' },
  { workspaceId: ws.id, userId: cara.id, role: 'viewer' },
])
const [vel, web] = await db.insert(projects).values([
  { workspaceId: ws.id, name: 'Velocity', key: 'VEL', description: 'The product itself', createdBy: alice.id },
  { workspaceId: ws.id, name: 'Marketing Site', key: 'WEB', description: 'Landing pages and docs', createdBy: alice.id },
]).returning()

// Sprint 1 (completed, 14 days) ended 15 days ago; Sprint 2 (active, 14 days) started 9 days ago.
const [s1, s2] = await db.insert(sprints).values([
  { workspaceId: ws.id, projectId: vel.id, name: 'Sprint 1', goal: 'Foundations: auth and CI', state: 'completed', startDate: dateOnly(ago(29)), endDate: dateOnly(ago(15)), startedAt: ago(29), completedAt: ago(15), createdBy: alice.id, retrospectiveNotes: 'Good pace; CI took longer than planned.' },
  { workspaceId: ws.id, projectId: vel.id, name: 'Sprint 2', goal: 'Ship the board and reports', state: 'active', startDate: dateOnly(ago(9)), endDate: dateOnly(ago(-5)), startedAt: ago(9), createdBy: alice.id },
]).returning()

const labelRows = await db.insert(issueLabels).values([
  ['frontend', '#0052cc'], ['backend', '#36b37e'], ['bug', '#e5493a'], ['design', '#904ee2'], ['tech-debt', '#ff991f'],
].map(([name, color]) => ({ projectId: vel.id, name, normalizedName: name, color }))).returning()
const L = Object.fromEntries(labelRows.map((l) => [l.name, l.id]))

type Row = { t: string; type: 'story' | 'task' | 'bug'; status: string; pri: 'lowest' | 'low' | 'medium' | 'high' | 'highest'; pts: number | null; who: typeof alice | null; sprint: 's1' | 's2' | null; done?: number; labels: string[] }
const velRows: Row[] = [
  // Sprint 1: all done, completed across days 28..16 ago
  { t: 'Set up CI pipeline', type: 'task', status: 'done', pri: 'high', pts: 3, who: bob, sprint: 's1', done: 27, labels: ['tech-debt'] },
  { t: 'Email/password registration', type: 'story', status: 'done', pri: 'highest', pts: 5, who: alice, sprint: 's1', done: 25, labels: ['backend'] },
  { t: 'Login and sessions', type: 'story', status: 'done', pri: 'highest', pts: 5, who: alice, sprint: 's1', done: 22, labels: ['backend', 'frontend'] },
  { t: 'Design system tokens', type: 'task', status: 'done', pri: 'medium', pts: 2, who: bob, sprint: 's1', done: 20, labels: ['design'] },
  { t: 'Workspace creation', type: 'story', status: 'done', pri: 'high', pts: 3, who: alice, sprint: 's1', done: 18, labels: ['backend'] },
  { t: 'Fix session cookie on Safari', type: 'bug', status: 'done', pri: 'high', pts: 1, who: bob, sprint: 's1', done: 16, labels: ['bug'] },
  // Sprint 2: mixed; completions spread over the last 8 days for a real burndown
  { t: 'Board drag and drop', type: 'story', status: 'in_progress', pri: 'highest', pts: 8, who: bob, sprint: 's2', labels: ['frontend'] },
  { t: 'Backlog ranking', type: 'story', status: 'done', pri: 'high', pts: 5, who: alice, sprint: 's2', done: 7, labels: ['frontend', 'backend'] },
  { t: 'Create issue dialog', type: 'story', status: 'done', pri: 'high', pts: 3, who: bob, sprint: 's2', done: 6, labels: ['frontend'] },
  { t: 'Sprint start/complete flow', type: 'story', status: 'done', pri: 'high', pts: 5, who: alice, sprint: 's2', done: 4, labels: ['backend'] },
  { t: 'Burndown chart', type: 'story', status: 'in_review', pri: 'medium', pts: 5, who: alice, sprint: 's2', labels: ['frontend'] },
  { t: 'Velocity report', type: 'story', status: 'todo', pri: 'medium', pts: 5, who: bob, sprint: 's2', labels: ['frontend', 'backend'] },
  { t: 'Fix login redirect loop', type: 'bug', status: 'done', pri: 'highest', pts: 2, who: bob, sprint: 's2', done: 2, labels: ['bug'] },
  { t: 'Issue comments', type: 'story', status: 'in_progress', pri: 'medium', pts: 3, who: alice, sprint: 's2', labels: ['backend'] },
  { t: 'Notification bell', type: 'task', status: 'todo', pri: 'low', pts: 2, who: bob, sprint: 's2', labels: ['frontend'] },
  { t: 'Board column overflow bug', type: 'bug', status: 'todo', pri: 'medium', pts: 1, who: null, sprint: 's2', labels: ['bug', 'frontend'] },
  // Backlog
  { t: 'Epic: Search and command menu', type: 'story', status: 'todo', pri: 'medium', pts: 8, who: null, sprint: null, labels: ['frontend'] },
  { t: 'Keyboard shortcuts', type: 'task', status: 'todo', pri: 'low', pts: 3, who: null, sprint: null, labels: ['frontend'] },
  { t: 'Dark mode', type: 'story', status: 'todo', pri: 'lowest', pts: 5, who: null, sprint: null, labels: ['design'] },
  { t: 'Rate limit invite creation', type: 'task', status: 'todo', pri: 'high', pts: 2, who: null, sprint: null, labels: ['backend'] },
  { t: 'Migrate to cursor pagination', type: 'task', status: 'todo', pri: 'low', pts: 3, who: null, sprint: null, labels: ['tech-debt', 'backend'] },
  { t: 'CSV export of issues', type: 'story', status: 'todo', pri: 'low', pts: 5, who: null, sprint: null, labels: ['backend'] },
  { t: 'Timezone shows UTC for all users', type: 'bug', status: 'todo', pri: 'medium', pts: 2, who: null, sprint: null, labels: ['bug'] },
  { t: 'Audit log page', type: 'story', status: 'todo', pri: 'medium', pts: 5, who: null, sprint: null, labels: ['backend'] },
]
const webRows: Row[] = [
  { t: 'Hero copy', type: 'task', status: 'done', pri: 'medium', pts: 1, who: cara, sprint: null, done: 5, labels: [] },
  { t: 'Pricing page', type: 'story', status: 'in_progress', pri: 'medium', pts: 3, who: bob, sprint: null, labels: [] },
  { t: 'Docs site skeleton', type: 'story', status: 'todo', pri: 'low', pts: 5, who: null, sprint: null, labels: [] },
  { t: 'Fix broken footer links', type: 'bug', status: 'todo', pri: 'low', pts: 1, who: null, sprint: null, labels: [] },
  { t: 'SEO metadata', type: 'task', status: 'todo', pri: 'low', pts: 2, who: null, sprint: null, labels: [] },
  { t: 'Customer logos section', type: 'task', status: 'todo', pri: 'lowest', pts: 1, who: null, sprint: null, labels: [] },
]

async function insertIssues(project: typeof vel, rows: Row[]) {
  const sprintId = { s1: s1.id, s2: s2.id }
  const created = await db.insert(issues).values(rows.map((r, i) => ({
    projectId: project.id, workspaceId: ws.id, number: i + 1, title: r.t, type: r.type, status: r.status, priority: r.pri,
    estimatePoints: r.pts, reporterId: alice.id, assigneeId: r.who?.id ?? null, sprintId: r.sprint ? sprintId[r.sprint] : null,
    rank: (i + 1) * 1000, createdAt: ago(r.sprint === 's1' ? 30 : 12), completedAt: r.done ? ago(r.done, 15) : null,
  }))).returning()
  await db.insert(projectSequences).values({ projectId: project.id, nextIssueNumber: rows.length + 1 })
  return created
}
const velIssues = await insertIssues(vel, velRows)
await insertIssues(web, webRows)

await db.insert(issueLabelLinks).values(velIssues.flatMap((iss, i) => velRows[i].labels.map((l) => ({ issueId: iss.id, labelId: L[l] }))))

const find = (t: string) => velIssues.find((i) => i.title === t)!
await db.insert(issueComments).values([
  { issueId: find('Board drag and drop').id, authorId: bob.id, body: 'Pointer sensor works; keyboard drag still needs work.', createdAt: ago(3) },
  { issueId: find('Board drag and drop').id, authorId: alice.id, body: 'Great. Please make sure the column drop targets are accessible.', createdAt: ago(2) },
  { issueId: find('Burndown chart').id, authorId: alice.id, body: 'Ready for review, uses completedAt history.', createdAt: ago(1) },
  { issueId: find('Burndown chart').id, authorId: bob.id, body: 'Looks good, one nit on axis labels.', createdAt: ago(1, 16) },
  { issueId: find('Fix login redirect loop').id, authorId: bob.id, body: 'Root cause: redirect param was re-encoded on every hop.', createdAt: ago(2) },
  { issueId: find('Issue comments').id, authorId: alice.id, body: '@bob can you take the notification side of this?', createdAt: ago(1) },
])

await db.insert(notifications).values([
  { workspaceId: ws.id, recipientId: bob.id, actorId: alice.id, type: 'mention', entityType: 'issue', entityId: find('Issue comments').id, metadata: { key: 'VEL-14', title: 'Issue comments' }, dedupeKey: 'seed-1' },
  { workspaceId: ws.id, recipientId: bob.id, actorId: alice.id, type: 'assigned', entityType: 'issue', entityId: find('Velocity report').id, metadata: { key: 'VEL-12', title: 'Velocity report' }, dedupeKey: 'seed-2', readAt: ago(1) },
  { workspaceId: ws.id, recipientId: alice.id, actorId: bob.id, type: 'comment', entityType: 'issue', entityId: find('Burndown chart').id, metadata: { key: 'VEL-11', title: 'Burndown chart' }, dedupeKey: 'seed-3' },
  { workspaceId: ws.id, recipientId: alice.id, actorId: bob.id, type: 'status_changed', entityType: 'issue', entityId: find('Fix login redirect loop').id, metadata: { key: 'VEL-13', to: 'done' }, dedupeKey: 'seed-4', readAt: ago(1) },
])
await db.insert(activityEvents).values(velIssues.filter((i) => i.completedAt).map((i) => ({
  workspaceId: ws.id, projectId: vel.id, actorId: i.assigneeId, entityType: 'issue', entityId: i.id, eventType: 'issue.status_changed', metadata: { to: 'done' }, createdAt: i.completedAt!,
})))

console.log(`seeded ${velIssues.length + webRows.length} issues. Logins (dev only), password "demo-password-1":\n  demo@velocity.dev (owner), bob@velocity.dev (member), cara@velocity.dev (viewer)`)
await pool.end()
