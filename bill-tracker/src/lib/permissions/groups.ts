/**
 * Permission Groups Definition
 * 
 * Defines all available permissions grouped by module
 * for use in the Permission Builder UI
 */

import {
  Receipt,
  TrendingUp,
  Users as UsersIcon,
  FileText,
  Settings,
  History,
  Wallet,
  MessageSquare,
  Banknote,
  Calculator,
  UserCircle,
  Shield,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// Role Presets - ชุดสิทธิ์สำเร็จรูป
// =============================================================================

export interface RolePreset {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    key: "accountant",
    label: "บัญชี",
    description: "สร้างรายการ (รออนุมัติ), ดูรายการทั้งหมด, เปลี่ยนสถานะเอกสาร, ส่งออกรายงาน, จัดการโอนคืน",
    icon: Calculator,
    permissions: [
      // Expenses - ดู, สร้างร่าง (ต้องรออนุมัติ), เปลี่ยนสถานะ
      "expenses:read",
      "expenses:create",
      "expenses:change-status",
      // Incomes - ดู, สร้างร่าง (ต้องรออนุมัติ), เปลี่ยนสถานะ
      "incomes:read",
      "incomes:create",
      "incomes:change-status",
      // Contacts - ดูและสร้าง
      "contacts:read",
      "contacts:create",
      // Reports - ดูและส่งออก
      "reports:read",
      "reports:export",
      // Reimbursements - จ่ายเงินคืน
      "reimbursements:read",
      "reimbursements:pay",
      // Settlements - จัดการโอนคืน
      "settlements:read",
      "settlements:manage",
      // Comments
      "comments:read",
      "comments:create",
      // Audit logs
      "audit:read",
    ],
  },
  {
    key: "employee",
    label: "พนักงาน",
    description: "สร้างรายจ่าย/รายรับ (รออนุมัติ), ส่งเบิกจ่าย, ดูรายการของตัวเอง",
    icon: UserCircle,
    permissions: [
      // Expenses - สร้างร่าง (ต้องรออนุมัติ)
      "expenses:read",
      "expenses:create",
      // Incomes - สร้างร่าง (ต้องรออนุมัติ)
      "incomes:read",
      "incomes:create",
      // Contacts - ดูและสร้าง
      "contacts:read",
      "contacts:create",
      // Reimbursements - ส่งคำขอเบิก
      "reimbursements:read",
      "reimbursements:create",
      // Comments
      "comments:read",
      "comments:create",
      "comments:delete",
    ],
  },
  {
    key: "manager",
    label: "ผู้จัดการ",
    description: "สิทธิ์เกือบทั้งหมด ยกเว้นจัดการทีมและลบข้อมูล",
    icon: Shield,
    permissions: [
      // Expenses - ทั้งหมดยกเว้นลบ
      "expenses:read",
      "expenses:create",
      "expenses:create-direct",
      "expenses:update",
      "expenses:approve",
      "expenses:mark-paid",
      "expenses:change-status",
      // Incomes - ทั้งหมดยกเว้นลบ
      "incomes:read",
      "incomes:create",
      "incomes:create-direct",
      "incomes:update",
      "incomes:approve",
      "incomes:mark-received",
      "incomes:change-status",
      // Contacts - ทั้งหมดยกเว้นลบ
      "contacts:read",
      "contacts:create",
      "contacts:update",
      // Reports
      "reports:read",
      "reports:export",
      // Settings - ดูอย่างเดียว
      "settings:read",
      // Reimbursements - อนุมัติได้
      "reimbursements:read",
      "reimbursements:create",
      "reimbursements:approve",
      // Settlements
      "settlements:read",
      "settlements:manage",
      // Comments
      "comments:read",
      "comments:create",
      "comments:delete",
      "comments:delete-all",
      // Audit
      "audit:read",
    ],
  },
];

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  expenses: {
    key: "expenses",
    label: "รายจ่าย (Expenses)",
    description: "จัดการค่าใช้จ่ายและใบเสร็จ",
    icon: Receipt,
    permissions: [
      {
        key: "expenses:read",
        label: "ดูรายการ",
        description: "เข้าถึงหน้ารายจ่ายและดูข้อมูล",
      },
      {
        key: "expenses:create",
        label: "สร้างร่าง",
        description: "สร้างรายจ่ายใหม่เป็นร่าง (รอส่งอนุมัติ)",
      },
      {
        key: "expenses:create-direct",
        label: "สร้างโดยตรง",
        description: "สร้างรายจ่ายและกดจ่ายได้เลยโดยไม่ต้องรออนุมัติ",
      },
      {
        key: "expenses:update",
        label: "แก้ไข",
        description: "แก้ไขรายจ่ายที่มีอยู่",
      },
      {
        key: "expenses:delete",
        label: "ลบ",
        description: "ลบรายจ่ายออกจากระบบ (ระมัดระวัง!)",
      },
      {
        key: "expenses:approve",
        label: "อนุมัติ",
        description: "อนุมัติรายจ่ายที่รออนุมัติ",
      },
      {
        key: "expenses:mark-paid",
        label: "บันทึกจ่ายแล้ว",
        description: "กดยืนยันว่าจ่ายแล้ว (หลังอนุมัติ)",
      },
      {
        key: "expenses:change-status",
        label: "เปลี่ยนสถานะเอกสาร",
        description: "เปลี่ยนสถานะเอกสาร (รอเอกสาร, ส่งบัญชีแล้ว, ฯลฯ)",
      },
    ],
  },
  incomes: {
    key: "incomes",
    label: "รายรับ (Incomes)",
    description: "จัดการรายรับและใบแจ้งหนี้",
    icon: TrendingUp,
    permissions: [
      {
        key: "incomes:read",
        label: "ดูรายการ",
        description: "เข้าถึงหน้ารายรับและดูข้อมูล",
      },
      {
        key: "incomes:create",
        label: "สร้างร่าง",
        description: "สร้างรายรับใหม่เป็นร่าง (รอส่งอนุมัติ)",
      },
      {
        key: "incomes:create-direct",
        label: "สร้างโดยตรง",
        description: "สร้างรายรับและกดรับเงินได้เลยโดยไม่ต้องรออนุมัติ",
      },
      {
        key: "incomes:update",
        label: "แก้ไข",
        description: "แก้ไขรายรับที่มีอยู่",
      },
      {
        key: "incomes:delete",
        label: "ลบ",
        description: "ลบรายรับออกจากระบบ (ระมัดระวัง!)",
      },
      {
        key: "incomes:approve",
        label: "อนุมัติ",
        description: "อนุมัติรายรับที่รออนุมัติ",
      },
      {
        key: "incomes:mark-received",
        label: "บันทึกรับเงินแล้ว",
        description: "กดยืนยันว่ารับเงินแล้ว (หลังอนุมัติ)",
      },
      {
        key: "incomes:change-status",
        label: "เปลี่ยนสถานะเอกสาร",
        description: "เปลี่ยนสถานะเอกสาร (รอออกบิล, ส่งสำเนาแล้ว, ฯลฯ)",
      },
    ],
  },
  contacts: {
    key: "contacts",
    label: "ผู้ติดต่อ (Contacts)",
    description: "จัดการข้อมูลลูกค้าและผู้ขาย",
    icon: UsersIcon,
    permissions: [
      {
        key: "contacts:read",
        label: "ดูรายการ",
        description: "ดูข้อมูลผู้ติดต่อ",
      },
      {
        key: "contacts:create",
        label: "สร้างใหม่",
        description: "เพิ่มผู้ติดต่อใหม่",
      },
      {
        key: "contacts:update",
        label: "แก้ไข",
        description: "แก้ไขข้อมูลผู้ติดต่อ",
      },
      {
        key: "contacts:delete",
        label: "ลบ",
        description: "ลบผู้ติดต่อออกจากระบบ",
      },
    ],
  },
  reports: {
    key: "reports",
    label: "รายงาน (Reports)",
    description: "ดูและส่งออกรายงาน",
    icon: FileText,
    permissions: [
      {
        key: "reports:read",
        label: "ดูรายงาน",
        description: "เข้าถึงหน้ารายงานและดูข้อมูล",
      },
      {
        key: "reports:export",
        label: "ส่งออกข้อมูล",
        description: "ส่งออกรายงานเป็น Excel/PDF",
      },
    ],
  },
  settings: {
    key: "settings",
    label: "การตั้งค่า (Settings)",
    description: "จัดการการตั้งค่าบริษัท",
    icon: Settings,
    permissions: [
      {
        key: "settings:read",
        label: "ดูการตั้งค่า",
        description: "เข้าถึงหน้าการตั้งค่า",
      },
      {
        key: "settings:update",
        label: "แก้ไขการตั้งค่า",
        description: "แก้ไขการตั้งค่าบริษัท (ชื่อ, ที่อยู่, ฯลฯ)",
      },
      {
        key: "settings:manage-team",
        label: "จัดการทีม",
        description: "เชิญ/ลบสมาชิก และจัดการสิทธิ์ (เฉพาะ OWNER)",
      },
    ],
  },
  audit: {
    key: "audit",
    label: "บันทึกระบบ (Audit Logs)",
    description: "ดูประวัติการกระทำทั้งหมดในระบบ",
    icon: History,
    permissions: [
      {
        key: "audit:read",
        label: "ดูบันทึก",
        description: "ดูบันทึกระบบทั้งหมด (Audit Log)",
      },
    ],
  },
  reimbursements: {
    key: "reimbursements",
    label: "เบิกจ่ายพนักงาน (Reimbursements)",
    description: "จัดการคำขอเบิกจ่ายจากพนักงาน",
    icon: Wallet,
    permissions: [
      {
        key: "reimbursements:read",
        label: "ดูรายการ",
        description: "ดูรายการเบิกจ่ายทั้งหมด",
      },
      {
        key: "reimbursements:create",
        label: "ส่งคำขอ",
        description: "ส่งคำขอเบิกจ่ายใหม่",
      },
      {
        key: "reimbursements:approve",
        label: "อนุมัติ",
        description: "อนุมัติหรือปฏิเสธคำขอเบิกจ่าย (สำหรับผู้จัดการ)",
      },
      {
        key: "reimbursements:pay",
        label: "จ่ายเงิน",
        description: "บันทึกการจ่ายเงินคืน (สำหรับบัญชี)",
      },
    ],
  },
  settlements: {
    key: "settlements",
    label: "การโอนคืนเงิน (Settlements)",
    description: "จัดการการโอนเงินคืนพนักงาน",
    icon: Banknote,
    permissions: [
      {
        key: "settlements:read",
        label: "ดูรายการ",
        description: "ดูรายการที่รอโอนคืน",
      },
      {
        key: "settlements:manage",
        label: "จัดการการโอน",
        description: "บันทึกการโอนเงินคืนพนักงาน",
      },
    ],
  },
  comments: {
    key: "comments",
    label: "ความคิดเห็น (Comments)",
    description: "จัดการความคิดเห็นในเอกสาร",
    icon: MessageSquare,
    permissions: [
      {
        key: "comments:read",
        label: "ดูความคิดเห็น",
        description: "ดูความคิดเห็นในเอกสาร",
      },
      {
        key: "comments:create",
        label: "เพิ่มความคิดเห็น",
        description: "เพิ่มความคิดเห็นใหม่",
      },
      {
        key: "comments:delete",
        label: "ลบความคิดเห็น",
        description: "ลบความคิดเห็นของตัวเอง",
      },
      {
        key: "comments:delete-all",
        label: "ลบความคิดเห็นทั้งหมด",
        description: "ลบความคิดเห็นของทุกคน (สำหรับผู้จัดการ)",
      },
    ],
  },
};

