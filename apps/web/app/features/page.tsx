import Link from 'next/link';

const featureGroups = [
  {
    id: 'subscriptions', number: '01', title: 'Subscription operations', status: 'Planned', tone: 'planned',
    summary: 'The core customer-to-renewal workflow for recurring revenue businesses.',
    points: ['Customers, products, variants, plans, and quotations', 'Trials, renewals, upgrades, downgrades, pauses, and cancellations', 'Recurring invoices, payment collection, and customer self-service'],
  },
  {
    id: 'metering', number: '02', title: 'AI and API usage metering', status: 'Working slice', tone: 'working',
    summary: 'Tenant-scoped event ingestion with idempotency and hourly and daily usage projections.',
    points: ['Meters for input/output tokens, model calls, GPU seconds, storage, and API requests', 'Append-only raw events with duplicate detection and decimal quantities', 'Raw-to-daily aggregate reconciliation for complete UTC-day ranges'],
    note: 'Pricing evaluation, billing-period snapshots, invoice adjustments, and invoice/ledger matching are still planned.',
  },
  {
    id: 'ledger', number: '03', title: 'Ledger and reconciliation', status: 'Planned', tone: 'planned',
    summary: 'Auditable financial records designed around balanced entries and explicit corrections.',
    points: ['Double-entry journals and immutable posted records', 'Reversals, revenue-recognition schedules, and account balances', 'Daily invoice, payment, refund, settlement, bank, and ledger matching'],
  },
  {
    id: 'gst', number: '04', title: 'India-first GST compliance', status: 'Planned', tone: 'planned',
    summary: 'Separate tax calculation, invoice issuance, e-invoice submission, and filing reconciliation.',
    points: ['CGST, SGST, IGST, UTGST, cess, place of supply, and GSTIN handling', 'Sequential tenant invoice numbers, credit notes, and debit notes', 'Eligible e-invoicing workflows and GSTR-1/GSTR-3B reconciliation views'],
  },
  {
    id: 'dunning', number: '05', title: 'Dunning and recovery intelligence', status: 'Planned', tone: 'planned',
    summary: 'Recover failed renewals with configurable policies and explainable customer risk signals.',
    points: ['Payment-attempt history and retry schedules by failure reason', 'Recovery score using tenure, usage, payment history, and engagement signals', 'Human overrides, recovery outcomes, and revenue-saved reporting'],
  },
  {
    id: 'forecasting', number: '06', title: 'Revenue forecasting and churn', status: 'Planned', tone: 'planned',
    summary: 'Decision-support forecasts with visible assumptions, model versions, and confidence.',
    points: ['Recurring, usage-based, and hybrid revenue scenarios', 'Cohorts, NRR, GRR, expansion, contraction, and reactivation', 'Customer health signals with explanations and human review'],
  },
  {
    id: 'leakage', number: '07', title: 'Revenue leakage detection', status: 'Planned', tone: 'planned',
    summary: 'Find mismatches between entitlements, usage, invoices, payments, credits, discounts, and ledger.',
    points: ['Detect missing or duplicate invoices and unbilled usage', 'Flag incorrect pricing, stale discounts, and unreconciled refunds', 'Track cases by severity, root cause, financial impact, owner, and resolution'],
  },
  {
    id: 'security', number: '08', title: 'Multi-tenant security', status: 'Partial foundation', tone: 'partial',
    summary: 'Tenant context is enforced in the usage API; full platform isolation remains work in progress.',
    points: ['Scoped tenant API keys stored as hashes', 'Composite tenant references and PostgreSQL RLS on usage tables', 'Planned coverage for users, queues, cache, files, analytics, audit, and rate limits'],
  },
  {
    id: 'developer', number: '09', title: 'Developer APIs and webhooks', status: 'Partial foundation', tone: 'partial',
    summary: 'Versioned REST foundations with a documented usage-event contract.',
    points: ['Implemented health and tenant-scoped usage routes under /api/v1', 'Planned scoped API-key management, cursor pagination, and sandbox mode', 'Planned signed webhooks, retries, delivery history, and dead-letter replay'],
  },
  {
    id: 'reliability', number: '10', title: 'Reliability and observability', status: 'Partial foundation', tone: 'partial',
    summary: 'PostgreSQL is authoritative; Redis/BullMQ is transport for future asynchronous jobs.',
    points: ['Local PostgreSQL and Redis services with health checks', 'Usage writes and aggregate updates commit in one database transaction', 'Planned outbox, billing safety, queue alerts, metrics, backups, and restore drills'],
  },
];

export default function FeaturesPage() {
  return (
    <main className="feature-shell">
      <header className="topbar feature-topbar">
        <Link className="brand" href="/"><span className="brand-mark">B</span><span>brightloop</span></Link>
        <Link className="nav-link" href="/">Back to overview <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="feature-hero">
        <p className="eyebrow">PLATFORM CAPABILITIES</p>
        <h1>One platform for recurring revenue operations.</h1>
        <p className="intro">Explore the planned product and infrastructure. Status labels distinguish working capabilities from areas still on the roadmap.</p>
        <div className="status-legend" aria-label="Feature status legend">
          <span><i className="legend-dot working-dot" /> Working slice</span>
          <span><i className="legend-dot partial-dot" /> Partial foundation</span>
          <span><i className="legend-dot planned-dot" /> Planned</span>
        </div>
      </section>

      <nav className="feature-index" aria-label="Feature sections">
        {featureGroups.map((feature) => <a href={`#${feature.id}`} key={feature.id}>{feature.number} {feature.title}</a>)}
      </nav>

      <section className="feature-list" aria-label="Platform feature status">
        {featureGroups.map((feature) => (
          <article className="feature-card" id={feature.id} key={feature.id}>
            <div className="feature-card-head">
              <span className="feature-number">{feature.number}</span>
              <span className={`feature-status ${feature.tone}`}>{feature.status}</span>
            </div>
            <h2>{feature.title}</h2>
            <p className="feature-summary">{feature.summary}</p>
            <ul>{feature.points.map((point) => <li key={point}>{point}</li>)}</ul>
            {feature.note && <p className="feature-note">{feature.note}</p>}
          </article>
        ))}
      </section>

      <footer className="feature-footer">
        <span>Brightloop Subscription Management</span>
        <span>Current implementation status · See README for setup and roadmap</span>
      </footer>
    </main>
  );
}
