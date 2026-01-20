"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, User, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonData {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  totalSettled: number;
  settledCount: number;
  totalPending: number;
  pendingCount: number;
}

interface PersonBreakdownTableProps {
  data: PersonData[];
  isLoading: boolean;
  companyCode: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PersonBreakdownTable({ data, isLoading, companyCode }: PersonBreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่พบข้อมูล
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-muted-foreground font-medium"></TableHead>
            <TableHead className="text-muted-foreground font-medium">พนักงาน</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">โอนคืนแล้ว</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">ค้างโอนคืน</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((person) => (
            <React.Fragment key={person.id}>
              <TableRow
                className={cn(
                  "cursor-pointer hover:bg-muted/30",
                  person.pendingCount > 0 && "bg-orange-50/30 dark:bg-orange-950/10"
                )}
                onClick={() => toggleRow(person.id)}
              >
                <TableCell className="w-10 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(person.id);
                    }}
                  >
                    {expandedRows.has(person.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span>{person.name}</span>
                      {person.email && (
                        <div className="text-xs text-muted-foreground">
                          {person.email}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {person.totalSettled > 0 ? (
                    <>
                      {formatCurrency(person.totalSettled)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({person.settledCount})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-orange-600">
                  {person.totalPending > 0 ? (
                    <>
                      {formatCurrency(person.totalPending)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({person.pendingCount})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {person.pendingCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {person.pendingCount} รายการรอโอน
                    </Badge>
                  ) : person.settledCount > 0 ? (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ไม่มีค้าง
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      ยังไม่มีรายการ
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
              
              {/* Expanded Details */}
              {expandedRows.has(person.id) && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={5} className="py-3">
                    <div className="pl-8 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="text-xs text-green-600 font-medium">
                            ยอดโอนคืนแล้ว
                          </div>
                          <div className="text-lg font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(person.totalSettled)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {person.settledCount} รายการ
                          </div>
                        </div>
                        <div className={cn(
                          "p-3 rounded-lg",
                          person.totalPending > 0 
                            ? "bg-orange-50 dark:bg-orange-950/20"
                            : "bg-muted"
                        )}>
                          <div className={cn(
                            "text-xs font-medium",
                            person.totalPending > 0 
                              ? "text-orange-600"
                              : "text-muted-foreground"
                          )}>
                            ยอดค้างโอนคืน
                          </div>
                          <div className={cn(
                            "text-lg font-bold",
                            person.totalPending > 0 
                              ? "text-orange-700 dark:text-orange-400"
                              : "text-muted-foreground"
                          )}>
                            {person.totalPending > 0 
                              ? formatCurrency(person.totalPending) 
                              : "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {person.pendingCount} รายการ
                          </div>
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      {(person.pendingCount > 0 || person.settledCount > 0) && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="gap-2"
                          >
                            <Link href={`/${companyCode}/reimbursements?userId=${person.userId}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                              ดูรายการทั้งหมด
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
