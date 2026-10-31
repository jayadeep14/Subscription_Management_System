# Webhook design and event catalog

No webhook delivery endpoint, subscription management API, signing flow, retry worker, or dead-letter queue is implemented yet. The contract below is the planned event catalog; it should be implemented after the outbox publisher and delivery persistence exist.

## Planned event types

```text
customer.created
subscription.created
subscription.activated
subscription.renewed
subscription.upgraded
subscription.downgraded
subscription.paused
subscription.cancelled
subscription.expired
invoice.generated
invoice.finalized
invoice.paid
invoice.overdue
invoice.voided
payment.failed
payment.succeeded
payment.refunded
usage.recorded
usage.threshold.crossed
credit.low_balance
credit.expired
dunning.started
dunning.recovered
reconciliation.exception.created
revenue_leakage.detected
```

## Delivery guarantees to implement

- Persist events to a transactional outbox in the same PostgreSQL transaction as the business state change.
- Deliver at least once; consumers must deduplicate by stable event ID.
- Sign each request with an HMAC secret scoped to the tenant endpoint and include a timestamp to limit replay windows.
- Persist endpoint, event, attempt count, response status, latency, next retry time, and final state.
- Retry transient errors with bounded exponential backoff; move exhausted deliveries to a dead-letter state with controlled replay.
- Rotate endpoint secrets with a short, documented overlap period and audit the actor.
- Avoid putting payment credentials or unnecessary personal data in event payloads.

Webhook delivery and signature verification are not production-ready until these behaviors and tenant-isolation tests are implemented.
