"use client";

import { TeamManagementCard } from "@/components/settings/team-management-card";

interface TeamSectionProps {
  companyId: string;
}

export function TeamSection({ companyId }: TeamSectionProps) {
  return (
    <div className="space-y-6">
      <TeamManagementCard companyId={companyId} />
    </div>
  );
}
