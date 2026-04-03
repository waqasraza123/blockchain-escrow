import { z } from "zod";
import type { ChainId, EntityId, IsoTimestamp, WalletAddress } from "./primitives";
import type { OrganizationMembershipSummary } from "./organizations";
export declare const sessionStatusSchema: z.ZodEnum<["ACTIVE", "REVOKED", "EXPIRED"]>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export declare const authNonceRequestSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    walletAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    walletAddress: string;
}, {
    chainId: number;
    walletAddress: string;
}>;
export type AuthNonceRequest = z.infer<typeof authNonceRequestSchema>;
export interface AuthNonceResponse {
    expiresAt: IsoTimestamp;
    nonce: string;
}
export declare const authVerifyRequestSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    message: z.ZodString;
    signature: z.ZodString;
    walletAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    chainId: number;
    walletAddress: string;
    signature: string;
}, {
    message: string;
    chainId: number;
    walletAddress: string;
    signature: string;
}>;
export type AuthVerifyRequest = z.infer<typeof authVerifyRequestSchema>;
export interface UserSummary {
    createdAt: IsoTimestamp;
    id: EntityId;
    updatedAt: IsoTimestamp;
}
export interface WalletSummary {
    address: WalletAddress;
    chainId: ChainId | null;
    createdAt: IsoTimestamp;
    id: EntityId;
    isPrimary: boolean;
    updatedAt: IsoTimestamp;
    userId: EntityId;
}
export interface SessionSummary {
    createdAt: IsoTimestamp;
    expiresAt: IsoTimestamp;
    id: EntityId;
    lastSeenAt: IsoTimestamp | null;
    status: SessionStatus;
    userId: EntityId;
    walletId: EntityId;
}
export interface AuthVerifyResponse {
    session: SessionSummary;
    user: UserSummary;
    wallets: WalletSummary[];
}
export interface LogoutResponse {
    success: true;
}
export interface MeResponse {
    organizations: OrganizationMembershipSummary[];
    session: SessionSummary;
    user: UserSummary;
    wallets: WalletSummary[];
}
