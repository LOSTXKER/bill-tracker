"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Receipt,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  PieChart,
  Wallet,
  History,
} from "lucide-react";
import type { Company, UserRole } from "@prisma/client";
import { PermissionProvider } from "@/components/providers/permission-provider";

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

export function DashboardShell({ children, company, user, isOwner, permissions }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const companyCode = company.code.toLowerCase();

  const navigation = [
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
    {
      name: "รายงาน",
      href: `/${companyCode}/reports`,
      icon: PieChart,
      permission: "reports:read",
    },
    {
      name: "งบประมาณ",
      href: `/${companyCode}/budgets`,
      icon: Wallet,
      permission: "budgets:read",
    },
    {
      name: "ลูกค้า",
      href: `/${companyCode}/customers`,
      icon: Users,
      permission: "customers:read",
    },
    {
      name: "ผู้ขาย",
      href: `/${companyCode}/vendors`,
      icon: Building2,
      permission: "vendors:read",
    },
    {
      name: "ประวัติการแก้ไข",
      href: `/${companyCode}/audit-logs`,
      icon: History,
      permission: "audit:read",
    },
  ];

  const isActive = (href: string) => pathname === href;

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isOwner) return true;
    if (permissions.includes(permission)) return true;
    const [module] = permission.split(":");
    return permissions.includes(`${module}:*`);
  };

  const filteredNavigation = navigation.filter((item) => hasPermission(item.permission));

  const NavLinks = () => (
    <>
      {filteredNavigation.map((item: typeof filteredNavigation[number]) => (
        <Link
          key={item.name}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isActive(item.href)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-colors",
            isActive(item.href) ? "text-primary" : ""
          )} />
          {item.name}
        </Link>
      ))}
    </>
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
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            <NavLinks />
          </nav>

          {/* Back to companies */}
          <div className="border-t border-border/50 p-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              เปลี่ยนบริษัท
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-lg px-4 lg:left-60 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" suppressHydrationWarning>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 border-r border-border/50">
              <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center gap-3 border-b border-border/50 px-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                    <Receipt className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-foreground text-sm">
                    {company.name}
                  </span>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                  <NavLinks />
                </nav>
                <div className="border-t border-border/50 p-3">
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    เปลี่ยนบริษัท
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Company name (mobile) */}
          <span className="text-sm font-medium text-muted-foreground lg:hidden truncate max-w-[150px]">
            {company.name}
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
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
                <Link href={`/${companyCode}/settings`} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  ตั้งค่า
                </Link>
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
        <main className="pt-16 lg:pl-60">
          <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</div>
        </main>
      </div>
    </PermissionProvider>
  );
}
