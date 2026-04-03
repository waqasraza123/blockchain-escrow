import { z } from "zod";

import type { WalletSummary } from "./auth";

export const walletIdParamsSchema = z.object({
  walletId: z.string().trim().min(1)
});
export type WalletIdParams = z.infer<typeof walletIdParamsSchema>;

export interface ListWalletsResponse {
  wallets: WalletSummary[];
}

export interface WalletDetailResponse {
  wallet: WalletSummary;
}
