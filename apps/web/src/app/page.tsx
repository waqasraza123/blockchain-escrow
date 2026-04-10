import { redirect } from "next/navigation";

import { LocaleTopbar } from "../components/locale-topbar";
import { getSession, getTenantPublicContext } from "../lib/api";
import { getI18n } from "../lib/i18n/server";

export default async function HomePage() {
  const { locale, messages } = await getI18n();
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
        <LocaleTopbar
          currentLocale={locale}
          localeLabels={messages.locale}
          subtitle={messages.publicTopbar.subtitle}
          switcherAriaLabel={messages.switcher.ariaLabel}
          switcherLabel={messages.switcher.label}
          title={messages.publicTopbar.platform}
        />
        <section
          className="workspace-card"
          style={{
            borderTop: `6px solid ${tenant.settings.accentColorHex}`,
            maxWidth: 720,
            margin: "0 auto",
            width: "100%"
          }}
        >
          <p className="eyebrow">{messages.home.tenantEyebrow}</p>
          <h1>{tenant.settings.displayName}</h1>
          <p className="lede">{messages.home.tenantSubtitle}</p>
          <div className="stack">
            <div className="detail-grid">
              <div>
                <small className="muted">{messages.home.support}</small>
                <div>{tenant.settings.supportEmail}</div>
              </div>
              <div>
                <small className="muted">{messages.home.legal}</small>
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
                {messages.home.continueToSignIn}
              </a>
            </div>
            <div className="inline-list">
              <a href={tenant.settings.supportUrl}>{messages.home.support}</a>
              <a href={tenant.settings.termsOfServiceUrl}>{messages.home.terms}</a>
              <a href={tenant.settings.privacyPolicyUrl}>{messages.home.privacy}</a>
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
        <LocaleTopbar
          currentLocale={locale}
          localeLabels={messages.locale}
          subtitle={messages.publicTopbar.subtitle}
          switcherAriaLabel={messages.switcher.ariaLabel}
          switcherLabel={messages.switcher.label}
          title={messages.publicTopbar.platform}
        />
        <section className="workspace-card">
          <p className="eyebrow">{messages.home.noOrganizationsEyebrow}</p>
          <h1>{messages.home.noOrganizationsTitle}</h1>
          <p className="lede">{messages.home.noOrganizationsBody}</p>
        </section>
      </main>
    );
  }

  redirect(`/orgs/${firstOrganization}`);
}
