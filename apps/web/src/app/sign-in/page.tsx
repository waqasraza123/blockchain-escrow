import { redirect } from "next/navigation";

import { LocaleTopbar } from "../../components/locale-topbar";
import { getSession, getTenantPublicContext } from "../../lib/api";
import { getI18n } from "../../lib/i18n/server";
import { SignInClient } from "./sign-in-client";

type SignInPageProps = {
  searchParams?: Promise<{ returnPath?: string; tenant?: string }>;
};

export default async function SignInPage(props: SignInPageProps) {
  const searchParams = await props.searchParams;
  const { locale, messages } = await getI18n();
  const returnPath =
    searchParams?.returnPath && searchParams.returnPath.startsWith("/")
      ? searchParams.returnPath
      : "/";
  const session = await getSession(true);

  if (session) {
    redirect(returnPath);
  }

  const tenant =
    searchParams?.tenant ? await getTenantPublicContext(searchParams.tenant) : { tenant: null };

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
      <section
        className="workspace-card"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          width: "100%",
          ...(tenant.tenant
            ? {
                borderTop: `6px solid ${tenant.tenant.settings.accentColorHex}`
              }
            : {})
        }}
      >
        <p className="eyebrow">{messages.signIn.eyebrow}</p>
        <h1>{tenant.tenant ? tenant.tenant.settings.displayName : messages.signIn.title}</h1>
        <p className="lede">{messages.signIn.lede}</p>
        <SignInClient
          returnPath={returnPath}
          tenantLabel={tenant.tenant?.settings.displayName ?? null}
        />
      </section>
    </main>
  );
}
