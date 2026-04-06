# Cache Layer

This directory contains Next.js `unstable_cache`-backed server-side caches.

---

## Invalidation Matrix

| Cache | File | Tags | `revalidate` (s) | Invalidated by |
|-------|------|------|-----------------|----------------|
| Expense stats | `stats.ts` | `expense-stats` | 60 | `revalidateTransactionCache("expense")` in `transaction-effects.ts` and `transaction-approval.ts` |
| Income stats | `stats.ts` | `income-stats` | 60 | `revalidateTransactionCache("income")` in `transaction-effects.ts` and `transaction-approval.ts` |
| Monthly chart data | `chart-data.ts` | `expense-stats`, `income-stats` | 60 | Same triggers as expense/income stats (shares tags) |
| Company by code | `company.ts` | `company` | 3600 | `revalidateTag("company", {})` in `api/companies/[id]/route.ts` PATCH handler |
| Company ID by code | `company.ts` | `company` | 3600 | Same as above |

---

## Trigger Map — where `revalidateTransactionCache` is called

```
transaction-effects.ts
  └─ revalidateTransactionCache(modelName)
        ├─ called by createCreateHandler (after expense/income create)
        └─ called by createUpdateHandler (after expense/income update)

transaction-approval.ts
  └─ revalidateTransactionCache(modelName)
        ├─ called by approveTransaction
        └─ called by rejectTransaction
```

---

## Adding a New Cache

1. Create your `unstable_cache`-wrapped function in this directory.
2. Assign a unique `tags` array entry (e.g. `["my-feature"]`).
3. Add a row to the table above.
4. Call `revalidateTag("my-feature", {})` in every mutation that changes the cached data.

---

## Notes

- `revalidateTag` requires **two arguments** in Next.js 16+ (tag string + options object `{}`).
- `chart-data.ts` shares `expense-stats` / `income-stats` tags so it auto-invalidates whenever a transaction is created or updated — no extra wiring needed.
- Company caches use a 1-hour `revalidate` as a fallback; the tag bust ensures immediate propagation after profile edits.
