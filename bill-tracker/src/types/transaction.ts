/**
 * Generic Transaction Types
 * 
 * Shared types for both Expense and Income transactions
 */

export type TransactionType = 'expense' | 'income';

export interface TaxCalculation {
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
  totalWithVat: number;
  netAmount: number;
}

export interface BaseTransaction {
  id: string;
  companyId: string;
  contactId?: string | null;
  contact?: {
    id: string;
    name: string;
    taxId?: string | null;
  } | null;
  amount: number;
  vatRate: number;
  vatAmount?: number | null;
  whtRate?: number | null;
  whtAmount?: number | null;
  whtType?: string | null;
  paymentMethod: string;
  status: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'expense';
  isWht: boolean;
  netPaid: number;
  description?: string | null;
  categoryId?: string | null;
  billDate: Date;
  dueDate?: Date | null;
  slipUrls?: string[];
  taxInvoiceUrls?: string[];
  whtCertUrls?: string[];
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'income';
  isWhtDeducted: boolean;
  netReceived: number;
  source?: string | null;
  receiveDate: Date;
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  whtCertUrls?: string[];
}

export type Transaction = ExpenseTransaction | IncomeTransaction;

export interface TransactionFormConfig {
  type: TransactionType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  colorClass: string;
  apiEndpoint: string;
  netField: 'netPaid' | 'netReceived';
  whtField: 'isWht' | 'isWhtDeducted';
  dateField: 'billDate' | 'receiveDate';
  defaultVatRate: number;
  defaultStatus: string;
  statusOptions: Array<{ value: string; label: string; color: string }>;
}

export interface TransactionApiConfig {
  model: 'expense' | 'income';
  permissions: {
    read: string;
    create: string;
    update?: string;
    delete?: string;
  };
  dateField: 'billDate' | 'receiveDate';
  netField: 'netPaid' | 'netReceived';
  whtField: 'isWht' | 'isWhtDeducted';
  notifyFn: (companyId: string, data: any, baseUrl: string) => Promise<void>;
}

export interface TransactionTableConfig<T> {
  type: TransactionType;
  dateField: keyof T;
  amountField: keyof T;
  contactField: keyof T;
  descriptionField?: keyof T;
  colorClass: string;
  statusLabels: Record<string, { label: string; color: string }>;
}
