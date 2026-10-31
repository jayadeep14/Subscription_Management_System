# API documentation

The API uses the `/api/v1` prefix. `openapi.yaml` documents the implemented usage endpoints only; Swagger UI is not wired into the running Nest application yet. Planned webhook event types and delivery guarantees are in [webhooks.md](webhooks.md); they are not currently emitted.

## Implemented routes

| Method | Route | Scope | Status |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | Implemented; process-only health |
| `POST` | `/api/v1/usage/events` | `usage:write` | Implemented; append-only raw ingestion with hourly/daily aggregates |
| `GET` | `/api/v1/usage/summary` | `usage:read` | Implemented; raw/daily report, invoice and ledger reconciliation pending |

Usage calls pass the tenant API key using `X-API-Key`. The request tenant is derived from the key, not a caller-supplied tenant ID. API key creation is currently an operator CLI action. The secret is returned once and only its SHA-256 hash is stored.

Example event submission (replace the placeholders with IDs from the seeded demo tenant and a key created for that tenant):

```sh
curl -X POST http://localhost:4000/api/v1/usage/events \
  -H 'content-type: application/json' \
  -H 'x-api-key: <tenant-api-key>' \
  -d '{
    "eventId": "evt-ai-request-0001",
    "customerId": "<customer-uuid>",
    "subscriptionId": "<subscription-uuid>",
    "meterId": "<meter-uuid>",
    "idempotencyKey": "idem-ai-request-0001",
    "quantity": "1536",
    "timestamp": "2026-10-31T08:00:00.000Z",
    "source": "inference-api",
    "metadata": { "model": "example-model", "kind": "input_tokens" }
  }'
```

## Idempotency behavior

The raw `eventId` is globally unique. The idempotency key is unique within a tenant. Replaying the same event and payload returns an accepted duplicate response without adding quantity again. Reusing either identifier for different content returns HTTP 409. Retry serialization failures with the same identifiers.

Customer, product, subscription, invoice, payment, tax, ledger, webhook, and analytics endpoints remain roadmap items. No OpenAPI docs are claimed for those endpoints yet.
