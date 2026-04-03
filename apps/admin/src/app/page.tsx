const pageStyle = {
  fontFamily: "sans-serif",
  margin: "0 auto",
  maxWidth: "720px",
  padding: "48px 24px"
} as const;

export default function HomePage() {
  return (
    <main style={pageStyle}>
      <h1>blockchain-escrow admin</h1>
      <p>Release 0 admin scaffold.</p>
      <p>
        This app will later host operator, compliance, and protocol admin
        workflows.
      </p>
    </main>
  );
}
