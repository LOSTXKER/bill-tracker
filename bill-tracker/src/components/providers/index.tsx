"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";
import { NavigationProgressProvider } from "./navigation-progress-provider";
import { NavigationProgress } from "@/components/navigation";

/**
 * Combined Providers Component
 * Wraps the application with all necessary providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <NavigationProgressProvider>
            <NavigationProgress />
            {children}
          </NavigationProgressProvider>
        </ThemeProvider>
      </SWRConfig>
    </SessionProvider>
  );
}
