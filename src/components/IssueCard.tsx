import { Link } from '@tanstack/react-router'
import { Avatar, IssueTypeIcon, PriorityIcon } from './ui'

export type IssueRow = {
  id: string; number: number; title: string; type: string; status: string; priority: string
  estimatePoints: number | null; assigneeId: string | null; sprintId: string | null; labels: { id: string; name: string }[]
}

export function IssueCard({ issue, projectKey, projectId, assigneeName, draggable, onDragStart }: {
  issue: IssueRow; projectKey: string; projectId: string; assigneeName?: string | null
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void
}) {
  return (
    <div draggable={draggable} onDragStart={onDragStart} className="cursor-grab rounded-sm border border-transparent bg-white p-2 shadow-[0_1px_1px_rgba(9,30,66,.25)] hover:bg-[#f4f5f7]">
      <Link to="/app/projects/$projectId/issues/$issueId" params={{ projectId, issueId: issue.id }} className="block text-sm text-ink hover:underline">{issue.title}</Link>
      {issue.labels.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{issue.labels.map((l) => <span key={l.id} className="rounded-sm bg-[#dfe1e6] px-1 text-[11px]">{l.name}</span>)}</div>}
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
        <IssueTypeIcon type={issue.type} />
        <span className="font-medium">{projectKey}-{issue.number}</span>
        <span className="flex-1" />
        {issue.estimatePoints != null && <span className="rounded-full bg-[#dfe1e6] px-1.5 text-[11px] font-medium text-ink">{issue.estimatePoints}</span>}
        <PriorityIcon priority={issue.priority} />
        {issue.assigneeId && <Avatar name={assigneeName ?? '?'} size={20} />}
      </div>
    </div>
  )
}
