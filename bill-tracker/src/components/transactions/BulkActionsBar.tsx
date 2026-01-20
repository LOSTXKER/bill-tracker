"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { X, Trash2, Send, FileDown, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
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
import type { NextStatusInfo } from "@/lib/workflow/status-rules";

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
  currentStatusLabel?: string;  // label ของสถานะปัจจุบัน (สำหรับแสดง)
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
  currentStatusLabel,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Determine status change UI state
  const hasMultipleStatuses = selectedStatuses.length > 1;
  const isAtFinalStatus = selectedStatuses.length === 1 && !nextStatus;
  const canChangeStatus = selectedStatuses.length === 1 && nextStatus && onStatusChange;

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
              ) : canChangeStatus ? (
                // สามารถเปลี่ยนสถานะได้
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusConfirm(true)}
                  disabled={isLoading}
                  className="h-8"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {nextStatus.label}
                </Button>
              ) : null}
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
    </>
  );
}
