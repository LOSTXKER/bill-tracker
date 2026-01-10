"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Sparkles,
  Plus,
  RefreshCw,
} from "lucide-react";
import { CreateAccountDialog } from "./create-account-dialog";

interface Account {
  id: string;
  code: string;
  name: string;
  class: string;
  isSystem: boolean;
  isActive: boolean;
  keywords?: string[];
  description?: string | null;
}

interface AccountsPageClientProps {
  companyCode: string;
  companyName: string;
  accounts: Account[];
  canEdit: boolean;
}

const ACCOUNT_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  ASSET: { label: "สินทรัพย์", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  LIABILITY: { label: "หนี้สิน", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  EQUITY: { label: "ส่วนของเจ้าของ", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  REVENUE: { label: "รายได้", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  COST_OF_SALES: { label: "ต้นทุนขาย", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  EXPENSE: { label: "ค่าใช้จ่าย", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  OTHER_INCOME: { label: "รายได้อื่น", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  OTHER_EXPENSE: { label: "ค่าใช้จ่ายอื่น", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" },
};

export function AccountsPageClient({
  companyCode,
  companyName,
  accounts: initialAccounts,
  canEdit,
}: AccountsPageClientProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh accounts list
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/${companyCode.toLowerCase()}/accounts`);
      if (response.ok) {
        const json = await response.json();
        // Handle new API format { success, data: { accounts } }
        const accountsData = json.success ? (json.data?.accounts || []) : (Array.isArray(json) ? json : []);
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setRefreshing(false);
    }
  }, [companyCode]);

  // Handle new account created
  const handleAccountCreated = useCallback((newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
  }, []);

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.code.includes(searchQuery) ||
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.keywords || []).some((keyword) =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesClass = !selectedClass || account.class === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Group by class
  const accountsByClass = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.class]) {
      acc[account.class] = [];
    }
    acc[account.class].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Stats
  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    custom: accounts.filter((a) => !a.isSystem).length,
    system: accounts.filter((a) => a.isSystem).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ผังบัญชี</h1>
          <p className="text-muted-foreground mt-2">
            จัดการผังบัญชี (Chart of Accounts) สำหรับ {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          {canEdit && (
            <CreateAccountDialog
              companyCode={companyCode}
              onAccountCreated={handleAccountCreated}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              บัญชีทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              ใช้งานอยู่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              บัญชีระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              บัญชีกำหนดเอง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.custom}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>รายการบัญชี</CardTitle>
          <CardDescription>
            ค้นหาและกรองบัญชีตามประเภท
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยรหัส ชื่อ หรือคีย์เวิร์ด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedClass === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedClass(null)}
            >
              ทั้งหมด ({accounts.length})
            </Button>
            {Object.entries(ACCOUNT_CLASS_LABELS).map(([classKey, { label, color }]) => {
              const count = accounts.filter((a) => a.class === classKey).length;
              if (count === 0) return null;
              return (
                <Button
                  key={classKey}
                  variant={selectedClass === classKey ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedClass(classKey)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Accounts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">รหัส</TableHead>
                  <TableHead>ชื่อบัญชี</TableHead>
                  <TableHead className="w-[150px]">ประเภท</TableHead>
                  <TableHead className="w-[100px]">สถานะ</TableHead>
                  <TableHead className="w-[80px]">ประเภทบัญชี</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      ไม่พบบัญชีที่ตรงกับเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => {
                    const classInfo = ACCOUNT_CLASS_LABELS[account.class];
                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <span className="font-mono font-semibold">
                            {account.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            {account.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {account.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={classInfo?.color || ""}>
                            {classInfo?.label || account.class}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {account.isActive ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              ใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <XCircle className="h-3 w-3" />
                              ปิดใช้งาน
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.isSystem ? (
                            <Badge variant="secondary" className="gap-1">
                              <Shield className="h-3 w-3" />
                              ระบบ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              กำหนดเอง
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>หมายเหตุ:</strong> บัญชีเหล่านี้ถูกใช้สำหรับการจำแนกรายรับ-รายจ่าย 
              และส่งออกข้อมูลไปยัง PEAK Accounting ระบบจะแนะนำบัญชีที่เหมาะสมโดยอัตโนมัติ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
