import { LocaleTopbar } from "../../components/locale-topbar";
import { getI18n } from "../../lib/i18n/server";

export default async function UnauthorizedPage() {
  const { locale, messages } = await getI18n();

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
        <p className="eyebrow">{messages.unauthorized.eyebrow}</p>
        <h1>{messages.unauthorized.title}</h1>
        <p className="lede">{messages.unauthorized.body}</p>
      </section>
    </main>
  );
}
