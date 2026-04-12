import type {
  MilestoneSettlementRequestKind,
  PreparedTransaction,
  WalletAddress
} from "@blockchain-escrow/shared";
import { encodeFunctionData } from "viem";

export type SettlementExecutionTransactionMethod =
  | "refundMilestone"
  | "releaseMilestone";

const settlementExecutionAbi = [
  {
    inputs: [
      { name: "milestonePosition", type: "uint32" },
      { name: "milestoneAmounts", type: "uint256[]" }
    ],
    name: "releaseMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "milestonePosition", type: "uint32" },
      { name: "milestoneAmounts", type: "uint256[]" }
    ],
    name: "refundMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export function buildSettlementExecutionPreparedTransaction(input: {
  agreementAddress: WalletAddress;
  kind: MilestoneSettlementRequestKind;
  milestoneAmountMinor: string;
  milestonePosition: number;
}): {
  method: SettlementExecutionTransactionMethod;
  transaction: PreparedTransaction;
} {
  const method =
    input.kind === "RELEASE" ? "releaseMilestone" : "refundMilestone";

  return {
    method,
    transaction: {
      data: encodeFunctionData({
        abi: settlementExecutionAbi,
        args: [input.milestonePosition, [BigInt(input.milestoneAmountMinor)]],
        functionName: method
      }),
      to: input.agreementAddress,
      value: "0"
    }
  };
}
