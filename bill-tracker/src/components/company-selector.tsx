"use client";

import { useCompany } from "@/hooks/use-company";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Factory, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Company icons and colors mapping
const COMPANY_STYLES: Record<
  string,
  { icon: typeof Building2; bgGradient: string; iconColor: string }
> = {
  ANJ: {
    icon: Factory,
    bgGradient: "from-blue-500 to-indigo-600",
    iconColor: "text-blue-100",
  },
  MLK: {
    icon: Globe,
    bgGradient: "from-orange-500 to-amber-500",
    iconColor: "text-orange-100",
  },
  DEFAULT: {
    icon: Building2,
    bgGradient: "from-primary to-primary/80",
    iconColor: "text-primary-foreground",
  },
};

function getCompanyStyle(code: string) {
  return COMPANY_STYLES[code] || COMPANY_STYLES.DEFAULT;
}

interface CompanySelectorProps {
  onSelect?: (companyId: string) => void;
}

export function CompanySelector({ onSelect }: CompanySelectorProps) {
  const { companies, selectedCompany, setSelectedCompany, isLoading } = useCompany();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          ยังไม่มีบริษัท
        </h3>
        <p className="text-sm text-muted-foreground">
          กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มบริษัท
        </p>
      </Card>
    );
  }

  const handleSelect = (company: typeof companies[0]) => {
    setSelectedCompany(company);
    onSelect?.(company.id);
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      {companies.map((company: typeof companies[number]) => {
        const style = getCompanyStyle(company.code);
        const Icon = style.icon;
        const isSelected = selectedCompany?.id === company.id;

        return (
          <button
            key={company.id}
            onClick={() => handleSelect(company)}
            className={cn(
              "group relative w-full text-left transition-all duration-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
              "rounded-2xl"
            )}
          >
            <Card
              className={cn(
                "relative overflow-hidden p-6 sm:p-8 transition-all duration-300",
                "border-2 hover:shadow-xl hover:-translate-y-1",
                isSelected
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-transparent hover:border-border"
              )}
            >
              {/* Background gradient */}
              <div
                className={cn(
                  "absolute inset-0 opacity-10 bg-gradient-to-br",
                  style.bgGradient
                )}
              />

              <div className="relative flex items-center gap-4 sm:gap-6">
                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg",
                    style.bgGradient
                  )}
                >
                  <Icon className={cn("w-8 h-8 sm:w-10 sm:h-10", style.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {company.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    รหัส: {company.code}
                  </p>
                  {company.isOwner && (
                    <span
                      className={cn(
                        "inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full",
                        "bg-muted text-muted-foreground"
                      )}
                    >
                      เจ้าของ
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight
                  className={cn(
                    "w-6 h-6 text-muted-foreground transition-transform duration-300",
                    "group-hover:translate-x-1 group-hover:text-foreground"
                  )}
                />
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
