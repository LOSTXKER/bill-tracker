"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, BookOpen, Users } from "lucide-react";
import Link from "next/link";

interface DataQualityCardProps {
  companyCode: string;
  total: number;
  noAccount: number;
  noContact: number;
}

export function DataQualityCard({ companyCode, total, noAccount, noContact }: DataQualityCardProps) {
  const accountPct = total > 0 ? Math.round(((total - noAccount) / total) * 100) : 100;
  const contactPct = total > 0 ? Math.round(((total - noContact) / total) * 100) : 100;
  const overallPct = Math.round((accountPct + contactPct) / 2);

  if (noAccount === 0 && noContact === 0) return null;

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <ClipboardCheck className="h-4 w-4 text-amber-600" />
          </div>
          ความสมบูรณ์ข้อมูลเดือนนี้
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {overallPct}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <QualityRow
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="มีบัญชี"
          current={total - noAccount}
          total={total}
          pct={accountPct}
        />
        <QualityRow
          icon={<Users className="h-3.5 w-3.5" />}
          label="มีผู้ติดต่อ"
          current={total - noContact}
          total={total}
          pct={contactPct}
        />

        {noAccount > 0 && (
          <Link
            href={`/${companyCode.toLowerCase()}/expenses/categorize`}
            className="block text-center text-sm text-primary hover:underline pt-1"
          >
            จัดหมวด {noAccount} รายการที่ยังไม่ระบุบัญชี
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function QualityRow({
  icon,
  label,
  current,
  total,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  total: number;
  pct: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-medium">
          {current}/{total}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
