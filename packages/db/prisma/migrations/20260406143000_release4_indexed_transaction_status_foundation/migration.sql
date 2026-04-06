CREATE TYPE "IndexedTransactionExecutionStatus" AS ENUM ('SUCCESS', 'REVERTED');

ALTER TABLE "indexed_transactions"
ADD COLUMN "executionStatus" "IndexedTransactionExecutionStatus" NOT NULL DEFAULT 'SUCCESS';
