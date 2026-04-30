"use client";

/**
 * Global error boundary. This replaces the root `layout.tsx` and is used as a
 * last-resort fallback when an error escapes all other error boundaries
 * (including errors thrown inside the root layout itself).
 *
 * Must be a client component and must render `<html>` and `<body>` itself.
 */

import { useEffect } from "react";
import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Surface the error to the browser console in production so support can
    // copy the digest / message if needed.
    console.error("[global-error]", {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            "'Noto Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background:
            "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          color: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "white",
            borderRadius: 16,
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            เกิดข้อผิดพลาดที่ไม่คาดคิด
          </h1>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            ระบบพบข้อผิดพลาดระหว่างประมวลผลคำขอของคุณ
            ทีมงานได้รับการแจ้งเตือนแล้ว กรุณาลองใหม่อีกครั้ง
          </p>
          {error?.digest ? (
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "#64748b",
                background: "#f1f5f9",
                borderRadius: 8,
                padding: "8px 12px",
                wordBreak: "break-all",
              }}
            >
              Error ID: <code>{error.digest}</code>
            </p>
          ) : null}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #10b981, #0d9488)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ลองใหม่
            </button>
            <Link
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "white",
                color: "#0f172a",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
