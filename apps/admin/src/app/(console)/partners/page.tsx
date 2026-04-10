import Link from "next/link";

import { listPartners } from "../../../lib/operator-api";
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
  const partners = await listPartners();

  return (
    <>
      <ConsoleHeader
        eyebrow="Partners"
        title="Partner Accounts"
        subtitle="Create and inspect linked partner identities, keys, hosted sessions, and delivery activity."
      />
      <div className="split-grid">
        <Card title="Create Partner Account">
          <form action={createPartnerAccountAction} className="form-grid">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" placeholder="Acme Integrations" />
            </div>
            <div className="field">
              <label htmlFor="slug">Slug</label>
              <input id="slug" name="slug" placeholder="acme-integrations" />
            </div>
            <div className="field">
              <label htmlFor="metadata">Metadata JSON</label>
              <textarea id="metadata" name="metadata" placeholder='{"tier":"launch"}' />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                Create Partner
              </button>
            </div>
          </form>
        </Card>
        <Card title="Existing Partners">
          {partners.partners.length === 0 ? (
            <EmptyState body="No partner accounts exist yet." />
          ) : (
            <DataTable headers={["Name", "Slug", "Status", "Updated", "Open"]}>
              {partners.partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td className="mono">{partner.slug}</td>
                  <td>
                    <Pill tone={toneForStatus(partner.status)} value={partner.status} />
                  </td>
                  <td className="mono">{partner.updatedAt}</td>
                  <td>
                    <Link className="link-text" href={`/partners/${partner.id}`}>
                      Detail
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
