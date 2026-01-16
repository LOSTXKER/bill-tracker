"use client";

import { useEffect, useState } from "react";
import { useNavigationProgress } from "@/components/providers/navigation-progress-provider";
import { cn } from "@/lib/utils";

export function NavigationProgress() {
  const { isNavigating } = useNavigationProgress();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setProgress(0);
      
      // Fast initial progress for immediate feedback
      const timer1 = setTimeout(() => setProgress(30), 20);
      const timer2 = setTimeout(() => setProgress(50), 80);
      const timer3 = setTimeout(() => setProgress(70), 200);
      const timer4 = setTimeout(() => setProgress(85), 500);
      const timer5 = setTimeout(() => setProgress(95), 1200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    } else if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/10 pointer-events-none">
      <div
        className={cn(
          "h-full bg-primary transition-all ease-out",
          "shadow-[0_0_10px_2px_hsl(var(--primary)/0.6),0_0_20px_4px_hsl(var(--primary)/0.3)]",
          progress < 100 ? "duration-150" : "duration-100"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
