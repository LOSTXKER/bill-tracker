"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bell, AlertCircle, MessageSquare, ArrowRight } from "lucide-react";
import { LineNotificationSettings } from "@/components/line-notification-settings";
import { LineNotifySettings } from "@/lib/notifications/settings";
import { Button } from "@/components/ui/button";

interface NotificationSectionProps {
  companyId: string;
}

export function NotificationSection({ companyId }: NotificationSectionProps) {
  const [loading, setLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<LineNotifySettings | null>(null);
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [notifyEnabled, setNotifyEnabled] = React.useState(false);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [configRes, settingsRes] = await Promise.all([
          fetch(`/api/companies/${companyId}/line-config`),
          fetch(`/api/companies/${companyId}/line-config/settings`),
        ]);

        if (configRes.ok) {
          const configData = await configRes.json();
          // API response is wrapped: { success: true, data: {...} }
          const data = configData.data || configData;
          setIsConfigured(data.isConfigured && data.groupId);
          setNotifyEnabled(data.notifyEnabled);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          // API response is wrapped: { success: true, data: {...} }
          const data = settingsData.data || settingsData;
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch notification settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show warning if LINE Bot not configured, but still show settings
  const showWarning = !isConfigured || !notifyEnabled;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {showWarning ? (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted border">
          <div className="h-12 w-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">ยังไม่พร้อมส่งข้อความ</p>
            <p className="text-sm text-muted-foreground">
              {!isConfigured
                ? "ตั้งค่า LINE Bot และเพิ่มบอทเข้ากลุ่มก่อน"
                : "เปิดการแจ้งเตือนอัตโนมัติในหน้า LINE Bot"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            ไปที่ LINE Bot
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">การแจ้งเตือนเปิดใช้งานอยู่</p>
            <p className="text-sm text-muted-foreground">
              ข้อความจะถูกส่งไปที่กลุ่ม LINE ของคุณอัตโนมัติ
            </p>
          </div>
        </div>
      )}

      {/* Main Settings */}
      <LineNotificationSettings
        companyId={companyId}
        initialSettings={settings || undefined}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
