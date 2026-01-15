"use client";

/**
 * Transaction Dialogs Component
 * Contains all dialogs used in UnifiedTransactionForm
 */

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
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

import { MergeOptionsDialog, MergeData, MergeDecision } from "./MergeOptionsDialog";
import { ConflictDialog, ConflictField, ConflictResolution } from "./ConflictDialog";

// =============================================================================
// Delete Confirmation Dialog
// =============================================================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  description?: string;
  amount?: number;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  title,
  description,
  amount,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการลบรายการนี้ใช่หรือไม่? การลบสามารถกู้คืนได้โดยผู้ดูแลระบบ
            <br />
            <span className="font-medium text-foreground">
              {description || title}
              {amount !== undefined && ` - ${formatCurrency(amount)}`}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              "ลบรายการ"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =============================================================================
// Re-export MergeOptionsDialog and ConflictDialog
// =============================================================================

export { MergeOptionsDialog, ConflictDialog };
export type { MergeData, MergeDecision, ConflictField, ConflictResolution };

// =============================================================================
// Combined Dialogs Props (for UnifiedTransactionForm)
// =============================================================================

export interface TransactionDialogsProps {
  // Delete dialog
  showDeleteConfirm: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  isDeleting: boolean;
  deleteTitle: string;
  deleteDescription?: string;
  deleteAmount?: number;

  // Merge dialog
  showMergeDialog: boolean;
  onMergeOpenChange: (open: boolean) => void;
  existingData: MergeData | null;
  newData: MergeData | null;
  onMergeDecision: (decision: MergeDecision) => void;

  // Conflict dialog
  showConflictDialog: boolean;
  onConflictOpenChange: (open: boolean) => void;
  conflicts: ConflictField[];
  onConflictResolve: (resolution: ConflictResolution) => void;
}

export function TransactionDialogs({
  // Delete dialog
  showDeleteConfirm,
  onDeleteOpenChange,
  onDeleteConfirm,
  isDeleting,
  deleteTitle,
  deleteDescription,
  deleteAmount,

  // Merge dialog
  showMergeDialog,
  onMergeOpenChange,
  existingData,
  newData,
  onMergeDecision,

  // Conflict dialog
  showConflictDialog,
  onConflictOpenChange,
  conflicts,
  onConflictResolve,
}: TransactionDialogsProps) {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={onDeleteOpenChange}
        onConfirm={onDeleteConfirm}
        isDeleting={isDeleting}
        title={deleteTitle}
        description={deleteDescription}
        amount={deleteAmount}
      />

      {/* Merge Options Dialog */}
      {existingData && newData && (
        <MergeOptionsDialog
          open={showMergeDialog}
          onOpenChange={onMergeOpenChange}
          existingData={existingData}
          newData={newData}
          onDecision={onMergeDecision}
        />
      )}

      {/* Conflict Resolution Dialog */}
      {conflicts.length > 0 && (
        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={onConflictOpenChange}
          conflicts={conflicts}
          onResolve={onConflictResolve}
        />
      )}
    </>
  );
}
