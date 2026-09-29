---
name: Damage & Returns Feature
description: How the stock adjustment (damage/return) system is structured across types, API, context, and UI.
---

## What was added

Types (in both `artifacts/api-server/src/honda-types.ts` AND `artifacts/honda-pos/src/types.ts`):
- `StockAdjustmentType` = 'Damage' | 'Customer Return' | 'Supplier Return' | 'Manual Adjustment'
- `AdjustmentResolution` = 'Pending' | 'Returned to Supplier' | 'Written Off' | 'Repaired & Restocked'
- `StockAdjustmentRecord` interface — includes stockBefore/stockAfter, direction for Manual Adjustment, resolution lifecycle

Stock impact rules:
- Damage → stock -= qty
- Customer Return → stock += qty
- Supplier Return → stock -= qty
- Manual Adjustment + direction=Add → stock += qty; direction=Remove → stock -= qty

API routes (in `artifacts/api-server/src/routes/honda-pos.ts`):
- `GET /api/stock-adjustments` — list all
- `POST /api/stock-adjustments` — create (adjusts product stock in place)
- `PUT /api/stock-adjustments/:id` — update resolution status only (does NOT reverse stock)
- `DELETE /api/stock-adjustments/:id` — reverses the stock change and removes the record

AppContext (`artifacts/honda-pos/src/components/AppContext.tsx`):
- `saveStockAdjustment({ productId, type, qty, direction?, reason, notes?, referenceNo? })`
- `updateStockAdjustment(id, resolution, notes?)`
- `deleteStockAdjustment(id)`

UI (`artifacts/honda-pos/src/components/InventoryView.tsx`):
- Two tabs: Products (existing) and Damage & Returns
- Products tab: each row has a ShieldAlert button to open log modal pre-filled
- Damage & Returns tab: stat cards (damage qty, customer return qty, supplier return qty, pending count), filter by type/resolution, table with inline resolve picker
- Log modal: product search dropdown, type selector (4 types), direction picker (Manual Adjustment only), reason dropdown (per-type options), reference no + notes

**Why:**
- `src/types.ts` had to be created from scratch — it was imported by all components but never committed to the repo.

**How to apply:**
- Keep both `honda-types.ts` (server) and `src/types.ts` (frontend) in sync when adding new shared types.
- The DELETE route reverses stock via `stockAfter - stockBefore` delta math — this means editing a record after the product stock changed could give wrong reversals; avoid editing stockBefore/stockAfter after creation.
