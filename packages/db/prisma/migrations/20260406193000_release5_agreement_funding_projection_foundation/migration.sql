ALTER TYPE "IndexedEventName" ADD VALUE IF NOT EXISTS 'AgreementFunded';

ALTER TABLE "escrow_agreement_projections"
ADD COLUMN "funded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fundedBlockNumber" BIGINT,
ADD COLUMN "fundedBlockHash" TEXT,
ADD COLUMN "fundedTransactionHash" TEXT,
ADD COLUMN "fundedLogIndex" INTEGER,
ADD COLUMN "fundedTimestamp" TIMESTAMPTZ(3),
ADD COLUMN "fundedPayerAddress" TEXT;
