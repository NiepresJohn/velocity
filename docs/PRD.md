# Velocity --- Product Requirements & Engineering Specification

> **Document type:** Product Requirements Document (PRD) +
> implementation contract\
> **Product:** Velocity --- Agile Sprint Planner & Team Dashboard\
> **Status:** Implementation-ready baseline\
> **Repository:** `/home/niepres/GitHub/velocity`\
> **Default branch:** `main`\
> **Database:** PostgreSQL 16\
> **Primary objective:** Build a complete, secure, polished, tested,
> deployable agile planning application---not a static prototype.

------------------------------------------------------------------------

## 0. Instructions to the implementation LLM

You are the lead product engineer, architect, designer, and QA engineer
responsible for implementing Velocity in the existing repository.

### 0.1 Required behavior

1.  **Inspect before changing.** Read the existing repository,
    `package.json`, lockfile, configuration, git status, existing
    PRD/product notes if present, and Docker Compose/database
    configuration. Do not assume the scaffold is empty until verified.
2.  **Preserve the project.** Work in the existing repository and
    existing package manager. Do not overwrite user work, reset Git,
    delete commits, or replace configuration without a clear technical
    reason.
3.  **Implement, don't merely describe.** Create the working
    application, database schema/migrations, server-side logic, UI,
    tests, seed/demo data, documentation, and deployment configuration.
4.  **Do not leave core flows mocked.** No fake buttons, placeholder
    pages, hard-coded dashboard metrics presented as live data,
    TODO-only handlers, or client-only persistence for core entities.
5.  **Use supported, mutually compatible package versions.** Inspect
    installed versions and current framework conventions. Prefer
    official package documentation and APIs over obsolete examples. Do
    not upgrade the entire stack gratuitously.
6.  **Make decisions autonomously.** Use this PRD as the source of
    truth. When a minor detail is unspecified, choose the simplest
    secure and accessible option, document it, and continue. Ask only if
    blocked by a truly irreversible decision or missing secret/external
    account.
7.  **Work in verified increments.** After each meaningful vertical
    slice, run relevant checks and fix regressions before proceeding.
8.  **No false completion claims.** At the end, report what was
    implemented, commands executed, tests passed/failed, configuration
    still needed, and known limitations. Never claim a test or
    deployment passed if it was not actually run.
9.  **Do not commit automatically.** Leave changes in the working tree
    unless explicitly instructed to commit.
10. **Do not stop at a plan.** Continue implementation until the
    acceptance criteria and completion checklist are satisfied or a real
    environment limitation prevents further progress.

### 0.2 Definition of done

The project is done only when: - a new developer can install
dependencies and start the app using the documented commands; - database
migrations apply cleanly to PostgreSQL 16; - an administrator can
create/configure a workspace and invite members; - a member can create
and manage projects, backlogs, sprints, issues, comments, and estimates
according to permissions; - sprint planning, board transitions,
filtering, and reporting use persisted data; - forms validate on both
client and server; - access control is enforced server-side and
cross-workspace data leakage is prevented; - loading, empty, error, and
success states are present; - the app is responsive, keyboard
accessible, and usable without motion; - automated tests cover critical
business rules and authorization; - lint, typecheck, unit/integration
tests, and production build pass; - production setup, migration, backup,
and environment configuration are documented.

------------------------------------------------------------------------

## 1. Product summary

Velocity is a team-oriented Agile sprint planning and delivery workspace
for teams that need one clear place to plan work, execute sprints,
monitor delivery, and understand team progress.

The product combines: - a team dashboard with current sprint health and
activity; - workspace and project management; - a product backlog with
prioritization and estimation; - sprint creation, planning, execution,
and completion; - a task board with status transitions; - issue detail
pages with descriptions, labels, assignees, due dates, estimates,
comments, and history; - team member and role management; - reports for
sprint outcomes, burndown, velocity, and work distribution; -
notifications and an activity feed; - personal preferences and workspace
settings.

The interface should feel focused, fast, polished, and information-dense
without becoming visually noisy. Three-dimensional visuals are a
supporting enhancement, not a dependency for core usability.

### 1.1 Product vision

Help teams move from a vague backlog to a shared, measurable sprint
plan, then make delivery status and blockers obvious without requiring
manual spreadsheet reporting.

### 1.2 Target users

-   **Workspace owner:** creates the workspace, controls ownership and
    billing-independent workspace settings.
-   **Workspace admin:** manages members, projects, roles, and workspace
    configuration.
-   **Product owner:** shapes backlog, priority, scope, and acceptance
    criteria.
-   **Scrum master / project lead:** prepares sprints, monitors flow,
    resolves blockers, and facilitates delivery.
-   **Developer / contributor:** owns issues, updates progress,
    collaborates, and estimates work.
-   **Viewer / stakeholder:** reads project, sprint, and report
    information without changing delivery data.

A user may hold different roles in different workspaces.

### 1.3 Product principles

1.  **Data integrity over animation.**
2.  **Fast common actions:** create issue, change status, assign work,
    and inspect sprint health should require minimal navigation.
3.  **Clear ownership:** each issue has an explicit status and may have
    an assignee.
4.  **No silent data loss:** unsaved changes, destructive actions, and
    failed requests must be clearly communicated.
5.  **Progress is computed from real records.**
6.  **Accessible by default:** keyboard operation, visible focus,
    contrast, labels, and reduced-motion support.
7.  **Tenant isolation:** workspace data is never accessible to
    unrelated users.
8.  **Progressive enhancement:** WebGL or animation failures must not
    prevent core workflows.

------------------------------------------------------------------------

## 2. Scope and priorities

### 2.1 P0 --- required for first production release

-   Authentication, sessions, logout, password recovery, and account
    settings.
-   Workspace creation, membership, invitations, role enforcement, and
    workspace switching.
-   Projects and project membership/access.
-   Issue creation, editing, viewing, deletion/archive, comments,
    labels, priorities, assignees, due dates, and estimates.
-   Backlog listing, search, filters, sorting, pagination/virtualization
    where useful, and drag-and-drop prioritization.
-   Sprint lifecycle: draft/planning, active, completed; dates; goal;
    issue assignment; start and complete operations.
-   Board with configurable workflow statuses, drag-and-drop status
    changes, and accessible non-drag alternatives.
-   Dashboard driven by persisted data.
-   Sprint reports: planned/completed work, completion rate, velocity
    history, and burndown where data supports it.
-   Activity history for significant changes.
-   Notifications/in-app notification center.
-   Responsive layouts, dark/light/system theme, empty/loading/error
    states.
-   PostgreSQL migrations, seed data, automated tests, CI-ready scripts,
    environment example, and deployment documentation.
-   Security protections, rate limiting on sensitive endpoints, and
    auditability for privileged actions.

