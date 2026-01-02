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

  // Check if user has access
  const hasAccess =
    session.user.role === "ADMIN" ||
    (await prisma.companyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: company.id,
        },
      },
    }));

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <DashboardShell company={company} user={session.user}>
      {children}
    </DashboardShell>
  );
}
