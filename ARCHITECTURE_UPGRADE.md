# Architecture upgrade notes

The existing application has intentionally been preserved instead of being reduced to a new MVP.

## Preserved feature areas

Dashboard, POS, sales history, invoice editing, invoice verification, FBR queue/sync, inventory, stock adjustments, purchasing, partial receiving, workshop services, workshop parts, oil/service reminders, expenses, banking, customer CRM, customer credit/payments, reporting, users/roles, backup/restore, and terminal synchronization remain in the application.

## New reliability layer

### Authentication

- Server-side login endpoint.
- Secure httpOnly signed session cookie.
- Passwords upgraded from legacy plaintext to scrypt hashes.
- Database snapshots returned to the browser never include user passwords.
- Client-provided `auth` payloads are overwritten with the authenticated server identity.

### Durable state

The current `AppDatabase` shape is preserved in PostgreSQL as a JSONB state document in `app_state`. This makes the transition non-destructive while providing durable multi-instance storage and database-level locking.

### Concurrency

Mutation requests acquire a PostgreSQL advisory lock. This prevents two terminals from loading the same state and then silently overwriting each other when they write.

### Synchronization

The frontend refreshes the authoritative snapshot automatically every 5 seconds and on window focus. This is intentionally Vercel-compatible and does not depend on long-lived WebSocket connections.

### Sales correctness

The sale endpoint now recalculates totals on the server, checks stock on the server, aggregates duplicate product quantities, uses database-safe UUIDs, and prevents overselling.

Invoice edits now reverse the original inventory/customer-payment effects and re-apply the edited transaction, including payment-account changes.

### FBR safety

FBR secrets are environment-driven. The queue does not mark an invoice approved in live mode unless a real adapter is connected/configured. Mock approval is explicit through `FBR_MOCK_MODE=true`.

## Important limitation

The application remains intentionally compatible with the existing `AppDatabase` document model. A future iteration can normalize individual domains into dedicated PostgreSQL tables (sales, inventory movements, journal entries, receivables, payables) without requiring a frontend rewrite. This upgrade establishes the secure/persistent/concurrent foundation needed for that next stage.
