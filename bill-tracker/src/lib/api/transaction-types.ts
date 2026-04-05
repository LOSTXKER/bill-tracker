import type { Session } from "next-auth";
import type { Company, Expense, Income, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type TransactionModelName = "expense" | "income";

export interface TransactionHookContext {
  session: Session;
  company: Company;
}

export interface TransactionUpdateHookContext<TModel> extends TransactionHookContext {
  existingItem: TModel;
}

export interface TransactionRequestBody {
  amount?: number;
  vatRate?: number;
  vatAmount?: number;
  netPaid?: number;
  netReceived?: number;
  description?: string;
  source?: string;
  contactId?: string;
  contactName?: string;
  accountId?: string;
  categoryId?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  notes?: string;
  referenceNo?: string;

  isWht?: boolean;
  isWhtDeducted?: boolean;
  whtRate?: number;
  whtAmount?: number;
  whtType?: string;
  _whtChangeConfirmed?: boolean;
  _whtChangeReason?: string;

  taxInvoiceUrls?: string[];
  slipUrls?: string[];
  customerSlipUrls?: string[];
  myBillCopyUrls?: string[];
  whtCertUrls?: string[];
  otherDocUrls?: string[];
  referenceUrls?: string[];

  billDate?: string | Date;
  incomeDate?: string | Date;
  receiveDate?: string | Date;
  dueDate?: string | Date;

  documentType?: string;
  workflowStatus?: string;
  internalCompanyId?: string;
  status?: string;

  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;

  [key: string]: unknown;
}

export type ExpenseDelegate = typeof prisma.expense;
export type IncomeDelegate = typeof prisma.income;

export interface TransactionRecord {
  id: string;
  companyId: string;
  createdBy: string;
  deletedAt: Date | null;
  workflowStatus?: string | null;
  approvalStatus?: string | null;
  status?: string | null;
  description?: string | null;
  Company?: Company;
  Contact?: { name?: string | null; [key: string]: unknown } | null;
  [key: string]: unknown;
}

export interface TransactionDelegate {
  create(args: object): Promise<TransactionRecord>;
  findUnique(args: object): Promise<TransactionRecord | null>;
  findFirst(args: object): Promise<TransactionRecord | null>;
  findMany(args: object): Promise<TransactionRecord[]>;
  update(args: object): Promise<TransactionRecord>;
  count(args: object): Promise<number>;
}

export interface TransactionRouteConfig<
  TModel = Expense | Income,
  TCreateData = Prisma.ExpenseCreateInput | Prisma.IncomeCreateInput,
  TUpdateData = Prisma.ExpenseUpdateInput | Prisma.IncomeUpdateInput
> {
  modelName: TransactionModelName;

  permissions: {
    read: string;
    create: string;
    update: string;
    delete?: string;
  };

  fields: {
    dateField: string;
    netAmountField: string;
    statusField: string;
  };

  prismaModel: TransactionDelegate;

  transformCreateData: (body: TransactionRequestBody) => TCreateData;
  transformUpdateData: (body: TransactionRequestBody, existingData?: TModel) => TUpdateData;

  afterCreate?: (item: TModel, body: TransactionRequestBody, context: TransactionHookContext) => Promise<void>;
  afterUpdate?: (item: TModel, body: TransactionRequestBody, context: TransactionUpdateHookContext<TModel>) => Promise<void>;

  notifyCreate?: (companyId: string, data: Record<string, unknown>, baseUrl: string) => Promise<void>;

  displayName: string;
  getEntityDisplayName?: (entity: TModel) => string | undefined;
}

export interface RouteParamsContext {
  params: Promise<{ id: string }>;
}
