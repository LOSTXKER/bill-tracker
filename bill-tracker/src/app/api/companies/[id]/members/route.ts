/**
 * Team Management API
 * 
 * Endpoints for managing team members and their permissions
 * Requires OWNER permissions to access
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { requireOwner } from "@/lib/permissions/checker";
import { logMemberInvite } from "@/lib/audit/logger";

/**
 * GET /api/companies/[id]/members
 * 
 * Get all members of a company with their permissions
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    
    // Require OWNER permission
    await requireOwner(companyId);

    // Get all company access records with user details
    const members = await prisma.companyAccess.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            lastLoginAt: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { isOwner: "desc" }, // OWNERs first
        { createdAt: "asc" }, // Then by join date
      ],
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/members
 * 
 * Invite a new member to the company
 * Body: { email: string, permissions: string[], isOwner?: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const session = await auth();
    
    // Require OWNER permission
    const currentUser = await requireOwner(companyId);

    const body = await request.json();
    const { email, permissions = [], isOwner = false } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create a new one with a temporary password
    if (!user) {
      // In a real system, you would:
      // 1. Generate a unique invite token
      // 2. Send an email with registration link
      // 3. Let them set their password
      // For now, we'll create them with a placeholder
      const tempPassword = require("crypto").randomBytes(32).toString("hex");
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0], // Use email prefix as temporary name
          password: hashedPassword,
          role: "STAFF",
          isActive: false, // Inactive until they complete registration
        },
      });
    }

    // Check if user already has access to this company
    const existingAccess = await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: "User already has access to this company" },
        { status: 409 }
      );
    }

    // Create company access
    const access = await prisma.companyAccess.create({
      data: {
        userId: user.id,
        companyId,
        isOwner,
        permissions,
      },
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

    // Log the invitation
    await logMemberInvite(email, permissions, currentUser.id, companyId);

    return NextResponse.json(
      { 
        member: access,
        message: "Member invited successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inviting member:", error);
    
    if (error instanceof Error && error.message.includes("redirect")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
