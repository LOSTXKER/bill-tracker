import type { 
  User, 
  Company, 
  Expense, 
  Income, 
  Vendor, 
  Customer,
  CompanyAccess,
  UserRole,
  CompanyRole,
  ExpenseCategory,
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
  Vendor,
  Customer,
  CompanyAccess,
  UserRole,
  CompanyRole,
  ExpenseCategory,
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

// Company with access role
export interface CompanyWithAccess extends Company {
  access?: CompanyAccess;
  role?: CompanyRole;
}

// Expense with relations
export interface ExpenseWithRelations extends Expense {
  company?: Company;
  vendor?: Vendor | null;
  creator?: User;
}

// Income with relations
export interface IncomeWithRelations extends Income {
  company?: Company;
  customer?: Customer | null;
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

// Filter types
export interface ExpenseFilters {
  companyId?: string;
  status?: ExpenseDocStatus;
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  vendorId?: string;
  search?: string;
}

export interface IncomeFilters {
  companyId?: string;
  status?: IncomeDocStatus;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  search?: string;
}

// Report types
export interface VatReportItem {
  date: Date;
  invoiceNumber: string | null;
  vendorName: string | null;
  customerName: string | null;
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

// Form data types
export interface ExpenseFormData {
  companyId: string;
  vendorId?: string;
  vendorName?: string;
  vendorTaxId?: string;
  amount: number;
  vatRate: number;
  isWht: boolean;
  whtRate?: number;
  whtType?: WhtType;
  description?: string;
  category?: ExpenseCategory;
  invoiceNumber?: string;
  referenceNo?: string;
  paymentMethod: PaymentMethod;
  billDate: Date;
  dueDate?: Date;
  status: ExpenseDocStatus;
  notes?: string;
}

export interface IncomeFormData {
  companyId: string;
  customerId?: string;
  customerName?: string;
  customerTaxId?: string;
  amount: number;
  vatRate: number;
  isWhtDeducted: boolean;
  whtRate?: number;
  whtType?: WhtType;
  source?: string;
  invoiceNumber?: string;
  referenceNo?: string;
  paymentMethod: PaymentMethod;
  receiveDate: Date;
  status: IncomeDocStatus;
  notes?: string;
}
