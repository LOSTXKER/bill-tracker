"use client";

import { useRouter } from "next/navigation";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle,
  History,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import Link from "next/link";

interface SessionSummary {
  id: string;
  month: number;
  year: number;
  type: string;
  status: string;
  matchedCount: number;
  unmatchedSystemCount: number;
  unmatchedAccountCount: number;
  totalSystemAmount: number;
  totalAccountAmount: number;
  sourceFileName: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
  totalMatches: number;
}

interface Props {
  sessions: SessionSummary[];
  companyCode: string;
  year: number;
  type?: string;
  status?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: {
    label: "กำลังดำเนินการ",
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
  },
  ARCHIVED: {
    label: "เก็บถาวร",
    color: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-700",
  },
};

const MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function ReconcileHistoryList({
  sessions,
  companyCode,
  year,
  type,
  status,
}: Props) {
  const router = useRouter();

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    params.set("year", overrides.year ?? String(year));
    if (overrides.type ?? type) params.set("type", (overrides.type ?? type)!);
    if (overrides.status ?? status) params.set("status", (overrides.status ?? status)!);
    return params;
  };

  const handleFilterChange = (field: string, value: string) => {
    const val = value === "all" ? undefined : value;
    const params = buildParams({ [field]: val });
    router.push(`/${companyCode}/reconcile/history?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Back link + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${companyCode}/reconcile`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปจับคู่
        </Link>

        <div className="h-6 w-px bg-border" />

        <Select value={String(year)} onValueChange={(v) => handleFilterChange("year", v)}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue placeholder="ปี" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type || "all"} onValueChange={(v) => handleFilterChange("type", v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="EXPENSE">ภาษีซื้อ (รายจ่าย)</SelectItem>
            <SelectItem value="INCOME">ภาษีขาย (รายรับ)</SelectItem>
            <SelectItem value="PP36">ภพ.36</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status || "all"} onValueChange={(v) => handleFilterChange("status", v)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
            <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
            <SelectItem value="ARCHIVED">เก็บถาวร</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <History className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground">ไม่พบประวัติ</p>
          <p className="text-xs text-muted-foreground mt-1">
            ลองเปลี่ยนตัวกรอง หรือบันทึกผลการจับคู่ก่อน
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const statusInfo = STATUS_MAP[s.status] ?? STATUS_MAP.IN_PROGRESS;
            const diff = Math.abs(s.totalSystemAmount - s.totalAccountAmount);
            const isBalanced = diff < 0.01;

            return (
              <Link
                key={s.id}
                href={`/${companyCode}/reconcile/history/${s.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold">
                            {s.type === "EXPENSE" ? "ภาษีซื้อ" : s.type === "INCOME" ? "ภาษีขาย" : "ภพ.36"}{" "}
                            {MONTH_NAMES[s.month - 1]} {s.year + 543}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px]", statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                          {s.sourceFileName && (
                            <Badge variant="secondary" className="text-[10px] max-w-[150px] truncate">
                              {s.sourceFileName}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {s.matchedCount} จับคู่แล้ว
                          </span>
                          {s.unmatchedSystemCount > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-orange-500" />
                              {s.unmatchedSystemCount} ไม่ตรง(ระบบ)
                            </span>
                          )}
                          {s.unmatchedAccountCount > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              {s.unmatchedAccountCount} ไม่ตรง(รายงาน)
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(s.createdAt).toLocaleDateString(APP_LOCALE, {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: APP_TIMEZONE,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right space-y-1">
                        <div>
                          <p className="text-sm font-mono font-semibold">
                            {formatCurrency(s.totalSystemAmount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">ระบบ</p>
                        </div>
                        <div>
                          <p className="text-sm font-mono font-semibold">
                            {formatCurrency(s.totalAccountAmount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">รายงาน</p>
                        </div>
                        {!isBalanced && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            ต่าง {formatCurrency(diff)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
