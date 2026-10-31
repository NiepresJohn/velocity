/** Returns a same-origin relative path, or `fallback`. Blocks //host, /\host, scheme URLs and control chars. */
export function safeRedirect(value: unknown, fallback = '/app'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback
  try {
    const u = new URL(value, 'http://velocity.invalid')
    if (u.origin !== 'http://velocity.invalid') return fallback
    const path = u.pathname + u.search + u.hash
    return path === '/login' || path.startsWith('/login?') ? fallback : path
  } catch { return fallback }
}

/** Client-side password rules (server enforces min 8 / max 128 too). */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (pw.length > 128) return 'Use at most 128 characters.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include at least one letter and one number.'
  return null
}
