import type { SystemItem, MatchedPair } from "./ReconcileTable";
import type { AccountingRow } from "./ImportPanel";
import type { SavedMatch } from "./reconcile-types";
import type { ReconcileSessionType } from "@prisma/client";

function daysBetween(dateA: string, dateB: string): number {
  try {
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    return Math.abs((a - b) / 86400000);
  } catch {
    return Infinity;
  }
}

export function runAutoMatch(
  systemItems: SystemItem[],
  accountingItems: AccountingRow[]
): MatchedPair[] {
  const usedAccounting = new Set<number>();
  const usedSystem = new Set<string>();
  const pairs: MatchedPair[] = [];

  // Pass 1: exact invoice number match
  systemItems.forEach((sItem) => {
    if (!sItem.invoiceNumber || usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx) || !aItem.invoiceNumber) return;
      if (
        sItem.invoiceNumber.trim().toLowerCase() ===
        aItem.invoiceNumber.trim().toLowerCase()
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "exact",
          confidence: 1,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  // Pass 2: tax ID + amount match
  systemItems.forEach((sItem) => {
    if (!sItem.taxId || usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx) || !aItem.taxId) return;
      if (
        sItem.taxId.replace(/\D/g, "") === aItem.taxId.replace(/\D/g, "") &&
        Math.abs(sItem.baseAmount - aItem.baseAmount) < 0.01
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "strong",
          confidence: 0.95,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  // Pass 3: fuzzy amount + VAT + date proximity match
  systemItems.forEach((sItem) => {
    if (usedSystem.has(sItem.id)) return;
    accountingItems.forEach((aItem, aIdx) => {
      if (usedAccounting.has(aIdx)) return;
      if (
        Math.abs(sItem.baseAmount - aItem.baseAmount) < 0.01 &&
        Math.abs(sItem.vatAmount - aItem.vatAmount) < 0.01 &&
        daysBetween(sItem.date, aItem.date) <= 3
      ) {
        pairs.push({
          id: `pair-${sItem.id}-${aIdx}`,
          systemItem: sItem,
          accountingItem: aItem,
          accountingIndex: aIdx,
          status: "fuzzy",
          confidence: 0.8,
        });
        usedAccounting.add(aIdx);
        usedSystem.add(sItem.id);
      }
    });
  });

  // Remaining unmatched system items
  systemItems.forEach((sItem) => {
    if (!usedSystem.has(sItem.id)) {
      pairs.push({
        id: `sys-${sItem.id}`,
        systemItem: sItem,
        status: "system-only",
      });
    }
  });

  // Remaining unmatched accounting items
  accountingItems.forEach((aItem, aIdx) => {
    if (!usedAccounting.has(aIdx)) {
      pairs.push({
        id: `acc-${aIdx}`,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: "accounting-only",
      });
    }
  });

  return pairs;
}

export function reconstructPairs(
  systemItems: SystemItem[],
  accountingItems: AccountingRow[],
  savedMatches: SavedMatch[],
  type: ReconcileSessionType
): MatchedPair[] {
  const usedSystem = new Set<string>();
  const usedAccounting = new Set<number>();
  const pairs: MatchedPair[] = [];

  for (const m of savedMatches) {
    const systemId = type === "INCOME" ? m.incomeId : m.expenseId;
    const sItem = systemId
      ? systemItems.find((s) => s.id === systemId)
      : undefined;

    const aIdx = accountingItems.findIndex(
      (a) =>
        a.vendorName === m.acctVendor &&
        Math.abs(a.baseAmount - m.acctBase) < 0.01 &&
        a.date === m.acctDate &&
        !usedAccounting.has(accountingItems.indexOf(a))
    );

    const aItem = aIdx >= 0 ? accountingItems[aIdx] : undefined;

    if (sItem && aItem) {
      const status =
        m.matchType === "AI"
          ? "ai"
          : m.matchType === "EXACT"
            ? "exact"
            : m.matchType === "STRONG"
              ? "strong"
              : "fuzzy";

      pairs.push({
        id: `saved-${m.id}`,
        systemItem: sItem,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: status as any,
        confidence: m.confidence ?? 1,
        aiReason: m.aiReason ?? undefined,
        userConfirmed: m.status === "CONFIRMED" ? true : undefined,
        matchedByName: m.matchedByName,
      });
      usedSystem.add(sItem.id);
      usedAccounting.add(aIdx);
    }
  }

  systemItems.forEach((sItem) => {
    if (!usedSystem.has(sItem.id)) {
      pairs.push({
        id: `sys-${sItem.id}`,
        systemItem: sItem,
        status: "system-only",
      });
    }
  });

  accountingItems.forEach((aItem, aIdx) => {
    if (!usedAccounting.has(aIdx)) {
      pairs.push({
        id: `acc-${aIdx}`,
        accountingItem: aItem,
        accountingIndex: aIdx,
        status: "accounting-only",
      });
    }
  });

  return pairs;
}
