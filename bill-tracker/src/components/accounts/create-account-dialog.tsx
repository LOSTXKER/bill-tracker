"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Loader2, Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CreateAccountDialogProps {
  companyCode: string;
  onAccountCreated?: (account: any) => void;
  // AI suggestion mode
  aiSuggestion?: {
    code?: string;
    name?: string;
    class?: string;
    description?: string;
    keywords?: string[];
    reason?: string;
  };
  trigger?: React.ReactNode;
}

const ACCOUNT_CLASSES = [
  { value: "COST_OF_SALES", label: "ต้นทุนขาย", prefix: "51" },
  { value: "EXPENSE", label: "ค่าใช้จ่าย", prefix: "52-53" },
  { value: "REVENUE", label: "รายได้จากการขาย", prefix: "41" },
  { value: "OTHER_INCOME", label: "รายได้อื่น", prefix: "42" },
];

export function CreateAccountDialog({
  companyCode,
  onAccountCreated,
  aiSuggestion,
  trigger,
}: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [code, setCode] = useState(aiSuggestion?.code || "");
  const [name, setName] = useState(aiSuggestion?.name || "");
  const [accountClass, setAccountClass] = useState(aiSuggestion?.class || "EXPENSE");
  const [description, setDescription] = useState(aiSuggestion?.description || "");
  const [keywordsText, setKeywordsText] = useState(
    aiSuggestion?.keywords?.join(", ") || ""
  );

  const resetForm = () => {
    setCode(aiSuggestion?.code || "");
    setName(aiSuggestion?.name || "");
    setAccountClass(aiSuggestion?.class || "EXPENSE");
    setDescription(aiSuggestion?.description || "");
    setKeywordsText(aiSuggestion?.keywords?.join(", ") || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !name.trim()) {
      toast.error("กรุณากรอกรหัสและชื่อบัญชี");
      return;
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      toast.error("รหัสบัญชีต้องเป็นตัวเลข 6 หลัก");
      return;
    }

    setLoading(true);
    try {
      const keywords = keywordsText
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);

      const response = await fetch(`/api/${companyCode.toLowerCase()}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          class: accountClass,
          description: description || null,
          keywords,
        }),
      });

      const json = await response.json();
      
      if (!response.ok || !json.success) {
        throw new Error(json.error || "ไม่สามารถสร้างบัญชีได้");
      }

      const account = json.data?.account || json;
      toast.success(`สร้างบัญชี ${code} ${name} สำเร็จ`);
      onAccountCreated?.(account);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  // Get suggested prefix based on class
  const getPrefix = () => {
    switch (accountClass) {
      case "COST_OF_SALES": return "51";
      case "EXPENSE": return "52";
      case "REVENUE": return "41";
      case "OTHER_INCOME": return "42";
      default: return "53";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            สร้างบัญชีใหม่
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {aiSuggestion ? (
              <>
                <Sparkles className="h-5 w-5 text-amber-500" />
                AI แนะนำบัญชีใหม่
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                สร้างบัญชีใหม่
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            สร้างบัญชีใหม่สำหรับจัดประเภทรายรับ-รายจ่าย
          </DialogDescription>
        </DialogHeader>

        {/* AI Suggestion Info */}
        {aiSuggestion?.reason && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  เหตุผลที่แนะนำ:
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  {aiSuggestion.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Class */}
          <div className="space-y-2">
            <Label htmlFor="class">ประเภทบัญชี</Label>
            <Select
              value={accountClass}
              onValueChange={(v) => setAccountClass(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_CLASSES.map((cls) => (
                  <SelectItem key={cls.value} value={cls.value}>
                    {cls.label} ({cls.prefix}xxxx)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">
              รหัสบัญชี <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={`${getPrefix()}0101`}
                maxLength={6}
                className="font-mono"
              />
              <Badge variant="outline" className="whitespace-nowrap">
                {code.length}/6 หลัก
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              แนะนำ: ใช้รหัสที่ขึ้นต้นด้วย {getPrefix()} สำหรับ{" "}
              {ACCOUNT_CLASSES.find((c) => c.value === accountClass)?.label}
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              ชื่อบัญชี <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ค่าบริการ AWS"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย (ไม่บังคับ)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="คำอธิบายเพิ่มเติม..."
              rows={2}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">
              คีย์เวิร์ดสำหรับ AI (คั่นด้วย comma)
            </Label>
            <Input
              id="keywords"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="เช่น aws, amazon, cloud, ec2"
            />
            <p className="text-xs text-muted-foreground">
              AI จะใช้คีย์เวิร์ดเหล่านี้เพื่อแนะนำบัญชีนี้โดยอัตโนมัติ
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  สร้างบัญชี
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
