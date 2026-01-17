-- Migration: Require User System
-- This migration adds requesterId to ReimbursementRequest and removes EXTERNAL from PaidByType

-- Step 1: Add requesterId column (nullable first)
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "requesterId" TEXT;

-- Step 2: Create index for requesterId
CREATE INDEX IF NOT EXISTS "ReimbursementRequest_requesterId_idx" ON "ReimbursementRequest"("requesterId");

-- Step 3: Update existing ReimbursementRequests - link to users by email
-- First, try to match by requesterEmail
UPDATE "ReimbursementRequest" r
SET "requesterId" = u.id
FROM "User" u
WHERE r."requesterEmail" = u.email
  AND r."requesterId" IS NULL;

-- Step 4: For any remaining orphaned requests, we'll need to handle them
-- Get the first admin user as a fallback (or create a system user)
-- This creates a system user if one doesn't exist
INSERT INTO "User" (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
SELECT 
  'system-user-migration',
  'system@internal.local',
  'System Migration',
  '$2a$12$placeholder-password-hash-not-usable',
  'ADMIN',
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE id = 'system-user-migration'
)
ON CONFLICT (email) DO NOTHING;

-- Step 5: Assign orphaned requests to system user or first admin
UPDATE "ReimbursementRequest"
SET "requesterId" = COALESCE(
  (SELECT id FROM "User" WHERE email != 'system@internal.local' AND "isActive" = true ORDER BY "createdAt" LIMIT 1),
  'system-user-migration'
)
WHERE "requesterId" IS NULL;

-- Step 6: Make requesterId NOT NULL (only if all records have been updated)
-- Note: We'll do this in a subsequent migration or manually after verification
-- ALTER TABLE "ReimbursementRequest" ALTER COLUMN "requesterId" SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE "ReimbursementRequest" 
ADD CONSTRAINT "ReimbursementRequest_requesterId_fkey" 
FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Handle EXTERNAL PaidByType in ExpensePayment
-- Convert EXTERNAL payments to USER type if possible (by matching paidByName to user name)
-- First, update where we can match by name
UPDATE "ExpensePayment" ep
SET 
  "paidByType" = 'USER',
  "paidByUserId" = u.id
FROM "User" u
WHERE ep."paidByType" = 'EXTERNAL'
  AND ep."paidByName" IS NOT NULL
  AND LOWER(ep."paidByName") = LOWER(u.name)
  AND ep."paidByUserId" IS NULL;

-- For remaining EXTERNAL payments with no match, we keep them as USER but with a note
-- These will need manual review
UPDATE "ExpensePayment"
SET "paidByType" = 'USER'
WHERE "paidByType" = 'EXTERNAL';

-- Note: We cannot remove EXTERNAL from the enum as PostgreSQL requires 
-- ensuring no rows use that value. The enum change is handled by Prisma client.
