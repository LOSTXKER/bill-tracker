"use client";

/**
 * Permission Provider
 * 
 * Provides permission context to client components
 * allowing them to check permissions without server calls
 */

import { createContext, useContext, useCallback, useMemo } from "react";

interface PermissionContextValue {
  permissions: string[];
  isOwner: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  isOwner: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
});

interface PermissionProviderProps {
  children: React.ReactNode;
  permissions: string[];
  isOwner: boolean;
}

export function PermissionProvider({
  children,
  permissions,
  isOwner,
}: PermissionProviderProps) {
  /**
   * Check if user has a specific permission
   * Supports wildcard module permissions (e.g., "expenses:*")
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // OWNER has all permissions
      if (isOwner) return true;

      // Check exact match
      if (permissions.includes(permission)) return true;

      // Check module wildcard (e.g., "expenses:*" covers "expenses:create")
      const [module] = permission.split(":");
      if (permissions.includes(`${module}:*`)) return true;

      return false;
    },
    [permissions, isOwner]
  );

  /**
   * Check if user has ANY of the provided permissions
   */
  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      if (isOwner) return true;
      return perms.some((perm) => hasPermission(perm));
    },
    [hasPermission, isOwner]
  );

  /**
   * Check if user has ALL of the provided permissions
   */
  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      if (isOwner) return true;
      return perms.every((perm) => hasPermission(perm));
    },
    [hasPermission, isOwner]
  );

  const value = useMemo(
    () => ({
      permissions,
      isOwner,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [permissions, isOwner, hasPermission, hasAnyPermission, hasAllPermissions]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permission context
 * 
 * @example
 * ```tsx
 * const { hasPermission, isOwner } = usePermissions();
 * 
 * if (hasPermission("expenses:delete")) {
 *   // Show delete button
 * }
 * ```
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  
  return context;
}
