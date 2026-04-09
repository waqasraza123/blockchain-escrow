import { createProtocolProposalAction } from "../../actions";
import { Card, ConsoleHeader } from "../../ui";

const exampleInputByAction: Record<string, string> = {
  ALLOW_TOKEN: '{"token":"0x0000000000000000000000000000000000000000"}',
  APPROVE_ARBITRATOR: '{"arbitrator":"0x0000000000000000000000000000000000000000"}',
  SET_PROTOCOL_FEE_BPS: '{"newProtocolFeeBps":125}',
  SET_TREASURY: '{"newTreasury":"0x0000000000000000000000000000000000000000"}',
  PAUSE_CREATE_ESCROW: "{}"
};

export default function NewProtocolProposalPage() {
  return (
    <>
      <ConsoleHeader
        eyebrow="Protocol Admin"
        subtitle="Create immutable Safe proposal drafts backed by manifest-aware calldata generation."
        title="New Proposal Draft"
      />
      <Card title="Proposal Builder">
        <form action={createProtocolProposalAction} className="form-grid">
          <div className="form-grid columns-2">
            <div className="field">
              <label htmlFor="chainId">Chain Id</label>
              <input defaultValue="84532" id="chainId" name="chainId" />
            </div>
            <div className="field">
              <label htmlFor="target">Target</label>
              <select defaultValue="ProtocolConfig" id="target" name="target">
                <option value="ProtocolConfig">ProtocolConfig</option>
                <option value="TokenAllowlist">TokenAllowlist</option>
                <option value="ArbitratorRegistry">ArbitratorRegistry</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="action">Action</label>
            <select defaultValue="SET_PROTOCOL_FEE_BPS" id="action" name="action">
              {[
                "ALLOW_TOKEN",
                "DISALLOW_TOKEN",
                "APPROVE_ARBITRATOR",
                "REVOKE_ARBITRATOR",
                "SET_TOKEN_ALLOWLIST",
                "SET_ARBITRATOR_REGISTRY",
                "SET_FEE_VAULT",
                "SET_TREASURY",
                "SET_PROTOCOL_FEE_BPS",
                "PAUSE_CREATE_ESCROW",
                "UNPAUSE_CREATE_ESCROW",
                "PAUSE_FUNDING",
                "UNPAUSE_FUNDING"
              ].map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" placeholder="Why this proposal is needed" />
          </div>
          <div className="field">
            <label htmlFor="input">Input JSON</label>
            <textarea
              defaultValue={exampleInputByAction.SET_PROTOCOL_FEE_BPS}
              id="input"
              name="input"
            />
          </div>
          <p className="muted">
            Example payloads: {Object.entries(exampleInputByAction)
              .map(([key, value]) => `${key} ${value}`)
              .join(" | ")}
          </p>
          <div className="actions-row">
            <button className="button" type="submit">
              Create Proposal Draft
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
