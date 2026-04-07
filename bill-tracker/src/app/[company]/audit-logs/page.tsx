import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/checker";
import { AuditLogTable } from "@/components/audit-logs/audit-log-table";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface AuditLogsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuditLogsPage({
  params,
  searchParams,
}: AuditLogsPageProps) {
  const { company: companyCode } = await params;
  
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) {
    return <div>Company not found</div>;
  }

  // Require audit:read permission
  await requirePermission(company.id, "audit:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="บันทึกระบบ"
        description="ประวัติการกระทำทั้งหมดในระบบ"
        icon={History}
      />

      <AuditLogTable companyId={company.id} />
    </div>
  );
}
