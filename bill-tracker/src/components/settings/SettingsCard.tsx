"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface SettingsCardProps {
  // Header
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  
  // Actions
  showEditButton?: boolean;
  editDisabled?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  customAction?: React.ReactNode;
  
  // Content
  children: React.ReactNode;
  contentClassName?: string;
  
  // Card styling
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SettingsCard({
  title,
  description,
  icon: Icon,
  iconClassName = "bg-primary text-primary-foreground",
  showEditButton = false,
  editDisabled = true,
  onEdit,
  editLabel = "แก้ไข",
  customAction,
  children,
  contentClassName,
  className,
}: SettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                iconClassName
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
          </div>
          {customAction || (showEditButton && (
            <Button 
              variant="outline" 
              size="sm" 
              disabled={editDisabled}
              onClick={onEdit}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              {editLabel}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Settings Field Component
// =============================================================================

export interface SettingsFieldProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function SettingsField({
  label,
  icon: Icon,
  children,
  fullWidth = false,
}: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", fullWidth && "sm:col-span-2")}>
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </label>
      {children}
    </div>
  );
}
