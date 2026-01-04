/**
 * Team Management API
 * 
 * Endpoints for managing team members and their permissions
 * Requires OWNER permissions to access
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/permissions/checker";
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

    // Require settings:manage-team permission (owners have all permissions automatically)
    await requirePermission(companyId, "settings:manage-team");

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
 * Create a new member for the company
 * Body: { name: string, email: string, password: string, permissions: string[], isOwner?: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const session = await auth();

    // Require settings:manage-team permission (owners have all permissions automatically)
    const currentUser = await requirePermission(companyId, "settings:manage-team");

    const body = await request.json();
    const { name, email, password, permissions = [], isOwner = false } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if user already has access to this company
      const existingAccess = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: existingUser.id,
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

      return NextResponse.json(
        { error: "Email already registered. Please use a different email." },
        { status: 409 }
      );
    }

    // Hash password and create new user
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "STAFF",
        isActive: true, // Active immediately
      },
    });

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

    // Log the member creation
    await logMemberInvite(email, permissions, currentUser.id, companyId);

    return NextResponse.json(
      {
        member: access,
        message: "Member created successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating member:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}

