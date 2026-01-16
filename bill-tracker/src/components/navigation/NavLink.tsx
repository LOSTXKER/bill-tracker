"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useNavigationProgress } from "@/components/providers/navigation-progress-provider";
import { cn } from "@/lib/utils";

interface NavLinkProps extends ComponentProps<typeof Link> {
  /**
   * If true, will not trigger navigation progress (useful for external links)
   */
  skipProgress?: boolean;
  /**
   * If true, shows a loading spinner when this specific link is pending navigation
   */
  showPendingSpinner?: boolean;
  /**
   * Custom pending indicator (replaces default spinner)
   */
  pendingIndicator?: ReactNode;
}

/**
 * A Link component that triggers navigation progress indicator.
 * Use this for internal navigation links that need instant feedback.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLink({ 
    onClick, 
    skipProgress, 
    href, 
    showPendingSpinner,
    pendingIndicator,
    children,
    className,
    ...props 
  }, ref) {
    const { startNavigation, pendingPath } = useNavigationProgress();
    const pathname = usePathname();

    const targetPath = typeof href === "string" ? href : href.pathname;
    const isPending = pendingPath === targetPath && targetPath !== pathname;

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);

      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        skipProgress
      ) {
        return;
      }

      if (targetPath && targetPath !== pathname) {
        startNavigation(targetPath);
      }
    };

    return (
      <Link 
        ref={ref} 
        href={href} 
        onClick={handleClick} 
        className={cn(
          className,
          isPending && "pointer-events-none"
        )}
        {...props}
      >
        {showPendingSpinner && isPending ? (
          <>
            {pendingIndicator || <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        ) : (
          children
        )}
      </Link>
    );
  }
);

/**
 * Hook to check if a path is active (current or pending navigation)
 */
export function useIsActivePath(path: string) {
  const pathname = usePathname();
  const { pendingPath } = useNavigationProgress();
  
  // If we're navigating to this path, show it as active immediately
  if (pendingPath === path) return true;
  // If we're navigating somewhere else, don't show current path as active
  if (pendingPath && pendingPath !== path) return false;
  // Normal case: check actual pathname
  return pathname === path;
}

/**
 * Hook to check if we are currently navigating to a specific path
 */
export function useIsPendingPath(path: string) {
  const pathname = usePathname();
  const { pendingPath } = useNavigationProgress();
  
  return pendingPath === path && path !== pathname;
}

/**
 * Hook to check if any navigation is in progress
 */
export function useIsNavigating() {
  const { isNavigating, pendingPath } = useNavigationProgress();
  return { isNavigating, pendingPath };
}
