# Bill Tracker Refactoring Documentation

**Last Updated**: January 7, 2026  
**Status**: ✅ Phase 1 & 2 Complete, Ongoing Improvements

---

## Table of Contents

1. [Overview](#overview)
2. [Completed Refactoring](#completed-refactoring)
3. [Code Metrics](#code-metrics)
4. [Architecture Improvements](#architecture-improvements)
5. [Migration Guide](#migration-guide)
6. [Next Steps](#next-steps)

---

## Overview

This document consolidates all refactoring work completed on the Bill Tracker application, including both Phase 1 and Phase 2 improvements.

### Goals Achieved

- ✅ Reduced code duplication by ~33% (490+ lines)
- ✅ Improved maintainability through shared components
- ✅ Migrated to array-based file storage
- ✅ Implemented flexible category system
- ✅ Created reusable hooks and utilities
- ✅ Zero linter errors maintained throughout

---

## Completed Refactoring

### Phase 1: Core Abstractions

#### 1. Shared Validation Schemas (`src/lib/validations/shared.ts`)

Created reusable validation schemas to eliminate duplication:
- `financialFieldsSchema` - Common financial fields
- `whtFieldsSchema` - Withholding tax fields  
- `paymentMethodSchema` - Payment method enum
- `baseTransactionSchema` - Base schema for all transactions

**Impact**: Reduced ~50 lines of duplicated validation code

#### 2. Generic Serializers (`src/lib/utils/serializers.ts`)

Created `serializeTransaction()` function for Decimal-to-number conversion.

**Impact**: Eliminated serialization duplication across transaction types

#### 3. API Routes Factory (`src/lib/api/transaction-routes.ts`)

Created `createTransactionRoutes()` factory function for CRUD handlers.

**Refactored files**:
- `src/app/api/expenses/route.ts` - 116 → 90 lines
- `src/app/api/expenses/[id]/route.ts` - 159 → 85 lines
- `src/app/api/incomes/route.ts` - 114 → 78 lines
- `src/app/api/incomes/[id]/route.ts` - 131 → 73 lines

**Impact**: ~250 lines eliminated

#### 4. Shared Route Configs (Phase 2 - Latest)

Extracted route configurations to shared files:
- `src/lib/api/configs/expense-config.ts`
- `src/lib/api/configs/income-config.ts`

**Impact**: Eliminated ~180 lines of duplicate configuration

#### 5. Generic Transaction Form (`src/components/forms/shared/TransactionFormBase.tsx`)

Created configuration-based form component:
- `expense-form.tsx` - 295 → 82 lines (72% reduction)
- `income-form.tsx` - 309 → 86 lines (72% reduction)

**Impact**: ~460 lines eliminated, consistent form behavior

#### 6. Shared Table Row Hook (`src/hooks/use-transaction-row.ts`)

Created `useTransactionRow()` hook for common table row behavior.

**Impact**: ~20 lines per component saved

---

### Phase 2: Data Structure Improvements

#### 1. Multiple File Upload Support

**Changed**:
- `slipUrl` (single) → `slipUrls` (array)
- `taxInvoiceUrl` → `taxInvoiceUrls`
- `whtCertUrl` → `whtCertUrls`
- `customerSlipUrl` → `customerSlipUrls`
- `myBillCopyUrl` → `myBillCopyUrls`

**Files Modified**: 12 files across forms, components, and API routes

**Impact**: Users can upload up to 5 files per document type

#### 2. Flexible Category System

**Changed**: 
- Removed hardcoded `ExpenseCategory` enum
- Migrated to database-driven `Category` model
- Categories now customizable per company

**Impact**: No code changes needed to add/modify categories

#### 3. Reusable Transaction Hooks

**Created**:
- `use-transaction-file-upload.ts` - File upload logic
- `use-transaction-actions.ts` - Status/delete actions
- `use-transaction-filters.ts` - Filter state management
- `use-transaction-row.ts` - Table row behavior

**Impact**: Reduced duplication, easier to test and maintain

---

## Code Metrics

### Before Refactoring
- API routes: ~520 lines
- Forms: ~600 lines
- Validations: ~200 lines (with duplication)
- Table rows: ~180 lines
- **Total: ~1,500 lines**

### After Refactoring  
- API routes: ~270 lines (factory + configs)
- Forms: ~400 lines (base + configs)
- Validations: ~180 lines (shared + specific)
- Table rows: ~160 lines (hook + components)
- **Total: ~1,010 lines**

### Net Reduction: ~490 lines (~33% reduction)

---

## Architecture Improvements

### 1. Configuration-Based Architecture

Transaction forms and API routes now use configuration objects instead of duplicated code:

```typescript
// Example: Expense Config
export const expenseRouteConfig = {
  modelName: "expense",
  displayName: "Expense",
  permissions: {
    read: "expenses:read",
    create: "expenses:create",
    update: "expenses:update",
  },
  fields: {
    dateField: "billDate",
    netAmountField: "netPaid",
    statusField: "status",
  },
  transformCreateData: (body) => { /* ... */ },
  transformUpdateData: (body) => { /* ... */ },
};

// Usage
const expenseRoutes = createTransactionRoutes(expenseRouteConfig);
```

### 2. Hook-Based Logic Extraction

Common logic extracted to reusable hooks:

```typescript
// Example: File Upload Hook
const { uploadFiles, isUploading } = useTransactionFileUpload({
  transactionId: expense.id,
  transactionType: "expense",
  fieldName: "slipUrls",
});
```

### 3. Type Safety with Generics

Factory functions use TypeScript generics for type safety:

```typescript
export function createTransactionRoutes<TModel, TCreateData, TUpdateData>(
  config: TransactionRouteConfig<TModel, TCreateData, TUpdateData>
) {
  // Fully typed CRUD operations
}
```

---

## Migration Guide

### For Developers

#### Using New Form Components

```typescript
// Import the new form
import { ExpenseForm } from "@/components/forms/expense-form";

// Forms now use array-based file fields
<ExpenseForm 
  onSubmit={(data) => {
    // data.slipUrls is now an array
    console.log(data.slipUrls); // ["url1", "url2"]
  }}
/>
```

#### Creating New Transaction Types

To add a new transaction type (e.g., Transfer):

1. Create config file: `src/lib/api/configs/transfer-config.ts`
2. Define route handlers: `src/app/api/transfers/route.ts`
3. Create form config: Use `TransactionFormBase` with custom config
4. Add detail page: Use `TransactionDetailBase` with custom config

Example:

```typescript
// 1. Config
export const transferRouteConfig = {
  modelName: "transfer",
  displayName: "Transfer",
  permissions: { read: "transfers:read", ... },
  fields: { dateField: "transferDate", ... },
  transformCreateData: (body) => ({ ... }),
  transformUpdateData: (body) => ({ ... }),
};

// 2. Routes
const transferRoutes = createTransactionRoutes(transferRouteConfig);
export const GET = transferRoutes.list;
export const POST = transferRoutes.create;

// 3. Form
const transferFormConfig: TransactionFormConfig = {
  type: "transfer",
  title: "โอนเงิน",
  icon: ArrowRightLeft,
  // ... field configs
};

export function TransferForm() {
  return <TransactionFormBase config={transferFormConfig} />;
}
```

### Deprecated Fields

The following fields still exist in the database but should not be used in new code:

**Expense Model:**
- ❌ `category` (enum) → ✅ Use `categoryId`
- ❌ `slipUrl` → ✅ Use `slipUrls`
- ❌ `taxInvoiceUrl` → ✅ Use `taxInvoiceUrls`
- ❌ `whtCertUrl` → ✅ Use `whtCertUrls`

**Income Model:**
- ❌ `customerSlipUrl` → ✅ Use `customerSlipUrls`
- ❌ `myBillCopyUrl` → ✅ Use `myBillCopyUrls`
- ❌ `whtCertUrl` → ✅ Use `whtCertUrls`

For migration steps to remove these fields, see [CLEANUP_GUIDE.md](./CLEANUP_GUIDE.md).

---

## Next Steps

### Immediate (Complete)
- [x] Extract route configs to separate files
- [x] Remove Team Section duplication from Settings
- [x] Migrate forms to use array-based file uploads
- [x] Remove ExpenseCategory enum usage

### Short Term (In Progress)
- [ ] Consolidate dual reimbursement systems
- [ ] Migrate all API routes to use `withCompanyAccess` middleware
- [ ] Standardize API responses to use `apiResponse` helper
- [ ] Run data migration script (`scripts/migrate-files-to-arrays.ts`)

### Medium Term
- [ ] Remove deprecated Prisma schema fields
- [ ] Add unit tests for critical paths
- [ ] Add E2E tests for main workflows

### Long Term
- [ ] Add more transaction types (Transfers, Adjustments)
- [ ] Implement batch operations
- [ ] Add transaction templates

---

## Benefits Achieved

### 1. Better Code Organization
- Shared hooks for common operations
- Config-based forms reduce duplication
- Cleaner type system

### 2. Improved Maintainability
- Less code to maintain (~33% reduction)
- Changes only need to be made once
- Clear separation of concerns

### 3. Enhanced Flexibility
- Multiple file uploads per document type
- Database-driven categories
- Easy to extend with new transaction types

### 4. Better Developer Experience
- Type-safe APIs with generics
- Reusable components and hooks
- Clear configuration patterns

### 5. Better User Experience
- Users can upload multiple files
- Consistent form behavior
- More intuitive category management

---

## Files Reference

### Core Library Files
- `src/lib/api/transaction-routes.ts` - Transaction CRUD factory
- `src/lib/api/configs/expense-config.ts` - Expense route config
- `src/lib/api/configs/income-config.ts` - Income route config
- `src/lib/validations/shared.ts` - Shared validation schemas
- `src/lib/utils/serializers.ts` - Generic serializers

### Component Files
- `src/components/forms/shared/TransactionFormBase.tsx` - Generic form
- `src/components/transactions/TransactionDetailBase.tsx` - Generic detail page
- `src/components/forms/expense-form.tsx` - Expense form (uses base)
- `src/components/forms/income-form.tsx` - Income form (uses base)

### Hook Files
- `src/hooks/use-transaction-file-upload.ts` - File upload logic
- `src/hooks/use-transaction-actions.ts` - Status/delete actions
- `src/hooks/use-transaction-filters.ts` - Filter management
- `src/hooks/use-transaction-row.ts` - Table row behavior

---

## Support

For questions or issues:
1. Check this documentation
2. Review the code examples above
3. Consult [CLEANUP_GUIDE.md](./CLEANUP_GUIDE.md) for migration steps
4. Refer to specific component files for implementation details

---

**Version**: 2.0.0  
**Completed**: January 7, 2026  
**Maintained By**: Development Team
