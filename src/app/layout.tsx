import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, Inter } from 'next/font/google';
import './globals.css';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SlipSync - AI จัดการสลิป & บัญชี',
  description: 'ระบบจัดการสลิปและบัญชีอัจฉริยะด้วย AI สำหรับ CEO และทีมบัญชี',
  keywords: ['สลิป', 'บัญชี', 'AI', 'OCR', 'CEO', 'expense', 'receipt'],
  authors: [{ name: 'SlipSync Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0f1a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${inter.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
