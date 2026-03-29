"use client";

import { Button } from "@/components/ui/button";
import { Link2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemItem } from "./reconcile-table-types";
import { fmt } from "./reconcile-table-types";
import { SystemRow } from "./ReconcileTableRows";

export function SelectionActionBar({
  canLink,
  hasOneSelected,
  selectedSysItem,
  selectedAccItem,
  selectedSystemId,
  onSelectSystem,
  onSelectAccounting,
  onManualLink,
  selectedAccountingIndex,
}: {
  canLink: boolean;
  hasOneSelected: boolean;
  selectedSysItem?: SystemItem;
  selectedAccItem?: { vendorName: string; baseAmount: number };
  selectedSystemId: string | null;
  onSelectSystem: (id: string | null) => void;
  onSelectAccounting: (index: number | null) => void;
  onManualLink: (systemId: string, accountingIndex: number) => void;
  selectedAccountingIndex: number | null;
}) {
  if (!canLink && !hasOneSelected) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b px-4 py-2.5 flex items-center gap-3",
        canLink
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted/80 backdrop-blur-sm"
      )}
    >
      {canLink && selectedSysItem && selectedAccItem ? (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-primary-foreground/70 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{selectedSysItem.vendorName}</span>
            <span className="text-sm font-mono opacity-70 flex-shrink-0">
              {fmt(selectedSysItem.baseAmount)}
            </span>
          </div>
          <Link2 className="h-4 w-4 flex-shrink-0 opacity-80" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-primary-foreground/70 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{selectedAccItem.vendorName}</span>
            <span className="text-sm font-mono opacity-70 flex-shrink-0">
              {fmt(selectedAccItem.baseAmount)}
            </span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => { onSelectSystem(null); onSelectAccounting(null); }}
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => onManualLink(selectedSystemId!, selectedAccountingIndex!)}
            >
              <Link2 className="h-3.5 w-3.5" />
              จับคู่รายการนี้
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            {selectedSystemId ? (
              <>
                เลือกแถว <strong className="text-foreground">ระบบ</strong> แล้ว —
                คลิกแถวจาก <strong className="text-foreground">รายงานบัญชี</strong> เพื่อจับคู่
              </>
            ) : (
              <>
                เลือกแถว <strong className="text-foreground">รายงานบัญชี</strong> แล้ว —
                คลิกแถวจาก <strong className="text-foreground">ระบบ</strong> เพื่อจับคู่
              </>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => { onSelectSystem(null); onSelectAccounting(null); }}
          >
            ล้างการเลือก
          </Button>
        </>
      )}
    </div>
  );
}

export function NoAccountingDataView({
  systemItems,
  showCompanyBadge,
  onPreview,
  typeLabel,
  monthLabel,
  yearLabel,
  onShowImport,
}: {
  systemItems: SystemItem[];
  showCompanyBadge?: boolean;
  onPreview: (id: string) => void;
  typeLabel: string;
  monthLabel: string;
  yearLabel: number;
  onShowImport: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_88px_1fr]">
      <div className="border-r border-border overflow-y-auto max-h-[calc(100vh-380px)] divide-y divide-border/50">
        {systemItems.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            ไม่มีรายการในเดือนนี้
          </div>
        ) : (
          systemItems.map((item) => (
            <SystemRow
              key={item.id}
              item={item}
              isSelected={false}
              isSelectable={false}
              onSelect={() => {}}
              showCompanyBadge={showCompanyBadge}
              onPreview={() => onPreview(item.id)}
            />
          ))
        )}
      </div>
      <div className="border-r border-border" />
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[300px]">
        <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
          <Upload className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-semibold text-foreground">นำเข้ารายงาน{typeLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">เดือน{monthLabel} {yearLabel}</p>
        <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
          อัปโหลด Excel, CSV หรือ PDF เพื่อเริ่มเปรียบเทียบ
        </p>
        <Button onClick={onShowImport} className="mt-5 gap-2">
          <Upload className="h-4 w-4" />
          อัปโหลดไฟล์
        </Button>
      </div>
    </div>
  );
}