### 2.2 P1 --- include if it can be completed without compromising P0 quality

-   Issue relationships (blocks/blocked by/relates to).
-   Saved filter views.
-   Workspace-level custom workflow configuration.
-   CSV export for issues and sprint reports.
-   Keyboard shortcuts and command palette.
-   Sprint retrospective notes.
-   Richer team capacity planning.
-   Notification preferences.

### 2.3 Explicitly out of scope for v1

Do not build these unless the repository already contains a working
implementation or the user explicitly changes scope: - paid
subscription/billing; - external integrations with Jira, Linear, GitHub,
Slack, or Microsoft Teams; - email delivery provider integration beyond
a clean adapter/interface and development fallback; - native mobile
apps; - enterprise SSO/SAML; - public anonymous workspaces; - complex
automation rules; - AI-generated sprint plans; - real-time multi-user
cursors or collaborative editing; - advanced financial/resource
planning.

Do not add an external integration that requires credentials and then
pretend it works without those credentials.

------------------------------------------------------------------------

## 3. Product information architecture

### 3.1 Global shell

Authenticated application shell: - left sidebar: workspace switcher,
primary navigation, project navigation, collapsible sections; - top bar:
current location/breadcrumbs, global search/command trigger, create
button, notifications, theme, profile menu; - content region: page
title, contextual actions, page body; - responsive mobile navigation
using a drawer/sheet; - optional right-side detail panel for quick issue
inspection where appropriate.

Sidebar navigation: 1. Overview 2. My work 3. Projects 4. Backlog
(project-scoped) 5. Board (project-scoped) 6. Sprints (project-scoped)
7. Reports (project-scoped) 8. Team 9. Workspace settings (admin/owner
only)

Do not show links the current user cannot access. Hiding a link is not
authorization; server handlers must independently check access.

### 3.2 Public/auth routes

-   `/` --- public product landing page or redirect to dashboard when
    authenticated.
-   `/login`
-   `/register`
-   `/forgot-password`
-   `/reset-password` (token-based)
-   `/invite/$token` --- accept workspace invitation.
-   `/unauthorized`
-   `*` --- not-found page.

Registration creates a user and a personal/default workspace, or a
workspace through an explicit onboarding step. Do not create duplicate
workspaces when a user retries onboarding.

### 3.3 Authenticated routes

Use TanStack Router file-based routing and typed route params/search
params.

-   `/app` --- workspace overview.
-   `/app/my-work` --- issues assigned to current user.
-   `/app/projects` --- accessible projects.
-   `/app/projects/new` --- project creation.
-   `/app/projects/$projectId` --- project overview.
-   `/app/projects/$projectId/backlog`
-   `/app/projects/$projectId/board`
-   `/app/projects/$projectId/sprints`
-   `/app/projects/$projectId/sprints/new`
-   `/app/projects/$projectId/sprints/$sprintId`
-   `/app/projects/$projectId/sprints/$sprintId/report`
-   `/app/projects/$projectId/issues/$issueId`
-   `/app/team`
-   `/app/notifications`
-   `/app/settings/profile`
-   `/app/settings/preferences`
-   `/app/settings/workspace`
-   `/app/settings/members`
-   `/app/settings/security`

Route guards should resolve the session and workspace membership on the
server where possible. Do not trust workspace IDs, project IDs, or role
values supplied by the browser.

### 3.4 URL state

Use URL search parameters for shareable/list state: - query; - status; -
priority; - assignee; - sprint; - label; - sort field/direction; - page
or cursor; - view mode where useful.

Validate search params with Zod. Invalid values should be normalized or
safely ignored, not crash the route. Avoid storing shareable filter
state only in component state.

------------------------------------------------------------------------

## 4. UX and visual design requirements

### 4.1 Design direction

Create a distinctive, modern productivity interface: - clean neutral
surfaces; - strong typographic hierarchy; - restrained accent color; -
crisp borders and subtle elevation; - consistent spacing and component
sizing; - meaningful status/priority colors with text/icon labels as
well; - dense tables and boards balanced by generous page-level
spacing; - intentional empty states with a clear next action; - avoid
generic gradients everywhere, excessive glassmorphism, gratuitous glow,
and decorative charts that communicate no data.

Build a reusable design system on Tailwind CSS v4 and shadcn/ui. Use CSS
variables/tokens for colors, radii, shadows, typography, and spacing. Do
not hard-code unrelated colors across pages.

### 4.2 Components

Use shared, reusable components for: - application
shell/sidebar/topbar; - page header and breadcrumbs; - buttons, inputs,
selects, comboboxes, dialogs, drawers, dropdowns, tooltips; - issue
identifier, issue row/card, priority badge, status badge, avatar
stack; - project/sprint selectors; - filter bar and filter chips; -
searchable data table; - board columns and issue cards; - confirmation
dialog; - toast/feedback; - skeletons; - empty/error states; - chart
container and chart accessibility summary.

Use shadcn/ui patterns where appropriate and keep custom components
typed and composable. Avoid one giant component per page.

### 4.3 Motion and 3D

Use Framer Motion for small, purposeful transitions: - sidebar/drawer; -
dialog and popover transitions where compatible; - card/column
interactions; - page-level entrance only when subtle.

Honor `prefers-reduced-motion`. Do not animate every item on every
render.

Three.js / React Three Fiber / Drei may be used for an optional,
lightweight visual accent on the public landing page or an explicitly
isolated dashboard visualization. Requirements: - lazy-load the 3D
bundle; - provide a static fallback; - disable or reduce motion when
requested; - do not place critical labels, forms, metrics, or navigation
only inside a canvas; - avoid continuous expensive rendering when
off-screen; - test on lower-powered/mobile devices; - do not let WebGL
errors break hydration or the application shell.

If no meaningful use case exists, keep the 3D feature isolated and
optional rather than forcing 3D into operational screens.

### 4.4 Accessibility

Target WCAG 2.2 AA practices: - semantic HTML; - full keyboard
navigation; - visible focus rings; - accessible dialog focus
management; - labels and descriptions for all inputs; - no color-only
status communication; - sufficient text and control contrast; -
screen-reader announcements for board status changes and form errors; -
keyboard-accessible drag-and-drop alternatives; - reduced-motion
support; - useful alt text for meaningful images; - charts with text
summaries or accessible data tables.

### 4.5 Responsive behavior

-   Desktop: full sidebar and multi-column board.
-   Tablet: collapsible sidebar and responsive board with horizontal
    scrolling or a compact view.
-   Mobile: drawer navigation; issue cards/details stack vertically;
    tables become horizontally scrollable or switch to compact cards;
    core create/edit/status actions remain available.
