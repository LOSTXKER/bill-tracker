import type { TransactionModelName } from "./transaction-types";

const userSelectFields = { id: true, name: true, email: true } as const;

export function getCreatorInclude(modelName: TransactionModelName) {
  return modelName === "expense"
    ? { User_Expense_createdByToUser: { select: userSelectFields } }
    : { User: { select: userSelectFields } };
}

export function getSubmitterInclude(modelName: TransactionModelName) {
  return modelName === "expense"
    ? { User_Expense_submittedByToUser: { select: userSelectFields } }
    : { User_Income_submittedByToUser: { select: userSelectFields } };
}

export function getInternalCompanyInclude(modelName: TransactionModelName) {
  return modelName === "expense" ? { InternalCompany: true } : {};
}

export function getBaseIncludes(modelName: TransactionModelName, options?: { includeSubmitter?: boolean }) {
  return {
    Contact: true,
    Account: true,
    ...getCreatorInclude(modelName),
    ...(options?.includeSubmitter ? getSubmitterInclude(modelName) : {}),
    ...getInternalCompanyInclude(modelName),
  };
}
