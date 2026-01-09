import { prisma } from "@/lib/db";
import { withCompanyAccess } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";
import {
  DEFAULT_EXPENSE_GROUPS,
  DEFAULT_INCOME_GROUPS,
} from "@/lib/constants/default-categories";

// POST /api/[company]/categories/reset
// Resets to default categories with 2-level hierarchy (groups → sub-categories)
async function handlePost(
  req: Request,
  context: { company: { id: string }; companyCode: string }
) {
  try {
    let groupsCreated = 0;
    let childrenCreated = 0;
    let updated = 0;
    let deactivated = 0;
    let deleted = 0;

    // Build sets of default category names for checking
    const defaultExpenseGroupNames = new Set(
      DEFAULT_EXPENSE_GROUPS.map((g) => g.name)
    );
    const defaultExpenseChildNames = new Set(
      DEFAULT_EXPENSE_GROUPS.flatMap((g) => g.children.map((c) => c.name))
    );
    const defaultIncomeGroupNames = new Set(
      DEFAULT_INCOME_GROUPS.map((g) => g.name)
    );
    const defaultIncomeChildNames = new Set(
      DEFAULT_INCOME_GROUPS.flatMap((g) => g.children.map((c) => c.name))
    );

    const allDefaultExpenseNames = new Set([
      ...defaultExpenseGroupNames,
      ...defaultExpenseChildNames,
    ]);
    const allDefaultIncomeNames = new Set([
      ...defaultIncomeGroupNames,
      ...defaultIncomeChildNames,
    ]);

    // Get all existing categories
    const existingCategories = await prisma.category.findMany({
      where: {
        companyId: context.company.id,
        isDefault: true,
      },
      include: {
        _count: { select: { expenses: true, incomes: true } },
      },
    });

    // Delete or deactivate old categories
    for (const cat of existingCategories) {
      const isInNewDefaults =
        (cat.type === "EXPENSE" && allDefaultExpenseNames.has(cat.name)) ||
        (cat.type === "INCOME" && allDefaultIncomeNames.has(cat.name));

      if (!isInNewDefaults) {
        const hasTransactions =
          cat._count.expenses > 0 || cat._count.incomes > 0;

        if (!hasTransactions) {
          await prisma.category.delete({ where: { id: cat.id } });
          deleted++;
        } else {
          await prisma.category.update({
            where: { id: cat.id },
            data: { isActive: false },
          });
          deactivated++;
        }
      }
    }

    // ==================== EXPENSE GROUPS ====================
    for (const group of DEFAULT_EXPENSE_GROUPS) {
      // Create or update group (parent)
      const parentCategory = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: context.company.id,
            name: group.name,
            type: "EXPENSE",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: group.color,
          icon: group.icon,
          order: group.order,
          parentId: null,
        },
        create: {
          companyId: context.company.id,
          name: group.name,
          type: "EXPENSE",
          isDefault: true,
          isActive: true,
          color: group.color,
          icon: group.icon,
          order: group.order,
          parentId: null,
        },
      });

      const isNew =
        parentCategory.createdAt.getTime() === parentCategory.updatedAt.getTime();
      if (isNew) groupsCreated++;
      else updated++;

      // Create or update children
      for (const child of group.children) {
        const childOrder = group.order * 100 + child.order;

        const childCategory = await prisma.category.upsert({
          where: {
            companyId_name_type: {
              companyId: context.company.id,
              name: child.name,
              type: "EXPENSE",
            },
          },
          update: {
            isDefault: true,
            isActive: true,
            color: child.color || group.color,
            icon: child.icon,
            order: childOrder,
            parentId: parentCategory.id,
          },
          create: {
            companyId: context.company.id,
            name: child.name,
            type: "EXPENSE",
            isDefault: true,
            isActive: true,
            color: child.color || group.color,
            icon: child.icon,
            order: childOrder,
            parentId: parentCategory.id,
          },
        });

        const isChildNew =
          childCategory.createdAt.getTime() === childCategory.updatedAt.getTime();
        if (isChildNew) childrenCreated++;
        else updated++;
      }
    }

    // ==================== INCOME GROUPS ====================
    for (const group of DEFAULT_INCOME_GROUPS) {
      // Create or update group (parent)
      const parentCategory = await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: context.company.id,
            name: group.name,
            type: "INCOME",
          },
        },
        update: {
          isDefault: true,
          isActive: true,
          color: group.color,
          icon: group.icon,
          order: group.order,
          parentId: null,
        },
        create: {
          companyId: context.company.id,
          name: group.name,
          type: "INCOME",
          isDefault: true,
          isActive: true,
          color: group.color,
          icon: group.icon,
          order: group.order,
          parentId: null,
        },
      });

      const isNew =
        parentCategory.createdAt.getTime() === parentCategory.updatedAt.getTime();
      if (isNew) groupsCreated++;
      else updated++;

      // Create or update children
      for (const child of group.children) {
        const childOrder = group.order * 100 + child.order;

        const childCategory = await prisma.category.upsert({
          where: {
            companyId_name_type: {
              companyId: context.company.id,
              name: child.name,
              type: "INCOME",
            },
          },
          update: {
            isDefault: true,
            isActive: true,
            color: child.color || group.color,
            icon: child.icon,
            order: childOrder,
            parentId: parentCategory.id,
          },
          create: {
            companyId: context.company.id,
            name: child.name,
            type: "INCOME",
            isDefault: true,
            isActive: true,
            color: child.color || group.color,
            icon: child.icon,
            order: childOrder,
            parentId: parentCategory.id,
          },
        });

        const isChildNew =
          childCategory.createdAt.getTime() === childCategory.updatedAt.getTime();
        if (isChildNew) childrenCreated++;
        else updated++;
      }
    }

    // Summary
    const totalExpense =
      DEFAULT_EXPENSE_GROUPS.length +
      DEFAULT_EXPENSE_GROUPS.reduce((sum, g) => sum + g.children.length, 0);
    const totalIncome =
      DEFAULT_INCOME_GROUPS.length +
      DEFAULT_INCOME_GROUPS.reduce((sum, g) => sum + g.children.length, 0);

    return apiResponse.success(
      {
        total: totalExpense + totalIncome,
        groupsCreated,
        childrenCreated,
        updated,
        deleted,
        deactivated,
        expense: {
          groups: DEFAULT_EXPENSE_GROUPS.length,
          children: DEFAULT_EXPENSE_GROUPS.reduce(
            (sum, g) => sum + g.children.length,
            0
          ),
        },
        income: {
          groups: DEFAULT_INCOME_GROUPS.length,
          children: DEFAULT_INCOME_GROUPS.reduce(
            (sum, g) => sum + g.children.length,
            0
          ),
        },
      },
      `รีเซ็ตหมวดหมู่สำเร็จ: สร้างกลุ่ม ${groupsCreated}, สร้างหมวดย่อย ${childrenCreated}, อัพเดต ${updated}, ลบ ${deleted}, ปิดใช้งาน ${deactivated}`
    );
  } catch (error: unknown) {
    console.error("Reset categories error:", error);
    if (error instanceof Error) {
      return apiResponse.badRequest(error.message);
    }
    return apiResponse.error("เกิดข้อผิดพลาด");
  }
}

// Helper to extract company code from URL path
const getCompanyFromPath = (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // URL: /api/[company]/categories/reset → pathParts = ["", "api", "company", "categories", "reset"]
  return pathParts[2];
};

export const POST = withCompanyAccess(handlePost, {
  permission: "settings:write",
  getCompanyCode: getCompanyFromPath,
});