-   Avoid horizontal page overflow at 320px viewport width.
-   Touch targets should be comfortably usable.

### 4.6 Required states on every data page

Every asynchronous page must have: - initial loading/skeleton state; -
empty state with a relevant action; - error state with retry when
safe; - success feedback for mutations; - disabled/pending state while a
mutation is in flight; - clear validation feedback; - permission-denied
and not-found behavior; - unsaved-change protection for long forms where
appropriate.

------------------------------------------------------------------------

## 5. Core feature requirements

## 5.1 Authentication and account lifecycle

Support: - registration with name, email, password; - login with
email/password; - logout; - password reset request and token-based
password reset; - session persistence using secure server-managed
cookies; - account profile editing; - password change; - account
deactivation/deletion flow with explicit confirmation.

Security requirements: - hash passwords using Argon2id or a vetted
password-hashing library with secure parameters; - never store plaintext
passwords or password-reset tokens; - reset tokens must be random,
single-use, time-limited, and stored hashed; - set cookies `HttpOnly`,
`Secure` in production, and appropriate `SameSite`; - rotate session
identifiers after login and privilege changes; - enforce rate limits on
login, registration, and reset requests; - return generic responses
where necessary to avoid account enumeration; - validate all inputs on
the server; - never include secrets in client bundles or logs.

Email delivery is an adapter. In development, a safe local flow may
expose a reset link only in server logs or a development-only UI,
guarded so it cannot run in production. Production setup must document
the required email provider. Do not silently claim email was sent if no
provider is configured.

## 5.2 Workspace onboarding and switching

A workspace is the tenant boundary for team data.

On first registration: 1. create user; 2. create a default workspace; 3.
create an owner membership; 4. direct user to onboarding to name the
workspace and optionally create a project; 5. show a useful empty state
if onboarding is skipped.

A user can belong to multiple workspaces. Workspace switching updates
active context and invalidates/refetches workspace-scoped queries. Never
trust a client-provided active workspace without verifying membership.

Workspace fields: - name (required, 2--80 chars); - unique slug within
the product; - description (optional); - timezone (IANA timezone,
default from browser/user preference); - created/updated timestamps.

Workspace owner can transfer ownership to another active member.
Ownership transfer must be transactional and audited. Do not allow
removing the final owner without transferring ownership.

## 5.3 Membership, roles, and invitations

Roles: - `owner`: full workspace control, ownership transfer, delete
workspace. - `admin`: manage members, settings, projects, and all
workspace delivery data. - `member`: create/edit issues and participate
in assigned projects. - `viewer`: read-only access to permitted
workspace/project data.

Permission model: - all users must have an active membership in the
workspace to access its data; - project access must be checked when
project-level access rules are enabled; - workspace owner/admin can
manage membership and workspace settings; - member can create and edit
issues in accessible projects, comment, assign issues to eligible
members, and manage sprint work according to project permissions; -
viewer cannot mutate issues, comments, sprints, projects, members, or
settings; - only owner can transfer ownership or delete the workspace; -
unauthorized requests return appropriate 401/403/404 responses without
leaking data.

Invitation flow: - admins/owners invite by email and role; - generate
cryptographically secure token, store only token hash; - invitation
expires after 7 days; - invited user accepts via `/invite/$token`; - if
the email already belongs to a user, require login before acceptance; -
invitation can be revoked and resent; - prevent duplicate active
invitations for the same workspace/email; - prevent invite role
escalation to owner; - record inviter, invited email, role, expiry,
accepted/revoked timestamps.

## 5.4 Projects

A project belongs to exactly one workspace.

Fields: - id (UUID); - workspace_id; - name (2--100 chars); - key (2--10
uppercase alphanumeric characters, unique per workspace); - description
(optional, bounded length); - status (`active`, `archived`); - default
workflow configuration; - created_by; - created_at, updated_at,
archived_at.

Project creation: - require name and key; - normalize key to
uppercase; - check uniqueness server-side; - project creation must not
allow cross-workspace member references; - initialize default statuses
and project settings.

Project list: - search by name/key; - filter active/archived; - sort by
updated/name; - show description, issue count, active sprint, and last
activity where available.

Archiving prevents new work by default but preserves history and
reporting. Only admin/owner can archive/unarchive. Do not hard-delete
projects through ordinary UI.

## 5.5 Issues / work items

Issue types: - `story` - `task` - `bug` - `epic` (support parent/child
relationship if implemented in the data model)

Fields: - UUID primary key; - project_id and workspace_id; -
project-scoped unique key such as `VEL-123`; - title (required, 3--200
chars); - description (optional, sanitized Markdown or safe rich
text); - type; - status; - priority (`lowest`, `low`, `medium`, `high`,
`highest`); - assignee_id (nullable); - reporter_id; - sprint_id
(nullable); - parent_issue_id (nullable); - estimate_points (nullable
integer from 0--100; zero may be disallowed in UI); -
original_estimate_minutes (optional); - remaining_estimate_minutes
(optional); - due_date (nullable date); - rank/order value for backlog
ordering; - created_at, updated_at, completed_at, archived_at; -
optimistic concurrency/version field if needed.

Issue identifiers must be generated safely and transactionally per
project. Concurrent issue creation must never produce duplicate keys.

Issue actions: - create; - edit fields; - assign/unassign; - change
status; - change priority; - set/change estimate; - add/remove labels; -
move between backlog and sprint; - set/clear due date; - add comments; -
view activity/history; - archive or delete only according to role and
confirmation policy.

Rules: - title is trimmed and cannot be blank; - all referenced users,
labels, sprints, and parent issues must belong to the same
workspace/project as required; - prevent parent-child cycles; - prevent
an issue being assigned to a sprint from a different project; -
completed status sets `completed_at`; reopening clears it or records the
transition consistently; - moving an issue into a completed sprint
requires an explicit warning/valid transition; - deleting an issue with
children or important history should be blocked or require a clear
reassignment/archive flow; - sanitize rendered Markdown to prevent
XSS; - do not allow arbitrary HTML execution.

Issue detail UI: - identifier and title; - description editor/viewer; -
status, priority, type, assignee, reporter, estimate, sprint, labels,
due date; - comments/activity timeline; - edit and transition actions; -
link to parent/related issues when available; - clear save/cancel
behavior; - mobile-friendly layout.

## 5.6 Labels

Labels are project-scoped unless a shared workspace label model is
deliberately chosen.

Fields: - id, project_id, name, normalized_name, color token,
created_at. - case-insensitive unique label name per project. - validate
length and normalize whitespace. - color must be selected from an
approved palette or validated format; do not accept arbitrary CSS. -
deleting a label removes its associations transactionally but does not
delete issues.

## 5.7 Backlog

The backlog is the ordered list of issues not assigned to an
active/planned sprint, plus an explicit way to inspect all issues.

