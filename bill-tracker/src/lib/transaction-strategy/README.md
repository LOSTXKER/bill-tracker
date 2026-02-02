# Transaction Strategy Pattern

## Overview

The Transaction Strategy Pattern provides a clean, extensible way to handle different transaction types (expenses, incomes, transfers, etc.) without code duplication or complex conditionals.

## Architecture

```
transaction-strategy/
├── base.ts                 # Base interface and abstract class
├── expense-strategy.ts     # Expense implementation
├── income-strategy.ts      # Income implementation
├── index.ts               # Registry and exports
└── README.md              # This file
```

## Key Concepts

### Strategy Interface (`ITransactionStrategy`)

Each transaction type implements this interface:

- **Type identification**: `type`, `labels`, `permissions`
- **Field mappings**: Different field names (e.g., `billDate` vs `receiveDate`)
- **Validation**: `validateCreate()`, `validateUpdate()`
- **Data transformation**: `transformCreateData()`, `transformUpdateData()`
- **Business logic**: `calculateTotals()`, `determineWorkflowStatus()`
- **Display helpers**: `getDisplayName()`, `getApiPath()`, `getUiPath()`

### Registry

The `TransactionStrategyRegistry` manages all strategies:

```typescript
import { getTransactionStrategy } from "@/lib/transaction-strategy";

const strategy = getTransactionStrategy("expense");
const labels = strategy.labels;
const validation = strategy.validateCreate(data);
```

## Usage Examples

### 1. Get Transaction Labels

```typescript
import { getTransactionLabels } from "@/lib/transaction-strategy";

const labels = getTransactionLabels("expense");
console.log(labels.singular); // "รายจ่าย"
console.log(labels.dateLabel); // "วันที่บิล"
```

### 2. Validate Transaction Data

```typescript
import { validateTransactionCreate } from "@/lib/transaction-strategy";

const result = validateTransactionCreate("expense", {
  amount: 1000,
  billDate: "2024-01-01",
  isWht: true,
  // missing whtRate - will fail validation
});

if (!result.valid) {
  console.error(result.errors); // ["กรุณาระบุอัตราหัก ณ ที่จ่าย"]
}
```

### 3. Transform Data for API

```typescript
import { getTransactionStrategy } from "@/lib/transaction-strategy";

const strategy = getTransactionStrategy("expense");
const transformed = strategy.transformCreateData({
  amount: 1000,
  vatRate: 7,
  isWht: true,
  whtRate: 3,
});

console.log(transformed);
// {
//   amount: 1000,
//   vatAmount: 70,
//   whtAmount: 30,
//   netPaid: 1040,
//   ...
// }
```

### 4. Calculate Totals

```typescript
import { calculateTransactionTotals } from "@/lib/transaction-strategy";

const totals = calculateTransactionTotals("expense", 1000, 7, 3);
console.log(totals);
// {
//   baseAmount: 1000,
//   vatAmount: 70,
//   whtAmount: 30,
//   totalWithVat: 1070,
//   netAmount: 1040
// }
```

### 5. Generic Code

```typescript
import { getTransactionStrategy } from "@/lib/transaction-strategy";

function processTransaction(type: "expense" | "income", data: any) {
  const strategy = getTransactionStrategy(type);
  
  // Validate
  const validation = strategy.validateCreate(data);
  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }
  
  // Transform
  const transformed = strategy.transformCreateData(data);
  
  // Get display name
  const displayName = strategy.getDisplayName(transformed);
  
  // Get API path
  const apiPath = strategy.getApiPath();
  
  return { transformed, displayName, apiPath };
}
```

## Adding a New Transaction Type

### Step 1: Create Strategy Class

Create `src/lib/transaction-strategy/transfer-strategy.ts`:

