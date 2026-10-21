# Security posture and limitations

## Current release

- The terminal is simulated in memory and does not invoke a host shell.
- Browser progress is stored in localStorage and must not contain secrets.
- The API has optional account registration/login with server-side sessions and authenticated progress snapshot sync; guest mode remains local-only.
- Cookie-authenticated writes use a double-submit CSRF token, and auth attempts have an in-memory per-client rate limit for the current deployment shape.
- API responses include baseline browser security headers; container startup applies Alembic migrations before serving traffic.
- No user-upload feature is enabled.

## Required before real execution

The Linux execution prototype uses a disposable non-root container with a disabled network namespace, read-only root, bounded temporary storage, CPU/memory/process/output/time limits, dropped capabilities, and cleanup on timeout. For multi-user production, move this runner behind a separate execution service; the learner-facing API must never receive a Docker socket or construct container arguments from untrusted strings.

## Required before multi-user deployment

Move rate limiting to a shared production store, add request-size limits, structured audit logs, and TLS termination. Keep server-side ownership checks on every new progress route and keep the current strict CORS allowlist. Note edits now use optimistic version checks with explicit client-side resolution. Guest/local mode remains separate from the account system by design.
