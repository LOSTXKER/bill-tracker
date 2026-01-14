"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the actual content components
import { DocumentTimelineContent } from "./document-timeline-content";
import { AuditHistoryContent } from "@/components/audit-logs/audit-history-content";

interface CombinedHistorySectionProps {
  companyCode: string;
  companyId: string;
  entityType: string;
  entityId: string;
  expenseId?: string;
  incomeId?: string;
  refreshKey?: number;
}

export function CombinedHistorySection({
  companyCode,
  companyId,
  entityType,
  entityId,
  expenseId,
  incomeId,
  refreshKey,
}: CombinedHistorySectionProps) {
  const [activeTab, setActiveTab] = useState<"document" | "audit">("document");

  return (
    <Card className="shadow-sm border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            ประวัติ
          </CardTitle>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs font-medium transition-colors",
                activeTab === "document"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
              onClick={() => setActiveTab("document")}
            >
              <Clock className="h-3 w-3 mr-1.5" />
              เอกสาร
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs font-medium transition-colors",
                activeTab === "audit"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
              onClick={() => setActiveTab("audit")}
            >
              <History className="h-3 w-3 mr-1.5" />
              แก้ไข
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "document" ? (
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
        )}
      </CardContent>
    </Card>
  );
}
