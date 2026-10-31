# Velocity

Jira-like issue tracker: boards, backlog, sprints, reports. TanStack Start + Drizzle + PostgreSQL 16.

## Local development

Requires Node 22 and pnpm.

```sh
pnpm install
cp .env.example .env                    # then set SESSION_SECRET (32+ chars)
# If port 5432 is taken, pick another and use it in DATABASE_URL:
export VELOCITY_PG_PORT=5434
docker compose up -d                    # PostgreSQL 16
# .env: DATABASE_URL=postgresql://velocity:velocity@localhost:5434/velocity
pnpm db:migrate                         # apply migrations
pnpm db:seed                            # demo data (local DB only, refuses other hosts)
pnpm dev                                # http://localhost:3000
```

Checks: `pnpm typecheck`, `pnpm test`, `pnpm build`.

Dev email: with `EMAIL_PROVIDER=log` (default) password-reset and invite emails are printed in the server log, links included. Set `EMAIL_PROVIDER=smtp` plus `SMTP_*` and `EMAIL_FROM` to send real mail (for local testing, a Mailpit container on port 1025 works).

### Demo logins (development only)

Password for all: `demo-password-1`. `demo@velocity.dev` (owner), `bob@velocity.dev` (member), `cara@velocity.dev` (viewer). Two projects (VEL, WEB), one completed and one active sprint, 30 issues.

### Reset demo data

The seed is skipped if the `demo` workspace exists. To reseed (destroys local data):

```sh
docker compose exec postgres psql -U velocity -c 'truncate users, workspaces, sessions, password_reset_tokens, rate_limits cascade'
pnpm db:seed
```

## Production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
