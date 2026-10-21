# OS A2Z

OS A2Z is an interactive operating-systems learning platform for students who want to move from Linux commands to OS internals by experimenting with models, traces, and practice problems.

## Current release

The working first release includes:

- A dark developer-learning shell with responsive navigation.
- A 12-module A2Z-style roadmap with prerequisites and lesson progression.
- Lesson pages with objectives, worked examples, common mistakes, notes, bookmarks, and completion tracking.
- A searchable Linux command reference.
- A versioned, schema-validated curriculum content artifact that can grow independently from the UI.
- A safe deterministic terminal simulator with a virtual filesystem.
- FCFS, SJF, and Round Robin scheduling traces with metrics.
- FIFO paging, Banker's safety, and FCFS disk visualizers.
- Practice questions with feedback and retry behavior.
- Local dashboard, analytics, theme settings, and progress export.
- A FastAPI health and curriculum contract under `apps/api`.
- An optional account center with guest fallback and server-backed authentication.
- Authenticated progress snapshot syncing for lessons, experiment challenges, challenge reflections, bookmarks, notes, and practice attempts.
- Server-derived analytics for challenge coverage, reflections, practice attempts, and accuracy in the signed-in account view.
- Practice lanes with module and difficulty filters for focused active recall.
- Authenticated bounded Linux sandbox runner for real shell pipelines inside a non-root, network-disabled container.

## Run the web application

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5175/`.

## Verify the web application

```bash
npm run typecheck
npm test
npm run build
```

## Run the API locally

```bash
cd apps/api
python -m pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

The API exposes `/api/v1/health`, `/api/v1/curriculum`, authenticated progress, analytics, practice-history, and activity routes, plus generated OpenAPI documentation at `/docs`.

The persistence foundation uses SQLAlchemy models and Alembic migrations. Run `make api-migrate` after the database is available; the container entrypoint applies migrations automatically. The migration chain includes users, lesson progress, bookmarks, notes, assessment attempts, challenge attempts, and activity events.

For Linux sandbox execution, install Docker Desktop or Podman Desktop, build `apps/api/sandbox`, and leave `SANDBOX_RUNTIME=auto`. The runner automatically uses Podman first and Docker second.

## Docker development

```bash
docker compose up --build
```

The compose file defines PostgreSQL and the API service. The browser release currently uses local persistence so it remains usable without a running API.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the staging checklist, production environment, sandbox isolation requirements, monitoring, and rollback procedure.

For a Vercel-plus-VPS handoff, see [`deploy/README.md`](deploy/README.md) and the included systemd, Caddy, environment, and Ubuntu bootstrap files.

## Important scope note

The browser keeps a deterministic simulator for guest learning and also exposes an authenticated Linux sandbox mode. Sandbox execution is bounded and isolated; a production deployment should move it behind a dedicated execution service before enabling it for many users.
