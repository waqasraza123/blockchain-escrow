import {
  createPrismaClient,
  runInRelease4Transaction
} from "@blockchain-escrow/db";

import { loadIndexerConfig } from "./config";
import { resetRelease4Projections } from "./projector";

async function main(): Promise<void> {
  const config = loadIndexerConfig();
  const prisma = createPrismaClient();

  try {
    await runInRelease4Transaction(prisma, async (transactionRepositories) => {
      await transactionRepositories.indexedContractEvents.deleteFromBlockNumber(
        config.chainId,
        "0"
      );
      await transactionRepositories.indexedTransactions.deleteFromBlockNumber(
        config.chainId,
        "0"
      );
      await transactionRepositories.indexedBlocks.deleteFromBlockNumber(
        config.chainId,
        "0"
      );
      await resetRelease4Projections(transactionRepositories, config.chainId);
      await transactionRepositories.chainCursors.upsert({
        chainId: config.chainId,
        cursorKey: config.cursorKey,
        lastProcessedBlockHash: null,
        lastProcessedBlockNumber: null,
        nextBlockNumber: config.startBlock.toString(),
        updatedAt: new Date().toISOString()
      });
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error("Release 4 local reset failed", error);
  process.exit(1);
});
