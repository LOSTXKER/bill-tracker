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
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Cloud,
  PenTool,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateAccountDialog } from "./create-account-dialog";
import { ImportAccountsDialog } from "./import-accounts-dialog";

interface Account {
  id: string;
  code: string;
  name: string;
  class: string;
  isSystem: boolean;
  isActive: boolean;
  keywords?: string[];
  description?: string | null;
  source?: "PEAK" | "MANUAL";
}

interface AccountsPageClientProps {
  companyCode: string;
  companyName: string;
  accounts: Account[];
  canEdit: boolean;
  lastAccountImportAt: string | null;
}

// Helper to format relative date
function formatRelativeDate(dateString: string | null): { text: string; daysAgo: number } {
  if (!dateString) return { text: "ยังไม่เคย import", daysAgo: Infinity };
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (daysAgo === 0) return { text: "วันนี้", daysAgo };
  if (daysAgo === 1) return { text: "เมื่อวาน", daysAgo };
  if (daysAgo < 7) return { text: `${daysAgo} วันที่แล้ว`, daysAgo };
  if (daysAgo < 30) return { text: `${Math.floor(daysAgo / 7)} สัปดาห์ที่แล้ว`, daysAgo };
  return { text: `${Math.floor(daysAgo / 30)} เดือนที่แล้ว`, daysAgo };
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

type SortField = "code" | "name";
type SortOrder = "asc" | "desc";

export function AccountsPageClient({
  companyCode,
  companyName,
  accounts: initialAccounts,
  canEdit,
  lastAccountImportAt,
}: AccountsPageClientProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("code"); // คอลัมน์แรก = รหัส
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [refreshing, setRefreshing] = useState(false);
  
  // Calculate import status
  const importStatus = formatRelativeDate(lastAccountImportAt);
  const needsUpdate = importStatus.daysAgo >= 30;

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

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

  // Handle delete account
  const handleDelete = useCallback(async (account: Account) => {
    if (account.isSystem) {
      toast.error("ไม่สามารถลบบัญชีระบบได้");
      return;
    }

    if (!confirm(`ต้องการลบบัญชี "${account.code} - ${account.name}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/${companyCode.toLowerCase()}/accounts/${account.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("ลบบัญชีสำเร็จ");
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาดในการลบบัญชี");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการลบบัญชี");
    }
  }, [companyCode]);

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.code.includes(searchQuery) ||
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.keywords || []).some((keyword) =>
        keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesClass = !selectedClass || account.class === selectedClass;
    
    const matchesSource = !selectedSource || 
      (selectedSource === "PEAK" ? account.source === "PEAK" : account.source !== "PEAK");
    
    const matchesStatus = !selectedStatus ||
      (selectedStatus === "active" ? account.isActive : !account.isActive);

    return matchesSearch && matchesClass && matchesSource && matchesStatus;
  });

  // Sort accounts
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    let comparison = 0;
    if (sortField === "code") {
      comparison = a.code.localeCompare(b.code);
    } else if (sortField === "name") {
      comparison = a.name.localeCompare(b.name, "th");
    }
    return sortOrder === "asc" ? comparison : -comparison;
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
    fromPeak: accounts.filter((a) => a.source === "PEAK").length,
    manual: accounts.filter((a) => a.source === "MANUAL" || !a.source).length,
  };

  return (
    <div className="space-y-6">
      {/* Update Reminder Alert */}
      {needsUpdate && canEdit && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-100">
                ควรอัปเดตผังบัญชีจาก Peak
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                Import ล่าสุด: {importStatus.text}
                {lastAccountImportAt && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}({new Date(lastAccountImportAt).toLocaleDateString("th-TH", { 
                      year: "numeric", 
                      month: "short", 
                      day: "numeric" 
                    })})
                  </span>
                )}
                {" "}- ถ้า Peak มีการเปลี่ยนแปลงผังบัญชี ควร Import ใหม่เพื่อให้ข้อมูลตรงกัน
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ผังบัญชี</h1>
          <p className="text-muted-foreground mt-2">
            จัดการผังบัญชี (Chart of Accounts) สำหรับ {companyName}
          </p>
          {/* Last Import Info */}
          <div className="flex items-center gap-2 mt-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Import จาก Peak ล่าสุด:{" "}
              <span className={needsUpdate ? "text-amber-600 font-medium" : "text-foreground"}>
                {importStatus.text}
              </span>
            </span>
          </div>
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
            <>
              <ImportAccountsDialog
                companyCode={companyCode}
                onImportComplete={() => {
                  handleRefresh();
                  // Refresh page to get updated lastAccountImportAt
                  router.refresh();
                }}
              />
              <CreateAccountDialog
                companyCode={companyCode}
                onAccountCreated={handleAccountCreated}
              />
            </>
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
              <Cloud className="h-4 w-4" />
              Import จาก Peak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fromPeak}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              สร้างเอง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manual}</div>
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

          {/* Additional Filters & Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">กรอง:</span>
            </div>
            
            {/* Source Filter */}
            <Select
              value={selectedSource || "all"}
              onValueChange={(value) => setSelectedSource(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="แหล่งที่มา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแหล่งที่มา</SelectItem>
                <SelectItem value="PEAK">
                  <span className="flex items-center gap-1">
                    <Cloud className="h-3 w-3" /> Peak
                  </span>
                </SelectItem>
                <SelectItem value="MANUAL">
                  <span className="flex items-center gap-1">
                    <PenTool className="h-3 w-3" /> สร้างเอง
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={selectedStatus || "all"}
              onValueChange={(value) => setSelectedStatus(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="active">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ใช้งาน
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> ปิดใช้งาน
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedSource || selectedStatus || selectedClass) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => {
                  setSelectedClass(null);
                  setSelectedSource(null);
                  setSelectedStatus(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>

          {/* Accounts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("code")}
                  >
                    <div className="flex items-center">
                      รหัส
                      <SortIcon field="code" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      ชื่อบัญชี
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">ประเภท</TableHead>
                  <TableHead className="w-[100px]">สถานะ</TableHead>
                  <TableHead className="w-[80px]">แหล่งที่มา</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      ไม่พบบัญชีที่ตรงกับเงื่อนไข
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAccounts.map((account) => {
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
                          {account.source === "PEAK" ? (
                            <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              <Cloud className="h-3 w-3" />
                              Peak
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <PenTool className="h-3 w-3" />
                              สร้างเอง
                            </Badge>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(account)}
                                  disabled={account.isSystem}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
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
