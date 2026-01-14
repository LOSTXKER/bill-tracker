"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Clock,
  CheckCircle,
  FileText,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

// Map icon names to actual icon components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "arrow-up-circle": ArrowUpCircle,
  "arrow-down-circle": ArrowDownCircle,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "clock": Clock,
  "check-circle": CheckCircle,
  "file-text": FileText,
  "wallet": Wallet,
};

interface StatItem {
  title: string;
  value: string;
  subtitle: string;
  icon?: string; // Changed from LucideIcon to string
  iconColor?: string;
  trend?: {
    value: number; // percentage change
    isPositive: boolean;
  };
  progress?: number; // percentage for progress bar (0-100)
  onClick?: () => void;
  featured?: boolean; // for gradient background
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
      {stats.map((stat, i) => {
        const IconComponent = stat.icon ? ICON_MAP[stat.icon] : null;
        
        return (
          <Card 
            key={i} 
            className={cn(
              "border-border/50 shadow-card transition-all duration-300",
              stat.onClick && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
              stat.featured && "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
            )}
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {IconComponent && (
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  stat.iconColor?.includes("text-destructive") && "bg-destructive/10",
                  stat.iconColor?.includes("text-primary") && "bg-primary/10",
                  stat.iconColor?.includes("text-amber") && "bg-amber-500/10",
                  !stat.iconColor && "bg-muted"
                )}>
                  <IconComponent className={cn("h-4 w-4", stat.iconColor)} />
                </div>
              )}
            </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-end justify-between">
              <div className={cn(
                "text-2xl font-semibold", 
                stat.iconColor || "text-foreground"
              )}>
                {stat.value}
              </div>
              {stat.trend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  stat.trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {stat.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stat.trend.value)}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stat.subtitle}
            </p>
            {stat.progress !== undefined && (
              <div className="pt-1">
                <Progress 
                  value={stat.progress} 
                  className="h-1.5"
                />
              </div>
            )}
          </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
