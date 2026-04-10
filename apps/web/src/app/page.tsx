import { redirect } from "next/navigation";

import { getSession } from "../lib/api";

export default async function HomePage() {
  const session = await getSession(true);

  if (!session) {
    redirect("/unauthorized");
  }

  const firstOrganization = session.organizations[0]?.organizationId;

  if (!firstOrganization) {
    return (
      <main className="workspace-shell" style={{ gridTemplateColumns: "1fr" }}>
        <section className="workspace-card">
          <p className="eyebrow">Release 9</p>
          <h1>No Organizations</h1>
          <p className="lede">
            This wallet session is valid, but it is not yet a member of any organization.
          </p>
        </section>
      </main>
    );
  }

  redirect(`/orgs/${firstOrganization}`);
}
