"use client";

import { useState, useCallback } from "react";
import { Loader2, Sparkles, MessageSquareText, Clipboard, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MultiDocAnalysisResult } from "@/lib/ai/types";

interface TextInputSectionProps {
  companyCode: string;
  transactionType: "expense" | "income";
  onAiResult?: (result: MultiDocAnalysisResult) => void;
}

export function TextInputSection({
  companyCode,
  transactionType,
  onAiResult,
}: TextInputSectionProps) {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        setIsAnalyzed(false);
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      setError("ไม่สามารถอ่าน clipboard ได้");
    }
  }, []);

  // Clear text
  const handleClear = useCallback(() => {
    setText("");
    setIsAnalyzed(false);
    setError(null);
  }, []);

  // Analyze text with AI
  const analyzeText = async () => {
    if (!text.trim()) {
      setError("กรุณาใส่ข้อความ");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          companyCode: companyCode.toUpperCase(),
          type: transactionType,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error?.message || responseData.error || "การวิเคราะห์ล้มเหลว");
      }

      const result = responseData.data;
      setIsAnalyzed(true);

      // Convert to MultiDocAnalysisResult format for compatibility
      if (onAiResult && result) {
        const aiResult: MultiDocAnalysisResult = {
          // Smart extracted data
          smart: {
            vendor: result.vendor,
            date: result.date,
            currency: result.currency || "THB",
            amount: result.amount,
            vatAmount: result.vatAmount,
            vatRate: result.vatRate,
            wht: result.wht,
            netAmount: result.netAmount,
            documentType: "TEXT_INPUT",
            invoiceNumber: result.invoiceNumber,
            items: result.items || [],
            confidence: result.confidence,
            description: result.description,
          },
          // AI account suggestion
          aiAccountSuggestion: result.account?.id ? {
            account: {
              id: result.account.id,
              code: result.account.code,
              name: result.account.name,
            },
            confidence: result.account.confidence || 0,
            reason: result.account.reason || "AI วิเคราะห์จากข้อความ",
            alternatives: result.accountAlternatives || [],
          } : undefined,
          // No file assignments for text input
          fileAssignments: {},
          // Empty categorized URLs
          categorizedUrls: {
            invoice: [],
            slip: [],
            whtCert: [],
          },
        };

        onAiResult(aiResult);
      }
    } catch (err) {
      console.error("Text analysis error:", err);
      setError(err instanceof Error ? err.message : "การวิเคราะห์ล้มเหลว");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" />
          วางข้อความจาก Line / SMS / อื่นๆ
          {isAnalyzed && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              AI วิเคราะห์แล้ว
            </span>
          )}
        </Label>
      </div>

      {/* Info Box */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>วิธีใช้:</strong> Copy ข้อความจาก Line, SMS, Email หรือพิมพ์เอง เช่น:
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-0.5 list-disc list-inside">
          <li>"จ่ายค่าหมึก DTF ให้ร้านอินดี้ 8,500 บาท วันนี้"</li>
          <li>"โอนค่าขนส่ง Kerry 350 บาท"</li>
          <li>"ลูกค้าโอนค่าสินค้า 12,000 บาท มี VAT"</li>
        </ul>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePaste}
            disabled={isAnalyzing}
          >
            <Clipboard className="h-4 w-4 mr-1" />
            วาง
          </Button>
          {text && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isAnalyzing}
            >
              <X className="h-4 w-4 mr-1" />
              ล้าง
            </Button>
          )}
        </div>
        <Textarea
          placeholder="วางหรือพิมพ์ข้อความที่นี่..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setIsAnalyzed(false);
          }}
          rows={5}
          className={cn(
            "resize-none",
            isAnalyzing && "opacity-50"
          )}
          disabled={isAnalyzing}
        />
        <p className="text-xs text-muted-foreground text-right">
          {text.length} ตัวอักษร
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <MessageSquareText className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* AI Analyze Button */}
      {text.trim().length > 0 && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI วิเคราะห์ข้อความ</p>
                <p className="text-xs text-muted-foreground">
                  {isAnalyzed
                    ? "วิเคราะห์แล้ว แก้ไขข้อความได้หากต้องการวิเคราะห์ใหม่"
                    : "ดึงข้อมูลผู้ติดต่อ ยอดเงิน และบัญชีอัตโนมัติ"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={isAnalyzed ? "outline" : "default"}
              size="sm"
              onClick={analyzeText}
              disabled={isAnalyzing || !text.trim()}
              className={cn(!isAnalyzed && "bg-primary hover:bg-primary/90")}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังวิเคราะห์...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAnalyzed ? "วิเคราะห์ใหม่" : "วิเคราะห์"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
