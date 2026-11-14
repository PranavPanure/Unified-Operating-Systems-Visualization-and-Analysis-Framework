# OS A2Z implementation status

Updated: 2026-11-14

## Interactive lab refinement (2026-11-14)

- [x] Fixed the deadlock lab's broken layout: `.deadlock-studio-route .app-shell` never matched the element carrying both classes, so the flex shell never applied and the entire main panel rendered below the fold. The selector is now compound.
- [x] Fixed the same descendant-selector bug in the CPU, synchronization and disk labs, which had silently disabled their theme rules.
- [x] Removed the standalone-product chrome from all five labs: the CPU lab linked to a third-party GitHub repository and four labs linked to a placeholder `https://github.com`. Every lab now shows `OS A2Z · <lab>` and a Workspace link back to the app.
- [x] Replaced unloaded Google Font webfonts (`DM Sans`, `DM Mono`, `Manrope`) with the app's system stacks and removed the render-blocking `@import` requests from all five stylesheets.
- [x] Gave each lab a distinct sidebar icon (paging, synchronization and deadlocks previously shared one).
- [x] Retired the light theme: it was a root colour flip that left headings and panel text unreadable, so the app and every lab are now a single, consistent dark workspace instead of shipping a switch that broke pages.

## Final product polish (2026-11-14)

- [x] Unified the product name to OS A2Z across the landing page, sidebar, breadcrumbs, and page title; the previous UOSVAF naming is gone.
- [x] Rebuilt the landing page with live curriculum metrics, five lab previews, a twelve-module index, and a footer.
- [x] Made the topbar search real: a Ctrl/Cmd K command palette searches pages, lessons, commands, and exercises.
- [x] Replaced placeholder dashboard figures (`/8` exercises, `0h 00m` learning time) with derived lessons, exercises, module mastery, and attempt accuracy.
- [x] Replaced the hardcoded `0 day streak` with a real consecutive-day streak derived from recorded activity.
- [x] Persisted the learning goal in settings instead of showing a select that saved nothing.
- [x] Made practice hints data-aware (answer shape and option count) instead of the same generic sentence for every exercise.
- [x] Added an offline mission catalogue so the missions page never renders empty without the API.
- [x] Added a favicon and social metadata.
- [x] Code-split each visualizer studio; the 530 kB visualizer chunk is now five focused chunks and the bundle-size warning is resolved.
- [x] Added `product-styles.css` for the new landing, palette, and settings surfaces.

## Completed in this session

