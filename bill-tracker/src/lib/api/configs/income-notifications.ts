import { notifyIncome } from "@/lib/notifications/line-messaging";

export async function notifyIncomeCreate(companyId: string, data: Record<string, unknown>, baseUrl: string) {
  await notifyIncome(companyId, {
    id: data.id as string | undefined,
    companyCode: data.companyCode as string | undefined,
    companyName: (data.companyName as string) || "Unknown",
    customerName: (data.customerName || data.contactName || data.source) as string | undefined,
    source: data.source as string | undefined,
    amount: Number(data.amount) || 0,
    vatAmount: data.vatAmount ? Number(data.vatAmount) : undefined,
    isWhtDeducted: (data.isWhtDeducted as boolean) || false,
    whtRate: data.whtRate ? Number(data.whtRate) : undefined,
    whtAmount: data.whtAmount ? Number(data.whtAmount) : undefined,
    netReceived: Number(data.netReceived) || 0,
    status: (data.workflowStatus || data.status || "DRAFT") as string,
  }, baseUrl);
}

export function getIncomeDisplayName(income: { contact?: { name: string } | null; source?: string | null }): string | undefined {
  return income.contact?.name || income.source || undefined;
}
