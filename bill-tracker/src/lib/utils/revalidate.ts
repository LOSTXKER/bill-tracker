import { mutate } from "swr";

/**
 * Revalidate sidebar badges SWR cache immediately.
 * Call after any mutation that could change badge counts
 * (create, update, delete, approve, reject, status change).
 */
export function revalidateSidebarBadges(companyCode: string) {
  if (!companyCode) return;
  mutate(`/api/${companyCode}/sidebar-badges`);
}

/**
 * Revalidate all SWR keys related to a company.
 * Invalidates contacts, categories, and any other cached data for the company.
 * Call after mutations that affect multiple data types or when you're unsure
 * which SWR keys are affected.
 */
export function revalidateCompanyData(companyCode: string) {
  if (!companyCode) return;
  mutate(
    (key) => typeof key === "string" && (
      key.includes(companyCode) ||
      key.includes(companyCode.toUpperCase()) ||
      key.includes(companyCode.toLowerCase())
    ),
    undefined,
    { revalidate: true }
  );
}

/**
 * Revalidate a specific transaction's SWR cache.
 * Also revalidates sidebar badges since transaction changes often affect counts.
 */
export function revalidateTransaction(
  companyCode: string,
  type: "expense" | "income",
  id: string
) {
  mutate(`/api/${type}s/${id}`);
  revalidateSidebarBadges(companyCode);
}
