"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Receipt,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  PieChart,
  Wallet,
} from "lucide-react";
import type { Company, UserRole } from "@prisma/client";

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
}

export function DashboardShell({ children, company, user }: DashboardShellProps) {
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
    },
    {
      name: "รายรับ",
      href: `/${companyCode}/incomes`,
      icon: ArrowDownCircle,
    },
    {
      name: "รายงาน",
      href: `/${companyCode}/reports`,
      icon: PieChart,
    },
    {
      name: "งบประมาณ",
      href: `/${companyCode}/budgets`,
      icon: Wallet,
    },
    {
      name: "ลูกค้า",
      href: `/${companyCode}/customers`,
      icon: Users,
    },
    {
      name: "ผู้ขาย",
      href: `/${companyCode}/vendors`,
      icon: Building2,
    },
  ];

  const isActive = (href: string) => pathname === href;

  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Bill Tracker
              </span>
              <span className="text-xs text-slate-500">{company.name}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <NavLinks />
          </nav>

          {/* Back to companies */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
              เปลี่ยนบริษัท
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:left-64 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" suppressHydrationWarning>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {company.name}
                  </span>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                  <NavLinks />
                </nav>
                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-sm text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    เปลี่ยนบริษัท
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Company name (mobile) */}
          <span className="text-sm font-medium text-slate-500 lg:hidden">
            {company.name}
          </span>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2" suppressHydrationWarning>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block text-sm font-medium">
                {user.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-slate-500">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${companyCode}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                ตั้งค่า
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main content */}
      <main className="pt-16 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
