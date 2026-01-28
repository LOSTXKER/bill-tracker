"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { X, Trash2, Send, FileDown, Loader2, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Building2, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NextStatusInfo } from "@/lib/workflow/status-rules";

// Note: Select is still used for Internal Company selection

export interface CompanyOption {
  id: string;
  name: string;
  code: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => Promise<void>;
  onStatusChange?: (status: string) => Promise<void>;
  onExport?: () => void;
  onSendNotification?: () => Promise<void>;
  // New props for workflow validation
  selectedStatuses?: string[];  // สถานะของรายการที่เลือก (unique values)
  nextStatus?: NextStatusInfo | null;  // สถานะถัดไปที่เป็นไปได้
  previousStatus?: NextStatusInfo | null;  // สถานะก่อนหน้า (สำหรับ Owner ย้อนสถานะ)
  isOwner?: boolean;  // true if user is owner (can revert status)
  currentStatusLabel?: string;  // label ของสถานะปัจจุบัน (สำหรับแสดง)
  // Internal company bulk edit
  onInternalCompanyChange?: (companyId: string | null) => Promise<void>;
  companies?: CompanyOption[];
  // Batch approval props
  onBatchApprove?: () => Promise<void>;
  onBatchReject?: (reason: string) => Promise<void>;
  canApprove?: boolean;
  hasPendingItems?: boolean;  // true if selected items include PENDING approval status
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onStatusChange,
  onExport,
  onSendNotification,
  selectedStatuses = [],
  nextStatus,
  previousStatus,
  isOwner = false,
  currentStatusLabel,
  onInternalCompanyChange,
  companies = [],
  onBatchApprove,
  onBatchReject,
  canApprove = false,
  hasPendingItems = false,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showRevertStatusConfirm, setShowRevertStatusConfirm] = useState(false);
  const [showInternalCompanyConfirm, setShowInternalCompanyConfirm] = useState(false);
  const [selectedInternalCompany, setSelectedInternalCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsLoading(true);
    const toastId = toast.loading(`กำลังลบ ${selectedCount} รายการ...`);
    try {
      await onDelete();
      toast.success(`ลบ ${selectedCount} รายการสำเร็จ`, { id: toastId });
      setShowDeleteConfirm(false);
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการลบ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!onStatusChange || !nextStatus) return;
    setIsLoading(true);
    const toastId = toast.loading(`กำลังเปลี่ยนสถานะ ${selectedCount} รายการ...`);
    try {
      await onStatusChange(nextStatus.value);
      toast.success(`เปลี่ยนสถานะ ${selectedCount} รายการเป็น "${nextStatus.label}" สำเร็จ`, { id: toastId });
      setShowStatusConfirm(false);
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Owner revert status (go back one step)
  const handleRevertStatus = async () => {
    if (!onStatusChange || !previousStatus) return;
    setIsLoading(true);
    const toastId = toast.loading(`กำลังย้อนสถานะ ${selectedCount} รายการ...`);
    try {
      await onStatusChange(previousStatus.value);
      toast.success(`ย้อนสถานะ ${selectedCount} รายการเป็น "${previousStatus.label}" สำเร็จ`, { id: toastId });
      setShowRevertStatusConfirm(false);
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการย้อนสถานะ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!onSendNotification) return;
    setIsLoading(true);
    const toastId = toast.loading("กำลังส่งแจ้งเตือน...");
    try {
      await onSendNotification();
      toast.success("ส่งแจ้งเตือนสำเร็จ", { id: toastId });
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการส่งแจ้งเตือน", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInternalCompanyChange = async () => {
    if (!onInternalCompanyChange) return;
    setIsLoading(true);
    const companyName = selectedInternalCompany 
      ? companies.find(c => c.id === selectedInternalCompany)?.name || "บริษัทที่เลือก"
      : "ไม่ระบุ";
    const toastId = toast.loading(`กำลังตั้งบริษัทจริงเป็น "${companyName}"...`);
    try {
      await onInternalCompanyChange(selectedInternalCompany);
      toast.success(`ตั้งบริษัทจริงเป็น "${companyName}" สำหรับ ${selectedCount} รายการสำเร็จ`, { id: toastId });
      setShowInternalCompanyConfirm(false);
      setSelectedInternalCompany(null);
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการตั้งบริษัทจริง", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    if (!onBatchApprove) return;
    setIsLoading(true);
    const toastId = toast.loading(`กำลังอนุมัติ ${selectedCount} รายการ...`);
    try {
      await onBatchApprove();
      toast.success(`อนุมัติ ${selectedCount} รายการสำเร็จ`, { id: toastId });
      setShowApproveConfirm(false);
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (!onBatchReject || !rejectReason.trim()) return;
    setIsLoading(true);
    const toastId = toast.loading(`กำลังปฏิเสธ ${selectedCount} รายการ...`);
    try {
      await onBatchReject(rejectReason.trim());
      toast.success(`ปฏิเสธ ${selectedCount} รายการสำเร็จ`, { id: toastId });
      setShowRejectConfirm(false);
      setRejectReason("");
      onClearSelection();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการปฏิเสธ", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine status change UI state
  const hasMultipleStatuses = selectedStatuses.length > 1;
  const isAtFinalStatus = selectedStatuses.length === 1 && !nextStatus && !previousStatus;
  const canChangeStatus = selectedStatuses.length === 1 && nextStatus && onStatusChange;
  const canRevertStatus = selectedStatuses.length === 1 && previousStatus && onStatusChange && isOwner;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-card border-2 border-primary/20 shadow-2xl rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">{selectedCount}</span>
            </div>
            <span className="text-sm font-medium">รายการที่เลือก</span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Status Change Section */}
          {onStatusChange && (
            <>
              {hasMultipleStatuses ? (
                // เลือกรายการที่สถานะต่างกัน - แสดงคำเตือน
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">เลือกสถานะเดียวกัน</span>
                </div>
              ) : isAtFinalStatus ? (
                // อยู่ที่สถานะสุดท้ายแล้ว
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs">เสร็จสิ้นแล้ว</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {/* Revert button for owners - go back one step */}
                  {canRevertStatus && previousStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRevertStatusConfirm(true)}
                      disabled={isLoading}
                      className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="ย้อนสถานะ"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {previousStatus.label}
                    </Button>
                  )}
                  
                  {/* Next status button */}
                  {canChangeStatus && nextStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStatusConfirm(true)}
                      disabled={isLoading}
                      className="h-8"
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      {nextStatus.label}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {onSendNotification && (
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleSendNotification}
              loading={isLoading}
              className="h-8"
            >
              <Send className="h-4 w-4 mr-2" />
              ส่งแจ้งเตือน
            </LoadingButton>
          )}

          {/* Batch Approval Actions */}
          {canApprove && hasPendingItems && (
            <>
              {onBatchApprove && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={isLoading}
                  className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  อนุมัติ
                </Button>
              )}
              {onBatchReject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isLoading}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  ปฏิเสธ
                </Button>
              )}
            </>
          )}

          {onInternalCompanyChange && companies.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInternalCompanyConfirm(true)}
              disabled={isLoading}
              className="h-8"
            >
              <Building2 className="h-4 w-4 mr-2" />
              บริษัทจริง
            </Button>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isLoading}
              className="h-8"
            >
              <FileDown className="h-4 w-4 mr-2" />
              ส่งออก
            </Button>
          )}

          {onDelete && (
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              loading={isLoading}
              className="h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบ
            </LoadingButton>
          )}

          <div className="h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isLoading}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการที่เลือก {selectedCount} รายการ? 
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการเปลี่ยนสถานะ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการเปลี่ยนสถานะ {selectedCount} รายการ
              {currentStatusLabel && (
                <>
                  {" "}จาก <strong>"{currentStatusLabel}"</strong>
                </>
              )}
              {nextStatus && (
                <>
                  {" "}เป็น <strong>"{nextStatus.label}"</strong>
                </>
              )}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังเปลี่ยน...
                </>
              ) : (
                "ยืนยัน"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Internal Company Change Dialog */}
      <AlertDialog open={showInternalCompanyConfirm} onOpenChange={setShowInternalCompanyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ตั้งบริษัทจริง</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>เลือกบริษัทที่เป็นเจ้าของค่าใช้จ่ายจริงสำหรับ {selectedCount} รายการที่เลือก</p>
                <Select
                  value={selectedInternalCompany || "__none__"}
                  onValueChange={(value) => setSelectedInternalCompany(value === "__none__" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบริษัท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">ไม่ระบุ (ใช้บริษัทที่บันทึก)</span>
                    </SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name} ({company.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInternalCompanyChange}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "ยืนยัน"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการอนุมัติ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการอนุมัติ {selectedCount} รายการที่เลือกใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchApprove}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังอนุมัติ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  อนุมัติ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Reject Confirmation Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการปฏิเสธ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>คุณต้องการปฏิเสธ {selectedCount} รายการที่เลือก กรุณาระบุเหตุผล</p>
                <Textarea
                  placeholder="ระบุเหตุผลในการปฏิเสธ..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchReject}
              disabled={isLoading || !rejectReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังปฏิเสธ...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  ปฏิเสธ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Status Confirmation Dialog (Owner only) */}
      <AlertDialog open={showRevertStatusConfirm} onOpenChange={setShowRevertStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการย้อนสถานะ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการย้อนสถานะ {selectedCount} รายการ
              {currentStatusLabel && (
                <>
                  {" "}จาก <strong>"{currentStatusLabel}"</strong>
                </>
              )}
              {previousStatus && (
                <>
                  {" "}กลับไปเป็น <strong>"{previousStatus.label}"</strong>
                </>
              )}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertStatus}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังย้อน...
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ย้อนสถานะ
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
