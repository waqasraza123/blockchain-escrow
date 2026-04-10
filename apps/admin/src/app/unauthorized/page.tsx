import Link from "next/link";

import { LocaleTopbar } from "../../components/locale-topbar";
import { getI18n } from "../../lib/i18n/server";
import { Card, ConsoleHeader } from "../(console)/ui";

export default async function UnauthorizedPage() {
  const { locale, messages } = await getI18n();

  return (
    <main className="unauthorized">
      <LocaleTopbar
        currentLocale={locale}
        localeLabels={messages.locale}
        subtitle={messages.publicTopbar.subtitle}
        switcherAriaLabel={messages.switcher.ariaLabel}
        switcherLabel={messages.switcher.label}
        title={messages.publicTopbar.title}
      />
      <Card>
        <ConsoleHeader
          eyebrow={messages.unauthorized.eyebrow}
          subtitle={messages.unauthorized.subtitle}
          title={messages.unauthorized.title}
        />
        <p className="muted">{messages.unauthorized.body}</p>
        <div className="actions-row">
          <Link className="button" href="/">
            {messages.common.retrySession}
          </Link>
        </div>
      </Card>
    </main>
  );
}
