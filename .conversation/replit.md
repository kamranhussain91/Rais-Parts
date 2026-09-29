# Rais Honda POS & Workshop

A full-featured Point-of-Sale and workshop management system for a Honda motorcycle parts shop. Handles sales, inventory, customers, expenses, banking, service records, oil reminders, reporting, and user management.

## Run & Operate

- `pnpm --filter @workspace/honda-pos run dev` — run the frontend (port 23813)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Default Login Credentials

- **Super Admin**: username `admin` / password `admin`
- **Cashier**: username `cashier` / password `admin`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, TailwindCSS 4, shadcn/ui, Wouter (routing), Recharts
- API: Express 5
- Database: JSON file (`artifacts/api-server/data/db.json`) — file-based, no Postgres needed
- QR codes: `qrcode` npm package (for FBR invoice QR)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/honda-pos/src/components/` — all app views (DashboardView, POSView, InventoryView, etc.)
- `artifacts/honda-pos/src/components/AppContext.tsx` — global state/context (auth, data)
- `artifacts/api-server/src/routes/honda-pos.ts` — all REST API route handlers
- `artifacts/api-server/src/honda-types.ts` — shared TypeScript types
- `artifacts/api-server/data/db.json` — live JSON database (all data stored here)
- `artifacts/api-server/data/backups/` — auto-created backup files

## Architecture decisions

- File-based JSON database instead of Postgres — simpler for a single-shop deployment with backup/restore built in.
- All business logic in the API server; frontend is thin and stateless (reads via AppContext).
- FBR (Pakistan tax authority) compliance fields on invoices — hash, QR code, sync status.
- Role-based access: Super Admin, Admin, Manager, Cashier, Store Keeper, Staff.

## Product

- **POS / Sales**: create invoices, apply discounts, multiple payment methods (Cash/Bank/Wallet), FBR sync
- **Inventory**: products with part numbers, barcodes, stock levels, low-stock alerts
- **Purchases**: record supplier purchases, update stock automatically
- **Customers**: customer records with bike model, purchase history
- **Workshop**: service records (oil changes, tuning, etc.)
- **Oil Reminders**: track upcoming service reminders by customer/bike
- **Expenses**: record shop expenses by category
- **Banking**: multiple bank accounts + cash drawer, ledger entries
- **Reporting**: sales analytics, profit/loss, charts
- **Users**: manage staff accounts and roles
- **Backup/Restore**: download/upload the JSON database

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The API server must be running for the frontend to function (all data is fetched from `/api/*`)
- Restart the API Server workflow after editing `artifacts/api-server/src/routes/honda-pos.ts`
- The JSON db is at `artifacts/api-server/data/db.json` — edits persist immediately

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
