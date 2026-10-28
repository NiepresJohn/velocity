import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { notifications } from '../db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { requireSession } from '#/server/auth/functions'

export const listNotifications = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid(), unreadOnly: z.boolean().default(false), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const wheres = [eq(notifications.recipientId, userId), eq(notifications.workspaceId, data.workspaceId)]
    if (data.unreadOnly) wheres.push(isNull(notifications.readAt))
    const rows = await db.select().from(notifications).where(and(...wheres)).orderBy(desc(notifications.createdAt)).limit(50).offset((data.page - 1) * 50)
    return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), readAt: r.readAt?.toISOString() ?? null, metadata: null } as const))
  })

export const getUnreadCount = createServerFn({ method: 'GET' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    const row = await db.select({ c: count() }).from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.workspaceId, data.workspaceId), isNull(notifications.readAt)))
      .limit(1)
    return { count: row[0]?.c ?? 0 }
  })

export const markNotificationRead = createServerFn({ method: 'POST' })
  .validator(z.object({ notificationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, data.notificationId), eq(notifications.recipientId, userId)))
    return { ok: true }
  })

export const markAllNotificationsRead = createServerFn({ method: 'POST' })
  .validator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { userId } = await requireSession()
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientId, userId), eq(notifications.workspaceId, data.workspaceId), isNull(notifications.readAt)))
    return { ok: true }
  })

import { count } from 'drizzle-orm'
