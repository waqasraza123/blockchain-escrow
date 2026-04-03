import { z } from "zod";

import type { EntityId, IsoTimestamp } from "./primitives";

export const fileCategorySchema = z.enum([
  "GENERAL",
  "DRAFT_ATTACHMENT",
  "EVIDENCE",
  "SIGNED_DOCUMENT"
]);
export type FileCategory = z.infer<typeof fileCategorySchema>;

export const createFileSchema = z.object({
  byteSize: z.number().int().positive(),
  category: fileCategorySchema,
  mediaType: z.string().trim().min(1).max(255),
  originalFilename: z.string().trim().min(1).max(255),
  sha256Hex: z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/),
  storageKey: z.string().trim().min(1).max(512)
});
export type CreateFileInput = z.infer<typeof createFileSchema>;

export const organizationFilesParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationFilesParams = z.infer<
  typeof organizationFilesParamsSchema
>;

export const organizationFileParamsSchema = z.object({
  fileId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type OrganizationFileParams = z.infer<typeof organizationFileParamsSchema>;

export interface FileSummary {
  byteSize: number;
  category: FileCategory;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  mediaType: string;
  organizationId: EntityId;
  originalFilename: string;
  sha256Hex: string;
  storageKey: string;
  updatedAt: IsoTimestamp;
}

export interface ListFilesResponse {
  files: FileSummary[];
}

export interface FileDetailResponse {
  file: FileSummary;
}

export type CreateFileResponse = FileDetailResponse;
