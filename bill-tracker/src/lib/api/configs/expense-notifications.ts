import { notifyExpense } from "@/lib/notifications/line-messaging";

export async function notifyExpenseCreate(companyId: string, data: Record<string, unknown>, baseUrl: string) {
  await notifyExpense(companyId, {
    id: data.id as string | undefined,
    companyCode: data.companyCode as string | undefined,
    companyName: (data.companyName as string) || "Unknown",
    vendorName: (data.vendorName || data.contactName || data.description) as string | undefined,
    description: data.description as string | undefined,
    amount: Number(data.amount) || 0,
    vatAmount: data.vatAmount ? Number(data.vatAmount) : undefined,
    isWht: (data.isWht as boolean) || false,
    whtRate: data.whtRate ? Number(data.whtRate) : undefined,
    whtAmount: data.whtAmount ? Number(data.whtAmount) : undefined,
    netPaid: Number(data.netPaid) || 0,
    status: (data.workflowStatus || data.status || "DRAFT") as string,
  }, baseUrl);
}

export function getExpenseDisplayName(expense: { contact?: { name: string } | null; description?: string | null }): string | undefined {
  return expense.contact?.name || expense.description || undefined;
}
