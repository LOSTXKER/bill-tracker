import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/checker";
import { AuditLogTable } from "@/components/audit-logs/audit-log-table";
import { History } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          บันทึกระบบ
        </h1>
        <p className="text-muted-foreground mt-1">
          ประวัติการกระทำทั้งหมดในระบบ (Audit Log)
        </p>
      </div>

      <AuditLogTable companyId={company.id} />
    </div>
  );
}
