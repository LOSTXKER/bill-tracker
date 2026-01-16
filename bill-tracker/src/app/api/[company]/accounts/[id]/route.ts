import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import { ApiErrors } from "@/lib/api/errors";

// GET /api/[company]/accounts/[id]
// Get a specific account 
async function handleGet(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  const account = await prisma.account.findFirst({
    where: {
      id: context.params.id,
      companyId: context.company.id,
    },
    include: {
      Account: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      other_Account: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!account) {
    return apiResponse.notFound("ไม่พบบัญชีนี้");
  }

  // Map Prisma relation names to client-expected names
  const { Account: parent, other_Account: children, ...rest } = account;
  return apiResponse.success({ account: { ...rest, parent, children } });
}

// PATCH /api/[company]/accounts/[id]
// Update an account
async function handlePatch(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  try {
    const body = await req.json();
    const { name, keywords, description, isActive } = body;

    // Check if account exists and belongs to company
    const existing = await prisma.account.findFirst({
      where: {
        id: context.params.id,
        companyId: context.company.id,
      },
    });

    if (!existing) {
      return apiResponse.notFound("ไม่พบบัญชีนี้");
    }

    // Don't allow modifying system accounts' core fields
    if (existing.isSystem && (body.code || body.class)) {
      return apiResponse.error(ApiErrors.forbidden("ไม่สามารถแก้ไขรหัสหรือประเภทของบัญชีระบบได้"));
    }

    // Update account
    const updated = await prisma.account.update({
      where: { id: context.params.id },
      data: {
        ...(name && { name }),
        ...(keywords && { keywords }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return apiResponse.success({ account: updated });
  } catch (error) {
    console.error("Account update error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการอัพเดตบัญชี")
    );
  }
}

// DELETE /api/[company]/accounts/[id]
// Delete an account (only custom accounts)
async function handleDelete(
  req: Request,
  context: {
    company: { id: string; code: string; name: string };
    params: { id: string };
  }
) {
  try {
    // Check if account exists and belongs to company
    const existing = await prisma.account.findFirst({
      where: {
        id: context.params.id,
        companyId: context.company.id,
      },
    });

    if (!existing) {
      return apiResponse.notFound("ไม่พบบัญชีนี้");
    }

    // Don't allow deleting system accounts
    if (existing.isSystem) {
      return apiResponse.error(ApiErrors.forbidden("ไม่สามารถลบบัญชีระบบได้"));
    }

    // Check if account is in use
    const [expenseCount, incomeCount] = await Promise.all([
      prisma.expense.count({
        where: { accountId: context.params.id },
      }),
      prisma.income.count({
        where: { accountId: context.params.id },
      }),
    ]);

    if (expenseCount > 0 || incomeCount > 0) {
      return apiResponse.error(
        ApiErrors.conflict(`บัญชีนี้ถูกใช้งานอยู่ใน ${expenseCount + incomeCount} รายการ ไม่สามารถลบได้`)
      );
    }

    // Delete account
    await prisma.account.delete({
      where: { id: context.params.id },
    });

    return apiResponse.success({ message: "ลบบัญชีสำเร็จ" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return apiResponse.error(
      error instanceof Error
        ? error
        : new Error("เกิดข้อผิดพลาดในการลบบัญชี")
    );
  }
}

export const GET = withCompanyAccessFromParams(handleGet, {
  permission: "reports:read",
});

export const PATCH = withCompanyAccessFromParams(handlePatch, {
  permission: "settings:write",
});

export const DELETE = withCompanyAccessFromParams(handleDelete, {
  permission: "settings:write",
});