Capabilities: - create issue inline; - open issue detail; - quick edit
priority/type/assignee/estimate; - search and filter; - sort by rank,
priority, created date, updated date, estimate, or due date; - drag to
reorder priority; - multi-select and bulk actions only when permissions
allow; - assign selected issues to a sprint; - remove issues from a
sprint back to backlog; - keyboard-accessible reorder controls and move
actions.

Ordering: - use a stable rank strategy (fractional indexing or
equivalent) instead of rewriting every row for every drag; - server
validates that moved issues belong to the same project; - handle
concurrent reorder conflicts predictably; - refetch or reconcile
canonical server order after failed mutation; - avoid using array index
as a persistent rank.

Filtering: - query text searches identifier/title and optionally
description; - status, priority, type, assignee, label, sprint, due-date
filters; - URL stores shareable filter state; - clearing filters
restores default list.

For large datasets, use TanStack Table and/or TanStack Virtual where
they add measurable value. Keep sorting/filtering/pagination server-side
when data volume requires it.

## 5.8 Sprints

Sprint fields: - id, workspace_id, project_id; - name (required, 2--100
chars); - goal (optional, bounded); - state (`planned`, `active`,
`completed`, `cancelled`); - start_date and end_date; - created_by,
created_at, updated_at; - started_at, completed_at; -
retrospective_notes (optional).

Lifecycle: - create planned sprint; - edit name/goal/dates while
planned; - add/remove issues while planned; - start sprint; - view
active sprint; - complete sprint; - move incomplete issues to backlog or
another planned sprint during completion; - inspect completed sprint
report/history.

Rules: - at most one active sprint per project; - end date must be after
start date; - starting a sprint requires a valid date range and explicit
confirmation if the sprint is empty (allow empty sprint only with
warning); - only planned sprints can be started; - completed/cancelled
sprints are immutable except allowed notes/administrative corrections; -
completion operation must be transactional; - completion summary lists
completed and incomplete issues; - incomplete issues must be explicitly
moved to backlog or a selected planned sprint---never silently
dropped; - completed sprint data remains available for reports; - date
calculations use project/workspace timezone consistently; - define
sprint duration in calendar days for v1 unless the app explicitly
introduces working-day configuration.

Sprint planning UI: - sprint goal and date range; - backlog panel and
sprint commitment panel; - issue count and total estimate; - capacity
indicator if team capacity is configured; - warnings for unestimated
issues or scope changes; - start sprint button with confirmation.

Sprint detail: - goal, dates, state, progress; - linked board; -
scope/estimate summary; - activity and report; - completion dialog with
incomplete issue handling.

## 5.9 Workflow and board

Default workflow: - `todo` - `in_progress` - `in_review` - `done`

Each status has: - stable key; - display name; - category (`todo`,
`in_progress`, `done`); - order; - visual token; - whether it is a
terminal/completed state.

Default priority order is configurable only through validated project
settings. Do not let a user create invalid status keys or change status
configuration without admin permission.

Board capabilities: - columns by status; - issue cards show key, title,
priority, estimate, assignee/avatar, labels, and due-date warning when
relevant; - drag-and-drop between columns; - click card opens issue
detail; - quick create in a column; - filters and search; - optional
swimlanes by assignee or priority; - keyboard-accessible status menu on
each card; - screen-reader announcement after successful movement.

Status changes must go through a server mutation that checks permissions
and valid status. Use optimistic updates only with rollback and error
feedback. Do not trust a status change simply because a drag event
occurred.

Board performance: - avoid rendering every issue in huge boards;
virtualize where appropriate; - preserve scroll position where
practical; - avoid unnecessary full-page refetches; - keep drag-and-drop
library compatible with React 19 and current framework versions.

## 5.10 Dashboard and My Work

Workspace overview should show real persisted metrics: - active
projects; - active sprint summary for selected/recent project; - issues
assigned to current user that are due soon/overdue; - issue counts by
status; - recent activity; - sprint progress and current commitment; -
recent completed sprint velocity where enough historical data exists.

Project dashboard: - project status and summary; - active sprint; -
issue distribution by status/priority; - recent activity; - links to
backlog, board, sprints, and reports.

My Work: - assigned to me; - reported by me (optional tab); - overdue; -
due soon; - recently updated; - filters by project, status, priority,
and sprint.

All counts and charts must come from server queries. Empty state should
explain how to create a project, issue, or sprint. Do not fabricate
metrics to fill blank charts.

## 5.11 Reports and metrics

Required reports: 1. **Sprint report:** committed issues/points at
sprint start, completed issues/points, incomplete issues, scope
added/removed after start, completion rate. 2. **Velocity history:**
completed estimate points per completed sprint, based on a clearly
documented rule. 3. **Burndown:** remaining work across sprint dates if
issue history/snapshots are sufficient. 4. **Issue distribution:** by
status, priority, type, or assignee. 5. **Workload:** assigned issue
count and estimate by member (with privacy-conscious framing).

Metric definitions: - completed issue = issue is in a configured
done-category status at report calculation time or was completed within
the sprint according to event history; use event history to avoid
rewriting history when possible; - velocity = sum of estimate points
completed during a completed sprint; - completion rate = completed
committed points divided by committed points at sprint start; if
committed points are zero, display "---" rather than divide by zero; -
scope change = issues/points added or removed after sprint start; -
burndown uses a consistent daily snapshot/event-based approach and
labels any approximation.

Do not imply a metric is historically exact if the database does not
retain the required history. Build event records or sprint-start
snapshots for reliable reports. Charts must include labels, tooltips,
loading/error states, and a textual summary or data table. Never use 3D
charts for operational metrics.

## 5.12 Comments, activity, and audit history

Comments: - issue-scoped; - author and timestamps; - edit/delete by
author within a reasonable policy or by admin; - server-side
authorization; - sanitized content; - empty comments rejected; -
deletion should leave a tombstone or audit record where appropriate.

Activity events: - issue created/updated; - status transition; -
priority/estimate/assignee change; - sprint created/started/completed; -
issue added to/removed from sprint; - comment added/edited/deleted; -
member invited/role changed/removed; - project/workspace setting
changed.

Activity record should include actor, workspace, project/issue reference
when relevant, event type, structured metadata, and timestamp. Avoid
storing secrets or excessive copies of personal data in event payloads.

Audit events for security-sensitive actions are append-only to ordinary
application users. Do not allow users to edit audit records.

## 5.13 Notifications

In-app notifications: - workspace invitation/acceptance; - assignment to
an issue; - mention in comment if mention parsing is implemented; -
issue due soon/overdue notification if scheduled processing exists; -
sprint started/completed; - relevant project updates.

