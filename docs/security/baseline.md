# Security baseline and outstanding work

Full user authentication is not implemented. The usage API slice has scoped tenant API-key authentication: only the key hash is stored, the tenant is derived from the key, and each key is checked for scope, expiry, revocation, and tenant status. Key creation is an operator CLI action that prints the key once. Do not treat the platform as production-ready.

Usage-event operations run inside a transaction that applies `app.tenant_id`; forced PostgreSQL RLS policies guard customer, subscription, usage meter, raw event, and aggregate tables. Composite tenant foreign keys add relational isolation. The API runtime role must be a non-superuser without `BYPASSRLS`. The local Postgres init script creates this restricted role; use the separate owner connection only for schema migrations.

Before broader tenant data is exposed, implement password hashing, email verification, short-lived access tokens, rotating refresh tokens, session revocation, login rate limiting, permission checks, tenant context guards across API and workers, and cross-tenant tests. Every object lookup must be tenant scoped on the server. Test direct cross-tenant ID substitution.

Secrets belong in a secret manager for deployment. `.env` is ignored by git; `.env.example` contains placeholders and local-only database credentials. Payment status must be verified server-side from provider APIs or signed webhooks. Finalized invoices and posted journal entries must be immutable; corrections use credit notes or compensating ledger transactions.
