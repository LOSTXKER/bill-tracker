import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import type { PermissionKey } from "@/lib/permissions/checker";

/**
 * Get the current session (server-side)
 */
export async function getSession() {
  return await auth();
}

/**
 * Get the current user (server-side)
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require authentication, redirect to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session.user;
}

/**
 * Require a specific role, redirect to home if not authorized
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }
  
  return user;
}

/**
 * Get user's company access
 */
export async function getUserCompanyAccess(userId: string, companyId: string) {
  const accessRaw = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    include: {
      Company: true,
    },
  });
  return accessRaw ? { ...accessRaw, company: accessRaw.Company } : null;
}

/**
 * Get all companies user has access to
 */
export async function getUserCompanies(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      CompanyAccess: {
        include: {
          Company: true,
        },
      },
    },
  });

  if (!user) return [];

  // ADMIN can access all companies
  if (user.role === "ADMIN") {
    return await prisma.company.findMany({
      orderBy: { name: "asc" },
    });
  }

  return user.CompanyAccess.map((c) => ({
    ...c.Company,
    access: c,
    isOwner: c.isOwner,
    permissions: c.permissions,
  }));
}

/**
 * Check if user can access a specific company
 */
export async function canAccessCompany(userId: string, companyId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // ADMIN can access all companies
  if (user.role === "ADMIN") return true;

  const access = await getUserCompanyAccess(userId, companyId);
  return access !== null;
}

/**
 * Require access to a specific company
 */
export async function requireCompanyAccess(companyId: string) {
  const user = await requireAuth();
  
  const hasAccess = await canAccessCompany(user.id, companyId);
  
  if (!hasAccess) {
    redirect("/");
  }

  const access = await getUserCompanyAccess(user.id, companyId);
  
  return {
    user,
    isOwner: access?.isOwner ?? false,
    permissions: (access?.permissions as string[]) ?? [],
  };
}

/**
 * Check if user can perform an action on a company
 */
export async function checkPermission(
  userId: string,
  companyId: string,
  permission: PermissionKey
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // ADMIN can do anything
  if (user.role === "ADMIN") return true;

  const access = await getUserCompanyAccess(userId, companyId);
  
  if (!access) return false;
  
  // Owner has all permissions
  if (access.isOwner) return true;
  
  const permissions = (access.permissions as string[]) || [];
  
  // Check exact match
  if (permissions.includes(permission)) return true;
  
  // Check module wildcard
  const [module] = permission.split(":");
  if (permissions.includes(`${module}:*`)) return true;
  
  return false;
}

/**
 * Require a specific permission
 */
export async function requirePermission(companyId: string, permission: PermissionKey) {
  const user = await requireAuth();
  
  const allowed = await checkPermission(user.id, companyId, permission);
  
  if (!allowed) {
    redirect("/");
  }
  
  return user;
}

/**
 * Check if user is owner of a company
 */
export async function isCompanyOwner(
  userId: string,
  companyId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // ADMIN is treated as owner for any company
  if (user.role === "ADMIN") return true;

  const access = await getUserCompanyAccess(userId, companyId);
  return access?.isOwner ?? false;
}

// Re-export PermissionKey type for convenience
export type { PermissionKey } from "@/lib/permissions/checker";
