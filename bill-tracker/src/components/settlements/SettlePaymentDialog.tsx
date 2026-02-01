"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, CheckCircle2, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SettlePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyCode: string;
  paymentIds: string[];
  payerName: string;
  totalAmount: number;
  onSuccess: () => void;
  isBatch?: boolean;
}

// Supabase client for file upload
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function SettlePaymentDialog({
  isOpen,
  onClose,
  companyCode,
  paymentIds,
  payerName,
  totalAmount,
  onSuccess,
  isBatch = false,
}: SettlePaymentDialogProps) {
  const { data: session } = useSession();
  const [settlementRef, setSettlementRef] = useState("");
  const [slipUrls, setSlipUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto expense creation
  const [createExpense, setCreateExpense] = useState(true);
  const [expensePayerType, setExpensePayerType] = useState<"USER" | "COMPANY">("USER");
  const [selectedPayerId, setSelectedPayerId] = useState<string>("");

  // Fetch company members for payer dropdown
  const { data: membersData } = useSWR(
    isOpen ? `/api/${companyCode}/members` : null,
    fetcher
  );
  const members = membersData?.data?.members || [];

  // Set default payer to current user when dialog opens
  useEffect(() => {
    if (isOpen && session?.user?.id && !selectedPayerId) {
      setSelectedPayerId(session.user.id);
    }
  }, [isOpen, session?.user?.id, selectedPayerId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileName = `${companyCode}/settlements/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from("bill-tracker")
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("bill-tracker")
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      setSlipUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("ไม่สามารถอัปโหลดไฟล์ได้");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSlip = (url: string) => {
    setSlipUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Always use batch endpoint (single item is just a batch of 1)
    const endpoint = `/api/${companyCode}/settlements/batch`;

    const body = {
      paymentIds,
      settlementRef,
      settlementSlipUrls: slipUrls,
      // Auto expense creation fields
      createExpense,
      expensePayerType,
      expensePayerId: expensePayerType === "USER" ? selectedPayerId : null,
    };

    // OPTIMIZED: Optimistic update - close dialog immediately for better UX
    // Show success toast and trigger revalidation right away
    // This gives instant feedback while the API call happens in background
    const successMessage = createExpense 
      ? "บันทึกการโอนคืนและสร้างรายจ่ายสำเร็จ"
      : "บันทึกการโอนคืนสำเร็จ";
    toast.success(successMessage);
    onClose();
    onSuccess(); // Trigger batch revalidation
    
    // Reset form state
    setSettlementRef("");
    setSlipUrls([]);
    setCreateExpense(true);
    setExpensePayerType("USER");
    setSelectedPayerId(session?.user?.id || "");
    setIsSubmitting(false);

    // Fire API request in background - if it fails, show error toast
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        // Show error and trigger revalidation to revert optimistic update
        toast.error(error.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        onSuccess(); // Re-fetch to get actual state
      }
    } catch (error) {
      // Network error or other failure
      toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง");
      onSuccess(); // Re-fetch to get actual state
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSettlementRef("");
      setSlipUrls([]);
      setCreateExpense(true);
      setExpensePayerType("USER");
      setSelectedPayerId(session?.user?.id || "");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            บันทึกการโอนคืน
          </DialogTitle>
          <DialogDescription>
            โอนคืนให้ {payerName}{" "}
            <span className="font-semibold text-green-600">
              ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
            {isBatch && ` (${paymentIds.length} รายการ)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Settlement Reference */}
          <div className="space-y-2">
            <Label htmlFor="settlementRef">เลขที่อ้างอิง / เลขที่โอน</Label>
            <Input
              id="settlementRef"
              placeholder="เช่น เลขที่รายการโอน"
              value={settlementRef}
              onChange={(e) => setSettlementRef(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Slip Upload */}
          <div className="space-y-2">
            <Label>สลิปการโอน (ถ้ามี)</Label>
            <div className="flex flex-wrap gap-2">
              {slipUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative w-20 h-20 rounded-lg border overflow-hidden"
                >
                  <img
                    src={url}
                    alt={`Slip ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSlip(url)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading || isSubmitting}
                />
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">เพิ่ม</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Auto Create Expense */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createExpense"
                checked={createExpense}
                onCheckedChange={(checked) => setCreateExpense(checked === true)}
                disabled={isSubmitting}
              />
              <Label htmlFor="createExpense" className="font-normal cursor-pointer">
                สร้างรายจ่ายอัตโนมัติ
              </Label>
            </div>

            {createExpense && (
              <div className="space-y-2 pl-6">
                <Label>ผู้จ่ายเงิน</Label>
                <Select
                  value={expensePayerType === "COMPANY" ? "COMPANY" : selectedPayerId}
                  onValueChange={(value) => {
                    if (value === "COMPANY") {
                      setExpensePayerType("COMPANY");
                      setSelectedPayerId("");
                    } else {
                      setExpensePayerType("USER");
                      setSelectedPayerId(value);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้จ่ายเงิน" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Company option */}
                    <SelectItem value="COMPANY">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>บัญชีบริษัท</span>
                      </div>
                    </SelectItem>
                    {/* All users */}
                    {members.map((member: { id: string; name: string }) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{member.name}</span>
                          {member.id === session?.user?.id && (
                            <span className="text-xs text-muted-foreground">(ตัวเอง)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  ระบบจะสร้างรายจ่าย &quot;โอนคืนค่าใช้จ่ายให้{payerName}&quot; อัตโนมัติ
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                ยืนยันการโอนคืน
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
