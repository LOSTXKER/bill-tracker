"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Cloud,
  PenTool,
  FileSpreadsheet,
} from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { CreateAccountDialog } from "./create-account-dialog";
import { ImportAccountsDialog } from "./import-accounts-dialog";
import { useAccountsPage } from "./useAccountsPage";
import { getAccountColumns, type Account } from "./accounts-table-config";
import { AccountsFilters } from "./AccountsFilters";
import { formatThaiDate } from "@/lib/utils/tax-calculator";

interface AccountsPageClientProps {
  companyCode: string;
  companyName: string;
  accounts: Account[];
  canEdit: boolean;
  lastAccountImportAt: string | null;
}

export function AccountsPageClient({
  companyCode,
  companyName,
  accounts: initialAccounts,
  canEdit,
  lastAccountImportAt,
}: AccountsPageClientProps) {
  const router = useRouter();
  const {
    accounts,
    searchQuery,
    setSearchQuery,
    selectedClass,
    setSelectedClass,
    selectedSource,
    setSelectedSource,
    selectedStatus,
    setSelectedStatus,
    sortField,
    sortOrder,
    handleSort,
    refreshing,
    handleRefresh,
    handleAccountCreated,
    handleDelete,
    sortedAccounts,
    stats,
    importStatus,
    needsUpdate,
  } = useAccountsPage({ companyCode, initialAccounts, lastAccountImportAt });

  const columns = useMemo(
    () => getAccountColumns(canEdit, handleDelete),
    [canEdit, handleDelete],
  );

  return (
    <div className="space-y-6">
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
                    {" "}(
                    {formatThaiDate(new Date(lastAccountImportAt))}
                    )
                  </span>
                )}
                {" "}- ถ้า Peak มีการเปลี่ยนแปลงผังบัญชี ควร Import ใหม่เพื่อให้ข้อมูลตรงกัน
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Import จาก Peak ล่าสุด:{" "}
            <span className={needsUpdate ? "text-amber-600 font-medium" : "text-foreground"}>
              {importStatus.text}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          {canEdit && (
            <>
              <ImportAccountsDialog
                companyCode={companyCode}
                onImportComplete={() => {
                  handleRefresh();
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "บัญชีทั้งหมด", value: stats.total, icon: null },
          { label: "ใช้งานอยู่", value: stats.active, icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: "Import จาก Peak", value: stats.fromPeak, icon: <Cloud className="h-4 w-4" /> },
          { label: "สร้างเอง", value: stats.manual, icon: <PenTool className="h-4 w-4" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {icon}{label}
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <AccountsFilters
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      <DataTable
        data={sortedAccounts}
        columns={columns}
        keyField="id"
        title="รายการบัญชี"
        total={sortedAccounts.length}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyState={{
          icon: FileSpreadsheet,
          title: "ไม่พบบัญชีที่ตรงกับเงื่อนไข",
        }}
      />

      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>หมายเหตุ:</strong> บัญชีเหล่านี้ถูกใช้สำหรับการจำแนกรายรับ-รายจ่าย
          และส่งออกข้อมูลไปยัง PEAK Accounting ระบบจะแนะนำบัญชีที่เหมาะสมโดยอัตโนมัติ
        </p>
      </div>
    </div>
  );
}
