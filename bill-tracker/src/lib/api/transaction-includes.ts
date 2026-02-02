/**
 * Prisma Include Builders for Transaction Queries
 * Extracted from transaction-routes.ts for better modularity
 */

const userSelectFields = { id: true, name: true, email: true } as const;

/**
 * Get the creator include for a transaction model.
 * Expense uses User_Expense_createdByToUser, Income uses User.
 */
export function getCreatorInclude(modelName: "expense" | "income") {
  return modelName === "expense" 
    ? { User_Expense_createdByToUser: { select: userSelectFields } }
    : { User: { select: userSelectFields } };
}

/**
 * Get the submitter include for a transaction model (for approval workflow).
 */
export function getSubmitterInclude(modelName: "expense" | "income") {
  return modelName === "expense"
    ? { User_Expense_submittedByToUser: { select: userSelectFields } }
    : { User_Income_submittedByToUser: { select: userSelectFields } };
}

/**
 * Get the internal company include (only for expense type).
 */
export function getInternalCompanyInclude(modelName: "expense" | "income") {
  return modelName === "expense" ? { InternalCompany: true } : {};
}

/**
 * Get base includes for transaction queries.
 * Includes Contact, Account, and model-specific relations.
 */
export function getBaseIncludes(modelName: "expense" | "income", options?: { includeSubmitter?: boolean }) {
  return {
    Contact: true,
    Account: true,
    ...getCreatorInclude(modelName),
    ...(options?.includeSubmitter ? getSubmitterInclude(modelName) : {}),
    ...getInternalCompanyInclude(modelName),
  };
}
