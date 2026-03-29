import type { SystemItem, MatchedPair, MatchStatus } from "./ReconcileTable";
import type { AccountingRow } from "./ImportPanel";
import type { ReconcileSessionType } from "@prisma/client";

const MATCH_STATUS_TO_MATCH_TYPE: Record<string, string> = {
  exact: "EXACT",
  strong: "STRONG",
  fuzzy: "FUZZY",
  ai: "AI",
  manual: "MANUAL",
};

function matchStatusToMatchType(status: MatchStatus): string {
  return MATCH_STATUS_TO_MATCH_TYPE[status] ?? "MANUAL";
}

interface AIMatchParams {
  companyCode: string;
  pairs: MatchedPair[];
}

interface AIMatchResult {
  updatedPairs: MatchedPair[];
}

export async function runAITextMatch({
  companyCode,
  pairs,
}: AIMatchParams): Promise<AIMatchResult> {
  const unmatchedSystem = pairs
    .filter((p) => p.status === "system-only")
    .map((p) => p.systemItem!)
    .filter(Boolean);
  const unmatchedAccounting = pairs
    .filter((p) => p.status === "accounting-only")
    .map((p) => ({ ...p.accountingItem!, _idx: p.accountingIndex! }));

  if (!unmatchedSystem.length || !unmatchedAccounting.length) {
    return { updatedPairs: pairs };
  }

  const res = await fetch(`/api/${companyCode}/reconcile/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemItems: unmatchedSystem.map((s) => ({
        id: s.id,
        vendorName: s.vendorName,
        amount: s.baseAmount,
        vatAmount: s.vatAmount,
        date: s.date,
        taxId: s.taxId,
        description: s.description,
        isPayOnBehalf: s.isPayOnBehalf,
        paidByCompany: s.payOnBehalfFrom,
      })),
      accountingItems: unmatchedAccounting.map((a) => ({
        vendorName: a.vendorName,
        amount: a.baseAmount,
        vatAmount: a.vatAmount,
        date: a.date,
        taxId: a.taxId,
      })),
    }),
  });

  if (!res.ok) throw new Error("AI request failed");
  const json = await res.json();
  const suggestions = json.data?.suggestions ?? [];

  if (suggestions.length === 0) {
    return { updatedPairs: pairs };
  }

  const updated = [...pairs];
  const usedAccountingInAI = new Set<number>();

  suggestions.forEach(
    (s: {
      systemId: string;
      accountingIndex: number;
      confidence: number;
      reason: string;
    }) => {
      const accountingEntry = unmatchedAccounting[s.accountingIndex];
      if (!accountingEntry) return;
      const realIdx = accountingEntry._idx;
      if (usedAccountingInAI.has(realIdx)) return;

      const sysIdx = updated.findIndex(
        (p) => p.status === "system-only" && p.systemItem?.id === s.systemId
      );
      const accIdx = updated.findIndex(
        (p) => p.status === "accounting-only" && p.accountingIndex === realIdx
      );

      if (sysIdx === -1 || accIdx === -1) return;

      const merged: MatchedPair = {
        id: `ai-${s.systemId}-${realIdx}`,
        systemItem: updated[sysIdx].systemItem,
        accountingItem: updated[accIdx].accountingItem,
        accountingIndex: realIdx,
        status: "ai",
        confidence: s.confidence,
        aiReason: s.reason,
        userConfirmed: undefined,
      };

      updated.splice(Math.max(sysIdx, accIdx), 1);
      updated.splice(Math.min(sysIdx, accIdx), 1, merged);
      usedAccountingInAI.add(realIdx);
    }
  );

  return { updatedPairs: updated };
}

interface SaveSessionParams {
  companyCode: string;
  month: number;
  year: number;
  type: ReconcileSessionType;
  sourceFileName: string | null;
  sourceFileUrl: string | null;
  matchedPairs: MatchedPair[];
  systemItems: SystemItem[];
  accountingItems: AccountingRow[];
  unmatchedSystemCount: number;
  unmatchedAccountingCount: number;
}

export async function saveReconcileSession({
  companyCode,
  month,
  year,
  type,
  sourceFileName,
  sourceFileUrl,
  matchedPairs,
  systemItems,
  accountingItems,
  unmatchedSystemCount,
  unmatchedAccountingCount,
}: SaveSessionParams): Promise<void> {
  const systemTotal = systemItems.reduce((s, i) => s + i.baseAmount, 0);
  const accountingTotal = accountingItems.reduce(
    (s, i) => s + i.baseAmount,
    0
  );

  const matches = matchedPairs.map((p) => ({
    expenseId: type !== "INCOME" ? p.systemItem!.id : undefined,
    incomeId: type === "INCOME" ? p.systemItem!.id : undefined,
    systemAmount: p.systemItem!.baseAmount,
    systemVat: p.systemItem!.vatAmount,
    systemVendor: p.systemItem!.vendorName || p.systemItem!.description || "",
    acctDate: p.accountingItem!.date,
    acctInvoice: p.accountingItem!.invoiceNumber || undefined,
    acctVendor: p.accountingItem!.vendorName,
    acctTaxId: p.accountingItem!.taxId || undefined,
    acctBase: p.accountingItem!.baseAmount,
    acctVat: p.accountingItem!.vatAmount,
    acctTotal: p.accountingItem!.totalAmount,
    matchType: matchStatusToMatchType(p.status),
    confidence: p.confidence,
    aiReason: p.aiReason,
    amountDiff:
      p.systemItem && p.accountingItem
        ? Math.abs(p.systemItem.baseAmount - p.accountingItem.baseAmount)
        : undefined,
    isPayOnBehalf: p.systemItem!.isPayOnBehalf ?? false,
    payOnBehalfFrom: p.systemItem!.payOnBehalfFrom ?? undefined,
    payOnBehalfTo: p.systemItem!.payOnBehalfTo ?? undefined,
    status: "CONFIRMED",
  }));

  const res = await fetch(`/api/${companyCode}/reconcile/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      month,
      year,
      type,
      sourceFileName,
      sourceFileUrl,
      matches,
      accountingRows: accountingItems.map((a) => ({
        date: a.date,
        invoiceNumber: a.invoiceNumber || undefined,
        vendorName: a.vendorName,
        taxId: a.taxId || undefined,
        baseAmount: a.baseAmount,
        vatAmount: a.vatAmount,
        totalAmount: a.totalAmount,
      })),
      totalSystemAmount: systemTotal,
      totalAccountAmount: accountingTotal,
      unmatchedSystemCount,
      unmatchedAccountCount: unmatchedAccountingCount,
    }),
  });

  if (!res.ok) throw new Error("Save failed");
}
