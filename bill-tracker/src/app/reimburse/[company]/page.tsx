"use client";

import { useState, useEffect, useCallback } from "react";
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
import { 
  Loader2, 
  Receipt, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Wand2,
  Search,
  PlusCircle,
  ArrowLeft,
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { THAI_BANKS } from "@/lib/constants/banks";
import Image from "next/image";

type PageView = "home" | "create" | "track";

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

interface AiResult {
  combined: {
    totalAmount?: number;
    amount?: number;
    date?: string;
    vendorName?: string;
    description?: string;
    items?: string[];
  };
  confidence?: {
    overall: number;
    amount: number;
    vendor: number;
    date: number;
  };
}

export default function PublicReimbursePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();

  // Page view state
  const [pageView, setPageView] = useState<PageView>("home");
  const [trackingInput, setTrackingInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [spendingLimitWarning, setSpendingLimitWarning] = useState<string | null>(null);
  
  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

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

  // AI Analyze when files are uploaded
  const analyzeReceipts = useCallback(async (urls: string[]) => {
    if (urls.length === 0 || !company) return;
    
    setIsAnalyzing(true);
    setAiResult(null);
    setAiApplied(false);
    
    try {
      const response = await fetch("/api/ai/analyze-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: urls,
          companyId: company.id,
        }),
      });

      if (!response.ok) {
        throw new Error("AI analyze failed");
      }

      const result = await response.json();
      if (result.data) {
        setAiResult(result.data);
        toast.success("AI วิเคราะห์ใบเสร็จสำเร็จ", {
          description: "กดปุ่ม 'ใช้ข้อมูล AI' เพื่อกรอกอัตโนมัติ",
        });
      }
    } catch (error) {
      console.error("AI analyze error:", error);
      // Don't show error toast - AI is optional
    } finally {
      setIsAnalyzing(false);
    }
  }, [company]);

  // Trigger AI analyze when files change
  useEffect(() => {
    if (receiptUrls.length > 0 && company && !aiApplied) {
      const timeoutId = setTimeout(() => {
        analyzeReceipts(receiptUrls);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [receiptUrls, company, aiApplied, analyzeReceipts]);

  // Apply AI result to form
  const applyAiResult = useCallback(() => {
    if (!aiResult?.combined) return;

    const combined = aiResult.combined;
    
    // Apply amount
    const amount = combined.totalAmount || combined.amount;
    if (amount && amount > 0) {
      setValue("amount", amount);
    }

    // Apply date
    if (combined.date) {
      try {
        const date = new Date(combined.date);
        if (!isNaN(date.getTime())) {
          setValue("billDate", date.toISOString().split("T")[0]);
        }
      } catch {
        // Ignore invalid date
      }
    }

    // Apply description
    let description = "";
    if (combined.description) {
      description = combined.description;
    } else if (combined.vendorName) {
      description = `ค่าใช้จ่ายจาก ${combined.vendorName}`;
    } else if (combined.items && combined.items.length > 0) {
      description = combined.items.slice(0, 3).join(", ");
    }
    
    if (description) {
      setValue("description", description);
    }

    setAiApplied(true);
    toast.success("กรอกข้อมูลจาก AI แล้ว");
  }, [aiResult, setValue]);

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

  // Handle file change
  const handleFilesChange = (urls: string[]) => {
    setReceiptUrls(urls);
    if (urls.length === 0) {
      setAiResult(null);
      setAiApplied(false);
    }
  };

  // Handle tracking
  const handleTrack = async () => {
    if (!trackingInput.trim()) {
      toast.error("กรุณาใส่รหัสติดตาม");
      return;
    }

    setIsTracking(true);
    try {
      const response = await fetch(`/api/track/${trackingInput.trim().toUpperCase()}`);
      if (response.ok) {
        router.push(`/track/${trackingInput.trim().toUpperCase()}`);
      } else {
        toast.error("ไม่พบรหัสติดตามนี้ กรุณาตรวจสอบอีกครั้ง");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsTracking(false);
    }
  };

  // Home page - Choose action
  if (pageView === "home") {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="bg-background border-b">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            {company?.logoUrl && (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <div>
              <h1 className="font-semibold">{company?.name || "Bill Tracker"}</h1>
              <p className="text-xs text-muted-foreground">ระบบเบิกจ่ายออนไลน์</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Create Request Card */}
          <button
            type="button"
            className="w-full text-left bg-card rounded-lg border hover:shadow-md transition-shadow hover:border-primary/50 p-5 flex items-center gap-4"
            onClick={() => setPageView("create")}
          >
            <div className="p-3 rounded-xl bg-primary/10">
              <PlusCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">ส่งคำขอเบิกจ่าย</h2>
              <p className="text-muted-foreground text-sm">
                อัปโหลดใบเสร็จและส่งคำขอเบิกเงิน
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
          </button>

          {/* Track Request Card */}
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">ติดตามสถานะ</CardTitle>
                  <CardDescription>ตรวจสอบสถานะคำขอเบิกจ่ายของคุณ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="ใส่รหัสติดตาม เช่น RB-ABC123"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  className="font-mono"
                />
                <Button 
                  onClick={handleTrack}
                  disabled={isTracking}
                >
                  {isTracking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ค้นหา"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              ✨ AI ช่วยอ่านใบเสร็จอัตโนมัติ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading overlay
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-semibold">กำลังส่งคำขอ...</p>
                <p className="text-sm text-muted-foreground mt-1">กรุณารอสักครู่</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success page
  if (trackingCode) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="bg-background border-b">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            {company?.logoUrl && (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <div>
              <h1 className="font-semibold">{company?.name || "Bill Tracker"}</h1>
              <p className="text-xs text-muted-foreground">ระบบเบิกจ่ายออนไลน์</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto p-4 pt-8">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">ส่งคำขอสำเร็จ!</CardTitle>
              <CardDescription>
                คำขอเบิกจ่ายของคุณได้รับการบันทึกเรียบร้อยแล้ว
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  รหัสติดตามสถานะ
                </p>
                <p className="text-2xl font-bold font-mono tracking-wider">
                  {trackingCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  เก็บรหัสนี้ไว้เพื่อเช็คสถานะการเบิกจ่าย
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  คำขอของคุณจะได้รับการพิจารณาภายใน 1-3 วันทำการ
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
                onClick={() => {
                  setTrackingCode(null);
                  setPageView("home");
                  setReceiptUrls([]);
                  setAiResult(null);
                  setAiApplied(false);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับหน้าหลัก
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Submit form page
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPageView("home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {company?.logoUrl && (
            <Image
              src={company.logoUrl}
              alt={company.name}
              width={32}
              height={32}
              className="rounded-lg"
            />
          )}
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{company?.name}</h1>
            <p className="text-xs text-muted-foreground">ส่งคำขอเบิกจ่าย</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">

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
              {/* Receipt Upload with AI */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  รูปใบเสร็จ <span className="text-destructive">*</span>
                  {isAnalyzing && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      AI กำลังวิเคราะห์...
                    </span>
                  )}
                </Label>
                <FileUpload
                  value={receiptUrls}
                  onChange={handleFilesChange}
                  folder="receipts"
                  maxFiles={5}
                />
                <p className="text-xs text-muted-foreground">
                  อัปโหลดรูปใบเสร็จหรือหลักฐานการจ่ายเงิน (สูงสุด 5 รูป) - AI จะช่วยอ่านข้อมูลให้อัตโนมัติ
                </p>
              </div>

              {/* AI Result Preview */}
              {aiResult && !aiApplied && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      <span className="font-medium text-violet-900 dark:text-violet-100">
                        AI อ่านข้อมูลได้
                      </span>
                      {aiResult.confidence?.overall && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300">
                          {aiResult.confidence.overall}% confident
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyAiResult}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      ใช้ข้อมูล AI
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(aiResult.combined.totalAmount || aiResult.combined.amount) && (
                      <div>
                        <span className="text-muted-foreground">ยอดเงิน:</span>
                        <span className="ml-2 font-semibold text-violet-700 dark:text-violet-300">
                          ฿{(aiResult.combined.totalAmount || aiResult.combined.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {aiResult.combined.date && (
                      <div>
                        <span className="text-muted-foreground">วันที่:</span>
                        <span className="ml-2 font-medium">
                          {new Date(aiResult.combined.date).toLocaleDateString("th-TH")}
                        </span>
                      </div>
                    )}
                    {aiResult.combined.vendorName && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">ร้านค้า:</span>
                        <span className="ml-2 font-medium">{aiResult.combined.vendorName}</span>
                      </div>
                    )}
                    {aiResult.combined.description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">รายละเอียด:</span>
                        <span className="ml-2">{aiResult.combined.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Applied Badge */}
              {aiApplied && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    กรอกข้อมูลจาก AI แล้ว - คุณสามารถแก้ไขได้ตามต้องการ
                  </AlertDescription>
                </Alert>
              )}

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
