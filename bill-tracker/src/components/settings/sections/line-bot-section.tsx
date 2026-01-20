"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Bell,
  BellOff,
  Send,
  Link2,
  Unlink,
  AlertCircle,
  HelpCircle,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface LineBotSectionProps {
  companyId: string;
  companyCode: string;
}

export function LineBotSection({ companyId, companyCode }: LineBotSectionProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [config, setConfig] = React.useState<{
    channelSecret: string | null;
    channelAccessToken: string | null;
    groupId: string | null;
    notifyEnabled: boolean;
    isConfigured: boolean;
  } | null>(null);

  const [formData, setFormData] = React.useState({
    channelSecret: "",
    channelAccessToken: "",
    groupId: "",
  });

  const [isEditing, setIsEditing] = React.useState(false);
  const [webhookUrl, setWebhookUrl] = React.useState("/api/line/webhook");

  React.useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/line/webhook`);
  }, []);

  React.useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/line-config`);
        if (response.ok) {
          const result = await response.json();
          // API returns { success: true, data: {...} }
          const data = result.data || result;
          setConfig(data);
          setFormData({
            channelSecret: "",
            channelAccessToken: "",
            groupId: data.groupId || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch LINE config:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [companyId]);

  const handleSave = async () => {
    if (!formData.channelSecret || !formData.channelAccessToken) {
      toast.error("กรุณากรอก Channel Secret และ Access Token");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setConfig({
          channelSecret: config?.channelSecret ?? null,
          channelAccessToken: config?.channelAccessToken ?? null,
          isConfigured: true,
          groupId: formData.groupId || null,
          notifyEnabled: config?.notifyEnabled ?? true,
        });
        setIsEditing(false);
        toast.success("บันทึกการตั้งค่า LINE Bot สำเร็จ");
      } else {
        const error = await response.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Failed to save LINE config:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบการตั้งค่า LINE Bot?")) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConfig({
          channelSecret: null,
          channelAccessToken: null,
          groupId: null,
          notifyEnabled: true,
          isConfigured: false,
        });
        setFormData({ channelSecret: "", channelAccessToken: "", groupId: "" });
        setIsEditing(false);
        toast.success("ลบการตั้งค่า LINE Bot สำเร็จ");
      }
    } catch (error) {
      console.error("Failed to remove LINE config:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotify = async (enabled: boolean) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEnabled: enabled }),
      });

      if (response.ok) {
        setConfig((prev) => (prev ? { ...prev, notifyEnabled: enabled } : null));
        toast.success(enabled ? "เปิดการแจ้งเตือนแล้ว" : "ปิดการแจ้งเตือนแล้ว");
      }
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "PUT",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("ส่งข้อความทดสอบสำเร็จ");
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error("เกิดข้อผิดพลาดในการส่งข้อความ");
    } finally {
      setTesting(false);
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
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card className={config?.isConfigured ? "border-primary/30" : ""}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                config?.isConfigured
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">
                {config?.isConfigured ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
              </p>
              <p className="text-sm text-muted-foreground">
                {config?.isConfigured
                  ? config.groupId
                    ? "บอทพร้อมส่งข้อความ"
                    : "รอเพิ่มบอทเข้ากลุ่ม"
                  : "ตั้งค่าเพื่อรับแจ้งเตือนผ่าน LINE"}
              </p>
            </div>
          </div>
          <Badge variant={config?.isConfigured ? "default" : "secondary"}>
            {config?.isConfigured ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                เชื่อมต่อแล้ว
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                รอตั้งค่า
              </>
            )}
          </Badge>
        </CardContent>
      </Card>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">การตั้งค่า LINE Bot</CardTitle>
          <CardDescription>
            เชื่อมต่อ LINE Official Account เพื่อรับแจ้งเตือนอัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing && config?.isConfigured ? (
            <>
              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleSendTest}
                  disabled={testing || !config.groupId}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  ทดสอบส่งข้อความ
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Link2 className="h-4 w-4" />
                  แก้ไขการเชื่อมต่อ
                </Button>
              </div>

              <Separator />

              {/* Notification Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {config.notifyEnabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">แจ้งเตือนอัตโนมัติ</p>
                    <p className="text-sm text-muted-foreground">
                      ส่งข้อความเมื่อมีรายการใหม่
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.notifyEnabled}
                  onCheckedChange={handleToggleNotify}
                  disabled={saving || !config.groupId}
                />
              </div>

              {!config.groupId && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    ต้องเพิ่มบอทเข้ากลุ่ม LINE แล้วพิมพ์ &quot;group id&quot; เพื่อเปิดการแจ้งเตือน
                  </p>
                </div>
              )}

              <Separator />

              {/* Current Config Display */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Channel Secret</Label>
                    <Input value={config.channelSecret || "••••••••"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Access Token</Label>
                    <Input value={config.channelAccessToken || "••••••••"} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Group ID</Label>
                  <Input
                    value={config.groupId || "ยังไม่มี (พิมพ์ 'group id' ในกลุ่ม LINE)"}
                    disabled
                  />
                </div>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive gap-2"
                onClick={handleRemove}
                disabled={saving}
              >
                <Unlink className="h-4 w-4" />
                ยกเลิกการเชื่อมต่อ
              </Button>
            </>
          ) : (
            <>
              {/* Setup Instructions */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    วิธีตั้งค่า LINE Bot
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      ไปที่{" "}
                      <a
                        href="https://developers.line.biz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-1"
                      >
                        LINE Developers Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>สร้าง Messaging API Channel</li>
                    <li>คัดลอก Channel Secret และ Channel Access Token</li>
                    <li>
                      ตั้งค่า Webhook URL:{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">
                        {webhookUrl}
                      </code>
                    </li>
                    <li>เปิดใช้งาน Webhook และเพิ่มบอทเข้ากลุ่ม</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Setup Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channelSecret">
                    Channel Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channelSecret"
                    type="password"
                    placeholder="กรอก Channel Secret"
                    value={formData.channelSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, channelSecret: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelAccessToken">
                    Channel Access Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channelAccessToken"
                    type="password"
                    placeholder="กรอก Channel Access Token"
                    value={formData.channelAccessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, channelAccessToken: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupId">
                    Group ID <span className="text-muted-foreground">(ไม่บังคับ)</span>
                  </Label>
                  <Input
                    id="groupId"
                    placeholder="บอทจะบันทึกอัตโนมัติเมื่อเข้ากลุ่ม"
                    value={formData.groupId}
                    onChange={(e) =>
                      setFormData({ ...formData, groupId: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {config?.isConfigured && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        channelSecret: "",
                        channelAccessToken: "",
                        groupId: config.groupId || "",
                      });
                    }}
                    disabled={saving}
                  >
                    ยกเลิก
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.channelSecret || !formData.channelAccessToken}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึกการตั้งค่า"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Commands Help */}
      {config?.isConfigured && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-5 w-5 text-primary" />
              คำสั่งที่ใช้ได้ใน LINE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {[
                { cmd: "help", desc: "ดูคำสั่งทั้งหมด" },
                { cmd: "group id", desc: "ดู Group ID ของกลุ่ม" },
                { cmd: "summary", desc: "สรุปรายการวันนี้" },
                { cmd: "budget", desc: "ดูสถานะงบประมาณ" },
              ].map((item) => (
                <div
                  key={item.cmd}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                >
                  <code className="text-primary font-medium">{item.cmd}</code>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
