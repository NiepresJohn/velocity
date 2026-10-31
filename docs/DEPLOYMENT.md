# Deployment

Stack: Node 22 (Nitro server) + PostgreSQL 16 + Caddy (automatic HTTPS). See `docker-compose.prod.yml`.

## Environment

Copy `.env.production.example` to `.env.production` and fill it in. Never commit it.

| Var | Notes |
|---|---|
| `DOMAIN` | Public hostname; Caddy obtains a certificate for it (ports 80/443 must be reachable) |
| `APP_URL` | `https://<DOMAIN>`; used in email links |
| `POSTGRES_PASSWORD` | Long random value |
| `SESSION_SECRET` | 32+ chars (`openssl rand -hex 32`) |
| `EMAIL_PROVIDER` | `smtp` (real mail), `log` (prints metadata only in production, nothing is delivered), `none` |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Required for `smtp`; port 465 uses implicit TLS, others STARTTLS |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Auth endpoint limits. In production they are stored in Postgres (`rate_limits`), so they are shared across instances |
| `DB_POOL_MAX` | pg pool size per app instance (default 10) |

Password-reset and invite emails are only delivered with `EMAIL_PROVIDER=smtp`. Without it users cannot reset passwords.

## Build and first release

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
```

Migrations are an explicit release step (never on app start).

The runtime image contains only the built server, so run migrations from a checkout of the same commit that can reach the database (e.g. temporarily publish Postgres on `127.0.0.1` or use an SSH tunnel):

```sh
DATABASE_URL=postgresql://velocity:...@127.0.0.1:5432/velocity pnpm db:migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Never run `db:seed` in production (it refuses non-local databases).

Schema-change order: ship backward-compatible migrations (add columns/tables) first, deploy the app, then ship destructive cleanup in a later release.

## Health check

`GET /healthz` returns `{"ok":true}` (200) or `{"ok":false}` (503) after a `select 1`; it exposes no config. The compose healthcheck and any external monitor can use it.

## Shutdown

On SIGTERM Nitro runs its `close` hook, which ends the pg pool (`src/server/plugins/runtime.ts`). Compose gives the container 20s.

## Pool sizing

Total connections = `DB_POOL_MAX` x app instances, and must stay below Postgres `max_connections` (default 100) with headroom for migrations and backups. 10 per instance is fine for one or two instances.

## Backups

Daily logical dump, 14 days retained (host crontab):

```cron
15 2 * * * docker compose -f /opt/velocity/docker-compose.prod.yml exec -T postgres pg_dump -U velocity -Fc velocity > /var/backups/velocity/velocity-$(date +\%F).dump && find /var/backups/velocity -name '*.dump' -mtime +14 -delete
```

Copy dumps off the host. Test restores regularly:

```sh
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U velocity -d velocity --clean --if-exists < velocity-YYYY-MM-DD.dump
```

## Rollback

1. App only: check out the previous commit, rebuild, `up -d`. Safe as long as the schema change was backward compatible.
2. With schema: restore the pre-release dump (take one just before every migration: `pg_dump -Fc`), then deploy the previous commit.

## Security headers

Set by a Nitro plugin on every response: nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP; in production also HSTS and a CSP. The CSP allows `'unsafe-inline'` scripts because TanStack Start emits inline hydration scripts; tighten with nonces once the router supports them.
