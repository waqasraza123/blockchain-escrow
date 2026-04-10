import { getHostedLaunchSession, getTenantPublicContext } from "../../../lib/api";
import { getI18n } from "../../../lib/i18n/server";
import { LocaleTopbar } from "../../../components/locale-topbar";
import { Card, WorkspaceHeader } from "../../(workspace)/ui";
import { exchangeHostedSessionAction } from "../actions";

type HostedLaunchPageProps = {
  params: Promise<{ launchToken: string }>;
};

export default async function HostedLaunchPage(props: HostedLaunchPageProps) {
  const params = await props.params;
  const { locale, messages } = await getI18n();
  const [session, tenantContext] = await Promise.all([
    getHostedLaunchSession(params.launchToken),
    getTenantPublicContext()
  ]);
  const tenant = tenantContext.tenant;

  return (
    <div
      className="workspace-main"
      style={{
        background: tenant
          ? `linear-gradient(135deg, ${tenant.settings.backgroundColorHex}, ${tenant.settings.primaryColorHex})`
          : undefined,
        color: tenant?.settings.textColorHex,
        maxWidth: 840,
        margin: "0 auto",
        padding: 32
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
      <WorkspaceHeader
        eyebrow={messages.hosted.hostedSession}
        title={tenant ? tenant.settings.displayName : messages.hosted.launchTitle}
        subtitle={messages.hosted.launchSubtitle}
      />
      <Card title={messages.hosted.sessionLaunch}>
        <p className="muted">
          {session.hostedSession
            ? messages.hosted.launchReady
            : messages.hosted.launchMissing}
        </p>
        {session.hostedSession ? (
          <form action={exchangeHostedSessionAction} className="actions-row">
            <input name="launchToken" type="hidden" value={params.launchToken} />
            <button className="button" type="submit">
              {messages.hosted.openHostedSession}
            </button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
