import { z } from "zod";

import type { DealVersionPartySnapshot } from "./drafts";
import type {
  EntityId,
  IsoTimestamp,
  JsonObject,
  JsonValue,
  WalletAddress
} from "./primitives";

const jsonLiteralSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonLiteralSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  jsonValueSchema
);

export const typedSignatureSchemeSchema = z.enum(["EIP712"]);
export type TypedSignatureScheme = z.infer<typeof typedSignatureSchemeSchema>;

export const createDealVersionAcceptanceSchema = z.object({
  scheme: typedSignatureSchemeSchema,
  signature: z.string().trim().regex(/^0x[a-fA-F0-9]+$/),
  typedData: jsonObjectSchema
});
export type CreateDealVersionAcceptanceInput = z.infer<
  typeof createDealVersionAcceptanceSchema
>;

export const dealVersionAcceptanceParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DealVersionAcceptanceParams = z.infer<
  typeof dealVersionAcceptanceParamsSchema
>;

export interface DealVersionAcceptanceSummary {
  acceptedAt: IsoTimestamp;
  acceptedByUserId: EntityId;
  dealVersionId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  partyId: EntityId;
  scheme: TypedSignatureScheme;
  signature: string;
  signerWalletAddress: WalletAddress;
  signerWalletId: EntityId;
  typedData: JsonObject;
}

export interface DealVersionAcceptanceDetail extends DealVersionAcceptanceSummary {
  party: DealVersionPartySnapshot;
}

export interface ListDealVersionAcceptancesResponse {
  acceptances: DealVersionAcceptanceDetail[];
}

export interface CreateDealVersionAcceptanceResponse {
  acceptance: DealVersionAcceptanceDetail;
}

export const createCounterpartyDealVersionAcceptanceSchema = z.object({
  signature: z.string().trim().regex(/^0x[a-fA-F0-9]+$/)
});
export type CreateCounterpartyDealVersionAcceptanceInput = z.infer<
  typeof createCounterpartyDealVersionAcceptanceSchema
>;

export interface CounterpartyDealVersionAcceptanceSummary {
  acceptedAt: IsoTimestamp;
  dealVersionId: EntityId;
  id: EntityId;
  partyId: EntityId;
  scheme: TypedSignatureScheme;
  signature: string;
  signerWalletAddress: WalletAddress;
  typedData: JsonObject;
}

export interface CounterpartyDealVersionAcceptanceDetail
  extends CounterpartyDealVersionAcceptanceSummary {
  party: DealVersionPartySnapshot;
}

export interface CounterpartyDealVersionAcceptanceChallenge {
  expectedWalletAddress: WalletAddress;
  typedData: JsonObject;
}

export interface GetCounterpartyDealVersionAcceptanceResponse {
  acceptance: CounterpartyDealVersionAcceptanceDetail | null;
  challenge: CounterpartyDealVersionAcceptanceChallenge;
}

export interface CreateCounterpartyDealVersionAcceptanceResponse {
  acceptance: CounterpartyDealVersionAcceptanceDetail;
}
