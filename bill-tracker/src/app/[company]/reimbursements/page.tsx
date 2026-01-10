"use client";

import { useParams } from "next/navigation";
import { ReimbursementDashboard } from "@/components/reimbursements/ReimbursementDashboard";

export default function ReimbursementsPage() {
  const params = useParams();
  const companyCode = (params.company as string).toUpperCase();

  return <ReimbursementDashboard companyCode={companyCode} />;
}
