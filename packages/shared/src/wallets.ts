import { z } from "zod";

import type { WalletSummary } from "./auth";
import type { WalletProfileSummary } from "./sponsorship";

export const walletIdParamsSchema = z.object({
  walletId: z.string().trim().min(1)
});
export type WalletIdParams = z.infer<typeof walletIdParamsSchema>;

export interface WalletWithProfileSummary extends WalletSummary {
  profile: WalletProfileSummary | null;
}

export interface ListWalletsResponse {
  wallets: WalletWithProfileSummary[];
}

export interface WalletDetailResponse {
  wallet: WalletWithProfileSummary;
}
