"use client";

/**
 * Root-scope error boundary for the App Router. This renders INSIDE the root
 * `layout.tsx`, so it keeps the `<html>` / `<body>` shell intact.
 *
 * Only server component errors outside of `(auth)` / `[company]` sub-trees
 * (or re-thrown from them) will reach this boundary.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("[app/error]", {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 text-white shadow-lg">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          เกิดข้อผิดพลาดที่ไม่คาดคิด
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          ระบบพบข้อผิดพลาดระหว่างประมวลผลคำขอของคุณ
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
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
