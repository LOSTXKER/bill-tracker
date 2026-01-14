/**
 * Comments API
 * GET /api/[company]/comments?entityType=expense&entityId=xxx - Get comments
 * POST /api/[company]/comments - Create a comment
 */

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
  } else if (entityType === "reimbursement") {
    where.reimbursementRequestId = entityId;
  } else {
    return apiResponse.badRequest("Invalid entityType");
  }

  // Only get top-level comments (no parentId), replies are included via relation
  const comments = await prisma.comment.findMany({
    where: {
      ...where,
      parentId: null,
    },
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      replies: {
        where: { deletedAt: null },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse.success({ comments });
}

// POST: Create a comment
async function handlePost(request: Request, { session, company }: { session: { user: { id: string; name: string } }; company: { id: string } }) {
  const body = await request.json();
  const { entityType, entityId, content, parentId, mentionedUserIds } = body;

  if (!entityType || !entityId || !content?.trim()) {
    return apiResponse.badRequest("entityType, entityId, and content are required");
  }

  // Build data based on entity type
  const data: Record<string, unknown> = {
    content: content.trim(),
    authorId: session.user.id,
    mentionedUserIds: mentionedUserIds || [],
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

  const comment = await prisma.comment.create({
    data: data as any,
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

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
