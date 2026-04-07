"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Receipt, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Send,
  Calendar,
  Building2,
  ArrowRight,
  RefreshCw,
  FileCheck,
  FileMinus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface DocumentWorkflowDashboardProps {
  companyCode: string;
}

interface PendingItem {
  id: string;
  pendingType: string;
  billDate?: string;
  receiveDate?: string;
  contact?: { name: string; taxId?: string } | null;
  contactName?: string;
  amount: number;
  whtAmount?: number;
  description?: string;
  source?: string;
}

interface DashboardData {
  expenses: PendingItem[];
  incomes: PendingItem[];
  summary: {
    pendingTaxInvoice: number;
    pendingWhtIssue: number;
    pendingWhtCert: number;
    pendingAccounting: number;
    total: number;
  };
}

interface WhtSummary {
  month: number;
  year: number;
  deadline: {
    date: string;
    day: number;
    daysUntil: number;
    isOverdue: boolean;
    isReminder: boolean;
  };
  toPay: {
    total: number;
    count: number;
  };
  credit: {
    total: number;
    count: number;
  };
  pending: {
    whtCertsFromCustomers: number;
    whtCertsToIssue: number;
  };
}

const PENDING_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  TAX_INVOICE: { label: "รอเอกสาร", icon: <Receipt className="h-4 w-4" />, color: "bg-orange-500" },
  WHT_ISSUE: { label: "รอออกใบ 50 ทวิ", icon: <FileText className="h-4 w-4" />, color: "bg-amber-500" },
  WHT_CERT: { label: "รอใบ 50 ทวิจากลูกค้า", icon: <FileMinus className="h-4 w-4" />, color: "bg-purple-500" },
  ACCOUNTING: { label: "รอส่งบัญชี", icon: <Send className="h-4 w-4" />, color: "bg-blue-500" },
};

export function DocumentWorkflowDashboard({ companyCode }: DocumentWorkflowDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [whtSummary, setWhtSummary] = useState<WhtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workflowRes, whtRes] = await Promise.all([
        fetch(`/api/${companyCode}/document-workflow`),
        fetch(`/api/${companyCode}/wht-summary`),
      ]);

      if (workflowRes.ok) {
        const workflowData = await workflowRes.json();
        setData(workflowData.data);
      }

      if (whtRes.ok) {
        const whtData = await whtRes.json();
        setWhtSummary(whtData.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyCode]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* WHT Deadline Alert */}
      {whtSummary && (whtSummary.deadline.isOverdue || whtSummary.deadline.isReminder) && (
        <Card className={whtSummary.deadline.isOverdue ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${whtSummary.deadline.isOverdue ? "text-red-500" : "text-amber-500"}`} />
              <div>
                <p className="font-medium">
                  {whtSummary.deadline.isOverdue
                    ? `⚠️ เลยกำหนดนำส่ง WHT แล้ว ${Math.abs(whtSummary.deadline.daysUntil)} วัน`
                    : `📢 ใกล้กำหนดนำส่ง WHT อีก ${whtSummary.deadline.daysUntil} วัน`}
                </p>
                <p className="text-sm text-muted-foreground">
                  กำหนดนำส่ง: วันที่ {new Date(whtSummary.deadline.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                  {" | "}ยอดที่ต้องนำส่ง: {formatCurrency(whtSummary.toPay.total)}
                </p>
              </div>
            </div>
            <Button variant={whtSummary.deadline.isOverdue ? "destructive" : "outline"} size="sm">
              ดูรายละเอียด
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอเอกสาร</p>
                <p className="text-2xl font-bold">{data?.summary.pendingTaxInvoice || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอออก/รับใบ 50 ทวิ</p>
                <p className="text-2xl font-bold">
                  {(data?.summary.pendingWhtIssue || 0) + (data?.summary.pendingWhtCert || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอส่งบัญชี</p>
                <p className="text-2xl font-bold">{data?.summary.pendingAccounting || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WHT ต้องนำส่ง</p>
                <p className="text-2xl font-bold">{formatCurrency(whtSummary?.toPay.total || 0)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>เอกสารที่รอดำเนินการ</CardTitle>
              <CardDescription>รายการที่ต้องติดตามเอกสารหรือดำเนินการ</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">ทั้งหมด ({data?.summary.total || 0})</TabsTrigger>
              <TabsTrigger value="expenses">รายจ่าย ({data?.expenses.length || 0})</TabsTrigger>
              <TabsTrigger value="incomes">รายรับ ({data?.incomes.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              {[...(data?.expenses || []), ...(data?.incomes || [])].slice(0, 10).map((item) => (
                <PendingItemCard key={item.id} item={item} />
              ))}
              {data?.summary.total === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium">ไม่มีเอกสารที่รอดำเนินการ</p>
                  <p className="text-sm">เอกสารทั้งหมดถูกจัดการเรียบร้อยแล้ว</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-3">
              {data?.expenses.map((item) => (
                <PendingItemCard key={item.id} item={item} type="expense" />
              ))}
              {(data?.expenses.length || 0) === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>ไม่มีรายจ่ายที่รอดำเนินการ</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="incomes" className="space-y-3">
              {data?.incomes.map((item) => (
                <PendingItemCard key={item.id} item={item} type="income" />
              ))}
              {(data?.incomes.length || 0) === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>ไม่มีรายรับที่รอดำเนินการ</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingItemCard({ item, type }: { item: PendingItem; type?: "expense" | "income" }) {
  const config = PENDING_TYPE_CONFIG[item.pendingType];
  const date = item.billDate || item.receiveDate;
  const vendorName = item.contact?.name || item.contactName || "ไม่ระบุ";

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${config?.color || "bg-gray-500"} text-white`}>
          {config?.icon || <FileText className="h-4 w-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{vendorName}</p>
            <Badge variant="outline" className="text-xs">
              {type === "expense" ? "รายจ่าย" : type === "income" ? "รายรับ" : item.billDate ? "รายจ่าย" : "รายรับ"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {date && formatDistanceToNow(new Date(date), { addSuffix: true, locale: th })}
            </span>
            <span>
              {formatCurrency(Number(item.amount))}
            </span>
            {item.whtAmount && (
              <span className="text-purple-600">
                WHT: {formatCurrency(Number(item.whtAmount))}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{config?.label || item.pendingType}</Badge>
        <Button variant="ghost" size="icon">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
