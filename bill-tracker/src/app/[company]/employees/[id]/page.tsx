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
  ArrowLeft,
  User,
  Mail,
  Shield,
  Activity,
  Receipt,
  FileText,
  Crown,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatThaiDate } from "@/lib/utils/tax-calculator";
import { toNumber } from "@/lib/utils/serializers";
import { UserBadge } from "@/components/shared/UserBadge";
import { cn } from "@/lib/utils";
import { EditPermissionsDialog } from "@/components/settings/edit-permissions-dialog";
import { useIsOwner } from "@/components/guards/permission-guard";

interface EmployeeData {
  id: string;
  userId: string;
  isOwner: boolean;
  permissions: string[];
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    lastLoginAt?: Date | null;
    isActive: boolean;
  };
}

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
  entityType: string;
  entityId: string;
  description: string | null;
  changes: any;
  details: any;
  createdAt: string;
  ipAddress?: string;
}

// Action colors
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  UPDATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  STATUS_CHANGE: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  APPROVE: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
};

// Entity type labels
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Expense: "รายจ่าย",
  Income: "รายรับ",
  Contact: "ผู้ติดต่อ",
  Account: "บัญชี",
  ReimbursementRequest: "คำขอเบิกจ่าย",
};

// Status labels for translation  
const STATUS_LABELS: Record<string, string> = {
  PENDING_PHYSICAL: "ร้านส่งบิลตามมา",
  WAITING_FOR_DOC: "ได้บิลครบแล้ว",
  READY_TO_SEND: "พร้อมส่ง",
  SENT_TO_ACCOUNT: "ส่งบัญชีแล้ว",
  PENDING_INVOICE: "รอออกบิล",
  INVOICE_ISSUED: "ออกบิลแล้ว",
  COPY_SENT: "ส่งสำเนาแล้ว",
  COMPLETED: "เสร็จสิ้น",
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  PAID: "จ่ายแล้ว",
  REJECTED: "ปฏิเสธ",
};

// Field labels
const FIELD_LABELS: Record<string, string> = {
  amount: "จำนวนเงิน",
  description: "รายละเอียด",
  billDate: "วันที่",
  status: "สถานะ",
  accountId: "บัญชี",
  contactId: "ผู้ติดต่อ",
  notes: "หมายเหตุ",
  invoiceNumber: "เลขที่ใบกำกับ",
  paymentMethod: "วิธีชำระเงิน",
  vatRate: "อัตรา VAT",
  slipUrls: "สลิปโอนเงิน",
  taxInvoiceUrls: "ใบกำกับภาษี",
};

const getFieldLabel = (field: string): string => FIELD_LABELS[field] || field;
const getStatusLabel = (status: string): string => STATUS_LABELS[status] || status;
const getEntityTypeLabel = (entityType: string): string => ENTITY_TYPE_LABELS[entityType] || entityType;

