import { redirect } from "next/navigation";

import { getSession, getTenantPublicContext } from "../lib/api";

export default async function HomePage() {
  const tenantContext = await getTenantPublicContext();

  if (tenantContext.tenant?.activeDomain.surface === "ENTRYPOINT") {
    const tenant = tenantContext.tenant;

    return (
      <main
        className="workspace-shell"
        style={{
          background: `linear-gradient(135deg, ${tenant.settings.backgroundColorHex}, ${tenant.settings.primaryColorHex})`,
          color: tenant.settings.textColorHex,
          gridTemplateColumns: "1fr"
        }}
      >
        <section
          className="workspace-card"
          style={{
            borderTop: `6px solid ${tenant.settings.accentColorHex}`,
            maxWidth: 720,
            margin: "0 auto",
            width: "100%"
          }}
        >
          <p className="eyebrow">Tenant Workspace</p>
          <h1>{tenant.settings.displayName}</h1>
          <p className="lede">
            Branded embedded entrypoint for hosted workflows and platform sign-in.
          </p>
          <div className="stack">
            <div className="detail-grid">
              <div>
                <small className="muted">Support</small>
                <div>{tenant.settings.supportEmail}</div>
              </div>
              <div>
                <small className="muted">Legal</small>
                <div>{tenant.settings.legalName}</div>
              </div>
            </div>
            <div className="actions-row">
              <a
                className="button"
                href={`/sign-in?tenant=${encodeURIComponent(tenant.partnerSlug)}&returnPath=/`}
                style={{
                  background: tenant.settings.accentColorHex,
                  borderColor: tenant.settings.accentColorHex,
                  color: tenant.settings.textColorHex
                }}
              >
                Continue To Sign-In
              </a>
            </div>
            <div className="inline-list">
              <a href={tenant.settings.supportUrl}>Support</a>
              <a href={tenant.settings.termsOfServiceUrl}>Terms</a>
              <a href={tenant.settings.privacyPolicyUrl}>Privacy</a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const session = await getSession(true);

  if (!session) {
    redirect("/sign-in");
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
