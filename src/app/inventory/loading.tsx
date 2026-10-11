export default function InventoryLoading() {
  return (
    <main className="inventory-page" aria-busy="true" aria-label="Loading inventory">
      <header className="dashboard-header">
        <div className="brand-lockup"><span className="brand-mark" /><span>Marketline<span className="brand-period">.</span></span></div>
      </header>
      <section className="inventory-content inventory-loading">
        <span className="loading-line heading-line" />
        <span className="loading-line description-line" />
        <span className="loading-block" />
        <span className="loading-block table-loading" />
      </section>
    </main>
  );
}