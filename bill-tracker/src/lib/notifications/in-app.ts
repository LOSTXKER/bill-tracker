/**
 * In-App Notification Service
 * 
 * สร้างและจัดการ notifications ในแอพ
 * ให้บัญชีและทีมรู้เมื่อมีการเปลี่ยนแปลงเอกสาร
 */

import { prisma } from "@/lib/db";
import type { NotificationType, Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface CreateNotificationParams {
  companyId: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  targetUserIds: string[]; // ต้องระบุเสมอ - ไม่ส่ง notification ให้ทุกคน
  excludeActorFromTargets?: boolean; // ไม่ส่งให้ผู้กระทำ (default: true)
  metadata?: Prisma.InputJsonValue;
}

interface NotificationWithRead {
  id: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Create Notification
// =============================================================================

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Filter out actor from targets (default behavior)
    let targetUserIds = [...params.targetUserIds];
    const excludeActor = params.excludeActorFromTargets !== false; // default true
    
    if (excludeActor && params.actorId) {
      targetUserIds = targetUserIds.filter(id => id !== params.actorId);
    }
    
    // Don't create notification if no targets
    if (targetUserIds.length === 0) {
      return;
    }
    
    await prisma.notification.create({
      data: {
        companyId: params.companyId,
        type: params.type,
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        message: params.message,
        actorId: params.actorId,
        actorName: params.actorName,
        targetUserIds: targetUserIds,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[createNotification] Failed:", error);
  }
}

// =============================================================================
// Get Notifications for User
// =============================================================================

export async function getNotificationsForUser(
  companyId: string,
  userId: string,
  limit: number = 50
): Promise<NotificationWithRead[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      companyId,
      // Only get notifications targeted to this user
      targetUserIds: { array_contains: [userId] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return notifications.map((n) => {
    const readBy = (n.readBy as Record<string, boolean>) || {};
    return {
      id: n.id,
      type: n.type,
      entityType: n.entityType,
      entityId: n.entityId,
      title: n.title,
      message: n.message,
      actorId: n.actorId,
      actorName: n.actorName,
      createdAt: n.createdAt,
      isRead: readBy[userId] === true,
      metadata: n.metadata as Record<string, unknown> | undefined,
    };
  });
}

// =============================================================================
// Get Unread Count
// =============================================================================

export async function getUnreadCount(companyId: string, userId: string): Promise<number> {
  const notifications = await prisma.notification.findMany({
    where: {
      companyId,
      targetUserIds: { array_contains: [userId] },
    },
    select: { readBy: true },
  });

  return notifications.filter((n) => {
    const readBy = (n.readBy as Record<string, boolean>) || {};
    return readBy[userId] !== true;
  }).length;
}

// =============================================================================
// Mark as Read
// =============================================================================

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { readBy: true },
  });

  if (!notification) return;

  const readBy = (notification.readBy as Record<string, boolean>) || {};
  readBy[userId] = true;

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readBy },
  });
}

export async function markAllAsRead(companyId: string, userId: string): Promise<void> {
  const notifications = await prisma.notification.findMany({
    where: {
      companyId,
      targetUserIds: { array_contains: [userId] },
    },
    select: { id: true, readBy: true },
  });

  // Update each notification
  await Promise.all(
    notifications.map(async (n) => {
      const readBy = (n.readBy as Record<string, boolean>) || {};
      if (readBy[userId] !== true) {
        readBy[userId] = true;
        await prisma.notification.update({
          where: { id: n.id },
          data: { readBy },
        });
      }
    })
  );
}

// =============================================================================
// Helper: Create Transaction Notification
// =============================================================================

interface TransactionNotificationParams {
  companyId: string;
  transactionType: "expense" | "income";
  transactionId: string;
  action: "created" | "updated" | "deleted" | "status_changed";
  actorId: string;
  actorName: string;
  creatorId?: string; // ผู้สร้างรายการ (สำหรับแจ้งเตือนเมื่อคนอื่นแก้ไข/ลบ)
  transactionDescription?: string;
  amount?: number;
  oldStatus?: string;
  newStatus?: string;
  changedFields?: string[];
}

const ACTION_TITLES: Record<string, Record<string, string>> = {
  expense: {
    created: "รายจ่ายใหม่",
    updated: "รายจ่ายถูกแก้ไข",
    deleted: "รายจ่ายถูกลบ",
    status_changed: "รายจ่ายเปลี่ยนสถานะ",
  },
  income: {
    created: "รายรับใหม่",
    updated: "รายรับถูกแก้ไข",
    deleted: "รายรับถูกลบ",
    status_changed: "รายรับเปลี่ยนสถานะ",
  },
};

const ACTION_TO_TYPE: Record<string, NotificationType> = {
  created: "TRANSACTION_CREATED",
  updated: "TRANSACTION_UPDATED",
  deleted: "TRANSACTION_DELETED",
  status_changed: "TRANSACTION_STATUS_CHANGED",
};

