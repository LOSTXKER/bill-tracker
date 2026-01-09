"use client";

import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";

/**
 * SWR Provider Component
 * Wraps the application with SWR configuration for caching and deduplication
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
