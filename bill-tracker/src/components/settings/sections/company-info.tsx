"use client";

import { Input } from "@/components/ui/input";
import { Building2, MapPin, Phone, FileText } from "lucide-react";
import { SettingsCard, SettingsField } from "../SettingsCard";

interface Company {
  id: string;
  name: string;
  code: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
}

interface CompanyInfoSectionProps {
  company: Company;
}

export function CompanyInfoSection({ company }: CompanyInfoSectionProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title={company.name}
        description={`รหัส: ${company.code}`}
        icon={Building2}
        showEditButton
        editDisabled
        contentClassName="grid gap-6 sm:grid-cols-2"
      >
        <SettingsField label="เลขประจำตัวผู้เสียภาษี" icon={FileText}>
          <Input value={company.taxId || "-"} disabled className="bg-muted/50" />
        </SettingsField>

        <SettingsField label="โทรศัพท์" icon={Phone}>
          <Input value={company.phone || "-"} disabled className="bg-muted/50" />
        </SettingsField>

        <SettingsField label="ที่อยู่" icon={MapPin} fullWidth>
          <Input value={company.address || "-"} disabled className="bg-muted/50" />
        </SettingsField>
      </SettingsCard>
    </div>
  );
}