Each notification includes recipient, actor when applicable, type,
entity reference, message metadata, created_at, read_at, and optional
deduplication key.

Features: - unread count; - mark one read; - mark all read; - click
notification navigates to the relevant accessible entity; -
pagination; - empty/loading/error states.

Do not create notification spam for every insignificant edit. If
background scheduling is not configured, do not pretend time-based
notifications are automatically sent. Document the required scheduler or
keep v1 notifications event-driven.

## 5.14 Search and command menu

Global search: - search accessible projects and issues; - return grouped
results with identifiers and project context; - debounce requests; -
enforce workspace access on server; - keyboard navigation and Escape to
close; - no search results should reveal inaccessible entities.

Command menu (P1): - create issue; - navigate to
project/backlog/board; - open My Work; - switch workspace; - use
keyboard shortcut only if it does not conflict with browser/system
behavior.

## 5.15 Settings

Profile: - display name; - avatar URL or safe uploaded image if uploads
are implemented; - timezone; - locale preference if supported.

Preferences: - theme: light/dark/system; - reduced motion respects
system preference; - compact/comfortable density if implemented; -
notification preferences.

Workspace settings: - name, slug where safe, description, timezone; -
member management; - project defaults; - workflow settings only for
authorized roles.

Security: - change password; - view/revoke active sessions if session
storage supports it; - delete account with re-authentication and typed
confirmation; - transfer workspace ownership before account deletion if
the user is the only owner.

------------------------------------------------------------------------

## 6. Data model

Use PostgreSQL with migrations checked into the repository. Use a typed
ORM/query layer that is compatible with the existing TanStack Start
setup. Drizzle ORM is the preferred default if no database layer already
exists; do not replace a working established ORM without reason.

Use UUIDs for entity primary keys unless an existing schema has a
justified alternative. Use `timestamptz` for instants, `date` for
date-only sprint/due dates, and explicit timezone handling.

### 6.1 Required tables

At minimum implement:

#### `users`

-   `id`
-   `email` (normalized, unique)
-   `name`
-   `password_hash`
-   `avatar_url` nullable
-   `timezone`
-   `email_verified_at` nullable
-   `created_at`, `updated_at`
-   `disabled_at` nullable

#### `sessions`

-   `id` or token hash
-   `user_id`
-   `expires_at`
-   `created_at`
-   `last_seen_at`
-   optional device/user-agent metadata with privacy limits

#### `password_reset_tokens`

-   `id`
-   `user_id`
-   `token_hash`
-   `expires_at`
-   `used_at`
-   `created_at`

#### `workspaces`

-   `id`
-   `name`
-   `slug`
-   `description`
-   `timezone`
-   `created_by`
-   `created_at`, `updated_at`, `deleted_at` nullable

#### `workspace_members`

-   `id`
-   `workspace_id`
-   `user_id`
-   `role`
-   `joined_at`
-   `created_at`, `updated_at`
-   unique `(workspace_id, user_id)`

#### `workspace_invitations`

-   `id`
-   `workspace_id`
-   `email_normalized`
-   `role`
-   `token_hash`
-   `invited_by`
-   `expires_at`
-   `accepted_at`, `revoked_at` nullable
-   `created_at`

#### `projects`

-   `id`
-   `workspace_id`
-   `name`
-   `key`
-   `description`
-   `status`
-   `workflow_config` JSONB only for genuinely flexible configuration
-   `created_by`
-   `created_at`, `updated_at`, `archived_at`
-   unique `(workspace_id, key)`

#### `project_sequences`

-   `project_id`
-   `next_issue_number`
-   use transactional row locking for safe issue key generation

#### `issues`

-   fields defined in §5.5;
-   indexes for `(project_id, status)`,
    `(workspace_id, assignee_id, status)`, `(sprint_id, status)`,
    `(project_id, rank)`, and common search fields;
-   enforce project/workspace consistency through schema design and/or
    transactional validation.

#### `issue_labels`

-   `id`
-   `project_id`
-   `name`
-   `normalized_name`
-   `color`
-   `created_at`
-   unique `(project_id, normalized_name)`

#### `issue_label_links`

-   `issue_id`
-   `label_id`
-   unique `(issue_id, label_id)`

#### `sprints`

-   fields defined in §5.8;
-   index by `(project_id, state)`;
-   enforce at most one active sprint per project using a partial unique
    index where supported.

#### `issue_comments`

-   `id`
-   `issue_id`
-   `author_id`
-   `body`
-   `created_at`, `updated_at`, `deleted_at`

#### `issue_events`

-   `id`
-   `workspace_id`
-   `project_id`
-   `issue_id`
-   `actor_id`
-   `event_type`
-   `payload` JSONB with validated schema and no secrets
-   `created_at`

#### `activity_events`

-   `id`
-   `workspace_id`
-   `project_id` nullable
-   `actor_id` nullable for system events
-   `entity_type`
-   `entity_id`
-   `event_type`
-   `metadata` JSONB
-   `created_at`

#### `notifications`

-   `id`
-   `workspace_id`
-   `recipient_id`
-   `actor_id` nullable
-   `type`
-   `entity_type`
-   `entity_id`
-   `metadata` JSONB
-   `dedupe_key` nullable
-   `read_at` nullable
-   `created_at`

#### `sprint_issue_snapshots` or equivalent history model

Capture sprint commitment at sprint start and scope changes so reports
do not depend solely on mutable current issue state.

#### `user_preferences`

-   `user_id` unique
-   theme and other validated preference fields
-   `updated_at`

### 6.2 Data integrity

-   foreign keys and delete policies must be explicit;
-   cascade only where data loss is intended and safe;
-   use transactions for multi-record lifecycle operations;
-   unique constraints for email, workspace membership, project keys,
    issue numbers, labels, and active sprint;
-   indexes for query patterns;
-   validate JSONB payloads at application boundaries;
-   avoid denormalizing values unless there is a clear performance
    reason;
-   use UTC instants in storage and render in user/workspace timezone;
-   define retention/deletion behavior for account and workspace
    removal;
-   migrations must be repeatable in a fresh environment and safe to
    deploy.

### 6.3 Seed data

Provide a deterministic development seed command that creates: - a
development-only demo workspace; - owner/admin/member/viewer users with
clearly documented credentials; - at least two projects; - a meaningful
backlog; - one active sprint and one completed sprint; - varied issue
statuses, priorities, estimates, labels, comments, activity, and
notifications.

Seed data must be disabled in production unless an explicit safe flag is
set. Demo credentials must never be used as production defaults.

------------------------------------------------------------------------

## 7. Architecture and implementation standards

### 7.1 Stack

