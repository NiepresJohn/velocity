import { Link } from '@tanstack/react-router'
import { Avatar, IssueTypeIcon, LabelChip, PriorityIcon, STATUS_OPTIONS } from './ui'

export type IssueRow = {
  id: string; number: number; title: string; type: string; status: string; priority: string
  estimatePoints: number | null; assigneeId: string | null; assigneeName?: string | null; sprintId: string | null
  dueDate?: string | null; rank?: number
  labels: { id: string; name: string; color?: string | null }[]
}

export function IssueCard({ issue, projectKey, projectId, assigneeName, draggable, onDragStart, onDragOver, onDragEnd, dropMarker, onAssignMe, onStatus }: {
  issue: IssueRow; projectKey: string; projectId: string; assigneeName?: string | null
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragOver?: (e: React.DragEvent) => void; onDragEnd?: () => void
  dropMarker?: 'before' | 'after' | null
  onAssignMe?: () => void; onStatus?: (status: string) => void
}) {
  const name = assigneeName ?? issue.assigneeName
  const overdue = issue.dueDate && issue.status !== 'done' && issue.dueDate < new Date().toISOString().slice(0, 10)
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}
      className={`group relative cursor-grab rounded-sm border border-transparent bg-white p-2 shadow-[0_1px_1px_rgba(9,30,66,.25)] hover:bg-[#f4f5f7] focus-within:bg-[#f4f5f7] ${dropMarker === 'before' ? 'border-t-2 !border-t-jira' : ''} ${dropMarker === 'after' ? 'border-b-2 !border-b-jira' : ''}`}>
      <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: issue.id }} className="block text-sm text-ink hover:underline">{issue.title}</Link>
      {issue.labels.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{issue.labels.map((l) => <LabelChip key={l.id} label={l} />)}</div>}
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
        <IssueTypeIcon type={issue.type} />
        <span className="font-medium">{projectKey}-{issue.number}</span>
        {issue.dueDate && <span className={overdue ? 'font-medium text-[#bf2600]' : ''} title="Due date">{issue.dueDate}</span>}
        <span className="flex-1" />
        {issue.estimatePoints != null && <span className="rounded-full bg-[#dfe1e6] px-1.5 text-[11px] font-medium text-ink">{issue.estimatePoints}</span>}
        <PriorityIcon priority={issue.priority} />
        {issue.assigneeId && <Avatar name={name ?? '?'} size={20} />}
      </div>
      {(onAssignMe || onStatus) && (
        <div className="mt-2 hidden items-center gap-2 border-t border-line pt-2 group-hover:flex group-focus-within:flex">
          {onStatus && (
            <select aria-label={`Move ${projectKey}-${issue.number} to`} value={issue.status} onChange={(e) => onStatus(e.target.value)} className="rounded-sm border border-line bg-white px-1 py-0.5 text-xs">
              {STATUS_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          )}
          {onAssignMe && <button type="button" onClick={onAssignMe} className="rounded-sm px-1.5 py-0.5 text-xs text-jira hover:bg-black/5">Assign to me</button>}
        </div>
      )}
    </div>
  )
}
