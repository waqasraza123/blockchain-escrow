import {
  assertProductionLaunchUrl,
  isProductionLaunchMode,
  type WalletAddress
} from "@blockchain-escrow/shared";
import {
  createPublicClient,
  http,
  parseAbi,
  type Abi,
  type PublicClient
} from "viem";

import { normalizeApiChainId } from "../drafts/deal-identity";

const erc20AllowanceAbi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)"
]) as Abi;

export type FundingAllowanceReadResult =
  | {
      allowance: bigint;
      status: "AVAILABLE";
    }
  | {
      status: "UNAVAILABLE";
    };

export interface FundingChainReader {
  readErc20Allowance(input: {
    chainId: number;
    ownerAddress: WalletAddress;
    spenderAddress: WalletAddress;
    tokenAddress: WalletAddress;
  }): Promise<FundingAllowanceReadResult>;
}

class ViemFundingChainReader implements FundingChainReader {
  private readonly client: PublicClient | null;

  constructor(
    private readonly chainId: number,
    rpcUrl: string | null
  ) {
    this.client = rpcUrl
      ? createPublicClient({
          transport: http(rpcUrl)
        })
      : null;
  }

  async readErc20Allowance(input: {
    chainId: number;
    ownerAddress: WalletAddress;
    spenderAddress: WalletAddress;
    tokenAddress: WalletAddress;
  }): Promise<FundingAllowanceReadResult> {
    if (!this.client || input.chainId !== this.chainId) {
      return { status: "UNAVAILABLE" };
    }

    try {
      const allowance = await this.client.readContract({
        abi: erc20AllowanceAbi,
        address: input.tokenAddress,
        args: [input.ownerAddress, input.spenderAddress],
        functionName: "allowance"
      });

      if (
        typeof allowance !== "bigint" &&
        typeof allowance !== "number" &&
        typeof allowance !== "string"
      ) {
        return { status: "UNAVAILABLE" };
      }

      return {
        allowance: typeof allowance === "bigint" ? allowance : BigInt(allowance),
        status: "AVAILABLE"
      };
    } catch {
      return { status: "UNAVAILABLE" };
    }
  }
}

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export const FUNDING_CHAIN_READER = Symbol("FUNDING_CHAIN_READER");

export function createUnavailableFundingChainReader(): FundingChainReader {
  return {
    async readErc20Allowance() {
      return { status: "UNAVAILABLE" };
    }
  };
}

export function loadFundingChainReader(): FundingChainReader {
  const chainId = normalizeApiChainId();
  const rpcUrl = parseOptionalString(process.env.BASE_RPC_URL);

  if (isProductionLaunchMode(process.env.APP_LAUNCH_MODE) && !rpcUrl) {
    throw new Error(
      "BASE_RPC_URL must be configured when APP_LAUNCH_MODE=production."
    );
  }

  if (isProductionLaunchMode(process.env.APP_LAUNCH_MODE)) {
    assertProductionLaunchUrl(process.env.BASE_RPC_URL, "BASE_RPC_URL");
  }

  return new ViemFundingChainReader(chainId, rpcUrl);
}
