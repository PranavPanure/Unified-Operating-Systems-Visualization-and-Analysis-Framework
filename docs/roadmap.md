# Product roadmap

## Release 0.1 — verified local learning loop

- Curriculum discovery
- Lesson completion and notes
- Searchable command reference
- Simulated terminal
- Core visualizers
- Practice feedback
- Local analytics and export

## Release 0.2 — content depth

- Move curriculum into versioned schema-validated content files.
- Expand every module with multiple lessons, worked examples, and graded exercises.
- Add all required scheduling, paging, disk, synchronization, and deadlock algorithms.
- Add content validation for duplicate IDs, references, prerequisites, and cycles.

## Release 0.3 — persistence and identity

- PostgreSQL-compatible SQLAlchemy schema and Alembic migrations.
- Repositories for progress, notes, bookmarks, and assessment attempts.
- Secure cookie sessions and password hashing.
- Registration, login, current-user, and logout API endpoints.
- Server-side progress, bookmarks, notes, assessments, and activity events.
- Authenticated progress snapshot read/write with guest-to-account merge.
- Explicit guest mode and account migration flow.

## Release 0.4 — execution and delivery

- Simulated terminal remains the default.
- Separate bounded execution service for approved Linux exercises.
- Security tests for input, resource limits, cleanup, and concurrency.
- Playwright workflows, CI security scans, deployment manifests, and observability.
