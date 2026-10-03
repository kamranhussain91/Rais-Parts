# Rais Honda deployment on GitHub + Vercel

This repository keeps the existing POS/workshop feature set and adds a safer server-side session, durable PostgreSQL-backed application state, server-side authentication/authorization, multi-terminal-safe writes, automatic frontend synchronization, safer invoice editing, and Vercel routing.

## 1. Push the whole repository to GitHub

Keep the monorepo structure unchanged. Vercel should be connected to the repository root (the directory containing `package.json`, `pnpm-workspace.yaml`, and `vercel.json`).

## 2. Provision PostgreSQL

Create a PostgreSQL database using your preferred provider (Vercel Postgres/Neon/Supabase/etc.) and copy its connection string.

Required environment variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — long random secret, preferably 32+ characters.

Recommended:

- `FRONTEND_ORIGIN` — your Vercel site URL, e.g. `https://your-project.vercel.app`.
- `DB_POOL_MAX=5`
- `FBR_API_URL` — only when using a real FBR adapter.
- `FBR_API_KEY` — never commit this value.
- `FBR_API_SECRET` — never commit this value.
- `FBR_MOCK_MODE=false` for production. Set `true` only for explicit test/demo processing.

## 3. Deploy the project

The repository contains `vercel.json`. Vercel will:

1. install the pnpm workspace,
2. build the existing React/Vite frontend,
3. serve the frontend from `artifacts/honda-pos/dist/public`,
4. route `/api/*` to the Express application in `api/index.ts`,
5. serve the SPA routes through `index.html`.

## 4. First database startup

The first runtime request creates the `app_state` PostgreSQL table automatically. When an empty database is detected, the application imports the existing `artifacts/api-server/data/db.json` dataset instead of replacing it with a blank database.

The existing users/products/sales/purchases/services/expenses/accounts/customers/suppliers/FBR/sync/stock-adjustment data is therefore used as the migration source.

## 5. Existing login accounts

The included seed/live JSON user passwords are stored as secure scrypt hashes. A legacy plaintext password encountered in an older database is upgraded automatically on the user's first successful login.

The browser no longer downloads the user/password database to perform authentication.

## 6. Backups on Vercel

The existing "Download Database JSON" feature remains the portable backup mechanism and downloads the current database to the administrator's computer.

The "Write Server Backup" feature remains available. Vercel's local filesystem is ephemeral, so timestamped server mirror files are written to `/tmp` in Vercel and should not be treated as the long-term backup store. Use portable JSON exports and/or an external backup store for durable offsite backup.

## 7. FBR

The current queue/retry/verification feature remains available. This version no longer fabricates an FBR approval in live mode. Set `FBR_MOCK_MODE=true` only for a deliberate test/demo environment, or connect the actual FBR API adapter with the required credentials.

## 8. Multi-terminal synchronization

All authenticated terminals periodically refresh the authoritative database snapshot every 5 seconds and immediately refresh when the browser regains focus. Financial writes use a PostgreSQL advisory lock so simultaneous terminal operations cannot overwrite each other through the legacy read/modify/write flow.
