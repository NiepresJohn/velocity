# Velocity

A self-hostable, multi-tenant agile planning app in the style of Jira: workspaces, projects, a kanban board, a ranked backlog, sprints with burndown reports, issues with comments and labels, notifications, and team management.

Built with TanStack Start (React 19, SSR), Drizzle ORM and PostgreSQL 16.

## Features

**Planning**
- **Board:** four-column kanban with drag and drop. Dragging updates status and keeps order within a column. Filter by text, assignee, type or label, or show only your issues.
- **Backlog:** ranked list grouped by sprint. Drag to reorder across sprints, bulk-move selected issues, edit estimates inline, and create, start and complete sprints. Completing a sprint can move unfinished work back to the backlog.
- **Sprints:** list, detail view and a sprint report with committed vs completed points and an SVG burndown chart.
- **Issues:** story, task, bug and epic types. Priority, status, story points, assignee, due date, parent epic and child issues, labels with colors, markdown comments (authors can edit and delete their own), activity history, archive and delete.
- **Create issue modal** from anywhere, plus **global search** in the top bar (matches titles and keys such as `VEL-12`).
- **Dashboards:** workspace overview, "Your work" (overdue, due this week, assigned to you) and notifications.

**Workspaces and people**
- Multiple workspaces per user, with a switcher.
- Roles: owner, admin, member, viewer. Admins manage members, but cannot touch owners. The last owner cannot be demoted or removed, and ownership is transferred explicitly.
- Email invitations with expiry, revocation and an accept flow that works for new and existing users.
- Settings pages for profile, preferences, security (active sessions, change password, deactivate account), workspace and members.

**Security and operations**
- Argon2id password hashing, HttpOnly session cookies with rotation on login, and password reset with single-use tokens.
- Tenant isolation: every server function checks workspace membership, and write access requires a member role or higher.
- Rate limiting on login, register and reset (Postgres-backed in production, in-memory in development).
- Security headers (CSP, HSTS in production, X-Frame-Options, Referrer-Policy, Permissions-Policy) and a safe `?redirect=` that blocks open redirects.
- SMTP email through nodemailer, a `/healthz` readiness probe, graceful shutdown of the database pool, a Dockerfile, a production compose file with Caddy (automatic HTTPS) and a GitHub Actions workflow.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | TanStack Start 1.x (SSR), TanStack Router, React 19 |
| Server | Nitro (`node-server` preset), server functions via `createServerFn` |
| Database | PostgreSQL 16, Drizzle ORM and drizzle-kit migrations |
| Validation | Zod |
| Styling | Tailwind CSS 4 |
| Auth | Argon2id, server-side sessions in Postgres |
| Tests | Vitest |
| Tooling | Vite 8, TypeScript, pnpm |

## Getting started

Requires Node 22 and pnpm.

```sh
pnpm install
cp .env.example .env            # then set SESSION_SECRET (32+ characters)

# Start PostgreSQL. If port 5432 is taken, pick another one:
export VELOCITY_PG_PORT=5434
docker compose up -d
# Match it in .env, for example:
# DATABASE_URL=postgresql://velocity:velocity@localhost:5434/velocity

pnpm db:migrate                 # apply migrations
pnpm db:seed                    # demo data (refuses to run against a non-local database)
pnpm dev                        # http://localhost:3000
```

### Demo logins (development only)

The password for all seeded users is `demo-password-1`.

| User | Role |
| --- | --- |
| `demo@velocity.dev` | owner |
| `bob@velocity.dev` | member |
| `cara@velocity.dev` | viewer |

The seed creates two projects (`VEL`, `WEB`), a completed and an active sprint, 30 issues, labels, comments and notifications.

To reseed from scratch (this destroys local data):

```sh
docker compose exec postgres psql -U velocity -c 'truncate users, workspaces, sessions, password_reset_tokens, rate_limits cascade'
pnpm db:seed
```

### Email in development

With `EMAIL_PROVIDER=log` (the default), invite and password-reset emails are printed to the server log, links included. Set `EMAIL_PROVIDER=smtp` with the `SMTP_*` variables and `EMAIL_FROM` to send real mail. A local Mailpit container on port 1025 works for testing.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build into `.output/` (run with `NODE_ENV=production`) |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit tests |
| `pnpm generate` | Regenerate the route tree |
| `pnpm db:generate` | Create a migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Load demo data (local only) |

Run the production build with `node .output/server/index.mjs`.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `SESSION_SECRET` | Secret for session tokens, 32+ characters | required |
| `APP_URL` | Public base URL used in emails | `http://localhost:3000` |
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `EMAIL_PROVIDER` | `log`, `smtp` or `none` | `log` |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP delivery (required in production) | none |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Rate limiter window and ceiling | `60000`, `20` |
| `DB_POOL_MAX` | Maximum database connections | `10` |
| `SESSION_COOKIE_NAME`, `WORKSPACE_COOKIE_NAME` | Cookie names | `velocity_session`, `velocity_workspace` |

See `.env.example` and `.env.production.example`.

## Project layout

```
src/
  routes/            File-based routes (public pages, /app shell, settings, invite)
  components/        Shared UI: IssueCard, CreateIssueModal, GlobalSearch, ui primitives
  server/
    services/        Server functions by domain: issues, sprints, projects, reports,
                     dashboard, notifications, search, activity, workspaces, settings
    auth/            Sessions, password hashing, the server-only session guard
    permissions/     Workspace membership and role checks
    db/              Drizzle schema, client and seed script
    email/           Log and SMTP adapters, templates
    security/        Rate limiter and security headers
    plugins/         Nitro runtime hooks (headers, graceful shutdown)
  lib/               Env validation, errors, redirects, roles, utilities
drizzle/             SQL migrations
docs/                PRD, implementation status, deployment guide
```

Server functions that touch cookies or the database live under `src/server` and import server-only helpers lazily, so they never end up in the client bundle.

## Deployment

The repository includes a `Dockerfile`, `docker-compose.prod.yml` (app, PostgreSQL and Caddy with automatic HTTPS), a `Caddyfile` and `.env.production.example`. Migrations run as an explicit release step (`pnpm db:migrate`), never on app start. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the build, migration, backup, rollback and health-check procedures.

Before exposing an instance publicly you need a domain, a PostgreSQL database and SMTP credentials.

## Known limitations

- The production CSP allows inline scripts, because TanStack Start emits inline hydration scripts. Tightening it requires nonces.
- Tests cover pure logic only (roles, rank, redirects, rate limiting, headers, utilities). Server functions have no database-backed tests yet.
- Archived issues can only be restored from their own page; there is no archived list.
- Removing a member does not invalidate their existing sessions until they expire.

## Documentation

- [Product requirements](docs/PRD.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Deployment guide](docs/DEPLOYMENT.md)
