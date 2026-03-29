"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, CheckCircle2, Info } from "lucide-react";

export function CloudStatusCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg">สถานะ Cloud</CardTitle>
            <CardDescription>ข้อมูลถูกจัดเก็บบน Supabase</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-4 bg-primary/5">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">Database</p>
              <p className="text-xs text-muted-foreground">
                Supabase PostgreSQL - Online
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4 bg-primary/5">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">Storage</p>
              <p className="text-xs text-muted-foreground">
                Supabase Storage - Online
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">การสำรองข้อมูลโดย Supabase</p>
              <p className="text-muted-foreground">
                Supabase มีระบบ Point-in-Time Recovery สำหรับ Database
                และเก็บไฟล์บน Cloud Storage อย่างปลอดภัย
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
