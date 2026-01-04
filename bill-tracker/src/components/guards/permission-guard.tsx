"use client";

/**
 * Permission Guard Component
 * 
 * Conditionally renders children based on user permissions
 * Use this to show/hide UI elements based on what the user can do
 */

import { usePermissions } from "@/components/providers/permission-provider";

interface PermissionGuardProps {
  /** The permission required to render children */
  permission?: string;
  
  /** Array of permissions - user needs at least ONE */
  anyOf?: string[];
  
  /** Array of permissions - user needs ALL of them */
  allOf?: string[];
  
  /** Only render for OWNER */
  ownerOnly?: boolean;
  
  /** What to render if permission is denied */
  fallback?: React.ReactNode;
  
  /** Children to render if permission is granted */
  children: React.ReactNode;
}

/**
 * Permission Guard Component
 * 
 * @example
 * ```tsx
 * // Single permission check
 * <PermissionGuard permission="expenses:create">
 *   <Button>เพิ่มรายจ่าย</Button>
 * </PermissionGuard>
 * 
 * // Multiple permissions (needs ANY)
 * <PermissionGuard anyOf={["expenses:update", "expenses:delete"]}>
 *   <ActionMenu />
 * </PermissionGuard>
 * 
 * // Multiple permissions (needs ALL)
 * <PermissionGuard allOf={["expenses:approve", "expenses:update"]}>
 *   <ApproveButton />
 * </PermissionGuard>
 * 
 * // Owner only
 * <PermissionGuard ownerOnly>
 *   <DangerZone />
 * </PermissionGuard>
 * 
 * // With fallback
 * <PermissionGuard 
 *   permission="expenses:delete" 
 *   fallback={<DisabledButton />}
 * >
 *   <DeleteButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  ownerOnly,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isOwner } =
    usePermissions();

  // Check owner-only access
  if (ownerOnly) {
    return isOwner ? <>{children}</> : fallback;
  }

  // Check single permission
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : fallback;
  }

  // Check any of permissions
  if (anyOf && anyOf.length > 0) {
    return hasAnyPermission(anyOf) ? <>{children}</> : fallback;
  }

  // Check all of permissions
  if (allOf && allOf.length > 0) {
    return hasAllPermissions(allOf) ? <>{children}</> : fallback;
  }

  // If no permission specified, render children
  return <>{children}</>;
}

/**
 * Hook-based permission guard for conditional logic in components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const canDelete = usePermissionCheck("expenses:delete");
 *   
 *   const handleClick = () => {
 *     if (!canDelete) {
 *       toast.error("คุณไม่มีสิทธิ์ลบรายจ่าย");
 *       return;
 *     }
 *     // ... delete logic
 *   };
 * }
 * ```
 */
export function usePermissionCheck(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to check if user is owner
 */
export function useIsOwner(): boolean {
  const { isOwner } = usePermissions();
  return isOwner;
}
