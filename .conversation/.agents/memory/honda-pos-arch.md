---
name: Honda POS Architecture
description: Key facts about the Rais Honda POS & Workshop app — stack, file layout, auth credentials, and data persistence.
---

## Stack
- Frontend: React + Vite, Tailwind CSS v4, no React Query (direct fetch), artifact at `artifacts/honda-pos`
- Backend: Express 5 in `artifacts/api-server`, routes at `src/routes/honda-pos.ts`
- Data: JSON file-based DB at `artifacts/api-server/data/db.json` (no PostgreSQL used)
- API base path: `/api` — all frontend fetch calls use `/api/*` relative paths

## Auth (default seed credentials)
- admin / admin (Super Admin)
- manager / manager (Manager)
- cashier1 / cashier (Cashier)
- storekeeper / keeper (Store Keeper)

## Key files
- Frontend app entry: `artifacts/honda-pos/src/App.tsx` (tab-based routing via AppContext)
- Global state/API calls: `artifacts/honda-pos/src/components/AppContext.tsx`
- TypeScript types (frontend): `artifacts/honda-pos/src/types.ts`
- TypeScript types (backend): `artifacts/api-server/src/honda-types.ts`
- All API routes: `artifacts/api-server/src/routes/honda-pos.ts` (~1000 lines)

## Modules / views
Dashboard, POS, Sales History, Workshop, Oil Reminders, Inventory, Purchases, Expenses, Banking, Customers, Reports, Backup, Users, Invoice Verification (public QR)

## Important notes
- `@workspace/db` / PostgreSQL is NOT used by the honda-pos routes — data is in db.json
- qrcode npm package is required by api-server for FBR invoice QR generation
- FBR tax integration is simulated (fake API calls), not a real FBR connection
- Multi-terminal concurrency lock is in-memory on the Express server
- Role-based access: Cashier sees basic tabs; Admin/Manager see purchases, banking, reports, backup, users
