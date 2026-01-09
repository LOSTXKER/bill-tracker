import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bill Tracker | ระบบจัดการเอกสารบัญชี",
  description:
    "ระบบจัดการรายรับ-รายจ่าย เอกสารภาษี และ Mini-ERP สำหรับธุรกิจ SME",
  keywords: [
    "บัญชี",
    "ภาษี",
    "ใบกำกับภาษี",
    "ภาษีหัก ณ ที่จ่าย",
    "ERP",
    "SME",
    "Bill Tracker",
  ],
  authors: [{ name: "Bill Tracker Team" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
