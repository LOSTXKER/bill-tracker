import { Receipt, FileText, Send, CheckCircle, Bell, Clock, Undo2 } from "lucide-react";
import type { ActionConfig } from "./types";

export const EXPENSE_ACTIONS: Record<string, ActionConfig[]> = {
  PAID: [
    { action: "receive_tax_invoice", label: "ได้รับเอกสาร", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับเอกสารจากร้านค้าแล้ว" },
    { action: "mark_tax_invoice_requested", label: "ขอใบกำกับแล้ว", icon: <Clock className="h-4 w-4" />, description: "บันทึกว่าได้ขอใบกำกับจาก Vendor แล้ว" },
  ],
  WAITING_TAX_INVOICE: [
    { action: "receive_tax_invoice", label: "ได้รับเอกสาร", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับเอกสารจากร้านค้าแล้ว" },
    { action: "mark_tax_invoice_requested", label: "ขอใบกำกับแล้ว", icon: <Clock className="h-4 w-4" />, description: "บันทึกว่าได้ขอใบกำกับจาก Vendor แล้ว" },
  ],
  TAX_INVOICE_RECEIVED: [
    { action: "issue_wht", label: "ออก 50 ทวิแล้ว", icon: <FileText className="h-4 w-4" />, description: "บันทึกว่าออกหนังสือรับรองหัก ณ ที่จ่ายแล้ว" },
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  WHT_PENDING_ISSUE: [
    { action: "issue_wht", label: "ออก 50 ทวิแล้ว", icon: <FileText className="h-4 w-4" />, description: "บันทึกว่าออกหนังสือรับรองหัก ณ ที่จ่ายแล้ว" },
  ],
  WHT_ISSUED: [
    { action: "send_wht", label: "ส่งใบ 50 ทวิให้ vendor", icon: <Send className="h-4 w-4" />, description: "ส่งหนังสือรับรองให้ vendor แล้ว", requiresConfirm: true },
  ],
  WHT_SENT_TO_VENDOR: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  READY_FOR_ACCOUNTING: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  SENT_TO_ACCOUNTANT: [
    { action: "complete", label: "เสร็จสิ้น", icon: <CheckCircle className="h-4 w-4" />, description: "ดำเนินการเสร็จสิ้น" },
  ],
};

export const INCOME_ACTIONS: Record<string, ActionConfig[]> = {
  RECEIVED: [
    { action: "issue_invoice", label: "ออกบิล", icon: <FileText className="h-4 w-4" />, description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า" },
  ],
  NO_INVOICE_NEEDED: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  WAITING_INVOICE_ISSUE: [
    { action: "issue_invoice", label: "ออกบิล", icon: <FileText className="h-4 w-4" />, description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า" },
  ],
  INVOICE_ISSUED: [
    { action: "send_invoice", label: "ส่งบิลให้ลูกค้า", icon: <Send className="h-4 w-4" />, description: "ส่งใบกำกับภาษีให้ลูกค้าแล้ว" },
  ],
  INVOICE_SENT: [
    { action: "receive_wht", label: "ได้รับใบ 50 ทวิ", icon: <Receipt className="h-4 w-4" />, description: "ได้รับหนังสือรับรองการหักภาษีจากลูกค้าแล้ว" },
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  WHT_PENDING_CERT: [
    { action: "receive_wht", label: "ได้รับใบ 50 ทวิ", icon: <Receipt className="h-4 w-4" />, description: "ได้รับหนังสือรับรองการหักภาษีจากลูกค้าแล้ว" },
    { action: "remind_wht", label: "ส่งแจ้งเตือนทวงใบ 50 ทวิ", icon: <Bell className="h-4 w-4" />, description: "ส่งแจ้งเตือนไปยังลูกค้าเพื่อขอใบ 50 ทวิ" },
  ],
  WHT_CERT_RECEIVED: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  READY_FOR_ACCOUNTING: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  SENT_TO_ACCOUNTANT: [
    { action: "complete", label: "เสร็จสิ้น", icon: <CheckCircle className="h-4 w-4" />, description: "ดำเนินการเสร็จสิ้น" },
  ],
};

interface BuildActionsParams {
  txType: string;
  status: string;
  documentType: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  isWht?: boolean;
  taxInvoiceRequestedAt?: string | Date | null;
}

function getModifiedActions(
  baseActions: ActionConfig[],
  documentType: string,
  isWht?: boolean,
): ActionConfig[] {
  return baseActions.map((action) => {
    if (documentType === "CASH_RECEIPT" && action.action === "receive_tax_invoice") {
      return { ...action, label: "ได้รับบิลเงินสด", description: "บันทึกว่าได้รับบิลเงินสด/ใบเสร็จแล้ว" };
    }
    if (documentType === "NO_DOCUMENT" && action.action === "receive_tax_invoice") {
      if (isWht) {
        return {
          ...action,
          action: "skip_to_wht",
          label: "ดำเนินการต่อ",
          icon: <FileText className="h-4 w-4" />,
          description: "ไปยังขั้นตอนออกหนังสือรับรองหัก ณ ที่จ่าย",
        };
      }
      return {
        ...action,
        action: "skip_to_accounting",
        label: "ส่งบัญชี",
        icon: <Send className="h-4 w-4" />,
        description: "ส่งเอกสารให้ฝ่ายบัญชี (ไม่มีใบกำกับภาษี)",
      };
    }
    return action;
  });
}

export function buildFilteredActions({
  txType,
  status,
  documentType,
  isWht,
  taxInvoiceRequestedAt,
}: BuildActionsParams): ActionConfig[] {
  const base = txType === "expense" ? EXPENSE_ACTIONS[status] || [] : INCOME_ACTIONS[status] || [];
  const modified = txType === "expense" ? getModifiedActions(base, documentType, isWht) : base;

  const filtered = modified.filter((action) => {
    if (action.action.includes("wht") && !isWht) return false;
    if (action.action === "mark_tax_invoice_requested" && documentType !== "TAX_INVOICE") return false;
    if (action.action === "mark_tax_invoice_requested" && !!taxInvoiceRequestedAt) return false;
    return true;
  });

  if (
    txType === "expense" &&
    documentType === "TAX_INVOICE" &&
    (status === "WAITING_TAX_INVOICE" || status === "PAID") &&
    !!taxInvoiceRequestedAt
  ) {
    filtered.push({
      action: "cancel_tax_invoice_request",
      label: "ยกเลิกการขอใบกำกับ",
      icon: <Undo2 className="h-4 w-4" />,
      description: "ยกเลิกบันทึกการขอใบกำกับ กลับเป็นสถานะรอขอ",
    });
  }

  return filtered;
}
