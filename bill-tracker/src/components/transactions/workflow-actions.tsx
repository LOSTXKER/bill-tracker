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
  ArrowLeft,
} from "lucide-react";
import { getPreviousStatus, type TransactionWorkflowContext } from "@/lib/workflow/status-rules";

interface WorkflowActionsProps {
  companyCode: string;
  type?: "expense" | "income"; // alias for transactionType
  transactionType?: "expense" | "income";
  transactionId: string;
  currentStatus?: string; // alias for workflowStatus
  workflowStatus?: string;
  isWht?: boolean;
  isWhtDeducted?: boolean; // for income type
  documentType?: "TAX_INVOICE" | "CASH_RECEIPT" | "NO_DOCUMENT";
  onActionComplete?: () => void;
  variant?: "default" | "compact";
  isOwner?: boolean; // Owner can revert status
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
    { action: "receive_tax_invoice", label: "ได้รับเอกสาร", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับเอกสารจากร้านค้าแล้ว" },
  ],
  WAITING_TAX_INVOICE: [
    { action: "receive_tax_invoice", label: "ได้รับเอกสาร", icon: <Receipt className="h-4 w-4" />, description: "บันทึกว่าได้รับเอกสารจากร้านค้าแล้ว" },
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
  isWhtDeducted,
  documentType = "TAX_INVOICE",
  onActionComplete,
  variant = "default",
  isOwner = false,
}: WorkflowActionsProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionConfig | null>(null);
  const [notes, setNotes] = useState("");
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("");

  // Support both prop names
  const txType = type || transactionType || "expense";
  const status = currentStatus || workflowStatus || "";

  // Build workflow context for getting previous status
  const workflowContext: TransactionWorkflowContext = {
    isWht: txType === "expense" ? isWht : undefined,
    isWhtDeducted: txType === "income" ? isWhtDeducted : undefined,
    documentType: txType === "expense" ? documentType : undefined,
  };

  // Get previous status for revert (owner only)
  const previousStatus = isOwner 
    ? getPreviousStatus(status, txType, workflowContext) 
    : null;

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
      // For NO_DOCUMENT type at PAID status, replace with appropriate action
      if (documentType === "NO_DOCUMENT" && action.action === "receive_tax_invoice") {
        if (isWht) {
          // Has WHT - need to issue 50 ทวิ
          return {
            ...action,
            action: "skip_to_wht",
            label: "ดำเนินการต่อ",
            icon: <FileText className="h-4 w-4" />,
            description: "ไปยังขั้นตอนออกหนังสือรับรองหัก ณ ที่จ่าย"
          };
        } else {
          // No WHT - go to accounting
          return {
            ...action,
            action: "skip_to_accounting",
            label: "ส่งบัญชี",
            icon: <Send className="h-4 w-4" />,
            description: "ส่งเอกสารให้ฝ่ายบัญชี (ไม่มีใบกำกับภาษี)"
          };
        }
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
      // Include delivery method in metadata for send_wht action
      const metadata = action === "send_wht" && deliveryMethod 
        ? { deliveryMethod } 
        : undefined;
      
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: txType,
          transactionId,
          action,
          notes: actionNotes || notes,
          metadata,
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

  // Handle revert action (owner only)
  const handleRevert = async () => {
    if (!previousStatus) return;
    
    setLoading(true);
    const toastId = toast.loading("กำลังย้อนสถานะ...");
    
    try {
      const res = await fetch(`/api/${companyCode}/document-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType: txType,
          transactionId,
          action: "revert",
          targetStatus: previousStatus.value,
          notes: notes || `ย้อนสถานะจาก ${status} ไปเป็น ${previousStatus.value}`,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }

      toast.success(`ย้อนสถานะเป็น "${previousStatus.label}" สำเร็จ`, { id: toastId });
      setShowRevertConfirm(false);
      setNotes("");
      onActionComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Show nothing if no actions and no revert available
  if (filteredActions.length === 0 && !previousStatus) {
    return null;
  }

  const primaryAction = filteredActions[0];
  const secondaryActions = filteredActions.slice(1);

  // Revert button component (shown when owner and previous status exists)
  const RevertButton = previousStatus ? (
    <Button
      variant="outline"
      size={variant === "compact" ? "sm" : "default"}
      onClick={() => setShowRevertConfirm(true)}
      disabled={loading}
      className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
    >
      <ArrowLeft className="h-4 w-4" />
      {previousStatus.label}
    </Button>
  ) : null;

  // Revert confirmation dialog
  const RevertConfirmDialog = (
    <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-amber-600" />
            ย้อนสถานะ
          </DialogTitle>
          <DialogDescription>
            ต้องการย้อนสถานะจาก <strong>"{status}"</strong> กลับไปเป็น <strong>"{previousStatus?.label}"</strong> ใช่หรือไม่?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="revert-notes">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="revert-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เหตุผลในการย้อนสถานะ..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRevertConfirm(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <LoadingButton 
            onClick={handleRevert} 
            loading={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ย้อนสถานะ
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Compact variant - single primary button with optional dropdown
  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-2">
          {/* Revert button for owner */}
          {RevertButton}
          
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
            setDeliveryMethod("");
          }}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
        />
        {RevertConfirmDialog}
      </>
    );
  }

  // Default variant
  // If only one action (or no actions but has revert), show as button
  if (filteredActions.length <= 1) {
    const action = filteredActions[0];
    return (
      <>
        <div className="flex items-center gap-2">
          {/* Revert button for owner */}
          {RevertButton}
          
          {action && (
            <LoadingButton
              onClick={() => handleAction(action)}
              loading={loading}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </LoadingButton>
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
            setDeliveryMethod("");
          }}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
        />
        {RevertConfirmDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Revert button for owner */}
        {RevertButton}
        
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
          setDeliveryMethod("");
        }}
        deliveryMethod={deliveryMethod}
        setDeliveryMethod={setDeliveryMethod}
      />
      {RevertConfirmDialog}
    </>
  );
}

// Delivery method options for WHT certificates
const DELIVERY_METHODS = [
  { value: "email", label: "อีเมล", icon: "📧" },
  { value: "physical", label: "ส่งตัวจริง (ไปรษณีย์/messenger)", icon: "📬" },
  { value: "line", label: "LINE", icon: "💬" },
  { value: "pickup", label: "มารับเอง", icon: "🏢" },
];

function ConfirmDialog({
  action,
  notes,
  setNotes,
  loading,
  onConfirm,
  onCancel,
  deliveryMethod,
  setDeliveryMethod,
}: {
  action: ActionConfig | null;
  notes: string;
  setNotes: (notes: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  deliveryMethod?: string;
  setDeliveryMethod?: (method: string) => void;
}) {
  if (!action) return null;

  const isSendWht = action.action === "send_wht";

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
          {/* Delivery method selection for WHT sending */}
          {isSendWht && setDeliveryMethod && (
            <div>
              <Label>วิธีส่ง</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DELIVERY_METHODS.map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={deliveryMethod === method.value ? "default" : "outline"}
                    className="justify-start gap-2 h-auto py-3"
                    onClick={() => setDeliveryMethod(method.value)}
                  >
                    <span>{method.icon}</span>
                    <span>{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          
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
          <LoadingButton 
            onClick={onConfirm} 
            loading={loading}
            disabled={isSendWht && !deliveryMethod}
          >
            ยืนยัน
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
