import { z } from "zod";

import type { EntityId, IsoTimestamp } from "./primitives";

export const createTemplateSchema = z.object({
  bodyMarkdown: z.string().trim().min(1).max(50000),
  defaultCounterpartyId: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  name: z.string().trim().min(1).max(160)
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const organizationTemplatesParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationTemplatesParams = z.infer<
  typeof organizationTemplatesParamsSchema
>;

export const organizationTemplateParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  templateId: z.string().trim().min(1)
});
export type OrganizationTemplateParams = z.infer<
  typeof organizationTemplateParamsSchema
>;

export interface TemplateSummary {
  bodyMarkdown: string;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  defaultCounterpartyId: EntityId | null;
  description: string | null;
  id: EntityId;
  name: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface ListTemplatesResponse {
  templates: TemplateSummary[];
}

export interface TemplateDetailResponse {
  template: TemplateSummary;
}

export type CreateTemplateResponse = TemplateDetailResponse;
