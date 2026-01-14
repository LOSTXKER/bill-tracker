"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Check,
  Save,
  Eye,
  Settings2,
  Zap,
  FileText,
  Wallet,
  AtSign,
  MessageCircle,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineNotifySettings,
  DEFAULT_NOTIFY_SETTINGS,
  mergeSettings,
} from "@/lib/notifications/settings";
import { cn } from "@/lib/utils";

interface LineNotificationSettingsProps {
  companyId: string;
  initialSettings?: LineNotifySettings;
  onSettingsChange?: (settings: LineNotifySettings) => void;
}

// Preview Component for LINE Message
function MessagePreview({ type, settings }: { type: "expense" | "income"; settings: LineNotifySettings }) {
  const isExpense = type === "expense";
  
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Eye className="h-3 w-3" />
        ตัวอย่างข้อความที่จะส่ง
      </div>
      
      {settings.messageFormat.useFlexMessage ? (
        // Flex Message Preview
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden max-w-[280px]">
          {/* Header */}
          <div className="p-3 flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-lg",
              isExpense ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
            )}>
              {isExpense ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">
                {isExpense ? "รายจ่ายใหม่" : "รายรับใหม่"}
              </p>
              <p className="font-semibold text-sm truncate">บริษัท ABC</p>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              รอส่งบัญชี
            </Badge>
          </div>
          
          {/* Body */}
          <div className="px-3 pb-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2 pt-2">
              <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                {isExpense ? "🏪" : "👤"}
              </div>
              <div>
                <p className="font-medium text-xs">
                  {isExpense ? "ร้านค้าตัวอย่าง" : "ลูกค้าตัวอย่าง"}
                </p>
                <p className="text-[10px] text-muted-foreground">ค่าบริการ</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดก่อน VAT</span>
                <span className="font-medium">฿10,000.00</span>
              </div>
              {settings.messageFormat.showVatBreakdown && (
                <div className="flex justify-between text-blue-600">
                  <span>VAT 7%</span>
                  <span className="font-medium">+฿700.00</span>
                </div>
              )}
              {settings.messageFormat.showWhtInfo && (
                <div className="flex justify-between text-orange-600">
                  <span>{isExpense ? "หัก ณ ที่จ่าย 3%" : "โดนหัก 3%"}</span>
                  <span className="font-medium">-฿300.00</span>
                </div>
              )}
            </div>
            
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-2 flex justify-between items-center">
              <span className="text-xs font-medium">
                {isExpense ? "โอนจริง" : "รับจริง"}
              </span>
              <span className="text-sm font-bold text-green-600">฿10,400.00</span>
            </div>
          </div>
          
          {/* Footer */}
          {settings.messageFormat.showDetailLink && (
            <div className="p-2 bg-background">
              <div className={cn(
                "w-full py-1.5 rounded text-center text-xs font-medium text-white",
                isExpense ? "bg-red-500" : "bg-green-500"
              )}>
                ดูรายละเอียด
              </div>
            </div>
          )}
        </div>
      ) : (
        // Text Message Preview
        <div className="bg-background rounded-lg border p-3 max-w-[280px]">
          <pre className="text-xs whitespace-pre-wrap font-sans">
{isExpense 
  ? `[รายจ่ายใหม่]
ร้านค้าตัวอย่าง
จำนวน: ฿10,000.00
${settings.messageFormat.showVatBreakdown ? "VAT: +฿700.00\n" : ""}${settings.messageFormat.showWhtInfo ? "หัก ณ ที่จ่าย: -฿300.00\n" : ""}โอนจริง: ฿10,400.00
สถานะ: รอส่งบัญชี`
  : `[รายรับใหม่]
ลูกค้าตัวอย่าง
จำนวน: ฿10,000.00
${settings.messageFormat.showVatBreakdown ? "VAT: +฿700.00\n" : ""}${settings.messageFormat.showWhtInfo ? "โดนหัก: -฿300.00\n" : ""}รับจริง: ฿10,400.00
สถานะ: รอส่งสำเนา`}
          </pre>
        </div>
      )}
    </div>
  );
}

