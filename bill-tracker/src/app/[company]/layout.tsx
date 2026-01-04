import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";

interface CompanyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ company: string }>;
}

export default async function CompanyLayout({
  children,
  params,
}: CompanyLayoutProps) {
  const session = await auth();
  const { company: companyCode } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  // Find company by code
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    notFound();
  }

  // Check if user has access and get permissions
  const companyAccess = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session.user.id,
        companyId: company.id,
      },
    },
  });

  const hasAccess = session.user.role === "ADMIN" || companyAccess;

  if (!hasAccess) {
    redirect("/");
  }

  // Get user permissions
  const isOwner = companyAccess?.isOwner || false;
  const permissions = (companyAccess?.permissions as string[]) || [];

  return (
    <DashboardShell 
      company={company} 
      user={session.user}
      isOwner={isOwner}
      permissions={permissions}
    >
      {children}
    </DashboardShell>
  );
}
