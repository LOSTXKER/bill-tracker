"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Sun, Moon, Monitor, Globe, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="h-32 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            ธีม
          </CardTitle>
          <CardDescription>
            เลือกโหมดการแสดงผลที่คุณชอบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid gap-3 sm:grid-cols-3"
          >
            {[
              {
                value: "light",
                label: "สว่าง",
                icon: <Sun className="h-5 w-5" />,
                description: "ธีมสีอ่อน",
              },
              {
                value: "dark",
                label: "มืด",
                icon: <Moon className="h-5 w-5" />,
                description: "ธีมสีเข้ม",
              },
              {
                value: "system",
                label: "ระบบ",
                icon: <Monitor className="h-5 w-5" />,
                description: "ตามการตั้งค่าอุปกรณ์",
              },
            ].map((option) => (
              <Label
                key={option.value}
                htmlFor={option.value}
                className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-muted/50 ${
                  theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/30"
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="sr-only"
                />
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    theme === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {option.icon}
                </div>
                <div className="text-center">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            ภาษา
          </CardTitle>
          <CardDescription>
            ภาษาที่ใช้แสดงผลในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Languages className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">ไทย</p>
                <p className="text-sm text-muted-foreground">ภาษาไทย (Thai)</p>
              </div>
            </div>
            <Badge variant="secondary">ค่าเริ่มต้น</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            การรองรับหลายภาษาจะเปิดให้ใช้งานเร็วๆ นี้
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
