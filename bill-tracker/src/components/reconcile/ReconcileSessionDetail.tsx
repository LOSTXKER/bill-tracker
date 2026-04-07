"use client";

import { useState } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  ExternalLink,
  Check,
  X,
  Loader2,
  Zap,
  Building2,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface MatchDetail {
  id: string;
  systemVendor: string;
  systemAmount: number;
  systemVat: number;
  acctVendor: string;
  acctDate: string;
  acctInvoice: string | null;
  acctTaxId: string | null;
  acctBase: number;
  acctVat: number;
  acctTotal: number;
  matchType: string;
  confidence: number | null;
  aiReason: string | null;
  amountDiff: number | null;
  notes: string | null;
  isPayOnBehalf: boolean;
  payOnBehalfFrom: string | null;
  payOnBehalfTo: string | null;
  status: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  rejectedReason: string | null;
  matchedBy: string | null;
  matchedByName: string | null;
  skipped: boolean;
  documentUrls: string[];
  expenseDescription: string | null;
  expenseDate: string | null;
}

interface SessionInfo {
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
}

interface Props {
  session: SessionInfo;
  matches: MatchDetail[];
  companyCode: string;
}

const MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const MATCH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  EXACT: { label: "ตรงกัน", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  STRONG: { label: "ใกล้เคียง", color: "text-blue-600 bg-blue-50 border-blue-200" },
  FUZZY: { label: "คล้ายกัน", color: "text-blue-600 bg-blue-50 border-blue-200" },
  AI: { label: "AI แนะนำ", color: "text-amber-600 bg-amber-50 border-amber-200" },
  MANUAL: { label: "จับคู่เอง", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "รอยืนยัน", color: "text-amber-600" },
  CONFIRMED: { label: "ยืนยันแล้ว", color: "text-emerald-600" },
  REJECTED: { label: "ปฏิเสธ", color: "text-red-600" },
};

const SESSION_STATUS_MAP: Record<string, { label: string; color: string }> = {
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

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: APP_TIMEZONE });
  } catch {
    return iso;
  }
}