Honor the existing stack: - TanStack Start; - React 19; - Vite; -
TanStack Router; - TanStack Query; - TanStack Table; - TanStack
Virtual; - Tailwind CSS v4; - shadcn/ui; - Framer Motion; - Three.js /
React Three Fiber / Drei for optional isolated visual features; - Nitro
SSR deployment; - Zod; - PostgreSQL 16.

Use the repository's existing package manager and lockfile. If a
required library is incompatible with the installed framework version,
choose a compatible alternative and document the reason.

### 7.2 Suggested organization

Adapt to the actual scaffold and conventions; avoid moving files simply
to match this example.

``` text
src/
  routes/
    __root.tsx
    index.tsx
    login.tsx
    register.tsx
    app/
      route.tsx
      index.tsx
      my-work.tsx
      projects/
      team.tsx
      notifications.tsx
      settings/
  components/
    ui/
    layout/
    issues/
    board/
    backlog/
    sprints/
    dashboard/
    reports/
  features/
    auth/
    workspaces/
    projects/
    issues/
    backlog/
    sprints/
    reports/
    notifications/
  server/
    auth/
    db/
    services/
    repositories/
    permissions/
    validation/
    email/
    audit/
  lib/
    env.ts
    errors.ts
    dates.ts
    formatters.ts
    logger.ts
  styles/
    app.css
drizzle/                 # if Drizzle is selected
tests/
  unit/
  integration/
  e2e/
```

Keep server-only code out of client imports. Clearly separate: -
route/view components; - domain/business logic; - database access; -
authorization; - input schemas; - shared types/utilities.

### 7.3 Server functions and data access

-   Use TanStack Start server functions/loaders/actions according to the
    installed version's recommended patterns.
-   Validate all external input with Zod on the server, even if the form
    validates on the client.
-   Keep business logic in testable service functions rather than
    burying it in UI components.
-   Use a repository/data-access layer for complex queries.
-   Never expose database credentials, password hashes, session tokens,
    invitation tokens, reset tokens, or internal error stacks to the
    client.
-   Use typed result/error conventions.
-   Use transactions for issue key allocation, sprint transitions,
    ownership transfer, and multi-record changes.
-   Return only fields the current user is allowed to see.
-   Apply authorization before performing any mutation or returning
    sensitive data.

### 7.4 TanStack Query

-   Define consistent query keys scoped by workspace/project/entity.
-   Invalidate or update related queries after mutations.
-   Use optimistic updates only where rollback behavior is implemented
    and safe.
-   Avoid stale data when switching workspaces or users.
-   Do not hydrate private data into a public/shared cache.
-   Handle pending, error, and retry states deliberately.
-   Use server-side pagination/filtering for large datasets.

### 7.5 TanStack Table and Virtual

Use Table for complex issue/member/report lists that benefit from
sorting, filtering, selection, and column configuration. Use Virtual for
large lists only where measured or anticipated volume warrants it.
Ensure keyboard navigation, row actions, and screen readers still work.
Do not virtualize small lists merely to advertise the library.

### 7.6 SSR and hydration

-   Ensure server/client rendering is deterministic for initial HTML.
-   Avoid reading `window`, `document`, local storage, or WebGL during
    server module evaluation.
-   Gate browser-only features behind client-safe boundaries and dynamic
    loading.
-   Do not render different date/time or random IDs between server and
    client.
-   Use a stable fallback for optional 3D/canvas content.
-   Test direct navigation to nested routes, refresh, and production
    SSR.

### 7.7 Error handling

Define safe, typed error categories: - unauthenticated; - forbidden; -
not found; - validation; - conflict; - rate limited; -
unavailable/internal.

Show user-friendly messages; log internal details server-side with
request/correlation IDs. Do not expose stack traces or SQL errors.
Provide retry where appropriate. Avoid swallowing errors or showing
success on failed requests.

### 7.8 Environment configuration

Create `.env.example` with documented names, safe placeholders, and no
secrets. Validate environment variables at server startup with Zod.

Expected variables (adapt to selected libraries): - `NODE_ENV` -
`APP_URL` - `DATABASE_URL` - `SESSION_SECRET` (cryptographically random,
sufficient length) - `EMAIL_FROM` - optional email provider variables -
optional logging/monitoring variables

Keep the existing local `.env` private and untracked. Never print secret
values in logs or final output. Ensure `.gitignore` excludes `.env`,
`.env.*` except `.env.example`, build output, local DB volumes where
applicable, and test artifacts.

------------------------------------------------------------------------

## 8. API and domain operation contract

Names below are conceptual. Implement them using idiomatic TanStack
Start server functions or the existing API convention. Every operation
must validate input and authorize access.

### Auth

-   `register`
-   `login`
-   `logout`
-   `requestPasswordReset`
-   `resetPassword`
-   `changePassword`
-   `getCurrentSession`

### Workspace and membership

-   `createWorkspace`
-   `updateWorkspace`
-   `switchWorkspace` / resolve active workspace
-   `listWorkspacesForUser`
-   `inviteMember`
-   `acceptInvitation`
-   `revokeInvitation`
-   `changeMemberRole`
-   `removeMember`
-   `transferOwnership`

### Projects

-   `listProjects`
-   `getProject`
-   `createProject`
-   `updateProject`
-   `archiveProject`
-   `restoreProject`

### Issues and labels

-   `listIssues`
-   `getIssue`
-   `createIssue`
-   `updateIssue`
-   `transitionIssue`
-   `assignIssue`
-   `setIssueEstimate`
-   `moveIssueToSprint`
-   `moveIssueToBacklog`
-   `reorderBacklog`
-   `archiveIssue`
-   `deleteIssue` where policy permits
-   `listLabels`
-   `createLabel`
-   `updateLabel`
-   `deleteLabel`
-   `addLabelToIssue`
-   `removeLabelFromIssue`
-   `addIssueComment`
-   `editIssueComment`
-   `deleteIssueComment`
-   `listIssueActivity`

### Sprints and reports

-   `listSprints`
-   `getSprint`
-   `createSprint`
-   `updateSprint`
-   `startSprint`
-   `completeSprint`
-   `cancelSprint`
-   `getSprintReport`
-   `getVelocityReport`
-   `getBurndownReport`
-   `getIssueDistributionReport`

### Dashboard, search, notifications

-   `getWorkspaceDashboard`
-   `getProjectDashboard`
-   `getMyWork`
-   `searchAccessibleEntities`
-   `listNotifications`
-   `markNotificationRead`
-   `markAllNotificationsRead`
-   `getActivityFeed`

All list operations must support bounded result sizes, validated
sorting/filtering, and pagination when appropriate. Never interpolate
untrusted user input into raw SQL. If raw SQL is needed, use
parameterized queries.

------------------------------------------------------------------------

## 9. Security and privacy requirements

Security is a release blocker, not a later enhancement.

