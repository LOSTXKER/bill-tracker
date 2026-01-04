"use client";

/**
 * Permission Builder Component
 * 
 * Advanced UI for building custom permission sets
 * Features:
 * - Tab groups for each module
 * - Toggle all switch for entire module
 * - Individual permission toggles
 * - Tooltips and descriptions
 * - Permission summary
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PERMISSION_GROUPS } from "@/lib/permissions/groups";
import { Info } from "lucide-react";

interface PermissionBuilderProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

export function PermissionBuilder({
  value = [],
  onChange,
  disabled = false,
}: PermissionBuilderProps) {
  const [activeTab, setActiveTab] = useState(Object.keys(PERMISSION_GROUPS)[0]);

  /**
   * Toggle entire module (all permissions in module)
   */
  const toggleModule = (module: string) => {
    const moduleWildcard = `${module}:*`;
    const hasModule = value.includes(moduleWildcard);
    
    if (hasModule) {
      // Remove module wildcard and all individual permissions
      const updated = value.filter(
        (p) => !p.startsWith(`${module}:`)
      );
      onChange(updated);
    } else {
      // Add module wildcard and remove individual permissions
      const updated = value.filter(
        (p) => !p.startsWith(`${module}:`)
      );
      updated.push(moduleWildcard);
      onChange(updated);
    }
  };

  /**
   * Toggle individual permission
   */
  const togglePermission = (permission: string) => {
    const [module] = permission.split(":");
    const moduleWildcard = `${module}:*`;
    
    // If module wildcard is active, we need to expand it first
    if (value.includes(moduleWildcard)) {
      // Expand wildcard to individual permissions except this one
      const group = PERMISSION_GROUPS[module];
      const individualPerms = group.permissions
        .map((p) => p.key)
        .filter((p) => p !== permission);
      
      const updated = value.filter((p) => p !== moduleWildcard);
      updated.push(...individualPerms);
      onChange(updated);
    } else {
      // Toggle individual permission
      if (value.includes(permission)) {
        onChange(value.filter((p) => p !== permission));
      } else {
        onChange([...value, permission]);
      }
    }
  };

  /**
   * Check if a permission is active
   */
  const isPermissionActive = (permission: string): boolean => {
    const [module] = permission.split(":");
    return value.includes(permission) || value.includes(`${module}:*`);
  };

  /**
   * Check if module wildcard is active
   */
  const isModuleActive = (module: string): boolean => {
    return value.includes(`${module}:*`);
  };

  /**
   * Get count of active permissions
   */
  const getActiveCount = (): number => {
    return value.reduce((count, perm) => {
      if (perm.endsWith(":*")) {
        const module = perm.replace(":*", "");
        const group = PERMISSION_GROUPS[module];
        return count + (group?.permissions.length || 0);
      }
      return count + 1;
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            สิทธิ์ที่เลือก:
          </span>
        </div>
        <Badge variant="secondary" className="font-mono">
          {getActiveCount()} สิทธิ์
        </Badge>
      </div>

      {/* Tabs for each module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div>
          <TabsList className="grid grid-cols-4 w-full h-auto gap-1">
            {Object.values(PERMISSION_GROUPS).map((group) => {
              const Icon = group.icon;
              const isActive = isModuleActive(group.key);
              const hasAnyPerm = group.permissions.some((p) =>
                value.includes(p.key)
              );
              
              return (
                <TabsTrigger
                  key={group.key}
                  value={group.key}
                  className="relative text-xs py-2"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {group.key}
                  {(isActive || hasAnyPerm) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {Object.values(PERMISSION_GROUPS).map((group) => {
          const Icon = group.icon;
          const isActive = isModuleActive(group.key);

          return (
            <TabsContent key={group.key} value={group.key} className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.label}</CardTitle>
                        <CardDescription>{group.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`module-${group.key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        เปิดทั้งหมด
                      </Label>
                      <Switch
                        id={`module-${group.key}`}
                        checked={isActive}
                        onCheckedChange={() => toggleModule(group.key)}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {group.permissions.map((perm) => {
                      const isChecked = isPermissionActive(perm.key);
                      const isDisabled = disabled || isActive;

                      return (
                        <div
                          key={perm.key}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={perm.key}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.label}
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {perm.description}
                            </p>
                          </div>
                          <Switch
                            id={perm.key}
                            checked={isChecked}
                            onCheckedChange={() => togglePermission(perm.key)}
                            disabled={isDisabled}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {isActive && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <Info className="h-4 w-4 inline mr-2" />
                        เปิดใช้สิทธิ์ทั้งหมดใน {group.label} แล้ว
                        สามารถปิดบางสิทธิ์ได้โดยปิดสวิตช์ "เปิดทั้งหมด" ก่อน
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
