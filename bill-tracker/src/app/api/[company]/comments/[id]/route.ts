/**
 * Single Comment API
 * PATCH /api/[company]/comments/[id] - Update a comment
 * DELETE /api/[company]/comments/[id] - Soft delete a comment
 */

import { apiResponse } from "@/lib/api/response";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { prisma } from "@/lib/db";

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // /api/[company]/comments/[id] -> pathParts[2] is company
  return pathParts[2];
};

interface RouteContext {
  params: Promise<{ company: string; id: string }>;
}

// PATCH: Update a comment (content or resolve status)
async function handlePatch(request: Request, { session }: { session: { user: { id: string } } }, routeContext?: RouteContext) {
  if (!routeContext) {
    return apiResponse.badRequest("Missing route context");
  }
  
  const { id } = await routeContext.params;
  const body = await request.json();
  const { content, isResolved } = body;

  // Find the comment
  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    return apiResponse.notFound("Comment not found");
  }

  // Only author can edit content, anyone can resolve
  if (content !== undefined && comment.authorId !== session.user.id) {
    return apiResponse.forbidden("You can only edit your own comments");
  }

  const updateData: Record<string, unknown> = {};

  if (content !== undefined) {
    updateData.content = content.trim();
  }

  if (isResolved !== undefined) {
    updateData.isResolved = isResolved;
    if (isResolved) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = session.user.id;
    } else {
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  return apiResponse.success({ comment: updated });
}

// DELETE: Soft delete a comment
async function handleDelete(request: Request, { session }: { session: { user: { id: string } } }, routeContext?: RouteContext) {
  if (!routeContext) {
    return apiResponse.badRequest("Missing route context");
  }
  
  const { id } = await routeContext.params;

  // Find the comment
  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    return apiResponse.notFound("Comment not found");
  }

  // Only author can delete their own comment
  if (comment.authorId !== session.user.id) {
    return apiResponse.forbidden("You can only delete your own comments");
  }

  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiResponse.success({ message: "Comment deleted" });
}

export const PATCH = withCompanyAccess(handlePatch, {
  getCompanyCode: getCompanyFromPath,
});

export const DELETE = withCompanyAccess(handleDelete, {
  getCompanyCode: getCompanyFromPath,
});
