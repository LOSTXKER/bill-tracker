import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AccountsPageClient } from "@/components/accounts/accounts-page-client";

interface PageProps {
  params: Promise<{ company: string }>;
}

export default async function AccountsPage({ params }: PageProps) {
  const { company: companyCode } = await params;
  const session = await auth();

  // Get company (use toUpperCase to match how layout finds it)
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    notFound();
  }

  // Get access for edit permissions (layout already handles access control)
  const companyAccess = session?.user?.id ? await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: company.id,
      },
    },
  }) : null;

  const permissions = (companyAccess?.permissions as string[]) || [];
  const isOwner = companyAccess?.isOwner || false;
  const canEdit = permissions.includes("settings:write") || isOwner;

  // Fetch all accounts
  const accounts = await prisma.account.findMany({
    where: { companyId: company.id },
    orderBy: [{ code: "asc" }],
  });

  return (
    <AccountsPageClient
      companyCode={company.code}
      companyName={company.name}
      accounts={accounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        class: a.class,
        isSystem: a.isSystem,
        isActive: a.isActive,
        keywords: a.keywords as string[],
        description: a.description,
      }))}
      canEdit={canEdit}
    />
  );
}
