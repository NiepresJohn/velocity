import { z } from 'zod'

export const createIssueSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(10000).optional().default(''),
  type: z.enum(['story', 'task', 'bug', 'epic']).default('task'),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).default('medium'),
  status: z.string().min(2).max(32).default('todo'),
  assigneeId: z.string().uuid().optional(),
  estimatePoints: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().date().or(z.date()).optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(['story', 'task', 'bug', 'epic']).optional(),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).optional(),
  status: z.string().min(2).max(32).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  estimatePoints: z.number().int().min(0).max(100).nullable().optional(),
  dueDate: z.string().date().or(z.date()).nullable().optional(),
})

export const issueTransitionSchema = z.object({
  status: z.string().min(2).max(32),
})

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
})

export const createSprintSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  goal: z.string().max(1000).optional(),
  startDate: z.string().date().or(z.date()),
  endDate: z.string().date().or(z.date()),
})

export const updateSprintSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  goal: z.string().max(1000).optional(),
  startDate: z.string().date().or(z.date()).optional(),
  endDate: z.string().date().or(z.date()).optional(),
  retrospectiveNotes: z.string().max(10000).optional(),
})

export const commentSchema = z.object({
  body: z.string().min(1).max(5000),
})

export const listIssuesSchema = z.object({
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
}).default({})

export const reorderBacklogSchema = z.object({
  ids: z.array(z.string().uuid()),
})

export const inviteMemberSchema = z.object({
  email: z.string().transform((v) => v.toLowerCase().trim()).pipe(z.string().email()),
  role: z.enum(['member', 'viewer']).default('member'),
})

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  key: z.string().min(2).max(10).toUpperCase().regex(/^[A-Z0-9]+$/),
  description: z.string().max(2000).optional(),
})
