"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";

/**
 * Combined Providers Component
 * Wraps the application with all necessary providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        {children}
      </ThemeProvider>
    </SWRConfig>
  );
}
