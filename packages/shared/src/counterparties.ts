import { z } from "zod";

import type { EntityId, IsoTimestamp } from "./primitives";

export const createCounterpartySchema = z.object({
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  legalName: z.string().trim().min(1).max(240).optional(),
  name: z.string().trim().min(1).max(160)
});
export type CreateCounterpartyInput = z.infer<typeof createCounterpartySchema>;

export const organizationCounterpartyParamsSchema = z.object({
  counterpartyId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type OrganizationCounterpartyParams = z.infer<
  typeof organizationCounterpartyParamsSchema
>;

export const organizationCounterpartiesParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationCounterpartiesParams = z.infer<
  typeof organizationCounterpartiesParamsSchema
>;

export interface CounterpartySummary {
  contactEmail: string | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  legalName: string | null;
  name: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface ListCounterpartiesResponse {
  counterparties: CounterpartySummary[];
}

export interface CounterpartyDetailResponse {
  counterparty: CounterpartySummary;
}

export type CreateCounterpartyResponse = CounterpartyDetailResponse;