export async function notifyTransactionChange(params: TransactionNotificationParams): Promise<void> {
  const {
    companyId,
    transactionType,
    transactionId,
    action,
    actorId,
    actorName,
    creatorId,
    transactionDescription,
    amount,
    oldStatus,
    newStatus,
    changedFields,
  } = params;

  // Determine target users based on action
  let targetUserIds: string[] = [];
  
  switch (action) {
    case "created":
      // ไม่ต้องแจ้งเตือนเมื่อสร้างใหม่ (ปกติธรรมดา)
      return;
      
    case "updated":
    case "deleted":
    case "status_changed":
      // แจ้งเตือนผู้สร้างรายการ (ถ้าคนแก้ไข/ลบ ไม่ใช่ผู้สร้าง)
      if (creatorId && creatorId !== actorId) {
        targetUserIds = [creatorId];
      }
      break;
  }
  
  // ถ้าไม่มี target ก็ไม่ต้องแจ้ง
  if (targetUserIds.length === 0) {
    return;
  }

  const title = ACTION_TITLES[transactionType][action];
  
  let message = "";
  if (transactionDescription) {
    message = transactionDescription;
  }
  if (amount) {
    message += ` ฿${amount.toLocaleString("th-TH")}`;
  }
  if (action === "status_changed" && oldStatus && newStatus) {
    message += ` (${oldStatus} → ${newStatus})`;
  }
  if (action === "updated" && changedFields && changedFields.length > 0) {
    message += ` แก้ไข: ${changedFields.join(", ")}`;
  }
  message += ` โดย ${actorName}`;

  await createNotification({
    companyId,
    type: ACTION_TO_TYPE[action],
    entityType: transactionType === "expense" ? "Expense" : "Income",
    entityId: transactionId,
    title,
    message: message.trim(),
    actorId,
    actorName,
    targetUserIds,
    metadata: {
      transactionType,
      action,
      oldStatus,
      newStatus,
      changedFields,
      amount,
    },
  });
}

// =============================================================================
// Helper: Create Reimbursement Notification
// =============================================================================

interface ReimbursementNotificationParams {
  companyId: string;
  requestId: string;
  action: "submitted" | "approved" | "rejected" | "paid";
  requesterName: string;
  requesterEmail?: string; // Email ของผู้ส่งคำขอ (สำหรับหา userId)
  amount: number;
  actorId?: string;
  actorName?: string;
  reason?: string;
}

const REIMB_TITLES: Record<string, string> = {
  submitted: "คำขอเบิกจ่ายใหม่",
  approved: "คำขอเบิกจ่ายถูกอนุมัติ",
  rejected: "คำขอเบิกจ่ายถูกปฏิเสธ",
  paid: "จ่ายเงินเบิกจ่ายแล้ว",
};

const REIMB_TO_TYPE: Record<string, NotificationType> = {
  submitted: "REIMBURSEMENT_SUBMITTED",
  approved: "REIMBURSEMENT_APPROVED",
  rejected: "REIMBURSEMENT_REJECTED",
  paid: "REIMBURSEMENT_PAID",
};

export async function notifyReimbursement(params: ReimbursementNotificationParams): Promise<void> {
  const {
    companyId,
    requestId,
    action,
    requesterName,
    requesterEmail,
    amount,
    actorId,
    actorName,
    reason,
  } = params;

  // Determine target users based on action
  let targetUserIds: string[] = [];
  
  switch (action) {
    case "submitted":
      // แจ้ง Owner และผู้ที่มีสิทธิ์อนุมัติ
      const approvers = await prisma.companyAccess.findMany({
        where: {
          companyId,
          OR: [
            { isOwner: true },
            // ผู้ที่มีสิทธิ์ approve
            { permissions: { array_contains: ["reimbursements:approve"] } },
            { permissions: { array_contains: ["reimbursements:*"] } },
          ],
        },
        select: { userId: true },
      });
      targetUserIds = approvers.map(a => a.userId);
      break;
      
    case "approved":
    case "rejected":
    case "paid":
      // แจ้งผู้ส่งคำขอ (หาจาก email)
      if (requesterEmail) {
        const requester = await prisma.user.findUnique({
          where: { email: requesterEmail },
          select: { id: true },
        });
        if (requester) {
          targetUserIds = [requester.id];
        }
      }
      break;
  }
  
  // ถ้าไม่มี target ก็ไม่ต้องแจ้ง
  if (targetUserIds.length === 0) {
    return;
  }

  const title = REIMB_TITLES[action];
  let message = `${requesterName} ฿${amount.toLocaleString("th-TH")}`;
  
  if (actorName && action !== "submitted") {
    message += ` โดย ${actorName}`;
  }
  if (reason) {
    message += ` (${reason})`;
  }

  await createNotification({
    companyId,
    type: REIMB_TO_TYPE[action],
    entityType: "ReimbursementRequest",
    entityId: requestId,
    title,
    message,
    actorId,
    actorName,
    targetUserIds,
    metadata: {
      action,
      requesterName,
      amount,
      reason,
    },
  });
}
