import type { SystemItem, MatchedPair, MonthRange } from "./ReconcileTable";
import type { AccountingRow } from "./ImportPanel";
import type { ReconcileSessionType } from "@prisma/client";

export interface SiblingCompany {
  code: string;
  name: string;
}

export interface SavedSession {
  id: string;
  status: string;
  sourceFileName: string | null;
  sourceFileUrl: string | null;
  matchedCount: number;
}

export interface SavedMatch {
  id: string;
  expenseId: string | null;
  incomeId: string | null;
  systemAmount: number;
  systemVat: number;
  systemVendor: string;
  acctDate: string;
  acctInvoice: string | null;
  acctVendor: string;
  acctTaxId: string | null;
  acctBase: number;
  acctVat: number;
  acctTotal: number;
  matchType: string;
  confidence?: number;
  aiReason: string | null;
  amountDiff?: number;
  isPayOnBehalf: boolean;
  payOnBehalfFrom: string | null;
  payOnBehalfTo: string | null;
  status: string;
  matchedByName: string | null;
}

export interface ReconcileWorkspaceProps {
  companyCode: string;
  year: number;
  month: number;
  type: ReconcileSessionType;
  systemExpenses: SystemItem[];
  systemIncomes: SystemItem[];
  spilloverExpenses?: SystemItem[];
  spilloverIncomes?: SystemItem[];
  siblingCompanies?: SiblingCompany[];
  selectedCompanyCodes?: string[];
  savedSession?: SavedSession;
  savedAccountingRows?: AccountingRow[];
  savedMatches?: SavedMatch[];
}

export const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function formatAmt(n: number) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
