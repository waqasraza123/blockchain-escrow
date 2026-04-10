import { getHostedLaunchSession, getTenantPublicContext } from "../../../lib/api";
import { Card, WorkspaceHeader } from "../../(workspace)/ui";
import { exchangeHostedSessionAction } from "../actions";

type HostedLaunchPageProps = {
  params: Promise<{ launchToken: string }>;
};

export default async function HostedLaunchPage(props: HostedLaunchPageProps) {
  const params = await props.params;
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
      <WorkspaceHeader
        eyebrow="Hosted Session"
        title={tenant ? tenant.settings.displayName : "Partner Hosted Workflow"}
        subtitle="Launch a constrained participant flow without an organization session."
      />
      <Card
        title="Session Launch"
      >
        <p className="muted">
          {session.hostedSession
            ? "This hosted session is ready to exchange into a short-lived workflow cookie."
            : "This hosted session could not be found."}
        </p>
        {session.hostedSession ? (
          <form action={exchangeHostedSessionAction} className="actions-row">
            <input name="launchToken" type="hidden" value={params.launchToken} />
            <button className="button" type="submit">
              Open Hosted Session
            </button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
