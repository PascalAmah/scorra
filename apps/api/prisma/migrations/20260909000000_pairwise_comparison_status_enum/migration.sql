-- Migration: replace plain String status on pairwise_comparisons with a proper enum

-- CreateEnum
CREATE TYPE "PairwiseComparisonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- AlterTable — cast the existing String values to the new enum.
-- Postgres cannot auto-cast the column default when changing the column
-- type (error 42804), so drop the TEXT default first and re-add it after.
ALTER TABLE "pairwise_comparisons" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "pairwise_comparisons"
  ALTER COLUMN "status" TYPE "PairwiseComparisonStatus"
  USING "status"::"PairwiseComparisonStatus";

-- SetDefault
ALTER TABLE "pairwise_comparisons"
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"PairwiseComparisonStatus";
