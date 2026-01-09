"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Loader2, Receipt, Send, ArrowLeft, Calendar, Tag, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { FileUpload } from "@/components/file-upload";
import { PageHeader } from "@/components/shared/PageHeader";

interface ReimbursementFormData {
  amount: number;
  description: string;
  categoryId?: string;
  billDate: string;
  paymentMethod: string;
}

export default function NewReimbursementPage() {
  const router = useRouter();
  const params = useParams();
  const companyCode = (params.company as string).toUpperCase();

  const [isLoading, setIsLoading] = useState(false);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

  const { categories, isLoading: categoriesLoading } = useCategories(
    companyCode,
    "EXPENSE"
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReimbursementFormData>({
    defaultValues: {
      amount: 0,
      description: "",
      billDate: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
    },
  });

  // Fetch company ID
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        if (result.data?.companies?.[0]) {
          setCompanyId(result.data.companies[0].id);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  const watchAmount = watch("amount");

  // AI Analysis function
  const analyzeReceipt = async () => {
    if (receiptUrls.length === 0) {
      toast.error("กรุณาอัปโหลดรูปใบเสร็จก่อน");
      return;
    }

    // Only analyze images, not PDFs
    const imageUrl = receiptUrls.find((url) => 
      !url.toLowerCase().endsWith(".pdf")
    );

    if (!imageUrl) {
      toast.error("ไม่พบไฟล์รูปภาพที่สามารถวิเคราะห์ได้ (รองรับเฉพาะ JPEG, PNG, WebP)");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          companyCode,
          smartMatch: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถวิเคราะห์ใบเสร็จได้");
      }

      const data = result.data?.data;
      const smart = result.data?.smart;

      if (!data) {
        toast.warning("ไม่พบข้อมูลในใบเสร็จ กรุณากรอกข้อมูลด้วยตนเอง");
        return;
      }

      // Apply extracted data to form
      let appliedFields = 0;

      // Amount - prefer totalAmount over items
      const amount = smart?.suggested?.amount || data.totalAmount || data.items?.[0]?.totalPrice;
      if (amount && amount > 0) {
        setValue("amount", amount);
        appliedFields++;
      }

      // Date
      const date = smart?.suggested?.date || data.date;
      if (date) {
        setValue("billDate", date);
        appliedFields++;
      }

      // Description - use vendor name or first item
      let description = smart?.suggested?.description || data.vendorName;
      if (data.items?.length > 0 && data.items[0]?.name) {
        description = description 
          ? `${description} - ${data.items[0].name}`
          : data.items[0].name;
      }
      if (description && !watch("description")) {
        setValue("description", description);
        appliedFields++;
      }

      // Category from smart matching
      if (smart?.suggested?.categoryId) {
        setValue("categoryId", smart.suggested.categoryId);
        appliedFields++;
      }

      setAiAnalyzed(true);

      if (appliedFields > 0) {
        toast.success(`AI กรอกข้อมูลแล้ว ${appliedFields} รายการ`, {
          description: "ตรวจสอบความถูกต้องก่อนส่ง",
        });
      } else {
        toast.warning("ไม่สามารถดึงข้อมูลจากใบเสร็จได้ กรุณากรอกข้อมูลด้วยตนเอง");
      }
    } catch (error) {
      console.error("AI Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "วิเคราะห์ใบเสร็จล้มเหลว");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: ReimbursementFormData) => {
    if (!companyId) {
      toast.error("ไม่พบข้อมูลบริษัท");
      return;
    }

    if (!data.amount || data.amount <= 0) {
      toast.error("กรุณาระบุจำนวนเงิน");
      return;
    }

    if (receiptUrls.length === 0) {
      toast.error("กรุณาอัปโหลดรูปใบเสร็จ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reimbursement-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          amount: Number(data.amount),
          description: data.description,
          categoryId: data.categoryId || null,
          billDate: data.billDate,
          paymentMethod: data.paymentMethod,
          receiptUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาด");
      }

      toast.success("ส่งคำขอเบิกจ่ายสำเร็จ", {
        description: "รอผู้จัดการอนุมัติ",
      });
      router.push(`/${companyCode.toLowerCase()}/reimbursements`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ขอเบิกค่าใช้จ่าย"
        description="ส่งใบเสร็จเพื่อขอเบิกเงินคืนจากบริษัท"
        actions={
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
        }
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">รายละเอียดการเบิกจ่าย</CardTitle>
                  <CardDescription>กรอกข้อมูลและแนบหลักฐานการจ่ายเงิน</CardDescription>
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
                  onChange={(urls) => {
                    setReceiptUrls(urls);
                    setAiAnalyzed(false); // Reset AI state when files change
                  }}
                  folder="receipts"
                  maxFiles={5}
                />
                <p className="text-xs text-muted-foreground">
                  อัปโหลดรูปใบเสร็จหรือหลักฐานการจ่ายเงิน (สูงสุด 5 รูป)
                </p>
              </div>

              {/* AI Analyze Button */}
              {receiptUrls.length > 0 && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">AI วิเคราะห์ใบเสร็จ</p>
                        <p className="text-xs text-muted-foreground">
                          {aiAnalyzed 
                            ? "กดวิเคราะห์ใหม่หากเพิ่มไฟล์" 
                            : "ดึงจำนวนเงินและรายละเอียดอัตโนมัติ"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={aiAnalyzed ? "outline" : "default"}
                      size="sm"
                      onClick={analyzeReceipt}
                      disabled={isAnalyzing || receiptUrls.length === 0}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังวิเคราะห์...
                        </>
                      ) : aiAnalyzed ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                          วิเคราะห์ใหม่
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          วิเคราะห์
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  จำนวนเงิน (บาท) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12 text-xl font-semibold"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  รายละเอียด <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="เช่น ซื้อน้ำดื่มสำหรับประชุม, ค่าแท็กซี่ไปพบลูกค้า"
                  className="min-h-[100px] resize-none"
                  {...register("description", { required: true })}
                />
              </div>

              {/* Category & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    หมวดหมู่
                  </Label>
                  <Select
                    value={watch("categoryId")}
                    onValueChange={(value) => setValue("categoryId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    วันที่ซื้อ
                  </Label>
                  <Input
                    id="billDate"
                    type="date"
                    className="h-11"
                    {...register("billDate")}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>วิธีที่คุณจ่ายเงิน</Label>
                <Select
                  value={watch("paymentMethod")}
                  onValueChange={(value) => setValue("paymentMethod", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 เงินสด</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 โอนเงิน</SelectItem>
                    <SelectItem value="CREDIT_CARD">💳 บัตรเครดิต</SelectItem>
                    <SelectItem value="PROMPTPAY">📱 พร้อมเพย์</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              {watchAmount > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">ยอดขอเบิก</span>
                    <span className="text-3xl font-bold text-primary">
                      ฿{Number(watchAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={() => router.back()}
              >
                ยกเลิก
              </Button>
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
