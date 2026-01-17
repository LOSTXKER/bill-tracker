"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, FileText, DollarSign, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

// =============================================================================
// Icon Map
// =============================================================================

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TRANSACTION_CREATED: <DollarSign className="h-4 w-4 text-emerald-500" />,
  TRANSACTION_UPDATED: <FileText className="h-4 w-4 text-blue-500" />,
  TRANSACTION_DELETED: <AlertCircle className="h-4 w-4 text-red-500" />,
  TRANSACTION_STATUS_CHANGED: <Clock className="h-4 w-4 text-amber-500" />,
  REIMBURSEMENT_SUBMITTED: <DollarSign className="h-4 w-4 text-purple-500" />,
  REIMBURSEMENT_APPROVED: <Check className="h-4 w-4 text-emerald-500" />,
  REIMBURSEMENT_REJECTED: <AlertCircle className="h-4 w-4 text-red-500" />,
  REIMBURSEMENT_PAID: <DollarSign className="h-4 w-4 text-emerald-500" />,
};

// =============================================================================
// Component
// =============================================================================

interface NotificationCenterProps {
  companyCode: string;
}

export function NotificationCenter({ companyCode }: NotificationCenterProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!companyCode) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/${companyCode}/notifications?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!companyCode) return;
    
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
    if (!companyCode) return;
    
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
    if (!companyCode) return;
    
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on entity type
    const { entityType, entityId } = notification;
    let path = "";

    if (entityType === "Expense") {
      path = `/${companyCode}/expenses/${entityId}`;
    } else if (entityType === "Income") {
      path = `/${companyCode}/incomes/${entityId}`;
    } else if (entityType === "ReimbursementRequest") {
      path = `/${companyCode}/reimbursements`;
    }

    if (path) {
      setOpen(false);
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
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  // Show placeholder before client hydration to prevent mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">การแจ้งเตือน</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span>ยังไม่มีการแจ้งเตือน</span>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[notification.type] || (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            !notification.isRead && "text-primary"
                          )}
                        >
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Link
            href={`/${companyCode}/activity`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 w-full py-2 text-sm text-primary hover:bg-muted rounded-md transition-colors"
          >
            ดูทั้งหมด
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
