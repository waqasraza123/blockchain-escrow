import Link from "next/link";

import { listPartners } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { createPartnerAccountAction } from "../actions";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function PartnersPage() {
  const { messages } = await getI18n();
  const partners = await listPartners();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.partners}
        title={messages.partners.partnerAccounts}
        subtitle={messages.partners.subtitle}
      />
      <div className="split-grid">
        <Card title={messages.partners.createPartnerTitle}>
          <form action={createPartnerAccountAction} className="form-grid">
            <div className="field">
              <label htmlFor="name">{messages.partners.name}</label>
              <input id="name" name="name" placeholder="Acme Integrations" />
            </div>
            <div className="field">
              <label htmlFor="slug">{messages.partners.slug}</label>
              <input id="slug" name="slug" placeholder="acme-integrations" />
            </div>
            <div className="field">
              <label htmlFor="metadata">{messages.partners.metadataJson}</label>
              <textarea id="metadata" name="metadata" placeholder='{"tier":"launch"}' />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                {messages.partners.createPartner}
              </button>
            </div>
          </form>
        </Card>
        <Card title={messages.partners.partnerAccounts}>
          {partners.partners.length === 0 ? (
            <EmptyState body="No partner accounts exist yet." />
          ) : (
            <DataTable
              headers={[
                messages.partners.name,
                messages.partners.slug,
                messages.partners.status,
                messages.partners.updated,
                messages.partners.open
              ]}
            >
              {partners.partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td className="mono">{partner.slug}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(partner.status)}
                      value={formatCode(partner.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td className="mono">{partner.updatedAt}</td>
                  <td>
                    <Link className="link-text" href={`/partners/${partner.id}`}>
                      {messages.partners.detail}
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
