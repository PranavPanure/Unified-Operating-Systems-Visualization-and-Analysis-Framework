# Architecture

OS A2Z is split into a browser application and a future API boundary.

```text
apps/web
  React/Vite presentation and local learning state
  content manifests and deterministic visualizer engines

apps/api
  FastAPI versioned contract, authentication, analytics, activity, and practice history
  SQLAlchemy persistence models and Alembic migrations
  future authoritative grading and isolated execution services

compose.yaml
  PostgreSQL and API development services
```

The web simulator algorithms live in `apps/web/src/lib/simulators.ts` and do not depend on React. This keeps them testable and makes it possible to move authoritative computation to the API later without changing the learning UI contract.

Content is currently stored in validated versioned JSON artifacts under `apps/web/src/content/` and loaded through `apps/web/src/data/curriculum.ts`. The next content phase can expose the same schema through the API for authoritative grading.

Persistence is normalized under `apps/api/app/models.py`: users own lesson progress, bookmarks, notes, assessment attempts, challenge attempts, and activity events. Guest mode remains browser-local by design; authenticated sessions synchronize a progress snapshot and derive account analytics from server records.