/**
 * Get all permission keys as a flat array
 */
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  
  Object.values(PERMISSION_GROUPS).forEach((group) => {
    group.permissions.forEach((perm) => {
      keys.push(perm.key);
    });
  });
  
  return keys;
}

/**
 * Get module wildcard permissions
 */
export function getModuleWildcards(): string[] {
  return Object.keys(PERMISSION_GROUPS).map((key) => `${key}:*`);
}

/**
 * Check if a permission is a module wildcard
 */
export function isModuleWildcard(permission: string): boolean {
  return permission.endsWith(":*");
}

/**
 * Get the module from a permission key
 */
export function getModuleFromPermission(permission: string): string | null {
  const [module] = permission.split(":");
  return module || null;
}

/**
 * Get permissions for a specific module
 */
export function getModulePermissions(module: string): PermissionItem[] {
  return PERMISSION_GROUPS[module]?.permissions || [];
}

/**
 * Expand wildcard permissions to full permission list
 */
export function expandWildcardPermissions(permissions: string[]): string[] {
  const expanded = new Set<string>();
  
  permissions.forEach((perm) => {
    if (isModuleWildcard(perm)) {
      const module = perm.replace(":*", "");
      const modulePerms = getModulePermissions(module);
      modulePerms.forEach((p) => expanded.add(p.key));
    } else {
      expanded.add(perm);
    }
  });
  
  return Array.from(expanded);
}

/**
 * Optimize permissions by converting to wildcards where possible
 */
export function optimizePermissions(permissions: string[]): string[] {
  const optimized = new Set<string>();
  const moduleGroups = new Map<string, string[]>();
  
  // Group permissions by module
  permissions.forEach((perm) => {
    const module = getModuleFromPermission(perm);
    if (!module) return;
    
    if (!moduleGroups.has(module)) {
      moduleGroups.set(module, []);
    }
    moduleGroups.get(module)!.push(perm);
  });
  
  // Check if each module has all permissions
  moduleGroups.forEach((perms, module) => {
    const allModulePerms = getModulePermissions(module);
    
    if (perms.length === allModulePerms.length) {
      // Has all permissions, use wildcard
      optimized.add(`${module}:*`);
    } else {
      // Only has some permissions, keep them individual
      perms.forEach((p) => optimized.add(p));
    }
  });
  
  return Array.from(optimized);
}
