# Marketline Supermarket Management

The project is being migrated in phases from the original static POS (`index.html`, `script.js`, and `styles.css`) to Next.js and MongoDB. Those original files are intentionally retained as migration references. The current Next.js app provides a MongoDB-backed staff sign-in foundation, expiring server-side sessions, role-checked inventory, product creation/search, stock adjustments with audit movements, and transactional POS checkout with immutable sale snapshots and a printable receipt.

This is an incremental migration, not yet the full requested production system. Store branding/settings, product image uploads, editing/archive tools, sales history/reports, staff management, email/WhatsApp delivery, password reset, production rate-limiting infrastructure, and automated integration tests remain to be implemented. Checkout and inventory writes require a configured Atlas replica-set cluster.

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the observed legacy behavior, MongoDB model choices, and remaining phases.

## Requirements

- Node.js 20.19 or newer
- A MongoDB Atlas cluster

## MongoDB Atlas setup

1. Create an Atlas project and cluster in your existing account.
2. Create a database user with a strong password. Do not use your Atlas account password as the database password.
3. In Network Access, allow your development machine's current public IP. For production, use a fixed Vercel egress IP/private networking solution where available; avoid leaving broad network access enabled.
4. Copy the cluster's Node.js connection string. Replace its placeholders and URL-encode special characters in the database username/password. Choose a database name such as `marketline`.

Atlas transactions require a replica set; Atlas clusters provide this. The eventual checkout workflow depends on transactions.

## Configure local secrets

Copy `.env.example` to `.env.local`, then set the values. `.env.local` is ignored by Git.

```text
MONGODB_URI=<your Atlas connection string>
AUTH_SECRET=<at least 32 random characters>
APP_URL=http://localhost:3000
INITIAL_OWNER_EMAIL=<owner's work email>
INITIAL_OWNER_PASSWORD=<unique password of at least 12 characters>
```

On macOS, create a secret with `openssl rand -base64 32`. Never prefix private values with `NEXT_PUBLIC_`, and never commit `.env.local`.

## Start the current phase

```sh
npm install
npm run setup:owner
npm run dev
```

Open `http://localhost:3000` and sign in with the one-time owner credentials. Remove `INITIAL_OWNER_PASSWORD` from `.env.local` after setup. Owner setup refuses to run if an owner already exists; there is no public registration route. The owner can then use **Manage inventory** and **Open point of sale** from the dashboard.

Inventory and checkout persist to MongoDB. Prices are stored as integer kobo; the server reloads product prices at checkout and never trusts prices sent by the browser. Checkout uses an Atlas transaction, a unique idempotency key, conditional stock updates, immutable purchased-item/payment snapshots, and stock movement entries. Payments are labeled cashier-recorded and are not presented as provider-verified. Print output supports thermal receipt and A4 page layouts.

Production deployment must set `MONGODB_URI`, `AUTH_SECRET`, and `APP_URL` in Vercel's server-side environment settings. Email and image-storage integrations will need separate provider credentials in the later integrations phase. Do not deploy before configuring these secrets, restricting Atlas network access, and running the later security/integration test checklist.

## Data migration safety

Do not treat existing browser `localStorage` sales as verified business transactions. Product records can be reviewed and imported later; the future importer will validate product identity, names, prices, and stock before writing to MongoDB. No legacy records are uploaded automatically by this phase.# supermarket
