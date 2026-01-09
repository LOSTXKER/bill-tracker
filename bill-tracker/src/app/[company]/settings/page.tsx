import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

interface SettingsPageProps {
  params: Promise<{ company: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { company: companyCode } = await params;
  const session = await auth();

  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      code: true,
      taxId: true,
      address: true,
      phone: true,
      exchangeRates: true,
    },
  });

  if (!company) return null;

  // Get user's access in this company
  const companyAccess = await prisma.companyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: session?.user?.id || "",
        companyId: company.id,
      },
    },
  });

  return (
    <SettingsLayout
      company={company}
      companyAccess={companyAccess}
      user={{
        id: session?.user?.id || "",
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        role: session?.user?.role || "STAFF",
      }}
    />
  );
}
