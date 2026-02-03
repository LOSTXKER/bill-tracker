import type { 
  User, 
  Company, 
  Expense, 
  Income, 
  Contact,
  CompanyAccess,
  UserRole,
  ExpenseDocStatus,
  IncomeDocStatus,
  PaymentMethod,
  WhtType
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Company,
  Expense,
  Income,
  Contact,
  CompanyAccess,
  UserRole,
  ExpenseDocStatus,
  IncomeDocStatus,
  PaymentMethod,
  WhtType
};

// Session user type
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
}

// Company with access
export interface CompanyWithAccess extends Company {
  access?: CompanyAccess;
  isOwner?: boolean;
  permissions?: string[];
}

// Expense with relations
export interface ExpenseWithRelations extends Expense {
  company?: Company;
  internalCompany?: Company | null;
  contact?: Contact | null;
  creator?: User;
}

// Income with relations
export interface IncomeWithRelations extends Income {
  company?: Company;
  contact?: Contact | null;
  creator?: User;
}

// Dashboard stats
export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  pendingDocs: number;
  waitingWhtCerts: number;
  readyToSend: number;
}

// Tax calculation result
export interface TaxCalculation {
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
  netAmount: number;
  totalWithVat: number;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter types - Base transaction filters
export interface BaseTransactionFilters {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  contactId?: string;
  search?: string;
}

// View mode for internal company tracking
export type ExpenseViewMode = "official" | "internal" | "all";

export interface ExpenseFilters extends BaseTransactionFilters {
  status?: ExpenseDocStatus;
  categoryId?: string;
  internalCompanyId?: string;
  viewMode?: ExpenseViewMode;
}

export interface IncomeFilters extends BaseTransactionFilters {
  status?: IncomeDocStatus;
}

// Report types
export interface VatReportItem {
  date: Date;
  invoiceNumber: string | null;
  contactName: string | null;
  amount: number;
  vatAmount: number;
  type: "input" | "output";
}

export interface WhtReportItem {
  date: Date;
  name: string | null;
  taxId: string | null;
  amount: number;
  whtRate: number;
  whtAmount: number;
  whtType: WhtType | null;
  direction: "paid" | "received";
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface CashFlowData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

// Contact summary type for listings and forms
export interface ContactSummary {
  id: string;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit?: number | null;
  paymentTerms?: number | null;
  peakCode?: string | null;
  source?: "PEAK" | "MANUAL";
  // Delivery preferences
  preferredDeliveryMethod?: string | null;
  deliveryEmail?: string | null;
  deliveryNotes?: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  color?: string | null;
  isActive: boolean;
  parentId?: string | null;
  icon?: string | null;
  order?: number;
}

// Category with hierarchy (2-level)
export interface CategoryWithChildren extends CategorySummary {
  children: CategorySummary[];
}

// Grouped categories for selectors
export interface GroupedCategories {
  groups: CategoryWithChildren[];
  flat: CategorySummary[];
}

// Form data types - Base transaction form data
export interface BaseTransactionFormData {
  companyId: string;
  contactId?: string;
  amount: number;
  vatRate: number;
  whtRate?: number;
  whtType?: WhtType;
  invoiceNumber?: string;
  referenceNo?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface ExpenseFormData extends BaseTransactionFormData {
  isWht: boolean;
  description?: string;
  categoryId?: string;
  billDate: Date;
  dueDate?: Date;
  status: ExpenseDocStatus;
  internalCompanyId?: string; // บริษัทภายใน (ถ้าต่างจากบริษัทที่บันทึก)
}

export interface IncomeFormData extends BaseTransactionFormData {
  isWhtDeducted: boolean;
  source?: string;
  receiveDate: Date;
  status: IncomeDocStatus;
}
