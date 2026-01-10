import { formatCurrency, formatThaiDate } from "./tax-calculator";

export function exportToCSV(data: any[], filename: string, type: "expense" | "income") {
  if (data.length === 0) return;

  // Define headers based on type
  const headers =
    type === "expense"
      ? ["วันที่", "ผู้ขาย", "รายละเอียด", "บัญชี", "จำนวนเงิน", "สถานะ", "ผู้สร้าง"]
      : ["วันที่", "ลูกค้า", "แหล่งที่มา", "จำนวนเงิน", "WHT", "สถานะ", "ผู้สร้าง"];

  // Map data to CSV rows
  const rows = data.map((item) => {
    if (type === "expense") {
      return [
        formatThaiDate(new Date(item.billDate)),
        item.contact?.name || "-",
        item.description || "-",
        item.category || "-",
        formatCurrency(item.netPaid),
        item.status,
        item.creator?.name || "-",
      ];
    } else {
      return [
        formatThaiDate(new Date(item.receiveDate)),
        item.contact?.name || "-",
        item.source || "-",
        formatCurrency(item.netReceived),
        item.isWhtDeducted ? `${item.whtRate}%` : "-",
        item.status,
        item.creator?.name || "-",
      ];
    }
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  // Add BOM for Excel to recognize UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: any[], filename: string, type: "expense" | "income") {
  // For now, just use CSV. Can add xlsx library later if needed
  exportToCSV(data, filename, type);
}