// Quick Toggle Card
function QuickToggle({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  color = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  color?: "primary" | "destructive" | "amber" | "purple";
}) {
  const colorClasses = {
    primary: {
      active: "bg-primary/5 border-primary/30",
      icon: "bg-primary/10 text-primary",
    },
    destructive: {
      active: "bg-destructive/5 border-destructive/30",
      icon: "bg-destructive/10 text-destructive",
    },
    amber: {
      active: "bg-amber-500/5 border-amber-500/30",
      icon: "bg-amber-500/10 text-amber-600",
    },
    purple: {
      active: "bg-purple-500/5 border-purple-500/30",
      icon: "bg-purple-500/10 text-purple-600",
    },
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
        checked ? colorClasses[color].active : "hover:bg-muted/50"
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        checked ? colorClasses[color].icon : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function LineNotificationSettings({
  companyId,
  initialSettings,
  onSettingsChange,
}: LineNotificationSettingsProps) {
  const [settings, setSettings] = React.useState<LineNotifySettings>(() =>
    mergeSettings(initialSettings)
  );
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const updateSettings = (path: string, value: boolean | string | number | number[]) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split(".");
      let current: Record<string, unknown> = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as object) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return newSettings as LineNotifySettings;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/line-config/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast.success("บันทึกการตั้งค่าแล้ว");
        setHasChanges(false);
        onSettingsChange?.(settings);
      } else {
        const error = await response.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_NOTIFY_SETTINGS);
    setHasChanges(true);
    toast.info("รีเซ็ตเป็นค่าเริ่มต้นแล้ว");
  };

  // Count enabled notifications
  const expenseCount = [
    settings.expenses.onCreate.enabled,
    settings.expenses.onStatusChange.enabled,
    settings.expenses.onUpdate.enabled,
    settings.expenses.onDelete.enabled,
  ].filter(Boolean).length;

  const incomeCount = [
    settings.incomes.onCreate.enabled,
    settings.incomes.onStatusChange.enabled,
    settings.incomes.onUpdate.enabled,
    settings.incomes.onDelete.enabled,
  ].filter(Boolean).length;

  const reimbursementCount = [
    settings.reimbursements.onSubmit.enabled,
    settings.reimbursements.onApprove.enabled,
    settings.reimbursements.onReject.enabled,
    settings.reimbursements.onPay.enabled,
  ].filter(Boolean).length;

  const commentCount = [
    settings.comments.onComment.enabled,
    settings.comments.onMention.enabled,
    settings.comments.onReply.enabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={handleSave} disabled={saving} className="shadow-lg gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      )}

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events" className="gap-2">
            <Zap className="h-4 w-4" />
            เหตุการณ์ที่แจ้งเตือน
          </TabsTrigger>
          <TabsTrigger value="format" className="gap-2">
            <Settings2 className="h-4 w-4" />
            รูปแบบข้อความ
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Expense Notifications */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">รายจ่าย</CardTitle>
                    <CardDescription>เลือกเหตุการณ์ที่ต้องการรับแจ้งเตือน</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {expenseCount}/4 เปิดอยู่
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickToggle
                icon={<Zap className="h-5 w-5" />}
                title="สร้างรายจ่ายใหม่"
                description="แจ้งเตือนทันทีเมื่อบันทึกรายจ่าย"
                checked={settings.expenses.onCreate.enabled}
                onCheckedChange={(v) => updateSettings("expenses.onCreate.enabled", v)}
                color="destructive"
              />
              <QuickToggle
                icon={<RefreshCw className="h-5 w-5" />}
                title="เปลี่ยนสถานะ"
                description="เมื่ออัปเดตสถานะเอกสาร"
                checked={settings.expenses.onStatusChange.enabled}
                onCheckedChange={(v) => updateSettings("expenses.onStatusChange.enabled", v)}
                color="destructive"
              />
              <QuickToggle
                icon={<FileText className="h-5 w-5" />}
                title="แก้ไขข้อมูล"
                description="เมื่อมีการแก้ไขรายการ"
                checked={settings.expenses.onUpdate.enabled}
                onCheckedChange={(v) => updateSettings("expenses.onUpdate.enabled", v)}
                color="destructive"
              />
              <QuickToggle
                icon={<Bell className="h-5 w-5" />}
                title="ลบรายการ"
                description="เมื่อลบรายจ่าย"
                checked={settings.expenses.onDelete.enabled}
                onCheckedChange={(v) => updateSettings("expenses.onDelete.enabled", v)}
                color="destructive"
              />
            </CardContent>
          </Card>

          {/* Income Notifications */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">รายรับ</CardTitle>
                    <CardDescription>เลือกเหตุการณ์ที่ต้องการรับแจ้งเตือน</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {incomeCount}/4 เปิดอยู่
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickToggle
                icon={<Zap className="h-5 w-5" />}
                title="สร้างรายรับใหม่"
                description="แจ้งเตือนทันทีเมื่อบันทึกรายรับ"
                checked={settings.incomes.onCreate.enabled}
                onCheckedChange={(v) => updateSettings("incomes.onCreate.enabled", v)}
              />
              <QuickToggle
                icon={<RefreshCw className="h-5 w-5" />}
                title="เปลี่ยนสถานะ"
                description="เมื่ออัปเดตสถานะเอกสาร"
                checked={settings.incomes.onStatusChange.enabled}
                onCheckedChange={(v) => updateSettings("incomes.onStatusChange.enabled", v)}
              />
              <QuickToggle
                icon={<FileText className="h-5 w-5" />}
                title="แก้ไขข้อมูล"
                description="เมื่อมีการแก้ไขรายการ"
                checked={settings.incomes.onUpdate.enabled}
                onCheckedChange={(v) => updateSettings("incomes.onUpdate.enabled", v)}
              />
              <QuickToggle
                icon={<Bell className="h-5 w-5" />}
                title="ลบรายการ"
                description="เมื่อลบรายรับ"
                checked={settings.incomes.onDelete.enabled}
                onCheckedChange={(v) => updateSettings("incomes.onDelete.enabled", v)}
              />
            </CardContent>
          </Card>

          {/* Reimbursement Notifications */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">เบิกจ่าย</CardTitle>
                    <CardDescription>แจ้งเตือนเกี่ยวกับคำขอเบิกจ่าย</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {reimbursementCount}/4 เปิดอยู่
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickToggle
                icon={<Zap className="h-5 w-5" />}
                title="ส่งคำขอใหม่"
                description="เมื่อมีคำขอเบิกจ่ายใหม่"
                checked={settings.reimbursements.onSubmit.enabled}
                onCheckedChange={(v) => updateSettings("reimbursements.onSubmit.enabled", v)}
                color="amber"
              />
              <QuickToggle
                icon={<CheckCircle className="h-5 w-5" />}
                title="อนุมัติ"
                description="เมื่อคำขอได้รับการอนุมัติ"
                checked={settings.reimbursements.onApprove.enabled}
                onCheckedChange={(v) => updateSettings("reimbursements.onApprove.enabled", v)}
                color="amber"
              />
              <QuickToggle
                icon={<XCircle className="h-5 w-5" />}
                title="ปฏิเสธ"
                description="เมื่อคำขอถูกปฏิเสธ"
                checked={settings.reimbursements.onReject.enabled}
                onCheckedChange={(v) => updateSettings("reimbursements.onReject.enabled", v)}
                color="amber"
              />
              <QuickToggle
                icon={<DollarSign className="h-5 w-5" />}
                title="จ่ายเงิน"
                description="เมื่อจ่ายเงินเบิกแล้ว"
                checked={settings.reimbursements.onPay.enabled}
                onCheckedChange={(v) => updateSettings("reimbursements.onPay.enabled", v)}
                color="amber"
              />
            </CardContent>
          </Card>

          {/* Comment & Mention Notifications */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">ความคิดเห็น</CardTitle>
                    <CardDescription>แจ้งเตือนเมื่อมีการ comment หรือ mention</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {commentCount}/3 เปิดอยู่
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickToggle
                icon={<MessageSquare className="h-5 w-5" />}
                title="Comment ใหม่"
                description="เมื่อมี comment ในเอกสารของคุณ"
                checked={settings.comments.onComment.enabled}
                onCheckedChange={(v) => updateSettings("comments.onComment.enabled", v)}
                color="purple"
              />
              <QuickToggle
                icon={<AtSign className="h-5 w-5" />}
                title="ถูก Mention"
                description="เมื่อคุณถูก mention ใน comment"
                checked={settings.comments.onMention.enabled}
                onCheckedChange={(v) => updateSettings("comments.onMention.enabled", v)}
                color="purple"
              />
              <QuickToggle
                icon={<MessageCircle className="h-5 w-5" />}
                title="ตอบกลับ"
                description="เมื่อมีการตอบกลับ comment ของคุณ"
                checked={settings.comments.onReply.enabled}
                onCheckedChange={(v) => updateSettings("comments.onReply.enabled", v)}
                color="purple"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Format Tab */}
        <TabsContent value="format" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Settings Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    รูปแบบข้อความ
                  </CardTitle>
                  <CardDescription>
                    ปรับแต่งข้อมูลที่จะแสดงในข้อความแจ้งเตือน
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>ใช้ Flex Message</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        แสดงข้อความแบบสวยงาม (แนะนำ)
                      </p>
                    </div>
                    <Switch
                      checked={settings.messageFormat.useFlexMessage}
                      onCheckedChange={(v) => updateSettings("messageFormat.useFlexMessage", v)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>แสดงปุ่มดูรายละเอียด</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ลิงก์เปิดดูข้อมูลในเว็บ
                      </p>
                    </div>
                    <Switch
                      checked={settings.messageFormat.showDetailLink}
                      onCheckedChange={(v) => updateSettings("messageFormat.showDetailLink", v)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>แสดงรายละเอียด VAT</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        แสดงยอด VAT ในข้อความ
                      </p>
                    </div>
                    <Switch
                      checked={settings.messageFormat.showVatBreakdown}
                      onCheckedChange={(v) => updateSettings("messageFormat.showVatBreakdown", v)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>แสดงข้อมูลหัก ณ ที่จ่าย</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        แสดงยอดหักภาษีในข้อความ
                      </p>
                    </div>
                    <Switch
                      checked={settings.messageFormat.showWhtInfo}
                      onCheckedChange={(v) => updateSettings("messageFormat.showWhtInfo", v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                ตัวอย่างข้อความ
              </h3>
              
              <Tabs defaultValue="expense" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense" className="gap-1.5 text-xs">
                    <TrendingDown className="h-3.5 w-3.5" />
                    รายจ่าย
                  </TabsTrigger>
                  <TabsTrigger value="income" className="gap-1.5 text-xs">
                    <TrendingUp className="h-3.5 w-3.5" />
                    รายรับ
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="expense" className="mt-4">
                  <MessagePreview type="expense" settings={settings} />
                </TabsContent>
                <TabsContent value="income" className="mt-4">
                  <MessagePreview type="income" settings={settings} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={handleReset} disabled={saving} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเซ็ตเป็นค่าเริ่มต้น
        </Button>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
