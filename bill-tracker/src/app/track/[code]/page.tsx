"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import Image from "next/image";

interface TrackingPageProps {
  params: Promise<{ code: string }>;
}

interface Timeline {
  status: string;
  label: string;
  date: string;
  by?: string;
}

interface TrackingData {
  requesterName: string;
  amount: number;
  description: string | null;
  billDate: string;
  status: string;
  rejectedReason: string | null;
  company: {
    name: string;
    logoUrl?: string;
  };
  timeline: Timeline[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "รออนุมัติ",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
  },
  FLAGGED: {
    label: "ตรวจสอบเพิ่มเติม",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
  },
  APPROVED: {
    label: "อนุมัติแล้ว - รอจ่ายเงิน",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Wallet,
  },
  REJECTED: {
    label: "ถูกปฏิเสธ",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
  },
  PAID: {
    label: "จ่ายเงินแล้ว",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
  },
};

export default function TrackingPage({ params }: TrackingPageProps) {
  const { code } = use(params);
  const router = useRouter();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await fetch(`/api/track/${code}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "ไม่พบข้อมูล");
        }

        setTrackingData(result.data?.request);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracking();
  }, [code]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ไม่พบข้อมูล</h3>
              <p className="text-muted-foreground mb-6">
                {error || "รหัสติดตามสถานะไม่ถูกต้องหรือไม่มีอยู่ในระบบ"}
              </p>
              <Button onClick={() => router.push("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับหน้าหลัก
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[trackingData.status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Company Header */}
        <div className="text-center">
          {trackingData.company.logoUrl && (
            <div className="mb-4">
              <Image
                src={trackingData.company.logoUrl}
                alt={trackingData.company.name}
                width={80}
                height={80}
                className="mx-auto rounded-lg"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold">{trackingData.company.name}</h1>
          <p className="text-muted-foreground text-sm">ติดตามสถานะคำขอเบิกจ่าย</p>
        </div>

        {/* Tracking Code */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                รหัสติดตามสถานะ
              </p>
              <p className="text-xl font-bold font-mono">{code}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status Badge */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3">
              <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">สถานะปัจจุบัน</p>
                <p className={`text-xl font-bold ${statusInfo.color}`}>
                  {statusInfo.label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Reason */}
        {trackingData.status === "REJECTED" && trackingData.rejectedReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">เหตุผลที่ปฏิเสธ:</p>
              <p className="mt-1">{trackingData.rejectedReason}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              รายละเอียดคำขอ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ผู้ขอเบิก</p>
                <p className="font-medium">{trackingData.requesterName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">จำนวนเงิน</p>
                <p className="font-bold text-primary">
                  {formatCurrency(Number(trackingData.amount))}
                </p>
              </div>
            </div>

            {trackingData.description && (
              <div>
                <p className="text-sm text-muted-foreground">รายละเอียด</p>
                <p className="font-medium">{trackingData.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">วันที่จ่ายเงิน</p>
              <p className="font-medium">
                {new Date(trackingData.billDate).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingData.timeline.map((item, index) => {
                let icon = <Clock className="h-4 w-4" />;
                let colorClass = "bg-primary/10 text-primary";

                if (item.status === "APPROVED") {
                  icon = <CheckCircle2 className="h-4 w-4" />;
                  colorClass = "bg-emerald-100 text-emerald-600";
                } else if (item.status === "REJECTED") {
                  icon = <XCircle className="h-4 w-4" />;
                  colorClass = "bg-red-100 text-red-600";
                } else if (item.status === "PAID") {
                  icon = <CheckCircle2 className="h-4 w-4" />;
                  colorClass = "bg-blue-100 text-blue-600";
                }

                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatThaiDate(item.date)}
                      </p>
                      {item.by && (
                        <p className="text-xs text-muted-foreground">
                          โดย {item.by}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              {trackingData.status === "PENDING" && (
                <>คำขอของคุณกำลังรอการพิจารณา โปรดรอ 1-3 วันทำการ</>
              )}
              {trackingData.status === "APPROVED" && (
                <>คำขอของคุณได้รับการอนุมัติแล้ว กำลังดำเนินการจ่ายเงิน</>
              )}
              {trackingData.status === "PAID" && (
                <>เงินได้รับการโอนเรียบร้อยแล้ว กรุณาตรวจสอบบัญชีของคุณ</>
              )}
              {trackingData.status === "REJECTED" && (
                <>คำขอของคุณถูกปฏิเสธ กรุณาติดต่อฝ่ายบัญชีหากมีข้อสงสัย</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
