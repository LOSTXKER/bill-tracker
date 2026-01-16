"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

interface LoadingButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  /**
   * Text to show while loading (optional, shows spinner by default)
   */
  loadingText?: string;
  /**
   * Position of the loading spinner
   */
  spinnerPosition?: "left" | "right";
  /**
   * Use Slot pattern for composition
   */
  asChild?: boolean;
}

/**
 * LoadingButton - A Button with built-in loading state
 * 
 * Features:
 * - Shows spinner when loading
 * - Automatically disabled when loading to prevent double-clicks
 * - Preserves button width during loading transition
 * - Supports all Button variants and sizes
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      spinnerPosition = "left",
      disabled,
      className,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const spinner = (
      <Loader2
        className={cn(
          "animate-spin",
          size === "sm" ? "h-3 w-3" : "h-4 w-4"
        )}
      />
    );

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={isDisabled}
        className={cn(
          "relative",
          loading && "cursor-wait",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            {spinnerPosition === "left" && spinner}
            {loadingText || children}
            {spinnerPosition === "right" && spinner}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
