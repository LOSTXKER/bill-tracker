# Cleanup Guide - Deprecated Fields and Code

This guide outlines deprecated code and fields that can be safely removed after proper migration.

## 1. Deprecated Database Fields

### Expense Model

#### Single File URLs (Use array versions instead)
- ❌ `slipUrl` → ✅ Use `slipUrls` (JSON array)
- ❌ `taxInvoiceUrl` → ✅ Use `taxInvoiceUrls` (JSON array)
- ❌ `whtCertUrl` → ✅ Use `whtCertUrls` (JSON array)

#### Category Enum (Use Category model instead)
- ❌ `category` (ExpenseCategory enum) → ✅ Use `categoryId` + `categoryRef` relation

### Income Model

#### Single File URLs (Use array versions instead)
- ❌ `customerSlipUrl` → ✅ Use `customerSlipUrls` (JSON array)
- ❌ `myBillCopyUrl` → ✅ Use `myBillCopyUrls` (JSON array)
- ❌ `whtCertUrl` → ✅ Use `whtCertUrls` (JSON array)

## 2. Migration Steps

### Step 1: Verify All Code Uses New Fields

Check that no code is still creating records with deprecated fields:

```bash
# Search for deprecated field usage
grep -r "slipUrl:" src/
grep -r "taxInvoiceUrl:" src/
grep -r "whtCertUrl:" src/
grep -r "customerSlipUrl:" src/
grep -r "myBillCopyUrl:" src/
grep -r "category:" src/ | grep -v "categoryId"
```

### Step 2: Run File Migration Script

```bash
# Migrate existing single URLs to arrays
npx tsx scripts/migrate-files-to-arrays.ts
```

This script should:
1. Find all expenses/incomes with non-null single URL fields
2. Copy values to corresponding array fields
3. Verify migration success
4. Report statistics

### Step 3: Create Database Backup

```bash
# Backup before removing fields
pg_dump your_database > backup_before_cleanup.sql
```

### Step 4: Create Prisma Migration

After verifying migration, create a migration to remove deprecated fields:

```prisma
// prisma/migrations/YYYYMMDD_remove_deprecated_fields/migration.sql

-- Remove deprecated single file URL fields from Expense
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "slipUrl";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "taxInvoiceUrl";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "whtCertUrl";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "category";

-- Remove deprecated single file URL fields from Income
ALTER TABLE "Income" DROP COLUMN IF EXISTS "customerSlipUrl";
ALTER TABLE "Income" DROP COLUMN IF EXISTS "myBillCopyUrl";
ALTER TABLE "Income" DROP COLUMN IF EXISTS "whtCertUrl";
```

### Step 5: Update Prisma Schema

Remove deprecated fields from `prisma/schema.prisma`:

```prisma
model Expense {
  // ... other fields ...
  
  // ❌ REMOVE THESE:
  // slipUrl       String?
  // taxInvoiceUrl String?
  // whtCertUrl    String?
  // category      ExpenseCategory?
  
  // ✅ KEEP THESE:
  slipUrls       Json @default("[]")
  taxInvoiceUrls Json @default("[]")
  whtCertUrls    Json @default("[]")
  categoryId     String?
  categoryRef    Category? @relation(fields: [categoryId], references: [id])
}

model Income {
  // ... other fields ...
  
  // ❌ REMOVE THESE:
  // customerSlipUrl String?
  // myBillCopyUrl   String?
  // whtCertUrl      String?
  
  // ✅ KEEP THESE:
  customerSlipUrls Json @default("[]")
  myBillCopyUrls   Json @default("[]")
  whtCertUrls      Json @default("[]")
}

// ❌ REMOVE THIS ENUM:
// enum ExpenseCategory {
//   MATERIAL
//   UTILITY
//   ...
// }
```

### Step 6: Remove Deprecated Code

#### Remove from Validations

```typescript
// src/lib/validations/expense.ts

// ❌ REMOVE:
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = { ... };

// ❌ REMOVE from schema:
category: z.enum([...]).optional()
```

#### Remove from Types

```typescript
// src/types/index.ts

// ❌ REMOVE:
import type { ExpenseCategory } from "@prisma/client";

// ❌ REMOVE from filters:
export interface ExpenseFilters extends BaseTransactionFilters {
  // category?: ExpenseCategory; // REMOVE THIS
}
```

### Step 7: Update API Routes

Remove handling of deprecated fields in transform functions:

```typescript
// src/app/api/expenses/route.ts

transformCreateData: (body) => {
  const { vatAmount, whtAmount, netPaid, ...data } = body;
  return {
    // ... other fields ...
    // ❌ REMOVE:
    // category: data.category,
    // slipUrl: data.slipUrl || null,
    // taxInvoiceUrl: data.taxInvoiceUrl || null,
    // whtCertUrl: data.whtCertUrl || null,
  };
}
```

### Step 8: Clean Up Old Form Components

After verifying new forms work correctly:

```bash
# Backup old forms first
mv src/components/forms/expense-form.tsx src/components/forms/expense-form.old.tsx
mv src/components/forms/income-form.tsx src/components/forms/income-form.old.tsx

# Rename new forms
mv src/components/forms/expense-form-new.tsx src/components/forms/expense-form.tsx
mv src/components/forms/income-form-new.tsx src/components/forms/income-form.tsx
```

## 3. Verification Checklist

Before removing deprecated fields, verify:

- [ ] All expenses have data migrated to `slipUrls`, `taxInvoiceUrls`, `whtCertUrls`
- [ ] All incomes have data migrated to `customerSlipUrls`, `myBillCopyUrls`, `whtCertUrls`
- [ ] All expenses with `category` enum have corresponding `categoryId`
- [ ] No code references deprecated single URL fields
- [ ] No code references `ExpenseCategory` enum
- [ ] Database backup created
- [ ] New forms tested thoroughly
- [ ] API routes tested with new field structure

## 4. Rollback Plan

If issues arise after cleanup:

1. Restore database from backup:
   ```bash
   psql your_database < backup_before_cleanup.sql
   ```

2. Revert Prisma schema changes:
   ```bash
   git checkout HEAD~1 prisma/schema.prisma
   npx prisma generate
   ```

3. Restore old form components:
   ```bash
   git checkout HEAD~1 src/components/forms/
   ```

## 5. Timeline

Recommended timeline for cleanup:

1. **Week 1**: Complete refactoring (✅ DONE)
2. **Week 2**: Test new components in production
3. **Week 3**: Run file migration script
4. **Week 4**: Verify migration, create backup
5. **Week 5**: Remove deprecated fields
6. **Week 6**: Monitor for issues

## 6. Risk Assessment

| Item | Risk Level | Mitigation |
|------|-----------|------------|
| Data loss during migration | Medium | Full backup + verification script |
| Breaking existing integrations | Low | Deprecated fields still work until removed |
| Performance impact | Low | Array fields are indexed, minimal impact |
| User disruption | Low | Changes are backend-only |

## 7. Post-Cleanup Benefits

After cleanup:
- ✅ Cleaner database schema
- ✅ Reduced code complexity
- ✅ Better type safety
- ✅ Easier maintenance
- ✅ ~500 lines of code removed
- ✅ Consistent file handling (arrays everywhere)
- ✅ Flexible category system (database-driven)

## 8. Support

If you encounter issues during cleanup:
1. Check migration logs
2. Verify database backup is valid
3. Test rollback procedure in staging first
4. Document any unexpected issues