const formatAuditDescription = (log: AuditLog): string => {
  const typeLabel = getEntityTypeLabel(log.entityType);
  
  if (log.action === "STATUS_CHANGE" && log.changes) {
    const oldLabel = log.changes.oldStatusLabel || getStatusLabel(log.changes.oldStatus);
    const newLabel = log.changes.newStatusLabel || getStatusLabel(log.changes.newStatus);
    return `เปลี่ยนสถานะ${typeLabel}: ${oldLabel} → ${newLabel}`;
  }
  
  if (log.action === "CREATE") {
    return `สร้าง${typeLabel}ใหม่`;
  }
  
  if (log.action === "DELETE") {
    return `ลบ${typeLabel}`;
  }
  
  if (log.action === "UPDATE" && log.changes?.changedFields) {
    const fields = log.changes.changedFieldLabels || log.changes.changedFields.map(getFieldLabel);
    const userFacingFields = fields.filter((f: string) => 
      !["updatedAt", "company", "creator"].includes(f)
    );
    if (userFacingFields.length > 0) {
      return `แก้ไข${typeLabel}: ${userFacingFields.join(", ")}`;
    }
    return `แก้ไข${typeLabel}`;
  }
  
  if (log.description) {
    let desc = log.description;
    Object.entries(ENTITY_TYPE_LABELS).forEach(([en, th]) => {
      desc = desc.replace(new RegExp(en, "g"), th);
    });
    Object.entries(STATUS_LABELS).forEach(([code, label]) => {
      desc = desc.replace(new RegExp(code, "g"), label);
    });
    desc = desc.replace(/\s*[a-z]{3}[a-z0-9]{5,}\.{0,3}:?\s*/gi, " ");
    desc = desc.replace(/\s+/g, " ").trim();
    desc = desc.replace(/:$/, "").trim();
    return desc;
  }
  
  const actionLabels: Record<string, string> = {
    CREATE: "สร้าง",
    UPDATE: "แก้ไข",
    DELETE: "ลบ",
    STATUS_CHANGE: "เปลี่ยนสถานะ",
    APPROVE: "อนุมัติ",
  };
  return `${actionLabels[log.action] || log.action}${typeLabel}`;
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();
  const userId = params.id as string;
  const isOwner = useIsOwner();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false);

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

  // Fetch employee data - using Promise.all for parallel requests
  const fetchEmployeeData = async () => {
    if (!companyId) return;

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

      // Process employee data
      const members = membersData.data?.members || membersData.members || [];
      const employeeData = members.find(
        (m: EmployeeData) => m.userId === userId
      );
      setEmployee(employeeData);

      // Set stats
      setStats(statsData.data?.stats || statsData.stats);

      // Set reimbursements
      setReimbursements(reimbursementsData.data?.reimbursements || reimbursementsData.reimbursements || []);

      // Set audit logs
      setAuditLogs(logsData.data?.logs || logsData.logs || []);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [companyId, userId]);

  if (isLoading) {
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

  if (!employee) {
    return (
      <div className="py-12 text-center">
        <h3 className="font-semibold text-lg mb-2">ไม่พบข้อมูลพนักงาน</h3>
        <Button onClick={() => router.back()}>กลับ</Button>
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
              {employee.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {employee.user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {employee.user.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button
              variant="outline"
              onClick={() => setEditPermissionsOpen(true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              จัดการสิทธิ์
            </Button>
          )}
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
        </div>
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

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">รออนุมัติ</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.reimbursements.pending}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.amounts.pending)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">รอจ่ายเงิน</p>
                <p className="text-2xl font-bold text-blue-600">
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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            ข้อมูลทั่วไป
          </TabsTrigger>
          <TabsTrigger value="reimbursements" className="gap-2">
            <Receipt className="h-4 w-4" />
            ประวัติเบิกจ่าย
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            สิทธิ์
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ชื่อ</p>
                  <p className="font-medium">{employee.user.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">อีเมล</p>
                  <p className="font-medium">{employee.user.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ตำแหน่ง</p>
                  <div>
                    {employee.isOwner ? (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        ผู้จัดการ
                      </Badge>
                    ) : (
                      <Badge variant="outline">พนักงาน</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">สถานะ</p>
                  <div>
                    {employee.user.isActive ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-emerald-600 border-emerald-600"
                      >
                        <CheckCircle className="h-3 w-3" />
                        ใช้งานอยู่
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        รอยืนยัน
                      </Badge>
                    )}
                  </div>
                </div>
                {employee.user.lastLoginAt && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      เข้าสู่ระบบล่าสุด
                    </p>
                    <p className="font-medium">
                      {new Date(employee.user.lastLoginAt).toLocaleString(
                        "th-TH"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reimbursements Tab */}
        <TabsContent value="reimbursements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ประวัติการเบิกจ่าย</CardTitle>
            </CardHeader>
            <CardContent>
              {reimbursements.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  ยังไม่มีประวัติการเบิกจ่าย
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                ประวัติการใช้งาน
                {auditLogs.length > 0 && (
                  <Badge variant="secondary">{auditLogs.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  ยังไม่มีประวัติการใช้งาน
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log, index) => (
                    <div
                      key={log.id}
                      className={cn(
                        "relative pl-6 pb-4",
                        index !== auditLogs.length - 1 && "border-l-2 border-muted ml-2"
                      )}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-1/2 flex items-center justify-center",
                        index === 0 ? "bg-primary" : "bg-muted"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          index === 0 ? "bg-white" : "bg-muted-foreground"
                        )} />
                      </div>
                      
                      <div className="space-y-2">
                        {/* Action badge and time */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={cn(
                              "text-xs",
                              ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                            )}
                          >
                            {getActionLabel(log.action)}
                          </Badge>
                          {log.entityType && (
                            <Badge variant="outline" className="text-xs">
                              {getEntityTypeLabel(log.entityType)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm font-medium">
                          {formatAuditDescription(log)}
                        </p>
                        
                        {/* Status change details */}
                        {log.action === "STATUS_CHANGE" && log.changes && (
                          <div className="p-2 bg-muted/50 rounded text-xs inline-block">
                            <span className="text-muted-foreground">
                              {log.changes.oldStatusLabel || getStatusLabel(log.changes.oldStatus)} → {log.changes.newStatusLabel || getStatusLabel(log.changes.newStatus)}
                            </span>
                          </div>
                        )}
                        
                        {/* Time and date */}
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })} เวลา {new Date(log.createdAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">สิทธิ์การใช้งาน</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.isOwner ? (
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
              ) : employee.permissions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  ไม่มีสิทธิ์ใดๆ
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {employee.permissions.map((perm) => (
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

      {/* Edit Permissions Dialog */}
      {isOwner && companyId && (
        <EditPermissionsDialog
          member={employee}
          companyId={companyId}
          open={editPermissionsOpen}
          onOpenChange={setEditPermissionsOpen}
          onSuccess={() => {
            fetchEmployeeData();
            setEditPermissionsOpen(false);
          }}
        />
      )}
    </div>
  );
}
