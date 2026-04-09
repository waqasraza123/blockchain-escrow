import Link from "next/link";

import { Card, ConsoleHeader } from "../(console)/ui";

export default function UnauthorizedPage() {
  return (
    <main className="unauthorized">
      <Card>
        <ConsoleHeader
          eyebrow="Operator Access"
          subtitle="This internal console only renders for authenticated operator accounts."
          title="Unauthorized"
        />
        <p className="muted">
          Sign in with an allowlisted wallet session, or have an existing operator
          account mapped to your user and wallet.
        </p>
        <div className="actions-row">
          <Link className="button" href="/">
            Retry Session
          </Link>
        </div>
      </Card>
    </main>
  );
}
