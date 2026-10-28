import { sql } from 'drizzle-orm'
import {
  pgTable, uuid, varchar, text, timestamp, integer, jsonb, pgEnum, date,
  uniqueIndex, index, doublePrecision, boolean,
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member', 'viewer'])
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived'])
export const sprintStateEnum = pgEnum('sprint_state', ['planned', 'active', 'completed', 'cancelled'])
export const issueTypeEnum = pgEnum('issue_type', ['story', 'task', 'bug', 'epic'])
export const issuePriorityEnum = pgEnum('issue_priority', ['lowest', 'low', 'medium', 'high', 'highest'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  timezone: varchar('timezone', { length: 64 }).default('UTC'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  description: text('description'),
  timezone: varchar('timezone', { length: 64 }).default('UTC'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('workspace_members_workspace_id_user_id_idx').on(t.workspaceId, t.userId),
  userIdx: index('workspace_members_user_id_idx').on(t.userId),
}))

export const workspaceInvitations = pgTable('workspace_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  emailNormalized: varchar('email_normalized', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('member'),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceEmailIdx: index('workspace_invitations_workspace_id_email_idx').on(t.workspaceId, t.emailNormalized),
}))

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 10 }).notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('active'),
  workflowConfig: jsonb('workflow_config'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => ({
  uniq: uniqueIndex('projects_workspace_id_key_idx').on(t.workspaceId, t.key),
  workspaceIdx: index('projects_workspace_id_idx').on(t.workspaceId),
}))

export const projectSequences = pgTable('project_sequences', {
  projectId: uuid('project_id').primaryKey().references(() => projects.id, { onDelete: 'cascade' }),
  nextIssueNumber: integer('next_issue_number').notNull().default(1),
})

export const sprints = pgTable('sprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  goal: text('goal'),
  state: sprintStateEnum('state').notNull().default('planned'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  retrospectiveNotes: text('retrospective_notes'),
}, (t) => ({
  projStateIdx: index('sprints_project_id_state_idx').on(t.projectId, t.state),
  oneActive: uniqueIndex('sprints_one_active_per_project_idx').on(t.projectId).where(sql`state = 'active'`),
}))

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  type: issueTypeEnum('type').notNull().default('task'),
  status: varchar('status', { length: 32 }).notNull().default('todo'),
  priority: issuePriorityEnum('priority').notNull().default('medium'),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  sprintId: uuid('sprint_id').references(() => sprints.id, { onDelete: 'set null' }),
  parentIssueId: uuid('parent_issue_id'),
  estimatePoints: integer('estimate_points'),
  originalEstimateMinutes: integer('original_estimate_minutes'),
  remainingEstimateMinutes: integer('remaining_estimate_minutes'),
  dueDate: date('due_date'),
  rank: doublePrecision('rank').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => ({
  uniqNumber: uniqueIndex('issues_project_id_number_idx').on(t.projectId, t.number),
  projStatusIdx: index('issues_project_id_status_idx').on(t.projectId, t.status),
  workspaceAssigneeIdx: index('issues_workspace_id_assignee_id_status_idx').on(t.workspaceId, t.assigneeId, t.status),
  sprintIdx: index('issues_sprint_id_status_idx').on(t.sprintId, t.status),
  projRankIdx: index('issues_project_id_rank_idx').on(t.projectId, t.rank),
  workspaceUpdatedIdx: index('issues_workspace_id_updated_at_idx').on(t.workspaceId, t.updatedAt),
}))

export const issueLabels = pgTable('issue_labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 50 }).notNull(),
  color: varchar('color', { length: 32 }).notNull().default('#6366f1'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('issue_labels_project_id_normalized_name_idx').on(t.projectId, t.normalizedName),
}))

export const issueLabelLinks = pgTable('issue_label_links', {
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => issueLabels.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniq: uniqueIndex('issue_label_links_issue_id_label_id_idx').on(t.issueId, t.labelId),
}))

export const issueComments = pgTable('issue_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  issueIdx: index('issue_comments_issue_id_created_at_idx').on(t.issueId, t.createdAt),
}))

export const issueEvents = pgTable('issue_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id').notNull(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  issueIdx: index('issue_events_issue_id_created_at_idx').on(t.issueId, t.createdAt),
  projectIdx: index('issue_events_project_id_created_at_idx').on(t.projectId, t.createdAt),
}))

export const activityEvents = pgTable('activity_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'),
  actorId: uuid('actor_id'),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index('activity_events_workspace_id_created_at_idx').on(t.workspaceId, t.createdAt),
}))

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  type: varchar('type', { length: 64 }).notNull(),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata'),
  dedupeKey: varchar('dedupe_key', { length: 128 }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  recipientIdx: index('notifications_recipient_id_read_at_idx').on(t.recipientId, t.readAt),
}))

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: varchar('theme', { length: 16 }).default('system'),
  compactDensity: boolean('compact_density').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sprintSnapshots = pgTable('sprint_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  sprintId: uuid('sprint_id').notNull().references(() => sprints.id, { onDelete: 'cascade' }),
  issueId: uuid('issue_id').notNull(),
  eventType: varchar('event_type', { length: 32 }).notNull(),
  estimatePoints: integer('estimate_points'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  sprintIdx: index('sprint_snapshots_sprint_id_idx').on(t.sprintId),
}))
