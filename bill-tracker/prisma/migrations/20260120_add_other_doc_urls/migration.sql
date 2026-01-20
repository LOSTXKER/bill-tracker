-- AlterTable: Add otherDocUrls for supporting documents that AI doesn't need to analyze
ALTER TABLE "Expense" ADD COLUMN "otherDocUrls" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Income" ADD COLUMN "otherDocUrls" JSONB NOT NULL DEFAULT '[]';
