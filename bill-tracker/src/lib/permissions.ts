import { UserRole, CompanyRole } from "@prisma/client";

// Permission types
export type Permission =
  | "company:create"
  | "company:read"
  | "company:update"
  | "company:delete"
  | "expense:create"
  | "expense:read"
  | "expense:update"
  | "expense:delete"
  | "expense:approve"
  | "income:create"
  | "income:read"
  | "income:update"
  | "income:delete"
  | "vendor:create"
  | "vendor:read"
  | "vendor:update"
  | "vendor:delete"
  | "customer:create"
  | "customer:read"
  | "customer:update"
  | "customer:delete"
  | "budget:create"
  | "budget:read"
  | "budget:update"
  | "budget:delete"
  | "report:read"
  | "report:export"
  | "user:create"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "audit:read";

// System-level role permissions (UserRole)
const USER_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "company:create",
    "company:read",
    "company:update",
    "company:delete",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:delete",
    "expense:approve",
    "income:create",
    "income:read",
    "income:update",
    "income:delete",
    "vendor:create",
    "vendor:read",
    "vendor:update",
    "vendor:delete",
    "customer:create",
    "customer:read",
    "customer:update",
    "customer:delete",
    "budget:create",
    "budget:read",
    "budget:update",
    "budget:delete",
    "report:read",
    "report:export",
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "audit:read",
  ],
  ACCOUNTANT: [
    "company:read",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:approve",
    "income:create",
    "income:read",
    "income:update",
    "vendor:create",
    "vendor:read",
    "vendor:update",
    "customer:create",
    "customer:read",
    "customer:update",
    "budget:read",
    "report:read",
    "report:export",
    "user:read",
  ],
  STAFF: [
    "company:read",
    "expense:create",
    "expense:read",
    "income:create",
    "income:read",
    "vendor:read",
    "customer:read",
    "budget:read",
    "report:read",
  ],
  VIEWER: [
    "company:read",
    "expense:read",
    "income:read",
    "vendor:read",
    "customer:read",
    "budget:read",
    "report:read",
  ],
};

// Company-level role permissions (CompanyRole)
const COMPANY_ROLE_PERMISSIONS: Record<CompanyRole, Permission[]> = {
  OWNER: [
    "company:read",
    "company:update",
    "company:delete",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:delete",
    "expense:approve",
    "income:create",
    "income:read",
    "income:update",
    "income:delete",
    "vendor:create",
    "vendor:read",
    "vendor:update",
    "vendor:delete",
    "customer:create",
    "customer:read",
    "customer:update",
    "customer:delete",
    "budget:create",
    "budget:read",
    "budget:update",
    "budget:delete",
    "report:read",
    "report:export",
    "audit:read",
  ],
  MANAGER: [
    "company:read",
    "company:update",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:approve",
    "income:create",
    "income:read",
    "income:update",
    "vendor:create",
    "vendor:read",
    "vendor:update",
    "customer:create",
    "customer:read",
    "customer:update",
    "budget:create",
    "budget:read",
    "budget:update",
    "report:read",
    "report:export",
    "audit:read",
  ],
  ACCOUNTANT: [
    "company:read",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:approve",
    "income:create",
    "income:read",
    "income:update",
    "vendor:create",
    "vendor:read",
    "vendor:update",
    "customer:create",
    "customer:read",
    "customer:update",
    "budget:read",
    "report:read",
    "report:export",
  ],
  VIEWER: [
    "company:read",
    "expense:read",
    "income:read",
    "vendor:read",
    "customer:read",
    "budget:read",
    "report:read",
  ],
};

/**
 * Check if a user role has a specific permission
 */
export function hasUserRolePermission(
  role: UserRole,
  permission: Permission
): boolean {
  return USER_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a company role has a specific permission
 */
export function hasCompanyRolePermission(
  role: CompanyRole,
  permission: Permission
): boolean {
  return COMPANY_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a user role
 */
export function getUserRolePermissions(role: UserRole): Permission[] {
  return USER_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get all permissions for a company role
 */
export function getCompanyRolePermissions(role: CompanyRole): Permission[] {
  return COMPANY_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if user can perform action based on both user role and company role
 * User role takes precedence (ADMIN can do anything)
 */
export function canPerformAction(
  userRole: UserRole,
  companyRole: CompanyRole | null,
  permission: Permission
): boolean {
  // ADMIN can do anything
  if (userRole === "ADMIN") {
    return true;
  }

  // Check user role first
  if (hasUserRolePermission(userRole, permission)) {
    return true;
  }

  // Then check company role if available
  if (companyRole && hasCompanyRolePermission(companyRole, permission)) {
    return true;
  }

  return false;
}

/**
 * Check if user can access a specific company
 */
export function canAccessCompany(
  userRole: UserRole,
  companyAccess: { role: CompanyRole } | null
): boolean {
  // ADMIN can access all companies
  if (userRole === "ADMIN") {
    return true;
  }

  // Must have company access
  return companyAccess !== null;
}

/**
 * Get the effective permissions for a user in a company context
 */
export function getEffectivePermissions(
  userRole: UserRole,
  companyRole: CompanyRole | null
): Permission[] {
  const userPermissions = new Set(getUserRolePermissions(userRole));
  
  if (companyRole) {
    const companyPermissions = getCompanyRolePermissions(companyRole);
    companyPermissions.forEach(p => userPermissions.add(p));
  }

  return Array.from(userPermissions);
}

// Role hierarchy for comparison
const USER_ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  ACCOUNTANT: 50,
  STAFF: 25,
  VIEWER: 10,
};

const COMPANY_ROLE_HIERARCHY: Record<CompanyRole, number> = {
  OWNER: 100,
  MANAGER: 75,
  ACCOUNTANT: 50,
  VIEWER: 10,
};

/**
 * Check if role A is higher or equal to role B
 */
export function isUserRoleHigherOrEqual(roleA: UserRole, roleB: UserRole): boolean {
  return USER_ROLE_HIERARCHY[roleA] >= USER_ROLE_HIERARCHY[roleB];
}

export function isCompanyRoleHigherOrEqual(roleA: CompanyRole, roleB: CompanyRole): boolean {
  return COMPANY_ROLE_HIERARCHY[roleA] >= COMPANY_ROLE_HIERARCHY[roleB];
}
