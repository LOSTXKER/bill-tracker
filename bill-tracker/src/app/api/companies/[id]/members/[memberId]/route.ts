/**
 * Individual Team Member API
 * 
 * Endpoints for updating and removing individual team members
 * Requires OWNER permissions
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/checker";
import { logPermissionChange, logMemberRemove } from "@/lib/audit/logger";

/**
 * PATCH /api/companies/[id]/members/[memberId]
 * 
 * Update member permissions
 * Body: { permissions: string[], isOwner?: boolean }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: companyId, memberId } = await params;
    
    // Require settings:manage-team permission (owners have all permissions automatically)
    const currentUser = await requirePermission(companyId, "settings:manage-team");

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
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent user from modifying their own permissions
    if (currentAccess.userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot modify your own permissions" },
        { status: 403 }
      );
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
        currentUser.id,
        companyId
      );
    }

    return NextResponse.json(
      {
        member: updated,
        message: "Permissions updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating member permissions:", error);
    
    if (error instanceof Error && error.message.includes("redirect")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/members/[memberId]
 * 
 * Remove a member from the company
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: companyId, memberId } = await params;
    
    // Require settings:manage-team permission (owners have all permissions automatically)
    const currentUser = await requirePermission(companyId, "settings:manage-team");

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
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent user from removing themselves
    if (memberToRemove.userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the company" },
        { status: 403 }
      );
    }

    // Prevent removing the last owner
    if (memberToRemove.isOwner) {
      const ownerCount = await prisma.companyAccess.count({
        where: {
          companyId,
          isOwner: true,
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner. Assign another owner first." },
          { status: 403 }
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
      currentUser.id,
      companyId
    );

    return NextResponse.json(
      { message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing member:", error);
    
    if (error instanceof Error && error.message.includes("redirect")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
