/**
 * Notifications API
 * GET /api/[company]/notifications - Get notifications for current user
 * POST /api/[company]/notifications/read - Mark notifications as read
 */

import { apiResponse } from "@/lib/api/response";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import {
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications/in-app";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // /api/[company]/notifications -> pathParts[2] is company
  return pathParts[2];
};

// GET: Get notifications for current user
async function handleGet(request: Request, { session, company }: { session: { user: { id: string } }; company: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(company.id, session.user.id, limit),
    getUnreadCount(company.id, session.user.id),
  ]);

  return apiResponse.success({
    notifications,
    unreadCount,
  });
}

// POST: Mark as read
async function handlePost(request: Request, { session, company }: { session: { user: { id: string } }; company: { id: string } }) {
  const body = await request.json();
  const { notificationId, markAll } = body;

  if (markAll) {
    await markAllAsRead(company.id, session.user.id);
    return apiResponse.success({ message: "Marked all as read" });
  }

  if (notificationId) {
    await markAsRead(notificationId, session.user.id);
    return apiResponse.success({ message: "Marked as read" });
  }

  return apiResponse.badRequest("notificationId or markAll is required");
}

export const GET = withCompanyAccess(handleGet, {
  getCompanyCode: getCompanyFromPath,
});

export const POST = withCompanyAccess(handlePost, {
  getCompanyCode: getCompanyFromPath,
});
