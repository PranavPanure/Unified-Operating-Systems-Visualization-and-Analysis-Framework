# OS A2Z deployment runbook

## Recommended production shape

Run the web frontend on a static host, the FastAPI service on a Linux VM or container host, PostgreSQL as a managed database, and the Linux sandbox on a dedicated execution host. Do not run untrusted learner commands inside the frontend host.

## Required production configuration

Set these values outside the repository:

```text
APP_ENV=production
CORS_ORIGINS=https://<frontend-domain>
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<database>
SANDBOX_IMAGE=os-a2z-linux-sandbox:latest
SANDBOX_RUNTIME=podman
VITE_API_BASE_URL=https://api.<domain>/api/v1
```

Use a unique database password, HTTPS-only cookies, and a private network between the API and database. Never use the development credentials from `compose.yaml` in production.

## Staging checklist

1. Build the sandbox image from `apps/api/sandbox/Dockerfile`.
2. Build the API image from `apps/api/Dockerfile`.
3. Run database migrations with `make api-migrate`.
4. Check `GET /api/v1/health` and the API OpenAPI page.
5. Register a staging account and verify login/logout.
6. Verify progress sync, notes, practice attempts, and analytics.
7. Execute `touch persistence-check && ls persistence-check` twice in the Linux sandbox.
8. Confirm network access is blocked, the process is non-root, and the reset action removes the workspace.
9. Run `make verify` before promoting the release.

## Production safeguards

- Put the API behind a TLS reverse proxy.
- Restrict database access to the API network.
- Keep sandbox execution on a separate host or worker pool.
- Apply per-user rate limits to terminal execution.
- Monitor container count, CPU, memory, timeout, and volume usage.
- Add a scheduled job to remove abandoned session volumes.
- Keep the terminal rate limit at 30 executions per user per minute or lower for public launches.
- Verify every terminal execution runs non-root, with no network, and within its resource limits.
- Back up PostgreSQL and test restoring a backup.
- Store logs without command secrets or personal data.

## Rollback

Keep the previous API image and frontend artifact available. If a migration is not backward compatible, stop promotion, restore the previous application image, and follow the migration-specific rollback procedure before changing the database.

## Release gate

Deployment is ready only when CI is green, the staging checklist passes, the sandbox limits are confirmed on the real host, and the database backup/restore check has succeeded.