### 9.1 Authorization and tenant isolation

-   Centralize permission checks in reusable server-side helpers.
-   For every query and mutation, verify the current user and membership
    for the target workspace.
-   For project/issue/sprint IDs, verify they belong to the authorized
    workspace and project.
-   Do not rely on obscured UUIDs or hidden UI controls.
-   Add automated tests for cross-workspace IDOR attempts.
-   Avoid revealing whether an inaccessible entity exists; use a
    consistent not-found response where appropriate.

### 9.2 Input and output safety

-   Validate all input on the server with Zod.
-   Sanitize Markdown/rich text before rendering.
-   Escape output appropriately.
-   Limit input sizes and list query limits.
-   Validate URLs before rendering or fetching them.
-   Prevent open redirects in auth/invitation flows.
-   Do not allow arbitrary CSS, script, or HTML injection.
-   Use parameterized SQL.

### 9.3 Session and CSRF

-   Use secure, HTTP-only cookies.
-   Enforce HTTPS in production.
-   Use SameSite settings appropriate to the authentication flow.
-   Apply CSRF protection/origin checks to cookie-authenticated
    mutations according to framework best practices.
-   Rotate and expire sessions.
-   Invalidate sessions on password change and account disable where
    appropriate.
-   Never place session secrets in local storage.

### 9.4 Rate limiting and abuse prevention

Apply limits to login, registration, password-reset, invitation
creation, global search, and other abuse-prone endpoints. Use a durable
shared rate-limit backend in multi-instance production deployments;
document if the development implementation is process-local. Avoid
unbounded queries and expensive unfiltered reports.

### 9.5 Logging and privacy

-   Use structured logs with request IDs.
-   Never log passwords, session cookies, reset tokens, invitation
    tokens, database URLs, or raw secrets.
-   Keep audit events limited to relevant metadata.
-   Provide account/workspace deletion policy and clear user
    confirmation.
-   Avoid collecting unnecessary personal information.

### 9.6 Production security headers

Configure appropriate headers for the deployment environment, including
content type protection, frame restrictions, referrer policy, and a
considered Content Security Policy. Do not break required assets with an
untested CSP. Use secure cookie settings in production.

------------------------------------------------------------------------

## 10. Performance and reliability

Initial targets, to be verified with realistic seed data: - common
navigation should feel immediate and avoid full reloads; -
server-rendered authenticated routes should not expose private data to
anonymous users; - common filtered list queries should be indexed and
bounded; - avoid N+1 queries on dashboard, board, and member lists; -
lazy-load optional 3D and heavy chart bundles; - avoid rendering
unnecessary off-screen motion; - paginate activity/notifications; - use
request cancellation/debouncing for search; - handle duplicate mutation
submissions safely; - use database transactions for lifecycle
transitions; - provide graceful error states when PostgreSQL or email
services are unavailable.

Do not add caching that can leak tenant-specific data. Cache keys must
include user/workspace context where appropriate, and sensitive
responses should use safe cache headers.

------------------------------------------------------------------------

## 11. Testing strategy

Use the existing test stack if configured. Otherwise choose a
compatible, maintained stack, typically Vitest for unit/integration
tests and Playwright for end-to-end tests.

### 11.1 Unit tests

Test: - Zod schemas and input normalization; - permission matrix; -
issue transition rules; - sprint lifecycle rules; - estimate and
velocity calculations; - completion-rate edge cases; - date/timezone
utilities; - rank/order utilities; - safe Markdown rendering policy; -
role changes and ownership-transfer rules.

### 11.2 Integration tests

Use a real PostgreSQL test database or isolated disposable database.
Test: - migrations from an empty database; - registration and session
lifecycle; - workspace creation and membership; - invitation
expiry/acceptance/revocation; - project and issue creation; - concurrent
issue number allocation; - cross-workspace access rejection; - backlog
reorder conflict behavior; - sprint start/completion transactions; -
incomplete sprint issue handling; - notification creation/read state; -
report accuracy from event/snapshot data.

Do not replace database integration tests with mocked repository tests
alone.

### 11.3 End-to-end tests

Critical happy path: 1. register or sign in; 2. create
workspace/project; 3. create issues; 4. assign an issue and set
priority/estimate; 5. create a sprint and add issues; 6. start sprint;
7. move issue across board statuses; 8. add comment; 9. complete sprint
and handle incomplete issues; 10. inspect report and dashboard; 11. sign
out and verify protected route behavior.

Additional E2E: - invitation acceptance; - viewer cannot mutate data; -
admin can invite member; - unauthorized user cannot access another
workspace; - empty/error states render; - mobile navigation and primary
issue actions work; - theme preference persists; - direct URL refresh on
nested routes works.

### 11.4 Quality gates

Provide scripts equivalent to: - `dev` - `build` - `start` or production
preview - `lint` - `typecheck` - `test` - `test:unit` -
`test:integration` - `test:e2e` - `db:generate` / `db:migrate` /
`db:seed` appropriate to the ORM.

The exact script names should fit the existing repository, but all
checks must be documented. Fix all errors introduced by the
implementation. If an environment-dependent check cannot run, report it
precisely and provide the command needed to run it.

------------------------------------------------------------------------

## 12. Deployment and operations

### 12.1 Local development

Use the existing Docker Compose PostgreSQL 16 service and configured
local environment. Inspect current Compose service/container names and
database settings before modifying anything. Do not overwrite local
database volumes.

Document: 1. supported Node.js version; 2. package installation command;
3. how to start PostgreSQL; 4. how to copy/configure `.env`; 5. how to
apply migrations; 6. how to seed development data; 7. how to start the
dev server; 8. how to run quality checks; 9. demo credentials, if
seeded, clearly labeled development-only.

### 12.2 Production build/runtime

-   Build using the project's supported TanStack Start/Nitro adapter and
    output mode.
-   Document the correct production start command.
-   Do not assume the dev server is suitable for production.
-   Ensure runtime database connectivity uses environment configuration.
-   Apply migrations as an explicit release/deployment step, not
    unpredictably on every application request.
-   Handle graceful shutdown and connection pool cleanup.
-   Include health/readiness endpoints if compatible with the deployment
    adapter.
-   Health checks must not leak environment or secrets.

### 12.3 Database operations

Document: - migration procedure; - backup/restore recommendations; -
connection pool sizing guidance; - safe deployment order for schema
changes; - development reset/seed commands and warnings; - data
retention/deletion expectations.

### 12.4 CI

Add CI configuration if the repository uses or can reasonably support
it. CI should install from lockfile, run lint/typecheck/tests, and
build. Do not require production secrets for ordinary pull-request
checks. Integration tests may use a dedicated PostgreSQL service.

### 12.5 Observability

