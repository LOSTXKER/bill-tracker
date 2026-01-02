import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { UserRole, CompanyRole } from "@prisma/client";
import { canPerformAction, type Permission } from "./permissions";

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
  return await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    include: {
      company: true,
    },
  });
}

/**
 * Get all companies user has access to
 */
export async function getUserCompanies(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companies: {
        include: {
          company: true,
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

  return user.companies.map((c: typeof user.companies[number]) => ({
    ...c.company,
    access: c,
    role: c.role,
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
    companyRole: access?.role ?? null,
  };
}

/**
 * Check if user can perform an action on a company
 */
export async function checkPermission(
  userId: string,
  companyId: string,
  permission: Permission
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // ADMIN can do anything
  if (user.role === "ADMIN") return true;

  const access = await getUserCompanyAccess(userId, companyId);
  
  return canPerformAction(user.role, access?.role ?? null, permission);
}

/**
 * Require a specific permission
 */
export async function requirePermission(companyId: string, permission: Permission) {
  const user = await requireAuth();
  
  const hasPermission = await checkPermission(user.id, companyId, permission);
  
  if (!hasPermission) {
    redirect("/");
  }
  
  return user;
}

/**
 * Get company role for current user
 */
export async function getCompanyRole(
  userId: string,
  companyId: string
): Promise<CompanyRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  // ADMIN is treated as OWNER for any company
  if (user.role === "ADMIN") return "OWNER";

  const access = await getUserCompanyAccess(userId, companyId);
  return access?.role ?? null;
}
