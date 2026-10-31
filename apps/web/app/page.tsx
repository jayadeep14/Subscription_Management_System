const modules = [
  ['Customers', 'Customer profiles and account history'],
  ['Plans', 'Products, pricing and subscription terms'],
  ['Subscriptions', 'Lifecycle changes and upcoming renewals'],
  ['Billing', 'Recurring invoices, payments and recovery'],
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">B</span><span>brightloop</span></div><span className="environment">Foundation setup</span></header>
      <section className="hero">
        <p className="eyebrow">SUBSCRIPTION OPERATIONS</p>
        <h1>One clear view of your recurring business.</h1>
        <p className="intro">The foundation for managing customers, subscription plans, renewals and billing—with financial records designed to stay auditable.</p>
        <div className="status"><span className="status-dot" /> Local platform foundation is ready to configure</div>
      </section>
      <section className="module-grid" aria-label="Platform modules">
        {modules.map(([title, description], index) => <article className="module-card" key={title}><span className="module-number">0{index + 1}</span><h2>{title}</h2><p>{description}</p></article>)}
      </section>
      <footer>Brightloop Subscription Management <span>Phase 1 · Infrastructure foundation</span></footer>
    </main>
  );
}
