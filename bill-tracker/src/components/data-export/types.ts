export interface DataExportPageProps {
  companyId: string;
  companyName: string;
  companyCode: string;
  isOwner: boolean;
}

export interface ArchiveStats {
  expenseCount: number;
  incomeCount: number;
  totalExpenseFiles: number;
  totalIncomeFiles: number;
  totalExpenseAmount: number;
  totalIncomeAmount: number;
  month: number;
  year: number;
  companyCode: string;
  companyName: string;
}

export interface BackupStats {
  companyCode: string;
  companyName: string;
  stats: {
    expenses: number;
    incomes: number;
    contacts: number;
    accounts: number;
    users: number;
  };
  estimatedSize: string;
}

export const THAI_MONTHS = [
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

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
