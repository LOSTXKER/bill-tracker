"use client";

import { useState } from "react";
import Link from "next/link";
import { NavLink, useIsActivePath } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  PieChart,
  History,
  Activity,
  Tags,
  Download,
  Wallet,
  User,
  UserCircle,
  Banknote,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { Company, UserRole } from "@prisma/client";
import { PermissionProvider } from "@/components/providers/permission-provider";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface DashboardShellProps {
  children: React.ReactNode;
  company: Company;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
  };
  isOwner: boolean;
  permissions: string[];
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// NavItem component with optimistic active state
function NavItemLink({ 
  href, 
  icon: Icon, 
  name, 
  onClick 
}: { 
  href: string; 
  icon: LucideIcon; 
  name: string; 
  onClick?: () => void;
}) {
  const isActive = useIsActivePath(href);
  
  return (
    <NavLink
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-colors",
        isActive ? "text-primary" : ""
      )} />
      {name}
    </NavLink>
  );
}

export function DashboardShell({ children, company, user, isOwner, permissions }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const companyCode = company.code.toLowerCase();

  // Grouped navigation
  const navigationGroups: NavGroup[] = [
    {
      // Main (no label)
      items: [
        {
          name: "Dashboard",
          href: `/${companyCode}/dashboard`,
          icon: LayoutDashboard,
        },
        {
          name: "บันทึกรายการ",
          href: `/${companyCode}/capture`,
          icon: Receipt,
        },
      ],
    },
    {
      label: "รายการ",
      items: [
        {
          name: "รายจ่าย",
          href: `/${companyCode}/expenses`,
          icon: ArrowUpCircle,
          permission: "expenses:read",
        },
        {
          name: "รายรับ",
          href: `/${companyCode}/incomes`,
          icon: ArrowDownCircle,
          permission: "incomes:read",
        },
      ],
    },
    {
      label: "การเงิน",
      items: [
        {
          name: "โอนคืนพนักงาน",
          href: `/${companyCode}/reimbursements`,
          icon: Wallet,
          permission: "reimbursements:read",
        },
        {
          name: "เงินสดย่อย",
          href: `/${companyCode}/petty-cash`,
          icon: Coins,
          permission: "expenses:read",
        },
      ],
    },
    {
      label: "รายงาน",
      items: [
        {
          name: "รายงานภาพรวม",
          href: `/${companyCode}/reports`,
          icon: PieChart,
          permission: "reports:read",
        },
        {
          name: "ภาพรวมค่าใช้จ่าย",
          href: `/${companyCode}/reports/expense-overview`,
          icon: Receipt,
          permission: "expenses:read",
        },
        {
          name: "รายงานเบิกจ่าย",
          href: `/${companyCode}/reports/reimbursements`,
          icon: Banknote,
          permission: "settlements:read",
        },
        {
          name: "รายงานผู้ติดต่อ",
          href: `/${companyCode}/reports/contacts`,
          icon: Users,
          permission: "expenses:read",
        },
      ],
    },
    {
      label: "ข้อมูล",
      items: [
        {
          name: "ผู้ติดต่อ",
          href: `/${companyCode}/contacts`,
          icon: Users,
          permission: "contacts:read",
        },
        {
          name: "พนักงาน",
          href: `/${companyCode}/employees`,
          icon: UserCircle,
          permission: "settings:manage-team",
        },
        {
          name: "ผังบัญชี",
          href: `/${companyCode}/accounts`,
          icon: Tags,
          permission: "settings:read",
        },
      ],
    },
    {
      label: "ระบบ",
      items: [
        {
          name: "ส่งออกข้อมูล",
          href: `/${companyCode}/exports`,
          icon: Download,
          permission: "settings:read",
        },
        {
          name: "บันทึกระบบ",
          href: `/${companyCode}/audit-logs`,
          icon: History,
          permission: "audit:read",
        },
        {
          name: "ตั้งค่า",
          href: `/${companyCode}/settings`,
          icon: Settings,
          permission: "settings:read",
        },
      ],
    },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isOwner) return true;
    if (permissions.includes(permission)) return true;
    const [module] = permission.split(":");
    return permissions.includes(`${module}:*`);
  };

  // Filter items by permission
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const NavLinks = () => (
    <div className="space-y-4">
      {filteredGroups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.label && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {group.label}
            </h3>
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavItemLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                name={item.name}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <PermissionProvider permissions={permissions} isOwner={isOwner}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 border-r border-border/50 bg-card lg:block">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-border/50 px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">
                  Bill Tracker
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {company.name}
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3">
              <NavLinks />
            </nav>

            {/* Back to companies */}
            <div className="border-t border-border/50 p-3">
              <NavLink
                href="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                เปลี่ยนบริษัท
              </NavLink>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-lg px-4 lg:left-60 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Company logo and name (mobile) */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Receipt className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                {company.name}
              </span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <NotificationCenter companyCode={companyCode} />
            <ThemeToggle />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2" suppressHydrationWarning>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium text-foreground">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-foreground">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink href={`/${companyCode}/profile`} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    โปรไฟล์
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink href={`/${companyCode}/settings`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    ตั้งค่า
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="pt-16 pb-20 lg:pb-0 lg:pl-60">
          <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</div>
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <BottomNav 
          companyCode={companyCode}
          isOwner={isOwner}
          permissions={permissions}
        />
      </div>
    </PermissionProvider>
  );
}