export function ReconcileSessionDetail({ session, matches, companyCode }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localMatches, setLocalMatches] = useState(matches);
  const [completing, setCompleting] = useState(false);

  const sessionStatus = SESSION_STATUS_MAP[session.status] ?? SESSION_STATUS_MAP.IN_PROGRESS;
  const diff = Math.abs(session.totalSystemAmount - session.totalAccountAmount);
  const isBalanced = diff < 0.01;

  const confirmedCount = localMatches.filter((m) => m.status === "CONFIRMED").length;
  const rejectedCount = localMatches.filter((m) => m.status === "REJECTED").length;
  const pendingCount = localMatches.filter((m) => m.status === "PENDING").length;

  const handleMatchAction = async (
    matchId: string,
    action: "confirm" | "reject",
    rejectedReason?: string
  ) => {
    setActionLoading(matchId);
    try {
      const res = await fetch(
        `/api/${companyCode}/reconcile/sessions/${session.id}/matches/${matchId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, rejectedReason }),
        }
      );
      if (res.ok) {
        setLocalMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? { ...m, status: action === "confirm" ? "CONFIRMED" : "REJECTED" }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Match action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/${companyCode}/reconcile/sessions/${session.id}/complete`,
        { method: "POST" }
      );
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "ไม่สามารถปิดรายการได้");
      }
    } catch {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/${companyCode}/reconcile/history`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปประวัติ
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              {session.type === "EXPENSE" ? "ภาษีซื้อ" : session.type === "INCOME" ? "ภาษีขาย" : "ภพ.36"}{" "}
              {MONTH_NAMES[session.month - 1]} {session.year + 543}
            </h1>
            <Badge variant="outline" className={cn("text-xs", sessionStatus.color)}>
              {sessionStatus.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(session.createdAt).toLocaleDateString(APP_LOCALE, {
                day: "numeric",
                month: "short",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: APP_TIMEZONE,
              })}
            </span>
            {session.sourceFileName && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {session.sourceFileName}
              </span>
            )}
          </div>
        </div>

        {session.status === "IN_PROGRESS" && pendingCount === 0 && (
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="gap-2"
          >
            {completing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            เสร็จสิ้นการเทียบ
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">ยอดระบบ</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(session.totalSystemAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">ยอดรายงาน</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(session.totalAccountAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">จับคู่แล้ว</p>
            <p className="text-lg font-bold text-emerald-600">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">รอยืนยัน / ปฏิเสธ</p>
            <p className="text-lg font-bold">
              <span className="text-amber-600">{pendingCount}</span>
              {rejectedCount > 0 && (
                <span className="text-red-600 ml-2">/ {rejectedCount}</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isBalanced && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            ยอดต่างกัน {formatCurrency(diff)}
          </span>
        </div>
      )}

      {/* Match pairs list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1fr_auto] bg-muted/50 border-b px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span>ระบบเว็บ</span>
          <span className="text-center">สถานะ</span>
          <span>รายงานบัญชี</span>
          <span className="text-center w-24">การดำเนินการ</span>
        </div>

        <div className="divide-y max-h-[calc(100vh-400px)] overflow-y-auto">
          {localMatches.map((m) => {
            const matchTypeInfo = MATCH_TYPE_LABELS[m.matchType] ?? MATCH_TYPE_LABELS.MANUAL;
            const statusInfo = STATUS_LABELS[m.status] ?? STATUS_LABELS.PENDING;
            const hasDocs = m.documentUrls.length > 0;

            return (
              <div
                key={m.id}
                className={cn(
                  "grid grid-cols-[1fr_100px_1fr_auto] px-4 py-3 hover:bg-muted/20 transition-colors",
                  m.status === "REJECTED" && "opacity-50"
                )}
              >
                {/* System side */}
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.systemVendor}</p>
                    <span className="text-sm font-mono font-semibold flex-shrink-0">
                      {formatCurrency(m.systemAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {m.expenseDate && <span>{fmtDate(m.expenseDate)}</span>}
                    {m.expenseDescription && m.expenseDescription !== m.systemVendor && (
                      <span className="truncate max-w-[150px]">{m.expenseDescription}</span>
                    )}
                    <span className="text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0">
                      VAT {formatCurrency(m.systemVat)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {m.isPayOnBehalf && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4 text-purple-600 border-purple-300">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />
                        {m.payOnBehalfFrom
                          ? `${m.payOnBehalfFrom} จ่ายแทน`
                          : "จ่ายแทน"}
                      </Badge>
                    )}
                    {hasDocs && (
                      <div className="flex items-center gap-1">
                        {m.documentUrls.slice(0, 3).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-5 w-5 rounded border bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                            title="ดูเอกสาร"
                          >
                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                          </a>
                        ))}
                        {m.documentUrls.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{m.documentUrls.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status center */}
                <div className="flex flex-col items-center justify-center gap-1">
                  <Badge variant="outline" className={cn("text-[10px]", matchTypeInfo.color)}>
                    {matchTypeInfo.label}
                  </Badge>
                  {m.confidence !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(m.confidence * 100)}%
                    </span>
                  )}
                  {m.amountDiff !== null && m.amountDiff > 0.01 && (
                    <span className="text-[10px] text-orange-600">
                      ±{formatCurrency(m.amountDiff)}
                    </span>
                  )}
                  {m.matchedByName && (
                    <span className="text-[9px] text-muted-foreground" title={`จับคู่โดย ${m.matchedByName}`}>
                      โดย {m.matchedByName}
                    </span>
                  )}
                </div>

                {/* Accounting side */}
                <div className="min-w-0 pl-3 border-l border-border">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.acctVendor}</p>
                    <span className="text-sm font-mono font-semibold flex-shrink-0">
                      {formatCurrency(m.acctBase)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{m.acctDate}</span>
                    {m.acctInvoice && (
                      <span className="truncate max-w-[100px]">#{m.acctInvoice}</span>
                    )}
                    {m.acctTaxId && (
                      <span className="truncate max-w-[100px]">{m.acctTaxId}</span>
                    )}
                    <span className="text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0">
                      VAT {formatCurrency(m.acctVat)}
                    </span>
                  </div>
                  {m.aiReason && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      <Zap className="h-3 w-3 inline mr-0.5 text-amber-500" />
                      {m.aiReason}
                    </p>
                  )}
                  {m.rejectedReason && (
                    <p className="text-[10px] text-red-600 mt-1 truncate">
                      เหตุผลปฏิเสธ: {m.rejectedReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1 w-24">
                  {m.status === "PENDING" ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="ปฏิเสธ"
                        disabled={actionLoading === m.id}
                        onClick={() => handleMatchAction(m.id, "reject")}
                      >
                        {actionLoading === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="ยืนยัน"
                        disabled={actionLoading === m.id}
                        onClick={() => handleMatchAction(m.id, "confirm")}
                      >
                        {actionLoading === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <span className={cn("text-xs font-medium", statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
