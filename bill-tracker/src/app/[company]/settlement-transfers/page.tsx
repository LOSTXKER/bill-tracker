import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ company: string }>;
}

export default async function SettlementTransfersPage({ params }: Props) {
  const { company } = await params;
  redirect(`/${company}/reimbursements?tab=transfers`);
}
