"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  User,
  Mail,
  Shield,
  Receipt,
  FileText,
  Crown,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  Plus,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { useSession } from "next-auth/react";

interface Stats {
  reimbursements: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  amounts: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  recentActivity: {
    last30Days: number;
  };
}

interface Reimbursement {
  id: string;
  description: string;
  netAmount: number;
  billDate: string;
  status: string;
  account?: { code: string; name: string };
  approver?: { name: string };
  payer?: { name: string };
  rejectedReason?: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: any;
  createdAt: string;
  ipAddress?: string;
}

interface CompanyAccess {
  isOwner: boolean;
  permissions: string[];
}

export default function MyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [stats, setStats] = useState<Stats | null>(null);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [companyAccess, setCompanyAccess] = useState<CompanyAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch company ID
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        if (result.data?.companies?.[0]) {
          setCompanyId(result.data.companies[0].id);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  // Fetch profile data - using Promise.all for parallel requests
  const fetchProfileData = async () => {
    if (!companyId || !userId) return;

    setIsLoading(true);
    try {
      // Fetch all data in parallel for faster loading
      const [membersRes, statsRes, reimbursementsRes, logsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/members`),
        fetch(`/api/companies/${companyId}/members/${userId}/stats`),
        fetch(`/api/companies/${companyId}/members/${userId}/reimbursements?limit=20`),
        fetch(`/api/companies/${companyId}/members/${userId}/audit-logs?limit=20`),
      ]);

      // Parse all responses in parallel
      const [membersData, statsData, reimbursementsData, logsData] = await Promise.all([
        membersRes.json(),
        statsRes.json(),
        reimbursementsRes.json(),
        logsRes.json(),
      ]);

      // Process and set data
      const myAccess = membersData.members?.find(
        (m: Record<string, unknown>) => m.userId === userId
      );
      setCompanyAccess(myAccess);
      setStats(statsData.stats);
      setReimbursements(reimbursementsData.reimbursements || []);
      setAuditLogs(logsData.logs || []);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [companyId, userId]);

  if (isLoading || !session?.user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            รออนุมัติ
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600">
            <CheckCircle className="h-3 w-3" />
            อนุมัติแล้ว
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600">
            <Wallet className="h-3 w-3" />
            จ่ายแล้ว
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
            <XCircle className="h-3 w-3" />
            ปฏิเสธ
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_EXPENSE: "สร้างรายจ่าย",
      UPDATE_EXPENSE: "แก้ไขรายจ่าย",
      DELETE_EXPENSE: "ลบรายจ่าย",
      CREATE_INCOME: "สร้างรายรับ",
      UPDATE_INCOME: "แก้ไขรายรับ",
      DELETE_INCOME: "ลบรายรับ",
      CREATE_REIMBURSEMENT: "สร้างคำขอเบิกจ่าย",
      APPROVE_REIMBURSEMENT: "อนุมัติเบิกจ่าย",
      REJECT_REIMBURSEMENT: "ปฏิเสธเบิกจ่าย",
      PAY_REIMBURSEMENT: "จ่ายเงินคืน",
      LOGIN: "เข้าสู่ระบบ",
      LOGOUT: "ออกจากระบบ",
      UPDATE_SETTINGS: "แก้ไขการตั้งค่า",
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {session.user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            router.push(`/${companyCode.toLowerCase()}/reimbursements/new`)
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          ขอเบิกจ่าย
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">เบิกจ่ายทั้งหมด</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.reimbursements.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.amounts.total)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">รออนุมัติ</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {stats.reimbursements.pending}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.amounts.pending)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">รอจ่ายเงิน</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.reimbursements.approved}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.amounts.approved)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.reimbursements.paid}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.amounts.paid)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">กิจกรรม 30 วัน</p>
                <p className="text-2xl font-bold text-primary">
                  {stats.recentActivity.last30Days}
                </p>
                <p className="text-xs text-muted-foreground">รายการ</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="reimbursements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reimbursements" className="gap-2">
            <Receipt className="h-4 w-4" />
            ประวัติเบิกจ่าย
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            กิจกรรมของฉัน
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <User className="h-4 w-4" />
            ข้อมูลและสิทธิ์
          </TabsTrigger>
        </TabsList>

        {/* Reimbursements Tab */}
        <TabsContent value="reimbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">ประวัติการเบิกจ่ายของฉัน</CardTitle>
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/${companyCode.toLowerCase()}/reimbursements`)
                  }
                >
                  ดูทั้งหมด
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reimbursements.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    ยังไม่มีประวัติการเบิกจ่าย
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    เริ่มต้นส่งคำขอเบิกจ่ายของคุณ
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        `/${companyCode.toLowerCase()}/reimbursements/new`
                      )
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    ขอเบิกจ่าย
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reimbursements.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/${companyCode.toLowerCase()}/reimbursements/${
                            item.id
                          }`
                        )
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(item.status)}
                            {item.account && (
                              <span className="text-sm text-muted-foreground">
                                {item.account.code} {item.account.name}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm">
                            {item.description || "ไม่ระบุรายละเอียด"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatThaiDate(new Date(item.billDate))}
                          </p>
                          {item.status === "REJECTED" && item.rejectedReason && (
                            <p className="text-xs text-red-600 mt-1">
                              เหตุผล: {item.rejectedReason}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-blue-600">
                            {formatCurrency(toNumber(item.netAmount))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">กิจกรรมล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  ยังไม่มีประวัติการใช้งาน
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {getActionLabel(log.action)}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {typeof log.details === "object"
                              ? JSON.stringify(log.details)
                              : log.details}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          {new Date(log.createdAt).toLocaleDateString("th-TH")}
                        </p>
                        <p>
                          {new Date(log.createdAt).toLocaleTimeString("th-TH")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info & Permissions Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลส่วนตัว</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ชื่อ</p>
                  <p className="font-medium">{session.user.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">อีเมล</p>
                  <p className="font-medium">{session.user.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ตำแหน่ง</p>
                  <div>
                    {companyAccess?.isOwner ? (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        ผู้จัดการ
                      </Badge>
                    ) : (
                      <Badge variant="outline">พนักงาน</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">สิทธิ์การใช้งาน</CardTitle>
            </CardHeader>
            <CardContent>
              {companyAccess?.isOwner ? (
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      ผู้จัดการระบบ (OWNER)
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    มีสิทธิ์ครบทุกอย่างในระบบ
                  </p>
                </div>
              ) : companyAccess?.permissions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  ไม่มีสิทธิ์พิเศษ (สิทธิ์พื้นฐานเท่านั้น)
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {companyAccess?.permissions.map((perm) => (
                    <div
                      key={perm}
                      className="p-3 border rounded-lg flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-mono">{perm}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
