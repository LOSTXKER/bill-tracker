import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DataExportPage } from "@/components/data-export-page";

interface PageProps {
  params: Promise<{
    company: string;
  }>;
}

export default async function ExportsPage({ params }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  const { company: companyCode } = await params;

  // Fetch company data
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!company) {
    redirect("/");
  }

  // Get user's access for this company
  const companyAccess = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: company.id,
      },
    },
    select: {
      isOwner: true,
      permissions: true,
    },
  });

  if (!companyAccess) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <DataExportPage
        companyId={company.id}
        companyName={company.name}
        companyCode={company.code}
        isOwner={companyAccess.isOwner}
      />
    </div>
  );
}
