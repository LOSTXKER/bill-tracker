"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TransactionTableRowProps<T> {
  transaction: T;
  type: "expense" | "income";
  companyCode: string;
  config: {
    dateField: keyof T;
    amountField: keyof T;
    contactNamePath: string; // e.g., "contact.name"
    descriptionField?: keyof T;
    amountColorClass: string;
    detailPagePath: string;
    notifyEndpoint: string;
    statusLabels: Record<string, { label: string; color: string }>;
    categoryLabels?: Record<string, string>;
    categoryField?: keyof T;
  };
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function TransactionTableRow<T extends Record<string, any>>({
  transaction,
  type,
  companyCode,
  config,
}: TransactionTableRowProps<T>) {
  const router = useRouter();
  const [sending, setSending] = React.useState(false);

  const handleClick = () => {
    router.push(`/${companyCode}/${config.detailPagePath}/${transaction.id}`);
  };

  const handleSendNotification = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSending(true);
    try {
      const response = await fetch(config.notifyEndpoint.replace("[id]", transaction.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyCode.toUpperCase() }),
      });

      if (response.ok) {
        toast.success("ส่งการแจ้งเตือนสำเร็จ");
      } else {
        throw new Error("Failed to send");
      }
    } catch {
      toast.error("ไม่สามารถส่งการแจ้งเตือนได้");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = config.statusLabels[status];
    if (!statusConfig) return <Badge variant="outline">{status}</Badge>;

    const colorMap: Record<string, string> = {
      green: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      red: "bg-destructive/10 text-destructive border-destructive/20",
      orange: "bg-amber-500/10 text-amber-600 border-amber-200",
      yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
      gray: "bg-muted text-muted-foreground border-muted",
    };

    return (
      <Badge variant="outline" className={colorMap[statusConfig.color] || ""}>
        {statusConfig.label}
      </Badge>
    );
  };

  const dateValue = transaction[config.dateField] as Date;
  const amount = transaction[config.amountField] as number;
  const contactName = getNestedValue(transaction, config.contactNamePath) || "ไม่ระบุผู้ติดต่อ";
  const description = config.descriptionField ? transaction[config.descriptionField] : null;
  const status = transaction.status as string;

  // Handle Decimal type
  const numericAmount = typeof amount === 'object' && amount !== null && 'toNumber' in amount
    ? (amount as any).toNumber?.() ?? 0
    : Number(amount);

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={handleClick}
    >
      <TableCell className="whitespace-nowrap text-foreground">
        {new Date(dateValue).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        })}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{contactName}</p>
          {description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {String(description)}
            </p>
          )}
        </div>
      </TableCell>
      {config.categoryField && config.categoryLabels && (
        <TableCell className="text-muted-foreground">
          {transaction[config.categoryField]
            ? config.categoryLabels[String(transaction[config.categoryField])] || String(transaction[config.categoryField])
            : "-"}
        </TableCell>
      )}
      <TableCell className={`text-right font-medium ${config.amountColorClass}`}>
        {formatCurrency(numericAmount)}
      </TableCell>
      <TableCell className="text-center">{getStatusBadge(status)}</TableCell>
      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendNotification}
          disabled={sending}
          className="h-8 w-8 p-0"
          title="ส่งการแจ้งเตือน LINE"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
