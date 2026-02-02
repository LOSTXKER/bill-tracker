/**
 * Reset Password API
 * 
 * Allows company owners to reset a member's password
 * POST /api/companies/[id]/members/[memberId]/reset-password
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { createApiLogger } from "@/lib/utils/logger";
import { hash } from "bcryptjs";
import { z } from "zod";

const log = createApiLogger("companies/members/reset-password");

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*[0-9])|(?=.*[A-Z])(?=.*[0-9]).+$/,
      "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลข"
    ),
});

export const POST = withCompanyAccessFromParams(
  async (request, { company, session, params }) => {
    const { memberId } = params;

    // Parse and validate body
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return apiResponse.badRequest(result.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง");
    }

    const { newPassword } = result.data;

    // Get the member
    const memberAccess = await prisma.companyAccess.findUnique({
      where: { id: memberId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!memberAccess) {
      return apiResponse.notFound("ไม่พบสมาชิก");
    }

    // Prevent user from resetting their own password through this endpoint
    if (memberAccess.userId === session.user.id) {
      return apiResponse.forbidden("ไม่สามารถเปลี่ยนรหัสผ่านตัวเองผ่าน endpoint นี้ได้");
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: memberAccess.userId },
      data: { password: hashedPassword },
    });

    // Audit log
    log.info("Password reset", { 
      targetUser: memberAccess.User.email, 
      byUser: session.user.email 
    });

    return apiResponse.success(
      {
        message: "รีเซ็ตรหัสผ่านเรียบร้อย",
        user: {
          name: memberAccess.User.name,
          email: memberAccess.User.email,
        },
      },
      "รีเซ็ตรหัสผ่านเรียบร้อย"
    );
  },
  { permission: "settings:manage-team" }
);
