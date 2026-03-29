"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { formatThaiDate } from "@/lib/utils/tax-calculator";
import type { TransactionPreviewData, PreviewTransactionType } from "./preview-types";

interface TransactionDetailsCardProps {
  data: TransactionPreviewData;
  transactionType: PreviewTransactionType;
}

export function TransactionDetailsCard({ data, transactionType }: TransactionDetailsCardProps) {
  const dateValue = transactionType === "expense" ? data.billDate : data.receiveDate;

  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        รายละเอียด
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {(data.Contact?.name || data.contactName) && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">ผู้ติดต่อ</p>
            <p className="font-medium">{data.Contact?.name || data.contactName}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">
            {transactionType === "expense" ? "วันที่บิล" : "วันที่รับ"}
          </p>
          <p className="font-medium">
            {dateValue ? formatThaiDate(new Date(dateValue)) : "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">สร้างเมื่อ</p>
          <p className="font-medium">
            {data.createdAt ? formatThaiDate(new Date(data.createdAt)) : "-"}
          </p>
        </div>

        {data.Account && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">หมวดหมู่บัญชี</p>
            <p className="font-medium">{data.Account.code} {data.Account.name}</p>
          </div>
        )}

        {(data.description || data.source) && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">
              {transactionType === "expense" ? "รายละเอียด" : "แหล่งที่มา"}
            </p>
            <p className="font-medium whitespace-pre-wrap">
              {transactionType === "expense" ? data.description : data.source}
            </p>
          </div>
        )}

        {data.invoiceNumber && (
          <div>
            <p className="text-xs text-muted-foreground">เลขที่เอกสาร</p>
            <p className="font-medium">{data.invoiceNumber}</p>
          </div>
        )}

        {data.referenceNo && (
          <div>
            <p className="text-xs text-muted-foreground">เลขอ้างอิง</p>
            <p className="font-medium">{data.referenceNo}</p>
          </div>
        )}

        {data.notes && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">หมายเหตุ</p>
            <p className="font-medium text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
          </div>
        )}

        {data.creator && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">สร้างโดย</p>
            <p className="font-medium">{data.creator.name}</p>
          </div>
        )}
      </div>

      {(data.isWht || data.isWhtDeducted) && (
        <div className="mt-3 pt-3 border-t">
          <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
            <Receipt className="h-3 w-3 mr-1" />
            หัก ณ ที่จ่าย {data.whtRate ? `${data.whtRate}%` : ""}
          </Badge>
        </div>
      )}
    </div>
  );
}
