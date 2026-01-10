-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_categoryId_fkey";
ALTER TABLE "Income" DROP CONSTRAINT IF EXISTS "Income_categoryId_fkey";
ALTER TABLE "VendorMapping" DROP CONSTRAINT IF EXISTS "VendorMapping_categoryId_fkey";
ALTER TABLE "ReimbursementRequest" DROP CONSTRAINT IF EXISTS "Reimbursement Request_categoryId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Expense_category_idx";
DROP INDEX IF EXISTS "Expense_categoryId_idx";
DROP INDEX IF EXISTS "Income_categoryId_idx";

-- AlterTable - Remove Category fields from Expense
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "categoryId";

-- AlterTable - Remove Category fields from Income  
ALTER TABLE "Income" DROP COLUMN IF EXISTS "categoryId";

-- AlterTable - Remove Category fields from ReimbursementRequest
ALTER TABLE "ReimbursementRequest" DROP COLUMN IF EXISTS "categoryId";

-- AlterTable - Remove Category fields from VendorMapping and convert transactionType
ALTER TABLE "VendorMapping" DROP COLUMN IF EXISTS "categoryId";

-- Convert CategoryType enum to String for transactionType
ALTER TABLE "VendorMapping" ALTER COLUMN "transactionType" TYPE TEXT;

-- DropTable Category
DROP TABLE IF EXISTS "Category";

-- DropEnum
DROP TYPE IF EXISTS "CategoryType";
DROP TYPE IF EXISTS "ExpenseCategory";
