-- Migration: replace plain String status on pairwise_comparisons with a proper enum

-- CreateEnum
CREATE TYPE "PairwiseComparisonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- AlterTable — cast the existing String values to the new enum
ALTER TABLE "pairwise_comparisons"
  ALTER COLUMN "status" TYPE "PairwiseComparisonStatus"
  USING "status"::"PairwiseComparisonStatus";

-- SetDefault
ALTER TABLE "pairwise_comparisons"
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"PairwiseComparisonStatus";
