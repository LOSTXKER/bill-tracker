/**
 * Permission Checker Utility
 * 
 * Provides functions to check if a user has specific permissions
 * in a company, with support for wildcard module permissions.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";

/**
 * Type representing a permission key
 * Format: "module:action" (e.g., "expenses:create", "incomes:read")
 */
export type PermissionKey = string;

/**
 * Check if a user has a specific permission in a company
 * 
 * @param userId - The user ID to check
 * @param companyId - The company ID to check against
 * @param permission - The permission to check (e.g., "expenses:create", "incomes:read")
 * @returns true if user has permission, false otherwise
 * 
 * @example
 * ```ts
 * const canCreate = await hasPermission(userId, companyId, "expenses:create");
 * ```
 */
export async function hasPermission(
  userId: string,
  companyId: string,
  permission: string
): Promise<boolean> {
  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!access) return false;

  // OWNER has all permissions
  if (access.isOwner) return true;

  const permissions = (access.permissions as string[]) || [];

  // Check exact match
  if (permissions.includes(permission)) return true;

  // Check module wildcard (e.g., "expenses:*" covers "expenses:create")
  const [module] = permission.split(":");
  if (permissions.includes(`${module}:*`)) return true;

  return false;
}

/**
 * Check multiple permissions at once
 * 
 * @param userId - The user ID to check
 * @param companyId - The company ID to check against
 * @param permissions - Array of permissions to check
 * @returns Object with permission as key and boolean as value
 * 
 * @example
 * ```ts
 * const perms = await hasPermissions(userId, companyId, [
 *   "expenses:create",
 *   "expenses:delete"
 * ]);
 * // { "expenses:create": true, "expenses:delete": false }
 * ```
 */
export async function hasPermissions(
  userId: string,
  companyId: string,
  permissions: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const permission of permissions) {
    results[permission] = await hasPermission(userId, companyId, permission);
  }
  
  return results;
}

/**
 * Check if user has ANY of the provided permissions
 * 
 * @param userId - The user ID to check
 * @param companyId - The company ID to check against
 * @param permissions - Array of permissions to check
 * @returns true if user has at least one permission
 */
export async function hasAnyPermission(
  userId: string,
  companyId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, companyId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has ALL of the provided permissions
 * 
 * @param userId - The user ID to check
 * @param companyId - The company ID to check against
 * @param permissions - Array of permissions to check
 * @returns true if user has all permissions
 */
export async function hasAllPermissions(
  userId: string,
  companyId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, companyId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Require that the current user has a specific permission
 * Redirects to home page if permission is denied
 * 
 * @param companyId - The company ID to check against
 * @param permission - The permission required
 * @returns The authenticated user
 * @throws Redirects to / if permission denied or not authenticated
 * 
 * @example
 * ```ts
 * // In a server component or API route
 * const user = await requirePermission(companyId, "expenses:create");
 * ```
 */
export async function requirePermission(
  companyId: string,
  permission: string
): Promise<User> {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const hasAccess = await hasPermission(session.user.id, companyId, permission);
  
  if (!hasAccess) {
    redirect("/");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }
  
  return user;
}

/**
 * Require that the current user has ANY of the provided permissions
 * 
 * @param companyId - The company ID to check against
 * @param permissions - Array of permissions (user needs at least one)
 * @returns The authenticated user
 */
export async function requireAnyPermission(
  companyId: string,
  permissions: string[]
): Promise<User> {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const hasAccess = await hasAnyPermission(session.user.id, companyId, permissions);
  
  if (!hasAccess) {
    redirect("/");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }
  
  return user;
}

/**
 * Require that the current user is an OWNER of the company
 * 
 * @param companyId - The company ID to check against
 * @returns The authenticated user
 */
export async function requireOwner(companyId: string): Promise<User> {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId,
      },
    },
  });

  if (!access || !access.isOwner) {
    redirect("/");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }
  
  return user;
}

/**
 * Get all permissions for a user in a company
 * 
 * @param userId - The user ID
 * @param companyId - The company ID
 * @returns Object with isOwner flag and permissions array
 */
export async function getUserPermissions(
  userId: string,
  companyId: string
): Promise<{ isOwner: boolean; permissions: string[] }> {
  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!access) {
    return { isOwner: false, permissions: [] };
  }

  return {
    isOwner: access.isOwner,
    permissions: access.permissions as string[],
  };
}

/**
 * Check if user has access to a company (any permissions at all)
 * 
 * @param userId - The user ID
 * @param companyId - The company ID
 * @returns true if user has any access to the company
 */
export async function hasCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  const access = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  return !!access;
}
