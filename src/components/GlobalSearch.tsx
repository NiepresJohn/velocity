import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { search } from '#/server/services/search'
import { IssueTypeIcon } from './ui'

type Result = { kind: 'issue' | 'sprint'; id: string; projectId: string; label: string; sub: string; type?: string }

export function GlobalSearch({ workspaceId }: { workspaceId?: string | null }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (!workspaceId || term.length < 2) { setResults([]); setLoading(false); return }
    let live = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { q: term, workspaceId } })
        if (!live) return
        setResults([
          ...r.issues.map((i): Result => ({ kind: 'issue', id: i.id, projectId: i.projectId, label: i.title, sub: i.key, type: i.type })),
          ...r.sprints.map((s): Result => ({ kind: 'sprint', id: s.id, projectId: s.projectId, label: s.name, sub: `Sprint · ${s.state}` })),
        ])
        setActive(0)
      } catch { if (live) setResults([]) }
      finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [q, workspaceId])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function go(r: Result) {
    setOpen(false); setQ('')
    if (r.kind === 'issue') void navigate({ to: '/app/projects/$projectId/issues/$issueId', params: { projectId: r.projectId, issueId: r.id } })
    else void navigate({ to: '/app/projects/$projectId/sprints/$sprintId', params: { projectId: r.projectId, sprintId: r.id } })
  }

  const show = open && q.trim().length >= 2
  return (
    <div ref={box} className="relative mr-2">
      <input aria-label="Search" role="combobox" aria-expanded={show} aria-controls="global-search-list" aria-autocomplete="list" placeholder="Search" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]) }
        }}
        className="w-56 rounded-sm bg-white/15 px-3 py-1.5 text-sm text-white placeholder:text-white/70 focus:bg-white focus:text-ink focus:placeholder:text-ink-soft" />
      {show && (
        <ul id="global-search-list" role="listbox" className="absolute right-0 top-9 z-30 max-h-96 w-96 overflow-y-auto rounded-sm border border-line bg-white py-1 text-ink shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">{loading ? 'Searching…' : 'No results'}</li>}
          {results.map((r, i) => (
            <li key={r.kind + r.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? 'bg-surface' : ''}`}>
                {r.type && <IssueTypeIcon type={r.type} />}
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-ink-soft">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
