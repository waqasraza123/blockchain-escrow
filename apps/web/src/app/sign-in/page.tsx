import { redirect } from "next/navigation";

import { getSession, getTenantPublicContext } from "../../lib/api";
import { SignInClient } from "./sign-in-client";

type SignInPageProps = {
  searchParams?: Promise<{ returnPath?: string; tenant?: string }>;
};

export default async function SignInPage(props: SignInPageProps) {
  const searchParams = await props.searchParams;
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
        <p className="eyebrow">Platform Sign-In</p>
        <h1>{tenant.tenant ? tenant.tenant.settings.displayName : "Blockchain Escrow"}</h1>
        <p className="lede">
          Wallet authentication stays on the platform domain even for white-labeled tenant entrypoints.
        </p>
        <SignInClient
          returnPath={returnPath}
          tenantLabel={tenant.tenant?.settings.displayName ?? null}
        />
      </section>
    </main>
  );
}
