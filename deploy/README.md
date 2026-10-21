# OS A2Z production handoff

This deployment layout keeps the API and Podman sandbox on the same Linux VPS. The frontend can be hosted separately on Vercel, Netlify, or any static HTTPS host. The API is run directly on the VPS so it can use the local Podman CLI without exposing a container socket.

## Files

- `os-a2z-api.service`: systemd service for the FastAPI API.
- `Caddyfile`: HTTPS reverse-proxy example.
- `.env.production.example`: production variables to copy into `/etc/os-a2z/api.env`.
- `bootstrap-ubuntu.sh`: repeatable VPS setup script.

## What you must provide

1. A Linux VPS with sudo access and Podman support.
2. A managed PostgreSQL connection string.
3. A domain with DNS records for the frontend and API.
4. A frontend hosting account, if using Vercel or Netlify.

The script does not create cloud accounts, DNS records, database instances, or TLS certificates on your behalf.

## Vercel frontend option

Use GitHub as the source repository and connect it to Vercel. Create a Vercel project with the repository root set to `apps/web`, then configure:

```text
Build command: npm run build
Output directory: dist
Install command: npm ci
Environment variable: VITE_API_BASE_URL=https://api.example.com/api/v1
```

The API and sandbox still need to run on a Linux VPS. No GitHub Pages configuration is required.

The `publish-images.yml` workflow publishes tagged API and sandbox images to GitHub Container Registry. It is useful when the VPS should pull versioned images instead of building locally.

## Deployment sequence

1. Copy the repository to `/opt/os-a2z` on the VPS.
2. Copy `.env.production.example` to `/etc/os-a2z/api.env` and replace every placeholder.
3. Run `sudo ./deploy/bootstrap-ubuntu.sh`.
4. Point `api.example.com` to the VPS and use the supplied Caddy configuration.
5. Deploy `apps/web` as a Vite static app with `VITE_API_BASE_URL=https://api.example.com/api/v1`.
6. Set `CORS_ORIGINS` in the API environment to the exact frontend origin.
7. Complete the staging checklist in `docs/DEPLOYMENT.md`.
