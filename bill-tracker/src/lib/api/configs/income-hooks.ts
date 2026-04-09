import type { Income } from "@prisma/client";
import type { TransactionRequestBody, TransactionHookContext } from "../transaction-types";

export async function handleIncomeAfterCreate(_item: Income, _body: TransactionRequestBody, _context: TransactionHookContext) {
  // Contact defaults (VAT/WHT) have been consolidated into presets.
  // Delivery/tax-invoice preferences are only updated from expense hooks.
}
