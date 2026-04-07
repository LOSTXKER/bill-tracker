"use client";

import { DocumentTimelineContent } from "./document-timeline-content";
import { AuditHistoryContent } from "@/components/audit-logs/audit-history-content";

export type HistoryTab = "document" | "audit";

interface CombinedHistorySectionProps {
  companyCode: string;
  companyId: string;
  entityType: string;
  entityId: string;
  expenseId?: string;
  incomeId?: string;
  refreshKey?: number;
  activeTab: HistoryTab;
}

export function CombinedHistorySection({
  companyCode,
  companyId,
  entityType,
  entityId,
  expenseId,
  incomeId,
  refreshKey,
  activeTab,
}: CombinedHistorySectionProps) {
  return activeTab === "document" ? (
    <DocumentTimelineContent
      companyCode={companyCode}
      expenseId={expenseId}
      incomeId={incomeId}
    />
  ) : (
    <AuditHistoryContent
      companyId={companyId}
      entityType={entityType}
      entityId={entityId}
      refreshKey={refreshKey}
    />
  );
}
