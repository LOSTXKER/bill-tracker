/**
 * Team Management API
 * 
 * Endpoints for managing team members and their permissions
 * Requires OWNER permissions to access
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { logMemberInvite } from "@/lib/audit/logger";

/**
 * GET /api/companies/[id]/members
 * 
 * Get all members of a company with their permissions
 */
export const GET = withCompanyAccessFromParams(
  async (request, { company }) => {
    // Get all company access records with user details
    const membersRaw = await prisma.companyAccess.findMany({
      where: { companyId: company.id },
      include: {
        User: {
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
    const members = membersRaw.map((m) => ({ ...m, user: m.User }));

    return apiResponse.success({ members });
  }
  // No permission required - all team members can view the employee list
);

/**
 * POST /api/companies/[id]/members
 * 
 * Create a new member for the company
 * Body: { name: string, email: string, password: string, permissions: string[], isOwner?: boolean }
 */
export const POST = withCompanyAccessFromParams(
  async (request, { company, session }) => {
    const body = await request.json();
    const { name, email, password, permissions = [], isOwner = false } = body;

    if (!name) {
      return apiResponse.badRequest("กรุณาระบุชื่อ");
    }

    if (!email) {
      return apiResponse.badRequest("กรุณาระบุอีเมล");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiResponse.badRequest("Invalid email format");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let user;
    let isNewUser = false;

    if (existingUser) {
      // Check if user already has access to this company
      const existingAccess = await prisma.companyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: existingUser.id,
            companyId: company.id,
          },
        },
      });

      if (existingAccess) {
        return apiResponse.badRequest("ผู้ใช้นี้มีสิทธิ์เข้าถึงบริษัทนี้อยู่แล้ว");
      }

      // User exists but doesn't have access to this company - add them
      user = existingUser;
    } else {
      // Create new user - password is required
      if (!password) {
        return apiResponse.badRequest("Password is required for new users");
      }

      if (password.length < 6) {
        return apiResponse.badRequest("Password must be at least 6 characters");
      }

      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          name,
          password: hashedPassword,
          role: "STAFF",
          isActive: true,
          updatedAt: new Date(),
        },
      });
      isNewUser = true;
    }

    // Create company access
    const accessRaw = await prisma.companyAccess.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        companyId: company.id,
        isOwner,
        permissions,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    const access = { ...accessRaw, user: accessRaw.User };

    // Log the member creation
    await logMemberInvite(email, permissions, session.user.id, company.id);

    const message = isNewUser
      ? "สร้างสมาชิกใหม่สำเร็จ"
      : `เพิ่ม ${existingUser?.name || email} เข้าบริษัทสำเร็จ`;

    return apiResponse.created({ member: access }, message);
  },
  {
    permission: "settings:manage-team",
    rateLimit: { maxRequests: 10, windowMs: 60000 },
  }
);

