"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LineBotSettingsProps {
  companyId: string;
  companyCode: string;
}

export function LineBotSettings({ companyId, companyCode }: LineBotSettingsProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<{
    channelSecret: string | null;
    channelAccessToken: string | null;
    groupId: string | null;
    isConfigured: boolean;
  } | null>(null);

  const [formData, setFormData] = React.useState({
    channelSecret: "",
    channelAccessToken: "",
    groupId: "",
  });

  const [isEditing, setIsEditing] = React.useState(false);

  // Fetch current config
  React.useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/line-config`);
        if (response.ok) {
          const data = await response.json();
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
        const data = await response.json();
        setConfig({
          ...config,
          isConfigured: true,
          groupId: formData.groupId || null,
        });
        setIsEditing(false);
        toast.success("✅ บันทึกการตั้งค่า LINE Bot สำเร็จ!");
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
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบการตั้งค่า LINE Bot?")) {
      return;
    }

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
          isConfigured: false,
        });
        setFormData({
          channelSecret: "",
          channelAccessToken: "",
          groupId: "",
        });
        setIsEditing(false);
        toast.success("ลบการตั้งค่า LINE Bot สำเร็จ");
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Failed to remove LINE config:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/line/webhook`
    : "/api/line/webhook";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            LINE Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          LINE Bot
          {config?.isConfigured && (
            <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              เชื่อมต่อแล้ว
            </Badge>
          )}
          {config && !config.isConfigured && (
            <Badge variant="outline" className="ml-auto text-slate-500">
              <XCircle className="h-3 w-3 mr-1" />
              ยังไม่เชื่อมต่อ
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          ตั้งค่าบอทสำหรับรับแจ้งเตือนและสั่งงานผ่าน LINE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing && config?.isConfigured ? (
          // Display mode
          <>
            <div className="space-y-2">
              <Label>Channel Secret</Label>
              <Input value={config.channelSecret || "••••••••"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Channel Access Token</Label>
              <Input value={config.channelAccessToken || "••••••••"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Group ID</Label>
              <Input 
                value={config.groupId || "ยังไม่มี (บอทจะบันทึกอัตโนมัติเมื่อเข้ากลุ่ม)"} 
                disabled 
              />
              {config.groupId && (
                <p className="text-xs text-slate-500">
                  ✅ บอทอยู่ในกลุ่มแล้ว
                </p>
              )}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                แก้ไข
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 hover:text-red-700"
                onClick={handleRemove}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ลบการตั้งค่า"}
              </Button>
            </div>
          </>
        ) : (
          // Edit mode
          <>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                📚 วิธีตั้งค่า LINE Bot:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>
                  ไปที่{" "}
                  <a 
                    href="https://developers.line.biz/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    LINE Developers Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>สร้าง Messaging API Channel</li>
                <li>คัดลอก Channel Secret และ Channel Access Token</li>
                <li>ตั้งค่า Webhook URL: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{webhookUrl}</code></li>
                <li>เปิดใช้งาน Webhook</li>
                <li>เพิ่มบอทเข้า LINE Group</li>
                <li>พิมพ์ "group id" ใน Group เพื่อดู Group ID</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelSecret">
                Channel Secret <span className="text-red-500">*</span>
              </Label>
              <Input
                id="channelSecret"
                type="password"
                placeholder="กรอก Channel Secret"
                value={formData.channelSecret}
                onChange={(e) => setFormData({ ...formData, channelSecret: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channelAccessToken">
                Channel Access Token <span className="text-red-500">*</span>
              </Label>
              <Input
                id="channelAccessToken"
                type="password"
                placeholder="กรอก Channel Access Token"
                value={formData.channelAccessToken}
                onChange={(e) => setFormData({ ...formData, channelAccessToken: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupId">
                Group ID <span className="text-slate-500">(ไม่บังคับ)</span>
              </Label>
              <Input
                id="groupId"
                placeholder="บอทจะบันทึกอัตโนมัติเมื่อเข้ากลุ่ม"
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                💡 ไม่จำเป็นต้องกรอก - บอทจะบันทึก Group ID อัตโนมัติเมื่อคุณพิมพ์ "group id" ในกลุ่ม
              </p>
            </div>

            <Separator />

            <div className="flex gap-2">
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

        {config?.isConfigured && !isEditing && (
          <>
            <Separator />
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 space-y-2 text-sm">
              <p className="font-medium text-green-900 dark:text-green-100">
                ✅ LINE Bot พร้อมใช้งาน!
              </p>
              <p className="text-green-800 dark:text-green-200">
                คุณสามารถใช้คำสั่งต่อไปนี้ใน LINE Group:
              </p>
              <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-200">
                <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">help</code> - ดูคำสั่งทั้งหมด</li>
                <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">group id</code> - ดู Group ID</li>
                <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">summary</code> - สรุปรายการวันนี้</li>
                <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">budget</code> - สถานะงบประมาณ</li>
                <li>ส่งรูปใบเสร็จ - วิเคราะห์ด้วย AI (เร็วๆ นี้)</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
