import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  Cloud,
  PenTool,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { type ColumnDef } from "@/components/shared/DataTable";

export interface Account {
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

export type SortField = "code" | "name";
export type SortOrder = "asc" | "desc";

export const ACCOUNT_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  ASSET: { label: "สินทรัพย์", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  LIABILITY: { label: "หนี้สิน", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  EQUITY: { label: "ส่วนของเจ้าของ", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  REVENUE: { label: "รายได้", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  COST_OF_SALES: { label: "ต้นทุนขาย", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  EXPENSE: { label: "ค่าใช้จ่าย", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  OTHER_INCOME: { label: "รายได้อื่น", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  OTHER_EXPENSE: { label: "ค่าใช้จ่ายอื่น", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" },
};

export function getAccountColumns(
  canEdit: boolean,
  handleDelete: (account: Account) => void,
): ColumnDef<Account>[] {
  return [
    {
      key: "code",
      label: "รหัส",
      sortable: true,
      width: "120px",
      render: (account) => (
        <span className="font-mono font-semibold">{account.code}</span>
      ),
    },
    {
      key: "name",
      label: "ชื่อบัญชี",
      sortable: true,
      render: (account) => (
        <div>
          <div className="font-medium">{account.name}</div>
          {account.description && (
            <div className="text-xs text-muted-foreground mt-1">{account.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "class",
      label: "ประเภท",
      width: "150px",
      render: (account) => {
        const classInfo = ACCOUNT_CLASS_LABELS[account.class];
        return (
          <Badge className={classInfo?.color || ""}>
            {classInfo?.label || account.class}
          </Badge>
        );
      },
    },
    {
      key: "isActive",
      label: "สถานะ",
      width: "100px",
      render: (account) =>
        account.isActive ? (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            ใช้งาน
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3" />
            ปิดใช้งาน
          </Badge>
        ),
    },
    {
      key: "source",
      label: "แหล่งที่มา",
      width: "100px",
      render: (account) =>
        account.source === "PEAK" ? (
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Cloud className="h-3 w-3" />
            Peak
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <PenTool className="h-3 w-3" />
            สร้างเอง
          </Badge>
        ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            label: "",
            width: "50px",
            render: (account: Account) => (
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
            ),
          } as ColumnDef<Account>,
        ]
      : []),
  ];
}
