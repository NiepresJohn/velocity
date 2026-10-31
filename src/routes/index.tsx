import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/server/auth/functions'
import { btnPrimary, btnSecondary } from '#/components/auth-ui'

export const Route = createFileRoute('/')({
  beforeLoad: async () => { if (await getCurrentSession()) throw redirect({ to: '/app' }) },
  component: Home,
})

const features = [
  { id: 'boards', title: 'Boards', text: 'Drag work across To do, In progress, In review and Done. Everyone sees the same live picture of the sprint.' },
  { id: 'backlog', title: 'Backlog', text: 'Rank, estimate and label issues in one list. Pull the right work into the next sprint with a click.' },
  { id: 'sprints', title: 'Sprints', text: 'Plan a goal, start the clock, and close it out with a clear view of what shipped and what rolls over.' },
  { id: 'reports', title: 'Reports', text: 'Burndown and velocity charts built from real history, so planning gets more accurate every sprint.' },
]

function Home() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-jira"><span aria-hidden className="inline-block h-6 w-6 rounded-sm bg-jira" />Velocity</Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface rounded-sm">Log in</Link>
            <Link to="/register" className={btnPrimary}>Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">Ship software with a team that moves in sync.</h1>
              <p className="mt-4 max-w-lg text-lg text-ink-soft">Velocity is the issue tracker for teams who plan in sprints: boards, a ranked backlog and honest reports in one fast workspace.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className={btnPrimary}>Create your workspace</Link>
                <Link to="/login" className={btnSecondary}>Log in</Link>
              </div>
            </div>
            <div aria-hidden className="rounded-sm border border-line bg-white p-3 shadow-sm">
              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold uppercase text-ink-soft">
                {[['To do', ['Fix login redirect', 'Burndown chart']], ['In progress', ['Board drag and drop']], ['Done', ['Set up CI', 'Seed demo data']]].map(([col, cards]) => (
                  <div key={col as string} className="rounded-sm bg-surface p-2">
                    <div className="mb-2">{col as string}</div>
                    {(cards as string[]).map((c) => <div key={c} className="mb-2 rounded-sm border border-line bg-white p-2 text-xs font-normal normal-case text-ink">{c}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-h">
          <h2 id="features-h" className="text-2xl font-semibold">Everything a sprint needs</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <article key={f.id} id={f.id} className="rounded-sm border border-line p-5">
                <span aria-hidden className="mb-3 block h-1 w-8 rounded-sm bg-jira" />
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-nav">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center">
            <h2 className="text-2xl font-semibold text-white">Ready to find your velocity?</h2>
            <Link to="/register" className="rounded-sm bg-white px-5 py-2 text-sm font-semibold text-jira hover:bg-surface">Get started free</Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">Velocity</footer>
    </div>
  )
}
