# Brightloop Subscription Management Platform

The Advanced Multi-Tenant Subscription Management, Automated Billing and Revenue Intelligence Platform is being built as a modular monolith for subscription businesses. Its central workflow is customer and product management through plans, quotations, subscriptions, recurring invoices, payment collection and revenue reporting.

## Implemented today

**Phase 1 foundation (initial scaffold):** pnpm workspace; Next.js web shell; NestJS API with `/api/v1/health`; PostgreSQL and Redis local services; Prisma 7 tenant, user, membership and RBAC schema; BullMQ worker process shell; environment template and initial architecture notes.

This is an early foundation, not a production-ready billing system. Authentication, tenant authorization, domain workflows, payment integrations, migrations, tests, production deployment and remaining modules are planned and not implemented yet.

## Architecture

- `apps/web`: Next.js App Router user interface.
- `apps/api`: NestJS versioned REST API and Prisma schema.
- `apps/worker`: BullMQ worker process, initially with no business job handlers.
- PostgreSQL is the source of truth for business and financial state. Redis/BullMQ is for asynchronous work, not financial correctness.
- The modular monolith will gain domain modules in `apps/api/src/modules` as each workflow is implemented.

See [architecture overview](docs/architecture/overview.md), [database notes](docs/database/README.md), and [security baseline](docs/security/baseline.md).

## Requirements

- Node.js 20.19 or newer
- Corepack with pnpm 10.20.0
- Docker Engine and Docker Compose

The current workspace runtime is Node 18.19.1, below the declared minimum. Use Node 20.19+ before running the JavaScript applications (Prisma 7.10.1 requires this minimum).

## Local setup

1. Copy `.env.example` to `.env` and replace the local secrets before any shared deployment.
2. Start infrastructure: `docker compose up -d postgres redis`.
3. Install dependencies with `corepack pnpm install`.
4. Generate the Prisma client: `corepack pnpm db:generate`.
5. Create/apply the initial development migration: `corepack pnpm db:migrate`.
6. Run the web and API: `corepack pnpm dev`. Run the worker separately with `corepack pnpm dev:worker`.

Web: http://localhost:3000 · API health: http://localhost:4000/api/v1/health

Database and Redis ports are exposed only for local development. Compose credentials are development-only.

## Planned implementation phases

1. Complete foundation: validated configuration, Prisma connection lifecycle, migration baseline, observability and health checks.
2. Authentication, tenant context, RBAC and tenant-isolation enforcement.
3. Customers, product catalog, plans, quotations and subscription state machine.
4. Billing periods, invoices, taxes, idempotency and billing jobs.
5. Provider adapter and verified payment/webhook workflow.
6. Proration, usage, credits and dunning.
7. Double-entry ledger and reconciliation.
8. Revenue analytics, customer portal, hardening and deployment.

## Checks

No tests or runtime checks have been run for this initial scaffold. The API exposes only a process-level health endpoint; a database readiness endpoint and Redis readiness check remain to be added. The API module opens a PostgreSQL connection at startup, so it will not start until the database is available.
