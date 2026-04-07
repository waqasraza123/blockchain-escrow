import { keccak256, stringToHex } from "viem";

export function buildCanonicalDealId(
  organizationId: string,
  draftDealId: string
): `0x${string}` {
  return keccak256(
    stringToHex(`blockchain-escrow:deal:${organizationId}:${draftDealId}`)
  );
}
