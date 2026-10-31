import { cn } from '#/lib/utils'

const TYPE: Record<string, { bg: string; glyph: string }> = {
  story: { bg: 'bg-[#36b37e]', glyph: '▮' },
  task: { bg: 'bg-[#4bade8]', glyph: '✓' },
  bug: { bg: 'bg-[#e5493a]', glyph: '●' },
  epic: { bg: 'bg-[#904ee2]', glyph: '⚡' },
}
export function IssueTypeIcon({ type, className }: { type: string; className?: string }) {
  const t = TYPE[type] ?? TYPE.task
  return <span title={type} aria-label={type} className={cn('inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] leading-none text-white', t.bg, className)}>{t.glyph}</span>
}

const PRIORITY: Record<string, { glyph: string; color: string }> = {
  highest: { glyph: '⏫', color: 'text-[#cd1317]' },
  high: { glyph: '▲', color: 'text-[#e5493a]' },
  medium: { glyph: '▲', color: 'text-[#ff991f]' },
  low: { glyph: '▼', color: 'text-[#2684ff]' },
  lowest: { glyph: '▼', color: 'text-[#4bade8]' },
}
export function PriorityIcon({ priority }: { priority: string }) {
  const p = PRIORITY[priority] ?? PRIORITY.medium
  return <span title={priority} aria-label={`${priority} priority`} className={cn('text-xs', p.color)}>{p.glyph}</span>
}

export function Avatar({ name, size = 24 }: { name?: string | null; size?: number }) {
  const initials = (name ?? '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return <span title={name ?? 'Unassigned'} style={{ width: size, height: size, fontSize: size * 0.4 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#6554c0] font-medium text-white">{initials}</span>
}

const STATUS: Record<string, string> = {
  todo: 'bg-[#dfe1e6] text-[#42526e]',
  in_progress: 'bg-[#deebff] text-[#0747a6]',
  in_review: 'bg-[#eae6ff] text-[#403294]',
  done: 'bg-[#e3fcef] text-[#006644]',
}
export function StatusLozenge({ status }: { status: string }) {
  return <span className={cn('inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase', STATUS[status] ?? STATUS.todo)}>{status.replace('_', ' ')}</span>
}

export function LabelChip({ label, onRemove }: { label: { name: string; color?: string | null }; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm px-1.5 text-[11px] font-medium text-white" style={{ background: label.color ?? '#6366f1' }}>
      {label.name}
      {onRemove && <button type="button" aria-label={`Remove label ${label.name}`} onClick={onRemove} className="leading-none hover:opacity-70">×</button>}
    </span>
  )
}

export const STATUS_OPTIONS = [
  { key: 'todo', label: 'To Do' }, { key: 'in_progress', label: 'In Progress' }, { key: 'in_review', label: 'In Review' }, { key: 'done', label: 'Done' },
]
export const TYPE_OPTIONS = ['story', 'task', 'bug', 'epic']
export const PRIORITY_OPTIONS = ['lowest', 'low', 'medium', 'high', 'highest']
export type Member = { id: string; name: string; email: string; role: string }
