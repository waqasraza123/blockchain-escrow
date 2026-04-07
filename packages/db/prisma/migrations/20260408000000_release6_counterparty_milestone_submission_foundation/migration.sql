ALTER TABLE "deal_milestone_submissions"
ADD COLUMN "scheme" "TypedSignatureScheme",
ADD COLUMN "signature" TEXT,
ADD COLUMN "typedData" JSONB;
