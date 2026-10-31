import { definePlugin } from 'nitro'
import { securityHeaders } from '../security/headers'
import { pool } from '../db'

const headers = securityHeaders(process.env.NODE_ENV === 'production')

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('response', (res) => {
    for (const [k, v] of Object.entries(headers)) { try { res.headers.set(k, v) } catch { /* immutable response */ } }
  })
  // Graceful shutdown: Nitro awaits `close` on SIGTERM/SIGINT before exiting.
  nitroApp.hooks.hook('close', async () => { await pool.end().catch(() => {}) })
})
