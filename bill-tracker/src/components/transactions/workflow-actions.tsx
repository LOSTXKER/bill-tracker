"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronDown,
  Receipt,
  FileText,
  Send,
  CheckCircle,
  Bell,
} from "lucide-react";

interface WorkflowActionsProps {
  companyCode: string;
  type?: "expense" | "income"; // alias for transactionType
  transactionType?: "expense" | "income";
  transactionId: string;
  currentStatus?: string; // alias for workflowStatus
  workflowStatus?: string;
  isWht?: boolean;
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  onActionComplete?: () => void;
  variant?: "default" | "compact";
}

interface ActionConfig {
  action: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresConfirm?: boolean;
}

const EXPENSE_ACTIONS: Record<string, ActionConfig[]> = {
  PAID: [
    { action: "receive_tax_invoice", label: "ได้รับใบกำกับภาษี", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับใบกำกับภาษีจากร้านค้าแล้ว" },
  ],
  WAITING_TAX_INVOICE: [
    { action: "receive_tax_invoice", label: "ได้รับใบกำกับภาษี", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับใบกำกับภาษีจากร้านค้าแล้ว" },
  ],
  TAX_INVOICE_RECEIVED: [
    { action: "issue_wht", label: "ออกใบ 50 ทวิ", icon: <FileText className="h-4 w-4" />, description: "ออกหนังสือรับรองการหักภาษี ณ ที่จ่ายให้ vendor" },
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  WHT_PENDING_ISSUE: [
    { action: "issue_wht", label: "ออกใบ 50 ทวิ", icon: <FileText className="h-4 w-4" />, description: "ออกหนังสือรับรองการหักภาษี ณ ที่จ่ายให้ vendor" },
  ],
  WHT_ISSUED: [
    { action: "send_wht", label: "ส่งใบ 50 ทวิให้ vendor", icon: <Send className="h-4 w-4" />, description: "ส่งหนังสือรับรองให้ vendor แล้ว" },
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

const INCOME_ACTIONS: Record<string, ActionConfig[]> = {
  RECEIVED: [
    { action: "issue_invoice", label: "ออกใบกำกับ", icon: <FileText className="h-4 w-4" />, description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า" },
  ],
  NO_INVOICE_NEEDED: [
    { action: "send_to_accounting", label: "ส่งบัญชี", icon: <Send className="h-4 w-4" />, description: "ส่งเอกสารให้ฝ่ายบัญชี" },
  ],
  WAITING_INVOICE_ISSUE: [
    { action: "issue_invoice", label: "ออกใบกำกับ", icon: <FileText className="h-4 w-4" />, description: "ออกใบกำกับภาษี/ใบเสร็จให้ลูกค้า" },
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

export function WorkflowActions({
  companyCode,
  type,
  transactionType,
  transactionId,
  currentStatus,
  workflowStatus,
  isWht,
  documentType = "TAX_INVOICE",
  onActionComplete,
  variant = "default",
}: WorkflowActionsProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionConfig | null>(null);
  const [notes, setNotes] = useState("");

  // Support both prop names
  const txType = type || transactionType || "expense";
  const status = currentStatus || workflowStatus || "";

  const actions = txType === "expense" 
    ? EXPENSE_ACTIONS[status] || []
    : INCOME_ACTIONS[status] || [];

  // Modify action labels based on document type for expenses
  const getModifiedActions = (baseActions: ActionConfig[]): ActionConfig[] => {
    if (txType !== "expense") return baseActions;
    
    return baseActions.map(action => {
      // For cash receipt, change the label for tax invoice actions
      if (documentType === "CASH_RECEIPT" && action.action === "receive_tax_invoice") {
        return {
          ...action,
          label: "ได้รับบิลเงินสด",
          description: "บันทึกว่าได้รับบิลเงินสด/ใบเสร็จแล้ว"
        };
      }
      return action;
    });
  };

  // Filter WHT actions based on isWht flag and document type
  const filteredActions = getModifiedActions(actions).filter((action) => {
    // Hide WHT actions if not using WHT
    if (action.action.includes("wht") && !isWht) {
      return false;
    }
    // For NO_DOCUMENT type, hide document-related actions (they shouldn't appear anyway)
    if (documentType === "NO_DOCUMENT" && action.action === "receive_tax_invoice") {
      return false;
    }
    return true;
  });

  const handleAction = async (action: ActionConfig) => {
    if (action.requiresConfirm) {
      setConfirmDialog(action);
      return;
    }
    await executeAction(action.action);
  };

  const executeAction = async (action: string, actionNotes?: string) => {
    setLoading(true);
    const toastId = toast.loading("กำลังดำเนินการ...");
    
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: txType,
          transactionId,
          action,
          notes: actionNotes || notes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }

      toast.success("อัปเดตสถานะสำเร็จ", { id: toastId });
      setConfirmDialog(null);
      setNotes("");
      onActionComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (filteredActions.length === 0) {
    return null;
  }

  const primaryAction = filteredActions[0];
  const secondaryActions = filteredActions.slice(1);

  // Compact variant - single primary button with optional dropdown
  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-2">
          {primaryAction && (
            <LoadingButton
              onClick={() => handleAction(primaryAction)}
              loading={loading}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </LoadingButton>
          )}
          {secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {secondaryActions.map((action, index) => (
                  <div key={action.action}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => handleAction(action)} disabled={loading}>
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <ConfirmDialog
          action={confirmDialog}
          notes={notes}
          setNotes={setNotes}
          loading={loading}
          onConfirm={() => executeAction(confirmDialog?.action || "", notes)}
          onCancel={() => {
            setConfirmDialog(null);
            setNotes("");
          }}
        />
      </>
    );
  }

  // Default variant
  // If only one action, show as button
  if (filteredActions.length === 1) {
    const action = filteredActions[0];
    return (
      <>
        <LoadingButton
          onClick={() => handleAction(action)}
          loading={loading}
          className="gap-2"
        >
          {action.icon}
          {action.label}
        </LoadingButton>

        <ConfirmDialog
          action={confirmDialog}
          notes={notes}
          setNotes={setNotes}
          loading={loading}
          onConfirm={() => executeAction(confirmDialog?.action || "", notes)}
          onCancel={() => {
            setConfirmDialog(null);
            setNotes("");
          }}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <LoadingButton loading={loading} className="gap-2">
            ดำเนินการ
            <ChevronDown className="h-4 w-4" />
          </LoadingButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {filteredActions.map((action, index) => (
            <div key={action.action}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => handleAction(action)} disabled={loading}>
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        action={confirmDialog}
        notes={notes}
        setNotes={setNotes}
        loading={loading}
        onConfirm={() => executeAction(confirmDialog?.action || "", notes)}
        onCancel={() => {
          setConfirmDialog(null);
          setNotes("");
        }}
      />
    </>
  );
}

function ConfirmDialog({
  action,
  notes,
  setNotes,
  loading,
  onConfirm,
  onCancel,
}: {
  action: ActionConfig | null;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!action) return null;

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action.icon}
            {action.label}
          </DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เพิ่มหมายเหตุ..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            ยกเลิก
          </Button>
          <LoadingButton onClick={onConfirm} loading={loading}>
            ยืนยัน
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
