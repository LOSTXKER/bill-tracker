"use client";

import { createContext, useContext, useState, useCallback, useEffect, useTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface NavigationProgressContextValue {
  isNavigating: boolean;
  pendingPath: string | null;
  startNavigation: (path: string) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const startNavigation = useCallback((path: string) => {
    setIsNavigating(true);
    setPendingPath(path);
  }, []);

  // Reset navigation state when pathname changes (navigation completed)
  useEffect(() => {
    setIsNavigating(false);
    setPendingPath(null);
  }, [pathname]);

  return (
    <NavigationProgressContext.Provider 
      value={{ 
        isNavigating: isNavigating || isPending, 
        pendingPath,
        startNavigation,
        isPending,
        startTransition,
      }}
    >
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (!context) {
    return {
      isNavigating: false,
      pendingPath: null,
      startNavigation: () => {},
      isPending: false,
      startTransition: (callback: () => void) => callback(),
    };
  }
  return context;
}
