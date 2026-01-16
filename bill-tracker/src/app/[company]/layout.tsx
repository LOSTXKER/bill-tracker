import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { cache } from "react";

interface CompanyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ company: string }>;
}

// Cache company lookup per request
const getCompany = cache(async (code: string) => {
  return prisma.company.findUnique({
    where: { code: code.toUpperCase() },
  });
});

// Cache company access lookup per request
const getCompanyAccess = cache(async (userId: string, companyId: string) => {
  return prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });
});

export default async function CompanyLayout({
  children,
  params,
}: CompanyLayoutProps) {
  // Fetch session and params in parallel
  const [session, { company: companyCode }] = await Promise.all([
    auth(),
    params,
  ]);

  // Middleware handles auth redirect, but double check
  if (!session?.user) {
    redirect("/login");
  }

  // Find company by code (cached)
  const company = await getCompany(companyCode);

  if (!company) {
    notFound();
  }

  // Check if user has access and get permissions (cached)
  const companyAccess = await getCompanyAccess(session.user.id, company.id);

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
