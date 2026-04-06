"use client";

import { AlertTriangle } from "lucide-react";
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

interface AccountWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AccountWarningDialog({
  open,
  onOpenChange,
  onConfirm,
}: AccountWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            ยังไม่ได้ระบุบัญชี
          </AlertDialogTitle>
          <AlertDialogDescription>
            การระบุบัญชีช่วยให้จำแนกค่าใช้จ่ายและวิเคราะห์ทางการเงินได้ดีขึ้น
            ต้องการบันทึกโดยไม่ระบุบัญชีหรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>กลับไปเลือกบัญชี</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>บันทึกโดยไม่ระบุ</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
