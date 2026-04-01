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
