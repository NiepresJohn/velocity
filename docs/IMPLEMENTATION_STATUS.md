# Velocity — Implementation Checkpoint

**Date:** 2026-11-01  
**Branch:** main | **Commits:** ~30+  
**Status:** Core scaffolding + services written | Typecheck clean, `vite build` passes, login → dashboard verified in browser

---

## What's Implemented

### Infrastructure
- ✅ TanStack Start 1.169 scaffold (Vite 8, Nitro SSR)
- ✅ Drizzle ORM with PostgreSQL 16 schema (17 tables, indexes, constraints)
- ✅ Docker Compose for local Postgres
- ✅ Zod env validation at startup

### Auth Layer
- ✅ Registration with session creation + cookie
- ✅ Login/logout with Argon2id password hashing
- ✅ Password reset flow (token-based)
- ✅ Account deactivation endpoint
- ✅ Session rotation on login

### Permission System
- ✅ Workspace membership model (owner/admin/member/viewer)
- ✅ Role-based access control helpers
- ✅ Cross-workspace tenant isolation enforcement

### Server Services
- ✅ **Workspaces:** CRUD, switch, invite member, revoke, remove, change role, transfer ownership
- ✅ **Projects:** CRUD, archive, restore
- ✅ **Issues:** CRUD, transitions, labels (CRUD + links), comments (CRUD), sprint assignment
- ✅ **Sprints:** CRUD, start, complete, cancel — with commitment snapshots
- ✅ **Dashboard:** workspace overview, project overview, my-work stubs
- ✅ **Reports:** sprint report, velocity history, burndown chart data, issue distribution
- ✅ **Search:** cross-entity search across issues and sprints
- ✅ **Notifications:** list, mark read, mark all read, unread count
- ✅ **Activity Feed:** workspace-level and per-issue activity timeline
- ✅ **Email adapter:** dev-mode log-based email sending

### Routes (File-Based Routing)
- ✅ `/` — public landing
- ✅ `/login`, `/register`, `/forgot-password`, `/reset-password`
- ✅ `/invite/$token` — accept invitation
- ✅ `/unauthorized`, `/*` — not-found catch-all
- ✅ `/app/route.tsx` — auth-guarded layout with sidebar navigation
- ✅ `/app/` — dashboard home
- ✅ `/app/my-work`, `/app/projects`, `/app/projects/new`
- ✅ `/app/team`, `/app/notifications`, `/app/settings/*`
- ✅ `/app/projects/$projectId/backlog`, `$projectId/board`
- ✅ `/app/projects/$projectId/sprints`, `new`, `$sprintId`, `$sprintId/report`
- ✅ `/app/projects/$projectId/issues/$issueId`

### Database Schema
All 17 tables from PRD §6: users, sessions, password_reset_tokens, workspaces, workspace_members, workspace_invitations, projects, project_sequences, issues, issue_labels, issue_label_links, sprints, issue_comments, issue_events, activity_events, notifications, user_preferences, sprint_snapshots.

---

## Remaining Work (Blocked by Time)

### Critical Fixes Needed
1. **TypeScript typecheck:** 11 errors remain in sprints.ts, workspaces.ts (mostly unused imports, SQL typing quirks from Drizzle v0.38)
2. **Route tree generation:** run `pnpm generate-routes` to regenerate routeTree.gen.ts after recent file moves
3. **Build test:** `pnpm build` not yet verified — needs typecheck to pass first
4. **Seed script:** `src/server/db/seed.ts` not written — demo data for development
5. **UI polish:** shadcn/ui integration, form components, board DnD, charts for reports
6. **Integration tests:** Vitest setup with test database, critical path E2E with Playwright
7. **CI:** GitHub Actions workflow
8. **Deployment docs:** production Dockerfile, deployment guide

### Quick Commands to Resume
```bash
cd /home/niepres/GitHub/velocity
pnpm typecheck          # Fix remaining 11 TS errors
npx tsr generate         # Regenerate route tree
pnpm build               # Verify production build works
pnpm db:migrate           # Apply pending migrations
pnpm db:seed              # Seed demo data (needs implementation)
pnpm dev                  # Start dev server
```

### Key Files Referenced by TS Errors
- `src/server/services/sprints.ts` — line 17 (SQL typing), line 40 (insert syntax)
- `src/server/services/workspaces.ts` — line 48 (`requireMembership` → `getMembership`)
- `src/server/auth/functions.ts` — verify exports match service imports
- `src/routes/` — verify route structure matches generated tree

---

## Architecture Decisions Made

1. **TanStack Start 1.169** over older versions (current stable, React 19 compatible)
2. **Drizzle ORM** for type-safe queries with PostgreSQL
3. **Cookie-based sessions** (HttpOnly, Secure, SameSite=Lax)
4. **Argon2id** for password hashing
5. **Process-local rate limiting** (documented as dev limitation)
6. **JSONB metadata** on events/notifications with serialization guards
7. **Fractional-indexing rank** for backlog ordering via double precision
8. **Sprint snapshots** for immutable report history
9. **No shadcn/ui** — direct Tailwind CSS classes for speed (P0 priority)
10. **Native HTML drag-and-drop** planned for kanban board (no dnd-kit dependency needed)

---

## Update 2026-11-01
Done: typecheck + build green; SSR shell via `__root.tsx`/`getRouter`; server-only code kept out of client bundle (`auth/guard.ts`, lazy cookie helpers); migration 0001 generated; `db:*` scripts and `db:seed` (demo@velocity.dev / demo-password-1, local DB only).
Run locally: `VELOCITY_PG_PORT=5434 docker compose up -d postgres`, set DATABASE_URL to that port, `pnpm db:migrate && pnpm db:seed`. Build with NODE_ENV=production.
Still open: board DnD UI, report charts, Vitest/Playwright tests, CI, Dockerfile, most pages are thin stubs.

## Update 2026-11-01 (Jira UI pass)
Done: Jira-style shell (top bar, project sidebar), projects list/create, board (drag, inline create), backlog (sprints, drag, start), issue detail, sprints list/detail/report with SVG burndown, dashboard, my work, notifications, team (list + invite). `/healthz`, Dockerfile, CI workflow, Vitest (utils only).
Security fixes found while wiring: search ignored workspace (cross-tenant leak); label/comment/activity/project-dashboard/moveToSprint/listMembers had no membership check; edit/deleteComment unauthenticated. All now require membership; comment edits author-only.
Still open: profile/preferences/workspace settings pages are stubs; avatars on cards show "?" (no member names in issue list); no DB-backed tests (server fns need request context); email adapter only logs; rate limiter is process-local; deploy needs domain + managed Postgres + SMTP from John (Phase 5 not executed, nothing pushed/deployed).

## Update 2026-11-01 (full pass)
All pages functional: settings (profile, preferences, security, workspace, members), invite flow, auth pages, landing, issue detail (assignee, labels, due date, parent, comments edit/delete, activity), create modal, global search, board filters + rank-aware drag, backlog reorder/bulk move/complete-sprint dialog. Prod hardening: security headers, Postgres rate limiter, SMTP email, graceful shutdown, docker-compose.prod.yml + Caddyfile, docs/DEPLOYMENT.md, README.
Verified in browser against local DB: login, create issue, search, drag, comment, backlog, sprint create/complete, burndown report, settings, invite -> register -> accept.
Not run: real SMTP send, Docker/Caddy deploy (needs domain, managed Postgres, SMTP credentials from John).
