"use client";

import { useState, useEffect, useCallback, use } from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  Clock,
  Search,
  Filter,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// =============================================================================
// Types
// =============================================================================

interface Notification {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

interface PageProps {
  params: Promise<{ company: string }>;
}

// =============================================================================
// Constants
// =============================================================================

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  TRANSACTION_CREATED: { 
    icon: <DollarSign className="h-5 w-5" />, 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  TRANSACTION_UPDATED: { 
    icon: <FileText className="h-5 w-5" />, 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  TRANSACTION_DELETED: { 
    icon: <AlertCircle className="h-5 w-5" />, 
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  TRANSACTION_STATUS_CHANGED: { 
    icon: <Clock className="h-5 w-5" />, 
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  REIMBURSEMENT_SUBMITTED: { 
    icon: <Wallet className="h-5 w-5" />, 
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  },
  REIMBURSEMENT_APPROVED: { 
    icon: <Check className="h-5 w-5" />, 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  REIMBURSEMENT_REJECTED: { 
    icon: <AlertCircle className="h-5 w-5" />, 
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  REIMBURSEMENT_PAID: { 
    icon: <DollarSign className="h-5 w-5" />, 
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  Expense: { label: "รายจ่าย", icon: <ArrowUpCircle className="h-4 w-4" /> },
  Income: { label: "รายรับ", icon: <ArrowDownCircle className="h-4 w-4" /> },
  ReimbursementRequest: { label: "เบิกจ่าย", icon: <Wallet className="h-4 w-4" /> },
};

const TYPE_LABELS: Record<string, string> = {
  TRANSACTION_CREATED: "สร้างใหม่",
  TRANSACTION_UPDATED: "แก้ไข",
  TRANSACTION_DELETED: "ลบ",
  TRANSACTION_STATUS_CHANGED: "เปลี่ยนสถานะ",
  REIMBURSEMENT_SUBMITTED: "ส่งคำขอ",
  REIMBURSEMENT_APPROVED: "อนุมัติ",
  REIMBURSEMENT_REJECTED: "ปฏิเสธ",
  REIMBURSEMENT_PAID: "จ่ายเงินแล้ว",
};

// =============================================================================
// Component
// =============================================================================

export default function ActivityPage({ params }: PageProps) {
  const { company: companyCode } = use(params);
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Fetch notifications
  const fetchNotifications = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/${companyCode}/notifications?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/${companyCode}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`/api/${companyCode}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Navigate to entity
  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    const { entityType, entityId } = notification;
    let path = "";

    if (entityType === "Expense") {
      path = `/${companyCode}/expenses/${entityId}`;
    } else if (entityType === "Income") {
      path = `/${companyCode}/incomes/${entityId}`;
    } else if (entityType === "ReimbursementRequest") {
      path = `/${companyCode}/reimbursements/${entityId}`;
    }

    if (path) {
      router.push(path);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "เมื่อกี้";
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชม.ที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    return date.toLocaleDateString("th-TH", { 
      day: "numeric", 
      month: "short",
      year: days > 365 ? "numeric" : undefined 
    });
  };

  // Format full date
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    // Read/unread filter
    if (filter === "unread" && n.isRead) return false;
    if (filter === "read" && !n.isRead) return false;

    // Entity type filter
    if (entityFilter !== "all" && n.entityType !== entityFilter) return false;

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower) ||
        n.actorName?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group by date
  const groupedNotifications = filteredNotifications.reduce((acc, n) => {
    const date = new Date(n.createdAt).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            การแจ้งเตือน
          </h1>
          <p className="text-muted-foreground">
            การแจ้งเตือนและกิจกรรมที่เกี่ยวข้องกับคุณ
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              อ่านทั้งหมด ({unreadCount})
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาการแจ้งเตือน..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="unread">ยังไม่อ่าน</SelectItem>
                  <SelectItem value="read">อ่านแล้ว</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="Expense">รายจ่าย</SelectItem>
                  <SelectItem value="Income">รายรับ</SelectItem>
                  <SelectItem value="ReimbursementRequest">เบิกจ่าย</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-sm text-muted-foreground">ทั้งหมด</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
            <p className="text-sm text-muted-foreground">ยังไม่อ่าน</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">
              {notifications.filter(n => n.type === "TRANSACTION_CREATED").length}
            </div>
            <p className="text-sm text-muted-foreground">สร้างใหม่</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {notifications.filter(n => n.type === "TRANSACTION_UPDATED").length}
            </div>
            <p className="text-sm text-muted-foreground">แก้ไข</p>
          </CardContent>
        </Card>
      </div>

      {/* Notification List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
            กำลังโหลด...
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm">ยังไม่มีการแจ้งเตือนใดๆ สำหรับคุณ</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                {date}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {items.map((notification) => {
                    const typeConfig = TYPE_CONFIG[notification.type] || {
                      icon: <Bell className="h-5 w-5" />,
                      color: "text-muted-foreground",
                      bgColor: "bg-muted",
                    };
                    const entityConfig = ENTITY_CONFIG[notification.entityType];

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleClick(notification)}
                        className={cn(
                          "w-full text-left px-4 py-4 hover:bg-muted/50 transition-colors flex gap-4",
                          !notification.isRead && "bg-primary/5"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                          typeConfig.bgColor,
                          typeConfig.color
                        )}>
                          {typeConfig.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  !notification.isRead && "text-primary"
                                )}>
                                  {notification.title}
                                </span>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              {entityConfig && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  {entityConfig.icon}
                                  {entityConfig.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="font-normal">
                              {TYPE_LABELS[notification.type] || notification.type}
                            </Badge>
                            <span>•</span>
                            <span title={formatFullDate(notification.createdAt)}>
                              {new Date(notification.createdAt).toLocaleTimeString("th-TH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
