"use client";

/**
 * Error boundary scoped to `/[company]/*` routes. It renders INSIDE
 * `DashboardShell`, so the sidebar / header stay visible and the user can keep
 * navigating to other pages.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface CompanyErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CompanyError({ error, reset }: CompanyErrorProps) {
  const params = useParams<{ company?: string }>();
  const companyCode = (params?.company ?? "").toLowerCase();
  const dashboardHref = companyCode ? `/${companyCode}/dashboard` : "/";

  useEffect(() => {
    console.error("[app/[company]/error]", {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 text-white shadow-lg">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          โหลดหน้านี้ไม่สำเร็จ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          ระบบพบข้อผิดพลาดระหว่างดึงข้อมูลจากเซิร์ฟเวอร์
          กรุณาลองใหม่อีกครั้ง หากยังเจอปัญหากรุณาแจ้ง Error ID ด้านล่างให้ทีมงาน
        </p>
        {error?.digest ? (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground break-all">
            Error ID: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            ลองใหม่
          </Button>
          <Button asChild variant="outline">
            <Link href={dashboardHref}>
              <Home className="mr-2 h-4 w-4" />
              ไปที่ภาพรวม
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