- [x] Inspected the empty workspace and established a monorepo layout.
- [x] Added React, Vite, TypeScript, React Router, Lucide, Recharts, Zod-ready frontend configuration.
- [x] Added the shared OS A2Z application shell and responsive dark/light themes.
- [x] Added a 12-module roadmap manifest with prerequisites and lesson material.
- [x] Expanded every module to include a second meaningful lesson focused on application and common failure modes.
- [x] Added lesson pages, notes, bookmarks, local progress, analytics, and export.
- [x] Added a searchable command reference with examples and safety notes.
- [x] Added a safe simulated terminal with a virtual filesystem and supported command subset.
- [x] Added FCFS, SJF, SRTF, non-preemptive/preemptive Priority, and Round Robin scheduling simulators.
- [x] Added FIFO, LRU, and Optimal paging plus FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK disk simulators.
- [x] Added a bounded-buffer producer/consumer synchronization visualizer.
- [x] Added practice exercises with answer evaluation, explanations, retries, and scoring state.
- [x] Added persistent local assessment attempts, attempt accuracy, and a revision queue for missed unsolved exercises.
- [x] Fixed the practice hint flow so revealing a hint never fills or credits the answer.
- [x] Expanded the practice bank to cover every roadmap module with multiple module-specific checks.
- [x] Added FastAPI health and curriculum endpoints, API tests, Dockerfile, Compose configuration, and CI workflow.
- [x] Added SQLAlchemy persistence models, repositories, Alembic configuration, and the initial PostgreSQL-compatible migration.
- [x] Added password hashing, server-side session records, and register/login/me/logout API endpoints.
- [x] Added frontend account center with guest fallback, API availability state, login/register forms, and sign-out flow.
- [x] Added narrow credentialed CORS support for the local web origin and readable validation errors in the API client.
- [x] Added authenticated progress snapshot read/write for lessons, solved exercises, bookmarks, notes, and attempts, with guest-to-account merge and debounced frontend sync.
- [x] Added double-submit CSRF protection for cookie-authenticated writes and an in-memory auth rate limiter.
- [x] Added optimistic note versioning with explicit local/server conflict resolution in the lesson scratchpad.
- [x] Moved curriculum modules, command reference, and practice exercises into versioned Zod-validated content artifacts.
- [x] Published `curriculum.v2.json` with a third lesson for every module and twelve additional module-specific practice exercises.
- [x] Published `curriculum.v3.json` with explicit lab destinations for every lesson and routed the lesson experiment links to those destinations.
- [x] Published `curriculum.v4.json` with lesson-specific simulator presets and added preset-aware scheduling, paging, synchronization, deadlock, and disk labs.
- [x] Added visible preset context cards inside simulators so learners know what each lesson experiment is testing.
- [x] Published `curriculum.v5.json` with concrete experiment challenges and gated lesson completion on recording the challenge.
- [x] Persisted challenge completion locally and in the authenticated API with migration `0004_completed_challenges`.
- [x] Added timestamped challenge attempts and optional learner reflections with migration `0005_challenge_attempts`.
- [x] Added challenge completion-rate analytics and recent reflection history to the analytics page.
- [x] Added module-level challenge coverage with completion rates, attempt counts, and visual progress bars.
- [x] Added authenticated analytics summary API and account-backed analytics status on the analytics page.
- [x] Added authenticated practice-attempt history API and recent account history on the analytics page.
- [x] Added authenticated learning activity timeline API and recent account activity on the analytics page.
- [x] Added module and difficulty practice lanes with filter-aware exercise navigation.
- [x] Added Readers–Writers and Dining Philosophers visualizers with step-by-step trace controls.
- [x] Added container migration entrypoint, API healthcheck, baseline security headers, and a combined verification target.
- [x] Added authenticated Linux sandbox execution prototype with bounded non-root Docker isolation and a terminal UI runner.
- [x] Added Zod-backed curriculum validation and algorithm tests for the new policies.
- [x] Code-split visualizer and analytics routes; the previous initial-bundle warning is resolved.
- [x] Added README, architecture documentation, security limitations, Makefile, and environment template.

## Verification actually run (2026-11-14 polish pass)

- `npm run typecheck` — passed.
- `npm test` — passed: 18 tests in 2 files.
- `npm run build` — passed with no chunk-size warning; visualizer labs are emitted as separate route chunks.
- `npm run dev` — server started and returned HTTP 200 on the landing route.

## Verification from earlier sessions

- `npm install` — completed; npm reported 0 vulnerabilities.
- `npm run typecheck` — passed.
- `npm test` — passed: 16 tests, including the v2 content artifact check.
- `npm run build` — passed; visualizer and analytics are emitted as route chunks.
- Browser smoke test — landing page, dashboard route, terminal route, practice hint/incorrect feedback, revision queue, and `pwd` interaction rendered with no console errors.
- Browser account smoke test — API availability, login, signed-in sidebar state, and logout all verified.
- Browser/API sync smoke test — authenticated `GET /api/v1/progress` and `PUT /api/v1/progress` both returned 200.
- Local live-server check — web app returned 200; API health returned 200; authenticated analytics route was exposed and correctly returned 401 without a session.
- Browser/API security smoke test — an invalid CSRF token was rejected with 403; the valid authenticated sync path returned 200.
- Note conflict API test — stale note edits are retained as conflicts and do not overwrite the newer server note.
- `python -m pytest apps/api/tests` — passed: 5 tests, including auth, CSRF, progress sync, and persistence checks.
- `python -m ruff check apps/api/app apps/api/tests` — passed.
- `cd apps/api && python -m alembic upgrade head` — passed against SQLite verification database.
- `cd apps/api && python -m alembic current` — confirmed `0005_challenge_attempts (head)`.

## Remaining work

- Continue expanding lessons and exercise banks with authored study material and richer answer explanations.
- Move rate limiting to a shared production store, add request-size limits, and stricter content ownership validation.
- Add server-owned curriculum/content endpoints so grading can be authoritative instead of browser-only.
- Add real exercise grading service; assessment attempt history and account analytics are now implemented.
- Move the Linux sandbox behind a dedicated execution service before multi-user production; add concurrency quotas, audit logs, and lifecycle monitoring.
- Add Playwright end-to-end tests, ESLint, dependency/security scans, and deployment-specific smoke tests.
- Configure a production host, managed PostgreSQL, shared rate limiting, TLS, monitoring, backups, and secrets.

## Resume commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```
