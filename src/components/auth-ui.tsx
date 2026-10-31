import { Link } from '@tanstack/react-router'
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-surface px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2 text-xl font-bold text-jira"><span aria-hidden className="inline-block h-6 w-6 rounded-sm bg-jira" />Velocity</Link>
      <div className="w-full max-w-sm rounded-sm border border-line bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </main>
  )
}

export function Field({ label, id, hint, error, ...props }: { label: string; id: string; hint?: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">{label}</label>
      <input id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="w-full rounded-sm border-2 border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-jira focus:bg-white focus:outline-none disabled:opacity-60" {...props} />
      {error ? <p id={`${id}-err`} className="mt-1 text-xs text-[#bf2600]">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = { error: 'bg-[#ffebe6] text-[#bf2600]', success: 'bg-[#e3fcef] text-[#006644]', info: 'bg-[#deebff] text-[#0747a6]' }[kind]
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-sm px-3 py-2 text-sm ${cls}`}>{children}</div>
}

export function SubmitButton({ pending, children, pendingText }: { pending: boolean; children: ReactNode; pendingText: string }) {
  // Disabled until hydrated so an early click can't submit natively (password in the URL).
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <button type="submit" disabled={pending || !ready} className="w-full rounded-sm bg-jira px-3 py-2 text-sm font-medium text-white hover:bg-jira-dark disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? pendingText : children}
    </button>
  )
}

/** Server-fn errors can arrive as zod JSON dumps; show something readable. */
export function errorMessage(err: unknown, fallback: string) {
  const m = err instanceof Error ? err.message : ''
  return m && !m.trim().startsWith('[') && !m.trim().startsWith('{') ? m : fallback
}

export function StatusPage({ code, title, text, children }: { code: string; title: string; text: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <p className="text-6xl font-bold text-jira" aria-hidden>{code}</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">{text}</p>
      <div className="mt-6 flex gap-3">{children}</div>
    </main>
  )
}
export const btnPrimary = 'rounded-sm bg-jira px-4 py-2 text-sm font-medium text-white hover:bg-jira-dark'
export const btnSecondary = 'rounded-sm border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface'
