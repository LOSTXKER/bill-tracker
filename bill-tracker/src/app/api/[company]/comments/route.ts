/**
 * Comments API
 * GET /api/[company]/comments?entityType=expense&entityId=xxx - Get comments
 * POST /api/[company]/comments - Create a comment
 */

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { apiResponse } from "@/lib/api/response";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/in-app";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // /api/[company]/comments -> pathParts[2] is company
  return pathParts[2];
};

// GET: Get comments for an entity
async function handleGet(request: Request, { company }: { company: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType"); // expense, income, reimbursement
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return apiResponse.badRequest("entityType and entityId are required");
  }

  // Verify entity belongs to this company before loading comments
  if (entityType === "expense") {
    const exists = await prisma.expense.findFirst({
      where: { id: entityId, companyId: company.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Expense not found in this company");
  } else if (entityType === "income") {
    const exists = await prisma.income.findFirst({
      where: { id: entityId, companyId: company.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Income not found in this company");
  } else if (entityType === "reimbursement") {
    const exists = await prisma.reimbursementRequest.findFirst({
      where: { id: entityId, companyId: company.id },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Reimbursement not found in this company");
  } else {
    return apiResponse.badRequest("Invalid entityType");
  }

  // Build where clause based on entity type
  const where: Record<string, string | null> = {
    expenseId: null,
    incomeId: null,
    reimbursementRequestId: null,
    deletedAt: null,
  };

  if (entityType === "expense") {
    where.expenseId = entityId;
  } else if (entityType === "income") {
    where.incomeId = entityId;
  } else {
    where.reimbursementRequestId = entityId;
  }

  // Only get top-level comments (no parentId), replies are included via relation
  const commentsRaw = await prisma.comment.findMany({
    where: {
      ...where,
      parentId: null,
    },
    include: {
      User: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      other_Comment: {
        where: { deletedAt: null },
        include: {
          User: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map Prisma relation names to client-expected names
  const comments = commentsRaw.map((c) => ({
    ...c,
    author: c.User,
    replies: c.other_Comment.map((r) => ({ ...r, author: r.User })),
  }));

  return apiResponse.success({ comments });
}

// POST: Create a comment
async function handlePost(request: Request, { session, company }: { session: { user: { id: string; name: string } }; company: { id: string } }) {
  const body = await request.json();
  const { entityType, entityId, content, parentId, mentionedUserIds } = body;

  if (!entityType || !entityId || !content?.trim()) {
    return apiResponse.badRequest("entityType, entityId, and content are required");
  }

  // Verify entity belongs to this company
  if (entityType === "expense") {
    const exists = await prisma.expense.findFirst({
      where: { id: entityId, companyId: company.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Expense not found in this company");
  } else if (entityType === "income") {
    const exists = await prisma.income.findFirst({
      where: { id: entityId, companyId: company.id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Income not found in this company");
  } else if (entityType === "reimbursement") {
    const exists = await prisma.reimbursementRequest.findFirst({
      where: { id: entityId, companyId: company.id },
      select: { id: true },
    });
    if (!exists) return apiResponse.notFound("Reimbursement not found in this company");
  } else {
    return apiResponse.badRequest("Invalid entityType");
  }

  // NOTE: Prisma schema for Comment has no @default on `id` and no @updatedAt,
  // so both fields MUST be set explicitly or `.create()` throws
  // "Argument `id` is missing." in production.
  const data: Prisma.CommentUncheckedCreateInput = {
    id: randomUUID(),
    content: content.trim(),
    authorId: session.user.id,
    mentionedUserIds: mentionedUserIds || [],
    updatedAt: new Date(),
  };

  if (parentId) {
    data.parentId = parentId;
  }

  if (entityType === "expense") {
    data.expenseId = entityId;
  } else if (entityType === "income") {
    data.incomeId = entityId;
  } else if (entityType === "reimbursement") {
    data.reimbursementRequestId = entityId;
  } else {
    return apiResponse.badRequest("Invalid entityType");
  }

  const commentRaw = await prisma.comment.create({
    data,
    include: {
      User: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });
  const comment = { ...commentRaw, author: commentRaw.User };

  // Create notification for mentioned users
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    await createNotification({
      companyId: company.id,
      type: "COMMENT_MENTION",
      entityType: entityType === "expense" ? "Expense" : entityType === "income" ? "Income" : "ReimbursementRequest",
      entityId,
      title: "คุณถูก mention ในความคิดเห็น",
      message: `${session.user.name}: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
      actorId: session.user.id,
      actorName: session.user.name || "ผู้ใช้",
      targetUserIds: mentionedUserIds,
    });
  }

  // Create notification for document owner (if not the commenter)
  let ownerId: string | null = null;
  
  if (entityType === "expense") {
    const expense = await prisma.expense.findUnique({
      where: { id: entityId },
      select: { createdBy: true, description: true },
    });
    ownerId = expense?.createdBy || null;
  } else if (entityType === "income") {
    const income = await prisma.income.findUnique({
      where: { id: entityId },
      select: { createdBy: true },
    });
    ownerId = income?.createdBy || null;
  }

  // Notify owner if they're not the commenter and not already mentioned
  if (ownerId && ownerId !== session.user.id && !mentionedUserIds?.includes(ownerId)) {
    await createNotification({
      companyId: company.id,
      type: parentId ? "COMMENT_REPLY" : "COMMENT_ADDED",
      entityType: entityType === "expense" ? "Expense" : entityType === "income" ? "Income" : "ReimbursementRequest",
      entityId,
      title: parentId ? "มีการตอบกลับความคิดเห็น" : "มีความคิดเห็นใหม่",
      message: `${session.user.name}: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
      actorId: session.user.id,
      actorName: session.user.name || "ผู้ใช้",
      targetUserIds: [ownerId],
    });
  }

  return apiResponse.created({ comment });
}

export const GET = withCompanyAccess(handleGet, {
  getCompanyCode: getCompanyFromPath,
  permission: "comments:read",
});

export const POST = withCompanyAccess(handlePost, {
  getCompanyCode: getCompanyFromPath,
  permission: "comments:create",
});
