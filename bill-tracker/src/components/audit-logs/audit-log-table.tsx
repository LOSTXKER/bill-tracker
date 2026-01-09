"use client";

/**
 * Audit Log Table Component
 * 
 * Displays audit logs with filters and pagination
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
}

interface AuditLogTableProps {
  companyId: string;
}

const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UPDATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  STATUS_CHANGE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  APPROVE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  EXPORT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const ACTION_LABELS = {
  CREATE: "สร้าง",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
  STATUS_CHANGE: "เปลี่ยนสถานะ",
  APPROVE: "อนุมัติ",
  EXPORT: "ส่งออก",
};

// Status labels for translation
const STATUS_LABELS: Record<string, string> = {
  // Expense statuses
  PENDING_PHYSICAL: "ร้านส่งบิลตามมา",
  WAITING_FOR_DOC: "ได้บิลครบแล้ว",
  READY_TO_SEND: "พร้อมส่ง",
  SENT_TO_ACCOUNT: "ส่งบัญชีแล้ว",
  // Income statuses
  PENDING_INVOICE: "รอออกบิล",
  INVOICE_ISSUED: "ออกบิลแล้ว",
  COPY_SENT: "ส่งสำเนาแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

// Entity type labels
const ENTITY_TYPE_LABELS: Record<string, string> = {
  Expense: "รายจ่าย",
  Income: "รายรับ",
  Contact: "ผู้ติดต่อ",
  Category: "หมวดหมู่",
};

// Field labels for translation
const FIELD_LABELS: Record<string, string> = {
  amount: "จำนวนเงิน",
  description: "รายละเอียด",
  billDate: "วันที่",
  dueDate: "วันครบกำหนด",
  status: "สถานะ",
  category: "หมวดหมู่",
  categoryId: "หมวดหมู่",
  contactId: "ผู้ติดต่อ",
  notes: "หมายเหตุ",
  invoiceNumber: "เลขที่ใบกำกับ",
  referenceNo: "เลขอ้างอิง",
  paymentMethod: "วิธีชำระเงิน",
  vatRate: "อัตรา VAT",
  whtRate: "อัตราหัก ณ ที่จ่าย",
  slipUrls: "สลิปโอนเงิน",
  taxInvoiceUrls: "ใบกำกับภาษี",
  whtCertUrls: "หนังสือรับรองหัก ณ ที่จ่าย",
  customerSlipUrls: "สลิปลูกค้า",
  myBillCopyUrls: "สำเนาบิล",
};

/**
 * Translate status code to Thai label
 */
function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Translate entity type to Thai label
 */
function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

/**
 * Translate field name to Thai label
 */
function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

/**
 * Format a user-friendly description for an audit log
 */
function formatDescription(log: AuditLog): string {
  const typeLabel = getEntityTypeLabel(log.entityType);
  
  // Fallback: use original description but try to translate
  if (log.description) {
    let desc = log.description;
    // Replace entity type names
    Object.entries(ENTITY_TYPE_LABELS).forEach(([en, th]) => {
      desc = desc.replace(new RegExp(en, "g"), th);
    });
    // Replace status codes
    Object.entries(STATUS_LABELS).forEach(([code, label]) => {
      desc = desc.replace(new RegExp(code, "g"), label);
    });
    // Replace field names in parentheses (e.g., "(slipUrls, whtCertUrls)")
    const fieldMatch = desc.match(/\(([^)]+)\)/);
    if (fieldMatch) {
      const fields = fieldMatch[1].split(", ").map(f => f.trim());
      const translatedFields = fields
        .map(getFieldLabel)
        .filter(f => !["วันที่อัปเดต", "บริษัท", "ผู้สร้าง", "updatedAt", "company", "creator"].includes(f));
      if (translatedFields.length > 0) {
        desc = desc.replace(fieldMatch[0], `(${translatedFields.join(", ")})`);
      } else {
        desc = desc.replace(fieldMatch[0], "");
      }
    }
    // Remove ID references like "cmk2aylx...:" or "ID: cmk2aylx..."
    desc = desc.replace(/\s*[a-z]{3}[a-z0-9]{5,}\.{0,3}:?\s*/gi, " ");
    desc = desc.replace(/: ID: [a-z0-9]+\.\.\.?/gi, "");
    desc = desc.replace(/ID: [a-z0-9]+\.\.\.?/gi, "");
    // Clean up extra colons and spaces
    desc = desc.replace(/:\s*:/g, ":");
    desc = desc.replace(/\s+/g, " ").trim();
    // Remove trailing colon
    desc = desc.replace(/:$/, "").trim();
    return desc;
  }
  
  return `${ACTION_LABELS[log.action as keyof typeof ACTION_LABELS] || log.action}${typeLabel}`;
}

export function AuditLogTable({ companyId }: AuditLogTableProps) {
  const params = useParams();
  const companyCode = params.company as string;
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const limit = 50;
  const totalPages = Math.ceil(total / limit);
  
  // Generate link to the related entity
  const getEntityLink = (entityType: string, entityId: string): string | null => {
    // Skip bulk operations, exports, and other non-linkable entities
    if (entityId.startsWith("bulk_") || entityId.startsWith("export_") || 
        entityId.startsWith("invite_") || entityId.startsWith("remove_") ||
        entityId.startsWith("permission_")) {
      return null;
    }
    
    switch (entityType) {
      case "Expense":
        return `/${companyCode}/expenses/${entityId}`;
      case "Income":
        return `/${companyCode}/incomes/${entityId}`;
      case "Contact":
        return `/${companyCode}/contacts`;
      default:
        return null;
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityTypeFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (entityTypeFilter !== "all") params.append("entityType", entityTypeFilter);
      if (search) params.append("search", search);

      const response = await fetch(
        `/api/companies/${companyId}/audit-logs?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to load audit logs");
      }

      const result = await response.json();
      setLogs(result.data.logs);
      setTotal(result.data.pagination.total);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการบันทึก</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="ค้นหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="การกระทำ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกการกระทำ</SelectItem>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="Expense">รายจ่าย</SelectItem>
              <SelectItem value="Income">รายรับ</SelectItem>
              <SelectItem value="Vendor">ผู้ขาย</SelectItem>
              <SelectItem value="Customer">ลูกค้า</SelectItem>
              <SelectItem value="TeamMember">สมาชิก</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            ไม่พบข้อมูล
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const entityLink = getEntityLink(log.entityType, log.entityId);
              
              return (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={ACTION_COLORS[log.action as keyof typeof ACTION_COLORS]}
                        >
                          {ACTION_LABELS[log.action as keyof typeof ACTION_LABELS] || log.action}
                        </Badge>
                        <Badge variant="outline">{getEntityTypeLabel(log.entityType)}</Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {formatDescription(log)}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{log.user.name}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: th,
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Link to related entity */}
                    {entityLink && log.action !== "DELETE" && (
                      <Link href={entityLink}>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          ดูรายการ
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              แสดง {(page - 1) * limit + 1}-{Math.min(page * limit, total)} จาก {total} รายการ
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>
              <span className="text-sm">
                หน้า {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
