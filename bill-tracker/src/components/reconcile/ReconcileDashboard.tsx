"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ArrowRight,
  CircleDashed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export interface SessionSummary {
  id: string;
  month: number;
  year: number;
  type: string;
  status: string;
  matchedCount: number;
  unmatchedSystemCount: number;
  unmatchedAccountCount: number;
  totalSystemAmount: string;
  totalAccountAmount: string;
  sourceFileName: string | null;
  sourceFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  _count?: { Matches: number; AccountingRows: number };
}

export type ReconcileType = "EXPENSE" | "INCOME" | "PP36";

interface ReconcileDashboardProps {
  companyCode: string;
  year: number;
  type: ReconcileType;
  sessions: SessionSummary[];
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function formatAmt(n: number) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReconcileDashboard({
  companyCode,
  year,
  type,
  sessions,
}: ReconcileDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sessionMap = new Map<number, SessionSummary>();
  sessions.forEach((s) => {
    if (s.type === type && s.year === year) {
      sessionMap.set(s.month, s);
    }
  });

  const handleNavigate = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("year", overrides.year ?? String(year));
    params.set("type", overrides.type ?? type);
    startTransition(() => {
      router.push(`/${companyCode}/reconcile?${params.toString()}`);
    });
  };

  const handleOpenWorkspace = (month: number) => {
    const params = new URLSearchParams();
    params.set("month", String(month));
    params.set("year", String(year));
    params.set("type", type);
    router.push(`/${companyCode}/reconcile/work?${params.toString()}`);
  };

  const totalSessions = sessions.filter((s) => s.type === type && s.year === year);
  const completedCount = totalSessions.filter((s) => s.status === "COMPLETED").length;
  const inProgressCount = totalSessions.filter((s) => s.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Select
          value={String(year)}
          onValueChange={(v) => handleNavigate({ year: v })}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-28">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y + 543}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border bg-muted/30 p-0.5">
          <Button
            variant={type === "EXPENSE" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-4 text-xs"
            onClick={() => handleNavigate({ type: "EXPENSE" })}
            disabled={isPending}
          >
            ภาษีซื้อ
          </Button>
          <Button
            variant={type === "INCOME" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-4 text-xs"
            onClick={() => handleNavigate({ type: "INCOME" })}
            disabled={isPending}
          >
            ภาษีขาย
          </Button>
          <Button
            variant={type === "PP36" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-4 text-xs"
            onClick={() => handleNavigate({ type: "PP36" })}
            disabled={isPending}
          >
            ภพ.36
          </Button>
        </div>

        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        <div className="flex-1" />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            เสร็จ {completedCount}/12
          </span>
          {inProgressCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              กำลังทำ {inProgressCount}
            </span>
          )}
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {MONTHS.map((monthName, idx) => {
          const m = idx + 1;
          const sess = sessionMap.get(m);
          return (
            <MonthCard
              key={m}
              month={m}
              monthName={monthName}
              monthShort={MONTHS_SHORT[idx]}
              session={sess}
              onClick={() => handleOpenWorkspace(m)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonthCard({
  month,
  monthName,
  monthShort,
  session,
  onClick,
}: {
  month: number;
  monthName: string;
  monthShort: string;
  session?: SessionSummary;
  onClick: () => void;
}) {
  const status = session?.status ?? "NOT_STARTED";
  const totalMatched = session?.matchedCount ?? 0;
  const totalUnmatched =
    (session?.unmatchedSystemCount ?? 0) + (session?.unmatchedAccountCount ?? 0);
  const hasData = !!session;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/40 group relative overflow-hidden",
        status === "COMPLETED" && "border-emerald-200 dark:border-emerald-800/50",
        status === "IN_PROGRESS" && "border-amber-200 dark:border-amber-800/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">{monthName}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {hasData ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>จับคู่แล้ว</span>
                  <span>{totalMatched} รายการ</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      status === "COMPLETED" ? "bg-emerald-500" : "bg-amber-500"
                    )}
                    style={{
                      width: `${
                        totalMatched + totalUnmatched > 0
                          ? (totalMatched / (totalMatched + totalUnmatched)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[120px]" title={session?.sourceFileName ?? ""}>
                {session?.sourceFileName ? (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    {session.sourceFileName}
                  </span>
                ) : (
                  "ไม่มีไฟล์"
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleDashed className="h-3.5 w-3.5" />
            <span>ยังไม่มีข้อมูล</span>
          </div>
        )}

        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 h-5 gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
        >
          <CheckCircle2 className="h-3 w-3" />
          เสร็จ
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 h-5 gap-1 text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
        >
          <Clock className="h-3 w-3" />
          กำลังทำ
        </Badge>
      );
    default:
      return null;
  }
}
