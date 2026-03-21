-- AlterTable
ALTER TABLE "ReconcileMatch" ADD COLUMN "matchedBy" TEXT;
ALTER TABLE "ReconcileMatch" ADD COLUMN "matchedByName" TEXT;
ALTER TABLE "ReconcileMatch" ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false;
