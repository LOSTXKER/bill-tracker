"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Calendar, Bell, FileText, Save } from "lucide-react";

interface WhtSettingsSectionProps {
  companyCode: string;
}

interface WhtSettings {
  whtDeadlineDay: number;
  whtReminderDays: number;
  docReminderDays: number;
  whtReminderEnabled: boolean;
  docReminderEnabled: boolean;
  lineNotifyEnabled: boolean;
}

export function WhtSettingsSection({ companyCode }: WhtSettingsSectionProps) {
  const [settings, setSettings] = useState<WhtSettings>({
    whtDeadlineDay: 7,
    whtReminderDays: 3,
    docReminderDays: 7,
    whtReminderEnabled: true,
    docReminderEnabled: true,
    lineNotifyEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/${companyCode}/wht-settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data.data);
        }
      } catch (error) {
        console.error("Error fetching WHT settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [companyCode]);

  const handleChange = (field: keyof WhtSettings, value: number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/${companyCode}/wht-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "เกิดข้อผิดพลาด");
      }

      toast.success("บันทึกการตั้งค่าสำเร็จ");
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          การตั้งค่า WHT และเอกสาร
        </CardTitle>
        <CardDescription>
          กำหนดการแจ้งเตือนสำหรับ WHT และเอกสารที่ค้าง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WHT Deadline */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            กำหนดนำส่ง WHT
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whtDeadlineDay">วันที่กำหนดนำส่ง (ของเดือนถัดไป)</Label>
              <Input
                id="whtDeadlineDay"
                type="number"
                min={1}
                max={28}
                value={settings.whtDeadlineDay}
                onChange={(e) => handleChange("whtDeadlineDay", parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                ตามกฎหมาย ต้องนำส่งภายในวันที่ 7 ของเดือนถัดไป
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whtReminderDays">แจ้งเตือนก่อนกำหนด (วัน)</Label>
              <Input
                id="whtReminderDays"
                type="number"
                min={1}
                max={14}
                value={settings.whtReminderDays}
                onChange={(e) => handleChange("whtReminderDays", parseInt(e.target.value) || 3)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="whtReminderEnabled">เปิดการแจ้งเตือน WHT Deadline</Label>
              <p className="text-sm text-muted-foreground">
                แจ้งเตือนเมื่อใกล้กำหนดนำส่ง WHT
              </p>
            </div>
            <Switch
              id="whtReminderEnabled"
              checked={settings.whtReminderEnabled}
              onCheckedChange={(checked) => handleChange("whtReminderEnabled", checked)}
            />
          </div>
        </div>

        {/* Document Reminder */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            การแจ้งเตือนเอกสารค้าง
          </h4>

          <div className="space-y-2">
            <Label htmlFor="docReminderDays">แจ้งเตือนเมื่อเอกสารค้างนาน (วัน)</Label>
            <Input
              id="docReminderDays"
              type="number"
              min={1}
              max={30}
              value={settings.docReminderDays}
              onChange={(e) => handleChange("docReminderDays", parseInt(e.target.value) || 7)}
            />
            <p className="text-xs text-muted-foreground">
              เช่น รอใบกำกับภาษี, รอใบ 50 ทวิ นานเกินกี่วันจะแจ้งเตือน
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="docReminderEnabled">เปิดการแจ้งเตือนเอกสารค้าง</Label>
              <p className="text-sm text-muted-foreground">
                แจ้งเตือนเมื่อมีเอกสารที่รอนานเกินกำหนด
              </p>
            </div>
            <Switch
              id="docReminderEnabled"
              checked={settings.docReminderEnabled}
              onCheckedChange={(checked) => handleChange("docReminderEnabled", checked)}
            />
          </div>
        </div>

        {/* LINE Notification Info */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 การแจ้งเตือนจะส่งผ่าน LINE ถ้าตั้งค่า LINE Notification ไว้แล้ว
            {settings.lineNotifyEnabled ? (
              <span className="text-green-600 font-medium ml-1">✓ LINE Notification เปิดใช้งานอยู่</span>
            ) : (
              <span className="text-amber-600 font-medium ml-1">⚠️ LINE Notification ยังไม่ได้เปิด</span>
            )}
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            บันทึกการตั้งค่า
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
