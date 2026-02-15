# Security Deployment (Defense-in-Depth)

This repo is often run on laptops/dev machines, but some users expose the dashboard to the internet.
If you do, use these layers:

## Layer 0: Secrets Hygiene

- Never paste `.env` or tokens into external platforms.
- Rotate any secret that was shared externally.

## Layer 1: Network Boundary (Recommended)

Expose *only* a reverse proxy to the internet (Caddy/Nginx/Cloudflare Access).
Keep the taskboard server bound to localhost or private network.

- Server: bind to `127.0.0.1:3011` (or firewall it).
- Reverse proxy: HTTPS + Basic Auth / SSO.

Example config: `deploy/security/Caddyfile.example`

## Layer 2: API Auth (Already in server)

- Use `X-API-Key` or `Authorization: Bearer <key>`.
- Prefer split keys:
  - `OPENCLAW_READ_KEY` for read-only
  - `OPENCLAW_WRITE_KEY` for write
  - `OPENCLAW_ADMIN_KEY` for admin endpoints

Prod recommendation:
- `OPENCLAW_ENFORCE_WRITE_AUTH=true`
- `OPENCLAW_ENFORCE_READ_AUTH=true`

## Layer 3: Dashboard Auth (Static UI)

Enable Basic Auth for `/` by setting:

- `OPENCLAW_DASHBOARD_BASIC_USER`
- `OPENCLAW_DASHBOARD_BASIC_PASS`

## Layer 3b: n8n Editor Auth

If you expose n8n (port 5678) to the internet, enable n8n Basic Auth:

- `N8N_BASIC_AUTH_ACTIVE=true`
- `N8N_BASIC_AUTH_USER=<user>`
- `N8N_BASIC_AUTH_PASSWORD=<strong password>`

For local-only access, bind the port to localhost:

- Docker: `127.0.0.1:5678:5678`

## Layer 4: Proxy Awareness

If behind a proxy, set:

- `OPENCLAW_TRUST_PROXY=true`

So `req.ip` and rate limiting use the real client IP.

## Quick Check

- `GET /api/security/status` (no secrets) to see if key protections are enabled.
