export default function UnauthorizedPage() {
  return (
    <main className="workspace-shell" style={{ gridTemplateColumns: "1fr" }}>
      <section className="workspace-card">
        <p className="eyebrow">Wallet Session Required</p>
        <h1>Unauthorized</h1>
        <p className="lede">
          Sign in with an allowed wallet session before using the customer workspace.
        </p>
      </section>
    </main>
  );
}
