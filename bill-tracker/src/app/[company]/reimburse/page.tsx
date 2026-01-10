"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Receipt, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { THAI_BANKS } from "@/lib/constants/banks";
import Image from "next/image";

interface ReimbursementFormData {
  requesterName: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  amount: number;
  description: string;
  billDate: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  reimbursementSpendingLimit?: number;
}

export default function PublicReimbursePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  const [isLoading, setIsLoading] = useState(false);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [spendingLimitWarning, setSpendingLimitWarning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReimbursementFormData>({
    defaultValues: {
      billDate: new Date().toISOString().split("T")[0],
    },
  });

  const watchAmount = watch("amount");
  const watchName = watch("requesterName");
  const watchBillDate = watch("billDate");

  // Fetch company info
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        if (result.data?.companies?.[0]) {
          setCompany(result.data.companies[0]);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  // Check spending limit
  useEffect(() => {
    if (company?.reimbursementSpendingLimit && watchAmount) {
      if (watchAmount > Number(company.reimbursementSpendingLimit)) {
        setSpendingLimitWarning(
          `จำนวนเงินเกินวงเงินที่กำหนด (${Number(company.reimbursementSpendingLimit).toLocaleString()} บาท) - อาจต้องใช้เวลาอนุมัตินานขึ้น`
        );
      } else {
        setSpendingLimitWarning(null);
      }
    }
  }, [watchAmount, company]);

  // Check for duplicates
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!company || !watchName || !watchAmount || !watchBillDate) return;

      try {
        const response = await fetch(
          `/api/reimbursement-requests/check-duplicate?` +
            new URLSearchParams({
              companyId: company.id,
              requesterName: watchName,
              amount: watchAmount.toString(),
              billDate: watchBillDate,
            })
        );

        const result = await response.json();
        if (result.data?.isDuplicate) {
          setDuplicateWarning(
            `พบคำขอที่คล้ายกันในวันนี้ - กรุณาตรวจสอบว่าไม่ได้ส่งซ้ำ`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [company, watchName, watchAmount, watchBillDate]);

  const onSubmit = async (data: ReimbursementFormData) => {
    if (!company) {
      toast.error("ไม่พบข้อมูลบริษัท");
      return;
    }

    // Validation
    const validationErrors: string[] = [];

    if (!data.requesterName || data.requesterName.trim() === "") {
      validationErrors.push("กรุณาระบุชื่อ-นามสกุล");
    }

    if (!data.bankName) {
      validationErrors.push("กรุณาเลือกธนาคาร");
    }

    if (!data.bankAccountNo || data.bankAccountNo.trim() === "") {
      validationErrors.push("กรุณาระบุเลขบัญชี");
    }

    if (!data.bankAccountName || data.bankAccountName.trim() === "") {
      validationErrors.push("กรุณาระบุชื่อบัญชี");
    }

    if (!data.amount || data.amount <= 0) {
      validationErrors.push("กรุณาระบุจำนวนเงิน");
    }

    if (!data.description || data.description.trim() === "") {
      validationErrors.push("กรุณาระบุรายละเอียด");
    }

    if (receiptUrls.length === 0) {
      validationErrors.push("กรุณาอัปโหลดรูปใบเสร็จ");
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reimbursement-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          requesterName: data.requesterName.trim(),
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo.trim(),
          bankAccountName: data.bankAccountName.trim(),
          amount: Number(data.amount),
          description: data.description.trim(),
          billDate: data.billDate,
          receiptUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      setTrackingCode(result.data?.trackingCode);
      toast.success("ส่งคำขอเบิกจ่ายสำเร็จ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // Success page
  if (trackingCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>ส่งคำขอสำเร็จ</CardTitle>
            <CardDescription>
              คำขอเบิกจ่ายของคุณได้รับการบันทึกเรียบร้อยแล้ว
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                รหัสติดตามสถานะ
              </p>
              <p className="text-2xl font-bold font-mono">{trackingCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                เก็บรหัสนี้ไว้เพื่อเช็คสถานะ
              </p>
            </div>

            <Alert>
              <AlertDescription>
                คำขอของคุณจะได้รับการพิจารณาภายใน 1-3 วันทำการ
                คุณสามารถเช็คสถานะได้ด้านล่าง
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => router.push(`/track/${trackingCode}`)}
            >
              เช็คสถานะคำขอ
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              ส่งคำขอใหม่
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Submit form page
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="max-w-2xl mx-auto">
        {/* Company Branding */}
        {company && (
          <div className="text-center mb-8">
            {company.logoUrl && (
              <div className="mb-4">
                <Image
                  src={company.logoUrl}
                  alt={company.name}
                  width={120}
                  height={120}
                  className="mx-auto rounded-lg"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
            <p className="text-muted-foreground">ขอเบิกค่าใช้จ่าย</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>ข้อมูลการเบิกจ่าย</CardTitle>
                  <CardDescription>
                    กรอกข้อมูลและแนบหลักฐานการจ่ายเงิน
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Receipt Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  รูปใบเสร็จ <span className="text-destructive">*</span>
                </Label>
                <FileUpload
                  value={receiptUrls}
                  onChange={setReceiptUrls}
                  folder="receipts"
                  maxFiles={5}
                />
                <p className="text-xs text-muted-foreground">
                  อัปโหลดรูปใบเสร็จหรือหลักฐานการจ่ายเงิน (สูงสุด 5 รูป)
                </p>
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">ข้อมูลผู้ขอเบิก</h3>

                <div className="space-y-2">
                  <Label htmlFor="requesterName">
                    ชื่อ-นามสกุล <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="requesterName"
                    placeholder="นายสมชาย ใจดี"
                    {...register("requesterName", { required: true })}
                  />
                </div>
              </div>

              {/* Bank Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">ข้อมูลบัญชีสำหรับรับเงิน</h3>

                <div className="space-y-2">
                  <Label>
                    ธนาคาร <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("bankName")}
                    onValueChange={(value) => setValue("bankName", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกธนาคาร" />
                    </SelectTrigger>
                    <SelectContent>
                      {THAI_BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.name}>
                          {bank.nameFull}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNo">
                      เลขบัญชี <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bankAccountNo"
                      placeholder="1234567890"
                      {...register("bankAccountNo", { required: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">
                      ชื่อบัญชี <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bankAccountName"
                      placeholder="นายสมชาย ใจดี"
                      {...register("bankAccountName", { required: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Reimbursement Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">รายละเอียดค่าใช้จ่าย</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      จำนวนเงิน (บาท) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("amount", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billDate">วันที่จ่ายเงิน</Label>
                    <Input id="billDate" type="date" {...register("billDate")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    รายละเอียด <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="เช่น ซื้อน้ำดื่มสำหรับประชุม, ค่าแท็กซี่ไปพบลูกค้า"
                    className="min-h-[100px] resize-none"
                    {...register("description", { required: true })}
                  />
                </div>
              </div>

              {/* Warnings */}
              {spendingLimitWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{spendingLimitWarning}</AlertDescription>
                </Alert>
              )}

              {duplicateWarning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{duplicateWarning}</AlertDescription>
                </Alert>
              )}

              {/* Summary */}
              {watchAmount > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">
                      ยอดขอเบิก
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      ฿
                      {Number(watchAmount).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-3 pt-6 border-t">
              <Button
                type="submit"
                className="flex-1 h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    ส่งขอเบิกจ่าย
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
