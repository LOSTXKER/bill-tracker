/**
 * Default Categories for Bill Tracker
 * ครอบคลุมธุรกิจสินค้าและบริการ
 */

export interface DefaultCategory {
  name: string;
  key: string;
  order: number;
  color: string;
  icon?: string;
}

// =============================================================================
// Default Expense Categories
// =============================================================================
export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  // --- ต้นทุนสินค้า/บริการ ---
  { name: "วัตถุดิบ", key: "MATERIAL", order: 1, color: "#8B4513", icon: "Package" },
  { name: "สินค้าเพื่อขาย", key: "GOODS_FOR_SALE", order: 2, color: "#CD853F", icon: "ShoppingCart" },
  { name: "ค่าจ้างผลิต/รับเหมา", key: "SUBCONTRACT", order: 3, color: "#D2691E", icon: "Hammer" },

  // --- ค่าแรง/บุคลากร ---
  { name: "เงินเดือน/ค่าจ้าง", key: "SALARY", order: 10, color: "#4169E1", icon: "Users" },
  { name: "ค่าจ้างฟรีแลนซ์", key: "FREELANCE", order: 11, color: "#9370DB", icon: "User" },
  { name: "ค่าล่วงเวลา (OT)", key: "OVERTIME", order: 12, color: "#6A5ACD", icon: "Clock" },
  { name: "สวัสดิการพนักงาน", key: "WELFARE", order: 13, color: "#7B68EE", icon: "Heart" },
  { name: "ประกันสังคม", key: "SOCIAL_SECURITY", order: 14, color: "#483D8B", icon: "Shield" },

  // --- ค่าดำเนินงาน ---
  { name: "สาธารณูปโภค", key: "UTILITY", order: 20, color: "#FFD700", icon: "Zap" },
  { name: "ค่าเช่าสถานที่", key: "RENT", order: 21, color: "#FF8C00", icon: "Home" },
  { name: "ค่าอินเทอร์เน็ต/โทรศัพท์", key: "TELECOM", order: 22, color: "#FFA500", icon: "Wifi" },
  { name: "อุปกรณ์สำนักงาน", key: "OFFICE", order: 23, color: "#20B2AA", icon: "Briefcase" },
  { name: "ซอฟต์แวร์/บริการออนไลน์", key: "SOFTWARE", order: 24, color: "#00CED1", icon: "Monitor" },

  // --- ค่าขนส่ง/เดินทาง ---
  { name: "ค่าขนส่ง/โลจิสติกส์", key: "TRANSPORT", order: 30, color: "#32CD32", icon: "Truck" },
  { name: "ค่าเดินทาง/น้ำมัน", key: "TRAVEL", order: 31, color: "#228B22", icon: "Car" },
  { name: "ค่าจอดรถ/ทางด่วน", key: "PARKING_TOLL", order: 32, color: "#2E8B57", icon: "MapPin" },

  // --- การตลาด/ขาย ---
  { name: "การตลาด/โฆษณา", key: "MARKETING", order: 40, color: "#FF69B4", icon: "Megaphone" },
  { name: "ค่าคอมมิชชั่นขาย", key: "SALES_COMMISSION", order: 41, color: "#DB7093", icon: "Percent" },
  { name: "ค่าบรรจุภัณฑ์", key: "PACKAGING", order: 42, color: "#C71585", icon: "Box" },

  // --- ค่าที่ปรึกษา/วิชาชีพ ---
  { name: "ค่าที่ปรึกษา/วิชาชีพ", key: "PROFESSIONAL", order: 50, color: "#8A2BE2", icon: "GraduationCap" },
  { name: "ค่าบัญชี/สอบบัญชี", key: "ACCOUNTING", order: 51, color: "#9932CC", icon: "Calculator" },
  { name: "ค่าทนายความ/กฎหมาย", key: "LEGAL", order: 52, color: "#BA55D3", icon: "Scale" },

  // --- ค่าบำรุงรักษา ---
  { name: "ค่าซ่อมบำรุง", key: "MAINTENANCE", order: 60, color: "#DC143C", icon: "Wrench" },
  { name: "ค่าประกันภัย", key: "INSURANCE", order: 61, color: "#B22222", icon: "ShieldCheck" },

  // --- ค่าใช้จ่ายทางการเงิน ---
  { name: "ดอกเบี้ยจ่าย", key: "INTEREST_EXPENSE", order: 70, color: "#800000", icon: "TrendingDown" },
  { name: "ค่าธรรมเนียมธนาคาร", key: "BANK_FEE", order: 71, color: "#A52A2A", icon: "CreditCard" },
  { name: "ค่าธรรมเนียม/ภาษีอื่น", key: "TAX_FEE", order: 72, color: "#8B0000", icon: "FileText" },

  // --- อื่นๆ ---
  { name: "ค่าเลี้ยงรับรอง", key: "ENTERTAINMENT", order: 80, color: "#FF4500", icon: "Coffee" },
  { name: "เบ็ดเตล็ด", key: "MISCELLANEOUS", order: 81, color: "#696969", icon: "MoreHorizontal" },
  { name: "อื่นๆ", key: "OTHER", order: 99, color: "#808080", icon: "HelpCircle" },
];

