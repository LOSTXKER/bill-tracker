/**
 * Default Categories for Bill Tracker
 * ระบบหมวดหมู่ 2 ขั้น: กลุ่ม (Group) → หมวดย่อย (Sub-category)
 */

export interface CategoryGroup {
  name: string;
  key: string;
  order: number;
  color: string;
  icon?: string;
  children: SubCategory[];
}

export interface SubCategory {
  name: string;
  key: string;
  order: number;
  color?: string; // ถ้าไม่ระบุจะใช้สีของ group
  icon?: string;
}

// =============================================================================
// Default Expense Categories - หมวดค่าใช้จ่ายตามมาตรฐานบัญชี (2 ขั้น)
// =============================================================================
export const DEFAULT_EXPENSE_GROUPS: CategoryGroup[] = [
  {
    name: "ต้นทุนขาย",
    key: "COST_OF_SALES",
    order: 1,
    color: "#8B4513",
    icon: "Package",
    children: [
      { name: "ซื้อสินค้า", key: "PURCHASE", order: 1 },
      { name: "วัตถุดิบ", key: "MATERIAL", order: 2 },
      { name: "ค่าแรงงาน (ผลิต)", key: "LABOR_PRODUCTION", order: 3 },
      { name: "ค่าโสหุ้ยการผลิต", key: "OVERHEAD", order: 4 },
    ],
  },
  {
    name: "ค่าใช้จ่ายในการขาย",
    key: "SELLING_EXPENSE",
    order: 2,
    color: "#FF69B4",
    icon: "Megaphone",
    children: [
      { name: "ค่าโฆษณา", key: "ADVERTISING", order: 1 },
      { name: "ค่าส่งเสริมการขาย", key: "PROMOTION", order: 2 },
      { name: "ค่าขนส่ง", key: "TRANSPORT", order: 3 },
      { name: "ค่าคอมมิชชั่น", key: "COMMISSION", order: 4 },
    ],
  },
  {
    name: "ค่าใช้จ่ายในการบริหาร",
    key: "ADMIN_EXPENSE",
    order: 3,
    color: "#4169E1",
    icon: "Building",
    children: [
      { name: "เงินเดือน/ค่าจ้าง", key: "SALARY", order: 1 },
      { name: "ค่าเช่าสำนักงาน", key: "RENT", order: 2 },
      { name: "ค่าสาธารณูปโภค", key: "UTILITY", order: 3 },
      { name: "ค่าใช้จ่ายสำนักงาน", key: "OFFICE", order: 4 },
      { name: "ค่าซ่อมแซม/บำรุงรักษา", key: "MAINTENANCE", order: 5 },
      { name: "ค่าที่ปรึกษา/วิชาชีพ", key: "PROFESSIONAL", order: 6 },
      { name: "ค่าประกันภัย", key: "INSURANCE", order: 7 },
      { name: "ค่าเสื่อมราคา", key: "DEPRECIATION", order: 8 },
    ],
  },
  {
    name: "ค่าใช้จ่ายทางการเงิน",
    key: "FINANCE_EXPENSE",
    order: 4,
    color: "#800000",
    icon: "CreditCard",
    children: [
      { name: "ดอกเบี้ยจ่าย", key: "INTEREST_EXPENSE", order: 1 },
      { name: "ค่าธรรมเนียมธนาคาร", key: "BANK_FEE", order: 2 },
    ],
  },
  {
    name: "ค่าใช้จ่ายอื่น",
    key: "OTHER_EXPENSE",
    order: 99,
    color: "#808080",
    icon: "MoreHorizontal",
    children: [
      { name: "ค่าใช้จ่ายเบ็ดเตล็ด", key: "MISCELLANEOUS", order: 1 },
    ],
  },
];

// =============================================================================
// Default Income Categories - หมวดรายได้ตามมาตรฐานบัญชี (2 ขั้น)
// =============================================================================
export const DEFAULT_INCOME_GROUPS: CategoryGroup[] = [
  {
    name: "รายได้จากการดำเนินงาน",
    key: "OPERATING_INCOME",
    order: 1,
    color: "#32CD32",
    icon: "TrendingUp",
    children: [
      { name: "รายได้จากการขาย", key: "SALES", order: 1 },
      { name: "รายได้จากการให้บริการ", key: "SERVICE", order: 2 },
      { name: "รายได้ค่าจ้างผลิต", key: "MANUFACTURING", order: 3 },
    ],
  },
  {
    name: "รายได้อื่น",
    key: "OTHER_INCOME",
    order: 2,
    color: "#FFD700",
    icon: "Star",
    children: [
      { name: "ดอกเบี้ยรับ", key: "INTEREST_INCOME", order: 1 },
      { name: "กำไรจากการขายสินทรัพย์", key: "ASSET_GAIN", order: 2 },
      { name: "รายได้ค่าเช่า", key: "RENTAL_INCOME", order: 3 },
      { name: "รายได้เบ็ดเตล็ด", key: "MISCELLANEOUS", order: 4 },
    ],
  },
];

// =============================================================================
// Helper functions
// =============================================================================

// นับจำนวน categories ทั้งหมด (รวม groups และ children)
export function countCategories(groups: CategoryGroup[]): number {
  return groups.reduce((total, group) => total + 1 + group.children.length, 0);
}

// Flatten categories สำหรับ backward compatibility
export interface FlatCategory {
  name: string;
  key: string;
  order: number;
  color: string;
  icon?: string;
  parentKey?: string; // key ของ parent group
  isGroup: boolean;
}

export function flattenCategories(groups: CategoryGroup[]): FlatCategory[] {
  const result: FlatCategory[] = [];
  let globalOrder = 0;

  for (const group of groups) {
    // Add group
    result.push({
      name: group.name,
      key: group.key,
      order: globalOrder++,
      color: group.color,
      icon: group.icon,
      isGroup: true,
    });

    // Add children
    for (const child of group.children) {
      result.push({
        name: child.name,
        key: child.key,
        order: globalOrder++,
        color: child.color || group.color,
        icon: child.icon,
        parentKey: group.key,
        isGroup: false,
      });
    }
  }

  return result;
}

// Legacy exports for backward compatibility
export const DEFAULT_EXPENSE_CATEGORIES = flattenCategories(DEFAULT_EXPENSE_GROUPS);
export const DEFAULT_INCOME_CATEGORIES = flattenCategories(DEFAULT_INCOME_GROUPS);

// Summary
export const CATEGORY_SUMMARY = {
  expense: {
    groupCount: DEFAULT_EXPENSE_GROUPS.length,
    totalCount: countCategories(DEFAULT_EXPENSE_GROUPS),
    groups: DEFAULT_EXPENSE_GROUPS.map(g => g.name),
  },
  income: {
    groupCount: DEFAULT_INCOME_GROUPS.length,
    totalCount: countCategories(DEFAULT_INCOME_GROUPS),
    groups: DEFAULT_INCOME_GROUPS.map(g => g.name),
  },
};
