import { prisma } from "@/lib/db";
import { apiResponse } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const codeFilter = searchParams.get("code")?.toUpperCase();

  // If admin, return all companies (with optional code filter)
  if (session.user.role === "ADMIN") {
    const companies = await prisma.company.findMany({
      where: codeFilter ? { code: codeFilter } : undefined,
      orderBy: { name: "asc" },
    });
    return apiResponse.success({ companies });
  }

  // Otherwise, return only companies user has access to
  const companyAccessRaw = await prisma.companyAccess.findMany({
    where: { 
      userId: session.user.id,
      ...(codeFilter && { Company: { code: codeFilter } }),
    },
    include: { Company: true },
  });

  const companies = companyAccessRaw.map((ca) => ({
    ...ca.Company,
    isOwner: ca.isOwner,
    permissions: ca.permissions,
  }));

  return apiResponse.success({ companies });
});

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const { name, code, taxId, address, phone } = body;

  if (!name || !code) {
    return apiResponse.badRequest("Name and code are required");
  }

  // Validate code format (2-10 uppercase letters/numbers)
  const codeRegex = /^[A-Z0-9]{2,10}$/;
  if (!codeRegex.test(code.toUpperCase())) {
    return apiResponse.badRequest("รหัสบริษัทต้องเป็นตัวอักษร 2-10 ตัว");
  }

  // Check if code already exists
  const existing = await prisma.company.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (existing) {
    return apiResponse.badRequest("รหัสบริษัทนี้ถูกใช้แล้ว");
  }

  // Create company and assign user as OWNER
  const company = await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name,
      code: code.toUpperCase(),
      taxId,
      address,
      phone,
      updatedAt: new Date(),
      CompanyAccess: {
        create: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          isOwner: true,
          permissions: [],
        },
      },
    },
  });

  return apiResponse.created({ company }, "Company created successfully");
});