// =============================================================================
// Default Income Categories
// =============================================================================
export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  // --- รายได้จากขาย ---
  { name: "ขายสินค้า", key: "PRODUCT_SALES", order: 1, color: "#32CD32", icon: "ShoppingCart" },
  { name: "ขายสินค้าออนไลน์", key: "ONLINE_SALES", order: 2, color: "#00FA9A", icon: "Globe" },
  { name: "ขายส่ง", key: "WHOLESALE", order: 3, color: "#3CB371", icon: "Package" },
  { name: "ขายปลีก", key: "RETAIL", order: 4, color: "#2E8B57", icon: "Store" },

  // --- รายได้จากบริการ ---
  { name: "ค่าบริการ", key: "SERVICE_INCOME", order: 10, color: "#4169E1", icon: "Settings" },
  { name: "งานออกแบบ/ครีเอทีฟ", key: "DESIGN", order: 11, color: "#6495ED", icon: "Palette" },
  { name: "งานพัฒนา/IT", key: "DEVELOPMENT", order: 12, color: "#1E90FF", icon: "Code" },
  { name: "ค่าที่ปรึกษา", key: "CONSULTING", order: 13, color: "#00BFFF", icon: "MessageSquare" },
  { name: "ค่าอบรม/สัมมนา", key: "TRAINING", order: 14, color: "#87CEEB", icon: "BookOpen" },

  // --- รายได้จากการผลิต ---
  { name: "ค่าจ้างผลิต/รับเหมา", key: "MANUFACTURING", order: 20, color: "#FF8C00", icon: "Factory" },
  { name: "ค่าพิมพ์/ผลิตสื่อ", key: "PRINTING", order: 21, color: "#FFA500", icon: "Printer" },

  // --- รายได้อื่น ---
  { name: "ค่าคอมมิชชั่น", key: "COMMISSION", order: 30, color: "#FF69B4", icon: "Percent" },
  { name: "ค่าเช่า/ค่าลิขสิทธิ์", key: "RENTAL_ROYALTY", order: 31, color: "#DA70D6", icon: "Key" },
  { name: "ค่าโฆษณา/สปอนเซอร์", key: "ADVERTISING", order: 32, color: "#EE82EE", icon: "Award" },

  // --- รายได้ทางการเงิน ---
  { name: "ดอกเบี้ยรับ", key: "INTEREST", order: 40, color: "#FFD700", icon: "TrendingUp" },
  { name: "เงินปันผล", key: "DIVIDEND", order: 41, color: "#FFEC8B", icon: "PieChart" },
  { name: "กำไรจากการขายทรัพย์สิน", key: "ASSET_SALE", order: 42, color: "#F0E68C", icon: "DollarSign" },

  // --- อื่นๆ ---
  { name: "เงินคืน/เครดิต", key: "REFUND", order: 50, color: "#98FB98", icon: "RotateCcw" },
  { name: "รายได้เบ็ดเตล็ด", key: "MISCELLANEOUS", order: 51, color: "#696969", icon: "MoreHorizontal" },
  { name: "อื่นๆ", key: "OTHER", order: 99, color: "#808080", icon: "HelpCircle" },
];

// Summary
export const CATEGORY_SUMMARY = {
  expense: {
    count: DEFAULT_EXPENSE_CATEGORIES.length,
    groups: [
      "ต้นทุนสินค้า/บริการ (3)",
      "ค่าแรง/บุคลากร (5)",
      "ค่าดำเนินงาน (5)",
      "ค่าขนส่ง/เดินทาง (3)",
      "การตลาด/ขาย (3)",
      "ค่าที่ปรึกษา/วิชาชีพ (3)",
      "ค่าบำรุงรักษา (2)",
      "ค่าใช้จ่ายทางการเงิน (3)",
      "อื่นๆ (3)",
    ],
  },
  income: {
    count: DEFAULT_INCOME_CATEGORIES.length,
    groups: [
      "รายได้จากขาย (4)",
      "รายได้จากบริการ (5)",
      "รายได้จากการผลิต (2)",
      "รายได้อื่น (3)",
      "รายได้ทางการเงิน (3)",
      "อื่นๆ (3)",
    ],
  },
};
