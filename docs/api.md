# API contract

The API is versioned under `/api/v1`.

## Current endpoints

### `GET /api/v1/health`

Returns service status and a UTC timestamp. This endpoint is safe for container health checks.

### `GET /api/v1/curriculum`

Returns a versioned summary of the twelve OS A2Z modules. The current frontend keeps richer lesson content locally while the content contract is being moved into validated server-owned data.

### Authentication

- `POST /api/v1/auth/register` creates an account and starts a session.
- `POST /api/v1/auth/login` validates credentials and starts a session.
- `GET /api/v1/auth/me` returns the current session user.
- `POST /api/v1/auth/logout` revokes the current session.

Sessions are stored server-side and exposed to the browser through an HttpOnly cookie. The frontend remains usable in guest mode and merges local progress after account sign-in.

### `GET /api/v1/progress` and `PUT /api/v1/progress`

Authenticated clients can read or merge a progress snapshot containing completed lessons, experiment challenges, challenge reflections/timestamps, solved exercises, bookmarks, notes, note versions, and assessment attempts. Note writes use optimistic version checks: a stale edit is preserved as a conflict instead of overwriting a newer server note. The browser merges guest records into the account snapshot after login and debounces subsequent writes.

### `GET /api/v1/analytics`

Authenticated clients can read a server-derived summary of lesson completion, challenge completion and reflections, solved exercises, practice attempts, accuracy, and recent reflections. This endpoint is read-only and does not mutate progress.

### `GET /api/v1/practice/attempts?limit=50`

Authenticated clients can read the most recent server-backed practice attempts. The optional limit is constrained to 1–100 records, and the route is read-only.

### `GET /api/v1/activity?limit=20`

Authenticated clients can read a recent learning timeline generated from synced lesson, challenge, and practice events. The optional limit is constrained to 1–100 records, and the route is read-only.

### `POST /api/v1/terminal/execute`

Authenticated clients can submit a bounded shell command to the Linux sandbox. The runner accepts a command of up to 2,000 characters, keeps the working directory under `/workspace`, enforces an 8-second maximum request timeout, caps output, and executes without network access or elevated privileges. It supports Docker or Podman and returns `503` when neither runtime or the sandbox image is available.

## Planned endpoint groups

- `auth`: password reset and shared production rate limiting remain planned; CSRF protection and account migration are implemented.
- `curriculum`: full server-owned modules, lessons, prerequisites, and content version remain planned; the summary endpoint is implemented.
- `commands`: server-owned search and command detail remain planned; the browser reference is available locally.
- `practice`: server-authoritative submissions and grading remain planned; attempt history is implemented.
- `progress`: revision queue and richer activity filters remain planned; snapshot read/write and activity event generation are implemented.
- `analytics`: additional mastery dimensions and historical trends.
- `terminal`: simulator sessions and, later, bounded execution jobs.

Routes should remain thin. Validation belongs in Pydantic schemas, business rules in services, and persistence in repositories backed by SQLAlchemy/Alembic.