```typescript
import { BaseTransactionStrategy } from "./base";
import type { TransactionFieldMapping, TransactionPermissions, TransactionLabels, WorkflowStatus } from "./base";

export class TransferStrategy extends BaseTransactionStrategy {
  readonly type = "transfer" as const;

  readonly labels: TransactionLabels = {
    singular: "โอนเงิน",
    plural: "โอนเงิน",
    singularEn: "Transfer",
    pluralEn: "Transfers",
    dateLabel: "วันที่โอน",
    amountLabel: "ยอดโอน",
    contactLabel: "ผู้รับ",
    whtLabel: "N/A",
    descriptionLabel: "รายละเอียด",
  };

  readonly fields: TransactionFieldMapping = {
    dateField: "transferDate",
    netAmountField: "amount",
    whtFlagField: "hasWht", // Not used for transfers
    descriptionField: "description",
    contactField: "ToAccount",
    workflowStatusField: "status",
    hasDocumentField: "hasReceipt",
  };

  readonly permissions: TransactionPermissions = {
    read: "transfers:read",
    create: "transfers:create",
    update: "transfers:update",
    delete: "transfers:delete",
  };

  readonly workflowStatuses: WorkflowStatus[] = [
    {
      value: "PENDING",
      label: "รอดำเนินการ",
      description: "รอโอนเงิน",
      color: "slate",
    },
    {
      value: "COMPLETED",
      label: "โอนแล้ว",
      description: "โอนเงินแล้ว",
      color: "emerald",
    },
  ];

  transformCreateData(data: Record<string, unknown>): Record<string, unknown> {
    return {
      ...data,
      transferDate: data.transferDate || new Date(),
      status: data.status || "PENDING",
    };
  }

  transformUpdateData(
    existingData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return data;
  }

  determineWorkflowStatus(data: Record<string, unknown>): string {
    return "PENDING";
  }

  getPrismaModel(): string {
    return "transfer";
  }
}

export const transferStrategy = new TransferStrategy();
```

### Step 2: Register Strategy

Update `src/lib/transaction-strategy/index.ts`:

```typescript
// Add export
export { TransferStrategy, transferStrategy } from "./transfer-strategy";

// Add import
import { transferStrategy } from "./transfer-strategy";

// Auto-register
transactionRegistry.register(transferStrategy);
```

### Step 3: Use Everywhere

Now your new transaction type works with:
- ✅ Generic API routes
- ✅ Validation helpers
- ✅ Calculation functions
- ✅ Permission checks
- ✅ Field mapping utilities
- ✅ Display labels

## Benefits

### 1. No More Type Conditionals

**Before:**
```typescript
const dateField = type === "expense" ? "billDate" : "receiveDate";
const amountField = type === "expense" ? "netPaid" : "netReceived";
const whtField = type === "expense" ? "isWht" : "isWhtDeducted";
```

**After:**
```typescript
const strategy = getTransactionStrategy(type);
const dateField = strategy.fields.dateField;
```

### 2. Easy Extensibility

Adding a new transaction type requires:
- ✅ Creating 1 strategy class
- ✅ Registering it in index.ts
- ❌ NO changes to existing code

### 3. Centralized Business Logic

All transaction-specific logic lives in one place:
- Validation rules
- Field mappings
- Workflow logic
- Calculation formulas

### 4. Type Safety

TypeScript ensures you implement all required methods and properties.

### 5. Testability

Each strategy can be tested independently:

```typescript
describe("ExpenseStrategy", () => {
  it("should validate WHT rate", () => {
    const result = expenseStrategy.validateCreate({
      amount: 1000,
      isWht: true,
      // missing whtRate
    });
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("กรุณาระบุอัตราหัก ณ ที่จ่าย");
  });
});
```

## Migration Guide

### Existing Code Using Conditionals

**Before:**
```typescript
if (type === "expense") {
  const netPaid = transaction.netPaid;
  // ... expense logic
} else if (type === "income") {
  const netReceived = transaction.netReceived;
  // ... income logic
}
```

**After:**
```typescript
const strategy = getTransactionStrategy(type);
const netAmount = transaction[strategy.fields.netAmountField];
// ... generic logic
```

### Existing API Routes

Use strategy methods instead of inline logic:

**Before:**
```typescript
const transformed = {
  ...data,
  netPaid: calculateNetPaid(data),
  workflowStatus: determineExpenseStatus(data),
};
```

**After:**
```typescript
const strategy = getTransactionStrategy("expense");
const transformed = strategy.transformCreateData(data);
```

## Future Enhancements

1. **Database-driven workflows**: Store workflow configurations in database
2. **Plugin system**: Allow runtime registration of strategies
3. **Event hooks**: Add lifecycle hooks (beforeCreate, afterUpdate, etc.)
4. **Custom validations**: Allow per-company custom validation rules
5. **Dynamic fields**: Support company-specific custom fields

## See Also

- [Field Mapping Utilities](../utils/transaction-fields.ts)
- [Transaction Hooks](../../hooks/use-transaction.ts)
- [API Route Factory](../api/transaction-routes.ts)
