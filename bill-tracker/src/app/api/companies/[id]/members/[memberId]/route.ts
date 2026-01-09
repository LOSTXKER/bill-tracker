/**
 * Individual Team Member API
 * 
 * Endpoints for updating and removing individual team members
 * Requires OWNER permissions
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logPermissionChange, logMemberRemove } from "@/lib/audit/logger";

/**
 * PATCH /api/companies/[id]/members/[memberId]
 * 
 * Update member permissions
 * Body: { permissions: string[], isOwner?: boolean }
 */
export const PATCH = withCompanyAccessFromParams(
  async (request, { company, session, params }) => {
    const { memberId } = params;
    const body = await request.json();
    const { permissions, isOwner } = body;

    // Get the current member info
    const currentAccess = await prisma.companyAccess.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!currentAccess) {
      return apiResponse.notFound("Member not found");
    }

    // Prevent user from modifying their own permissions
    if (currentAccess.userId === session.user.id) {
      return apiResponse.forbidden("Cannot modify your own permissions");
    }

    // Prepare update data
    const updateData: any = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isOwner !== undefined) updateData.isOwner = isOwner;

    // Update the member
    const updated = await prisma.companyAccess.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log the permission change if permissions were updated
    if (permissions !== undefined) {
      await logPermissionChange(
        currentAccess.user.name,
        currentAccess.permissions as string[],
        permissions,
        session.user.id,
        company.id
      );
    }

    return apiResponse.success(
      { member: updated },
      "Permissions updated successfully"
    );
  },
  { permission: "settings:manage-team" }
);

/**
 * DELETE /api/companies/[id]/members/[memberId]
 * 
 * Remove a member from the company
 */
export const DELETE = withCompanyAccessFromParams(
  async (request, { company, session, params }) => {
    const { memberId } = params;

    // Get the member to be removed
    const memberToRemove = await prisma.companyAccess.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!memberToRemove) {
      return apiResponse.notFound("Member not found");
    }

    // Prevent user from removing themselves
    if (memberToRemove.userId === session.user.id) {
      return apiResponse.forbidden("Cannot remove yourself from the company");
    }

    // Prevent removing the last owner
    if (memberToRemove.isOwner) {
      const ownerCount = await prisma.companyAccess.count({
        where: {
          companyId: company.id,
          isOwner: true,
        },
      });

      if (ownerCount <= 1) {
        return apiResponse.forbidden(
          "Cannot remove the last owner. Assign another owner first."
        );
      }
    }

    // Remove the member
    await prisma.companyAccess.delete({
      where: { id: memberId },
    });

    // Log the removal
    await logMemberRemove(
      memberToRemove.user.name,
      memberToRemove.user.email,
      session.user.id,
      company.id
    );

    return apiResponse.success(
      { message: "Member removed successfully" }
    );
  },
  { permission: "settings:manage-team" }
);
