import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettlementTransferList } from "@/components/settlement-transfers/SettlementTransferList";

interface Props {
  params: Promise<{ company: string }>;
}

export default async function SettlementTransfersPage({ params }: Props) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowLeftRight}
        title="รายการโอนเงินคืน"
        description="ดูและจัดการรายการโอนเงินคืนให้พนักงาน"
      />
      <SettlementTransferList companyCode={companyCode} />
    </div>
  );
}
