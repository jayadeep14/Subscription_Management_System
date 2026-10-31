# Security baseline and outstanding work

The foundation does not yet implement authentication or tenant authorization. Do not expose it as a production service. The API currently enables a fixed-origin CORS policy, global DTO validation behavior, and a health endpoint without business data.

Before tenant data is exposed, implement password hashing, email verification, short-lived access tokens, rotating refresh tokens, session revocation, login rate limiting, permission checks, and tenant context guards. Every object lookup must be tenant scoped on the server. Add composite tenant foreign keys and test direct cross-tenant ID substitution.

Secrets belong in a secret manager for deployment. `.env` is ignored by git; `.env.example` contains placeholders and local-only database credentials. Payment status must be verified server-side from provider APIs or signed webhooks. Finalized invoices and posted journal entries must be immutable; corrections use credit notes or compensating ledger transactions.