-   structured server logs;
-   clear error reporting;
-   health check;
-   optional external error-monitoring adapter documented but not
    required;
-   avoid logging sensitive content from issue descriptions/comments by
    default.

------------------------------------------------------------------------

## 13. Product analytics (internal, optional)

Do not add invasive third-party tracking by default. If internal product
analytics are implemented, collect only useful events such as: -
workspace created; - project created; - sprint started/completed; -
issue created/completed; - invitation accepted.

Never log issue descriptions, comment bodies, passwords, tokens, or
unnecessary personal information as analytics properties.

------------------------------------------------------------------------

## 14. Acceptance criteria by feature

### Authentication

-   A user can register, log in, log out, and request/reset a password
    through the configured flow.
-   Invalid credentials return a safe error.
-   Protected pages require a valid session.
-   Passwords and reset tokens are never stored in plaintext.

### Workspaces

-   A new user receives a usable workspace.
-   Workspace switching only exposes the selected workspace's accessible
    data.
-   A workspace member cannot read or mutate another workspace's
    entities by changing IDs.

### Membership

-   Owner/admin can invite a user and assign an allowed role.
-   Expired/revoked invitations cannot be accepted.
-   Viewer mutation attempts are rejected server-side.
-   Ownership cannot be accidentally removed without transfer.

### Projects

-   Authorized users can create/list/view projects.
-   Duplicate project keys in one workspace are rejected.
-   Archived projects remain available for history but follow documented
    mutation restrictions.

### Issues

-   Authorized users can create/edit/view issues.
-   Issue keys remain unique under concurrent creation.
-   Search, filters, sorting, labels, assignment, estimates, comments,
    and status transitions work with persisted data.
-   Invalid cross-project relationships are rejected.
-   Markdown/XSS protections are tested.

### Backlog and board

-   Reordering persists after reload.
-   Moving issues between statuses/sprints persists and updates relevant
    views.
-   Failed optimistic mutations roll back and show feedback.
-   All actions are available without relying solely on drag-and-drop.

### Sprints

-   At most one sprint per project is active.
-   Invalid dates and invalid lifecycle transitions are rejected.
-   Starting captures a commitment baseline.
-   Completing requires an explicit resolution for incomplete issues.
-   Completed sprint reports remain available.

### Dashboard and reports

-   Dashboard metrics derive from database queries.
-   Velocity and completion rate follow documented formulas.
-   Zero/empty datasets do not cause divide-by-zero or misleading
    charts.
-   Reports accurately reflect snapshots/events and disclose
    approximations.

### Notifications and activity

-   Significant actions create activity records.
-   Relevant notifications are generated and can be marked read.
-   Users cannot read another user's private notification list.
-   Activity feed is paginated and authorization-scoped.

### UX and quality

-   Every route has loading, empty, error, and unauthorized/not-found
    behavior as appropriate.
-   Layout works on mobile, tablet, and desktop.
-   Keyboard navigation and reduced-motion support work.
-   No core action is a fake button or dead link.
-   lint, typecheck, tests, and production build pass.

### Deployment

-   A clean checkout can be configured from documented instructions.
-   Database migrations work from empty PostgreSQL 16.
-   `.env.example` is complete and contains no real secrets.
-   Production build starts using the documented runtime command.

------------------------------------------------------------------------

## 15. Recommended implementation sequence

Follow this order to reduce integration risk. Do not stop after writing
this plan.

### Phase 0 --- repository reconnaissance

-   inspect files, package manager, versions, existing scaffold, Git
    status, environment, Compose config, and available PRD material;
-   identify compatibility risks;
-   record a short implementation checklist;
-   preserve current user changes.

### Phase 1 --- foundation

-   configure environment validation;
-   database client and schema/migrations;
-   error handling and logging;
-   test/lint/typecheck/build scripts;
-   base styles, design tokens, shadcn/ui setup;
-   application shell and route conventions.

### Phase 2 --- identity and tenant boundary

-   auth/session lifecycle;
-   workspace creation/switching;
-   membership and permission helpers;
-   invitation flow;
-   authorization tests before building broad feature pages.

### Phase 3 --- project and issue domain

-   projects;
-   issue model and transactional key allocation;
-   labels, comments, issue events;
-   issue create/edit/detail views;
-   server-side validation and integration tests.

### Phase 4 --- planning and execution

-   backlog filtering/order;
-   sprint lifecycle and commitment snapshots;
-   board and status transitions;
-   optimistic updates with rollback;
-   sprint planning and completion flows.

### Phase 5 --- visibility and collaboration

-   workspace/project dashboards;
-   My Work;
-   activity feed;
-   notifications;
-   sprint reports, velocity, burndown, distribution charts.

### Phase 6 --- polish and accessibility

-   responsive refinements;
-   keyboard navigation;
-   reduced-motion behavior;
-   empty/loading/error states;
-   optional 3D accent with fallback;
-   performance review.

### Phase 7 --- hardening and release

-   unit, integration, and E2E tests;
-   cross-tenant authorization testing;
-   dependency/security review;
-   migration-from-empty test;
-   production build and runtime smoke test;
-   documentation and final implementation report.

At every phase, keep the application buildable. Do not postpone all
testing until the end.

------------------------------------------------------------------------

## 16. Required repository deliverables

The final repository should contain, adapted to the actual setup: -
complete working application source; - migrations and schema
definitions; - development seed script; - `.env.example`; - updated
`.gitignore`; - automated tests; - lint/typecheck/test/build scripts; -
CI workflow if appropriate; - `README.md` with setup and commands; -
`docs/architecture.md` with architectural decisions and data flow; -
`docs/security.md` with auth, authorization, secrets, and tenant
isolation; - `docs/deployment.md` with production build, migrations,
environment variables, and operations; - this PRD stored as
`docs/PRD.md` or `PRD.md`; - a concise final implementation report.

Do not include real credentials, private `.env` values, database dumps
containing personal data, or generated build output in Git.

------------------------------------------------------------------------

## 17. Final execution instructions

Begin by inspecting the repository and checking its current state. Then
implement the product in the phases above.

Before considering any feature complete: 1. verify the UI action calls a
real server operation; 2. verify the server validates input; 3. verify
authorization and tenant ownership; 4. verify the database
mutation/query; 5. verify query invalidation and UI feedback; 6. test
empty, loading, and failure paths; 7. add automated coverage for
important business rules.

When finished, run every feasible quality gate and report: - major
features implemented; - important architectural choices; - database
migration/seed status; - exact commands run and their results; - any
tests or checks that could not run and why; - environment variables or
provider credentials still required; - known limitations that are real
and not hidden behind placeholder UI.

**Do not substitute a polished mockup for a functional application. Do
not stop after generating files. Deliver the working product.**
