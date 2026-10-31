# Usage metering architecture

## Implemented slice

`POST /api/v1/usage/events` accepts events under a tenant API key with the `usage:write` scope. The tenant ID comes from the API key and is never accepted from the request body. Required event attributes are a globally unique event ID, customer, subscription, meter, idempotency key, decimal quantity, event timestamp, and source; metadata is optional.

The API checks that the active meter, customer, and subscription belong to the tenant. A raw event and hourly plus daily aggregate increments are committed in one serializable PostgreSQL transaction. The transaction applies `app.tenant_id` before tenant-owned rows are queried. Duplicate replays with identical content return `duplicate: true`; key reuse with altered content returns conflict. Serialization failures retry up to three times. The raw table has a database trigger that rejects update and delete operations.

Late-arriving usage is retained with its original UTC timestamp and updates its historical hour/day projection. It never edits an invoice. Invoice adjustment and billing-period aggregation are not implemented yet.

`GET /api/v1/usage/summary` returns raw totals and daily projections. For complete UTC-day ranges, it compares raw usage against daily aggregates and reports missing or mismatched buckets. Invoice line and ledger comparisons are marked unavailable until those modules exist.

## Pricing and meter catalog

`UsageMeter` supports tenant-specific meter codes, unit names, integer minor-unit prices, currency, JSON tier configuration, and `FLAT`, `TIERED`, `VOLUME`, `STAIR_STEP`, and `PACKAGE` model enums. The current API does not yet calculate these prices or create invoice lines. A seed script creates AI input/output token, model call, GPU seconds, storage GB, and API request meters.

## Tenant API keys

Create a scoped key using `pnpm --filter @brightloop/api api-key:create <tenant-uuid> [name]`. The command stores only a SHA-256 hash and prints the raw secret once. The current command grants `usage:read` and `usage:write`; the API guard verifies key status, expiry, tenant status, and scopes. Key management UI, rotation workflow, rate limits, and per-key usage analytics remain planned.

## RLS and operational assumptions

Customer, subscription, meter, event, and aggregate tables use forced RLS policies keyed by `app.tenant_id`. Tenant-facing service transactions must call `setTenantContext` before querying these tables. The API runtime must connect as a non-superuser, non-`BYPASSRLS` role. Local Compose provisions a restricted `brightloop_app` role for runtime access and a separate `brightloop` owner connection for migrations. Do not run application traffic as the migration owner.

## Reconciliation and follow-up

The raw event log is authoritative; aggregates are rebuildable projections. The implemented read path detects raw-versus-daily differences for whole-day windows. Remaining work: controlled aggregate rebuild jobs, hourly/daily scheduled reconciliation, billing-period snapshots, adjustments for late usage after invoice finalization, invoice-line and ledger comparison, anomaly alerts, usage thresholds, and ingestion throughput/concurrency integration tests.
