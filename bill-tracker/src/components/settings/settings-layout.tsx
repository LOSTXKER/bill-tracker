"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  User,
  Bell,
  MessageSquare,
  Palette,
  Settings,
  DollarSign,
  ChevronRight,
  Receipt,
} from "lucide-react";

// Settings sections
import { CompanyInfoSection } from "./sections/company-info";
import { UserInfoSection } from "./sections/user-info";
import { LineBotSection } from "./sections/line-bot-section";
import { NotificationSection } from "./sections/notification-section";
import { AppearanceSection } from "./sections/appearance-section";
import { ExchangeRatesSection } from "./sections/exchange-rates";
import { WhtSettingsSection } from "./sections/wht-settings-section";

interface Company {
  id: string;
  name: string;
  legalName: string | null;
  code: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  exchangeRates?: unknown;
  businessDescription: string | null;
}

interface CompanyAccess {
  isOwner: boolean;
  permissions: unknown;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SettingsLayoutProps {
  company: Company;
  companyAccess: CompanyAccess | null;
  user: User;
}

type SettingSection =
  | "company"
  | "wht"
  | "exchange-rates"
  | "user"
  | "appearance"
  | "line-bot"
  | "notifications";

interface NavItem {
  id: SettingSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// Grouped navigation items
const navGroups: NavGroup[] = [
  {
    id: "company",
    label: "บริษัท",
    items: [
      {
        id: "company",
        label: "ข้อมูลบริษัท",
        icon: <Building2 className="h-4 w-4" />,
        description: "ชื่อ ที่อยู่ และข้อมูลทางภาษี",
      },
      {
        id: "wht",
        label: "หัก ณ ที่จ่าย",
        icon: <Receipt className="h-4 w-4" />,
        description: "ตั้งค่าอัตราภาษีหัก ณ ที่จ่าย",
      },
      {
        id: "exchange-rates",
        label: "อัตราแลกเปลี่ยน",
        icon: <DollarSign className="h-4 w-4" />,
        description: "ตั้งค่าอัตราสกุลเงินต่างประเทศ",
      },
    ],
  },
  {
    id: "user",
    label: "บัญชีผู้ใช้",
    items: [
      {
        id: "user",
        label: "ข้อมูลส่วนตัว",
        icon: <User className="h-4 w-4" />,
        description: "ข้อมูลและสิทธิ์ของคุณ",
      },
      {
        id: "appearance",
        label: "รูปแบบแสดงผล",
        icon: <Palette className="h-4 w-4" />,
        description: "ธีมและภาษา",
      },
    ],
  },
  {
    id: "notifications",
    label: "การแจ้งเตือน",
    items: [
      {
        id: "line-bot",
        label: "LINE Bot",
        icon: <MessageSquare className="h-4 w-4" />,
        description: "เชื่อมต่อและตั้งค่าบอท",
      },
      {
        id: "notifications",
        label: "ตั้งค่าแจ้งเตือน",
        icon: <Bell className="h-4 w-4" />,
        description: "ปรับแต่งเหตุการณ์และข้อความ",
      },
    ],
  },
];

// Flatten for easy lookup
const allNavItems = navGroups.flatMap((group) => group.items);

export function SettingsLayout({
  company,
  companyAccess,
  user,
}: SettingsLayoutProps) {
  const [activeSection, setActiveSection] =
    React.useState<SettingSection>("company");

  const renderSection = () => {
    switch (activeSection) {
      case "company":
        return <CompanyInfoSection company={company} />;
      case "wht":
        return <WhtSettingsSection companyCode={company.code} />;
      case "exchange-rates":
        return (
          <ExchangeRatesSection
            companyCode={company.code}
            initialRates={(company.exchangeRates as Record<string, number>) || {}}
          />
        );
      case "user":
        return <UserInfoSection user={user} companyAccess={companyAccess} />;
      case "appearance":
        return <AppearanceSection />;
      case "line-bot":
        return <LineBotSection companyId={company.id} companyCode={company.code} />;
      case "notifications":
        return <NotificationSection companyId={company.id} />;
      default:
        return null;
    }
  };

  const activeNavItem = allNavItems.find((item) => item.id === activeSection);

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Settings className="h-4 w-4" />
          <span className="text-sm">ตั้งค่า</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {activeNavItem?.label || "ตั้งค่า"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeNavItem?.description}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-20 space-y-6">
            {navGroups.map((group) => (
              <div key={group.id}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 opacity-0 transition-opacity",
                        activeSection === item.id ? "opacity-100" : "group-hover:opacity-50"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden space-y-3">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-3">
              {allNavItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "outline"}
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <main className="flex-1 min-w-0">{renderSection()}</main>
      </div>
    </div>
  );
}
