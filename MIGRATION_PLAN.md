# Marketline Migration Plan

## Existing application

The current app is three static files, not an Express application. `index.html` contains a broad hardcoded Nigerian product catalogue and basic POS, inventory, receipt, sales-history, and dashboard markup. `script.js` keeps editable products and sales in browser `localStorage`; stock and sales therefore do not synchronize across users or devices. Staff login has no handler or server enforcement. The receipt flow currently uses receipt values before defining them, so checkout cannot reliably complete. `styles.css` is the existing visual layer.

The three original files remain at the project root during migration. Their catalogue names and the price map are useful review material. Browser inventory may be exported as candidate products after validation. Browser sales are untrusted records and will not be imported as verified payments or official sales.

## Target structure

```text
src/
  app/                 App Router pages and Route Handlers
  components/          Shared accessible UI and forms
  lib/                 Mongoose connection, auth, validation, utilities
  models/              Mongoose schemas and indexes
  services/            Inventory, checkout, receipt, reporting workflows
  types/               Shared application types
scripts/               One-time owner setup and migration commands
tests/                 Unit and integration tests
public/                Static brand assets
```

## MongoDB model choices

- `User` stores the password hash, active state, and role; `Session` stores only a hash of its random bearer token with a TTL index.
- `Product` references a `Category`; `InventoryMovement` references both product and acting user to keep a durable stock audit trail.
- `Sale` references its cashier but embeds immutable item snapshots and payment records. Receipts are generated from that snapshot, not live product records.
- `StoreSettings` is a singleton document. Audit events are append-only documents. Login throttling records are short-lived and TTL-indexed.
- Checkout uses an Atlas replica-set transaction, a unique idempotency key, server-reloaded prices, and conditional stock decrements. Atlas must support transactions.

Product selling and cost prices are persisted as integer kobo (for example, ₦1,250.50 is `125050`). `Product` has unique SKU and optional unique barcode indexes, category/status/search indexes, low-stock thresholds, and archival state. Product and stock-adjustment writes append `InventoryMovement` records; product creation and its opening-stock movement are atomic. `Sale` embeds the immutable line and cashier-recorded payment snapshots; checkout creates its sale, stock deductions, and sale movements in a single MongoDB transaction.

## Delivery phases

1. Inspect and document the existing app and data risks. Keep the legacy files intact.
2. Establish Next.js App Router, TypeScript, Tailwind, server-only configuration, and the new visual foundation.
3. Add Mongoose connection/models, one-time owner setup, hashed-password login, and server-backed sessions.
4. Add role-guarded products, categories, inventory movements, and validated legacy product import.
5. Add cashier POS and idempotent transactional checkout; retain immutable sale and payment snapshots.
6. Add receipts, store settings, staff management, reports, and image/email integrations when provider credentials are configured.
7. Add focused tests, deployment instructions, Atlas setup, monitoring guidance, and production checks.

The current implementation establishes the App Router/design foundation and a first server-backed authentication, inventory, and checkout slice. MongoDB connection configuration and a one-time owner setup are required before protected workflows can be used. The original browser app remains unchanged; no browser sales are imported or represented as verified records.

## Current implementation status

- Foundation: Next.js App Router, React, TypeScript, Tailwind, accessible responsive login, Mongoose connection, Argon2id password hashing, server-side expiring sessions, owner bootstrap.
- Inventory: owner/manager guarded inventory screen and endpoints, validated product creation/search/pagination, category records, restricted cost-price projection, opening-stock and adjustment audit movements.
- POS/checkout: authenticated cashier route, server-loaded products and prices, cart quantities, optional customer data, cash/transfer/POS/other recording, transaction-safe stock deduction, idempotency, immutable sale snapshots, and receipt printing layouts.
- Still pending: product editing/archive and uploads, category UI, store settings/branding, staff lifecycle and password recovery, login rate limiting backed by a production shared store, receipt history/reprint and delivery, sales/report analytics, legacy product import, CI/integration tests, production Vercel validation, and monitoring.

The checkout and movement transactions require Atlas or another MongoDB replica-set deployment. A local standalone MongoDB instance will not satisfy transaction requirements. Never import legacy browser sales as provider-verified payments.