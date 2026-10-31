import { getCookie } from '@tanstack/react-start/server'
import { getSession, SESSION_COOKIE } from './session'
import { UnauthenticatedError } from '#/lib/errors'

export const requireSession = async () => { const token = getCookie(SESSION_COOKIE); const result = await getSession(token ?? ''); if (!result) throw new UnauthenticatedError(); return { sessionId: result.session.id, userId: result.user.id, user: result.user } }
export async function getAuthenticatedUser() { const result = await getSession(getCookie(SESSION_COOKIE) ?? ''); return result?.user ?? null }
