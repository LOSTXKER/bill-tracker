# Deprecated Fields Migration Guide

**Status:** ⚠️ Requires DATABASE_URL Configuration

This migration removes deprecated single-file URL fields from the database schema.

---

## Prerequisites

1. **DATABASE_URL must be configured** in `.env` file
2. Backup your database before running
3. Test on development database first

---

## Step 1: Run Data Migration Script

This script copies data from single URL fields to array fields:

```bash
# Ensure DATABASE_URL is set in .env
npx tsx scripts/migrate-files-to-arrays.ts
```

**What it does:**
- Migrates `Expense.slipUrl` → `slipUrls`
- Migrates `Expense.taxInvoiceUrl` → `taxInvoiceUrls`
- Migrates `Expense.whtCertUrl` → `whtCertUrls`
- Migrates `Income.customerSlipUrl` → `customerSlipUrls`
- Migrates `Income.myBillCopyUrl` → `myBillCopyUrls`
- Migrates `Income.whtCertUrl` → `whtCertUrls`

---

## Step 2: Create Prisma Migration

After verifying data migration, create a new migration to drop deprecated fields:

```bash
npx prisma migrate dev --name remove_deprecated_fields
```

---

## Step 3: Update Schema

Edit `prisma/schema.prisma` and remove these fields:

### Expense Model - Remove:
```prisma
// ❌ REMOVE THESE:
slipUrl       String?
taxInvoiceUrl String?
whtCertUrl    String?
category      ExpenseCategory?
```

### Income Model - Remove:
```prisma
// ❌ REMOVE THESE:
customerSlipUrl String?
myBillCopyUrl   String?
whtCertUrl      String?
```

### Remove ExpenseCategory Enum:
```prisma
// ❌ REMOVE THIS ENTIRE ENUM:
enum ExpenseCategory {
  MATERIAL
  UTILITY
  MARKETING
  SALARY
  FREELANCE
  TRANSPORT
  RENT
  OFFICE
  OTHER
}
```

---

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

---

## Step 5: Remove Code References

Search and remove any remaining code references to deprecated fields:

```bash
# Check for any remaining references
grep -r "slipUrl:" src/
grep -r "taxInvoiceUrl:" src/
grep -r "ExpenseCategory" src/
```

---

## Verification Checklist

- [ ] DATABASE_URL is configured
- [ ] Database backup created
- [ ] Migration script ran successfully
- [ ] All data migrated (check counts)
- [ ] Prisma migration created
- [ ] Schema updated
- [ ] Prisma client regenerated
- [ ] No code references to deprecated fields
- [ ] Application tested and working

---

## Rollback Plan

If issues occur:

1. Restore database from backup:
   ```bash
   psql your_database < backup.sql
   ```

2. Revert schema changes:
   ```bash
   git checkout HEAD~1 prisma/schema.prisma
   npx prisma generate
   ```

---

**Estimated Time:** 2-3 hours
**Risk Level:** Medium (requires database access)
**Impact:** High (cleaner schema, removes technical debt)
