"use client";

import { useState } from "react";
import { NavLink, useIsActivePath } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Receipt,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Settings,
  MoreHorizontal,
  PieChart,
  History,
  Tags,
  ChevronLeft,
  Wallet,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

// Bottom nav item with optimistic active state
function BottomNavItem({ href, icon: Icon, name }: { href: string; icon: LucideIcon; name: string }) {
  const isActive = useIsActivePath(href);
  
  return (
    <NavLink
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 transition-colors", isActive && "text-primary")} />
      <span className={cn("text-[10px] font-medium transition-colors", isActive && "text-primary")}>
        {name}
      </span>
    </NavLink>
  );
}

// More menu item with optimistic active state
function MoreMenuItem({ 
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
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 transition-colors", isActive && "text-primary")} />
      {name}
    </NavLink>
  );
}

interface BottomNavProps {
  companyCode: string;
  isOwner: boolean;
  permissions: string[];
}

export function BottomNav({ companyCode, isOwner, permissions }: BottomNavProps) {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isOwner) return true;
    if (permissions.includes(permission)) return true;
    const [module] = permission.split(":");
    return permissions.includes(`${module}:*`);
  };

  const mainNavItems: NavigationItem[] = [
    { name: "หน้าหลัก", href: `/${companyCode}/dashboard`, icon: LayoutDashboard },
    { name: "บันทึก", href: `/${companyCode}/capture`, icon: Receipt },
    { name: "รายจ่าย", href: `/${companyCode}/expenses`, icon: ArrowUpCircle, permission: "expenses:read" },
    { name: "รายรับ", href: `/${companyCode}/incomes`, icon: ArrowDownCircle, permission: "incomes:read" },
  ];

  const moreNavItems: NavigationItem[] = [
    { name: "เบิกจ่าย", href: `/${companyCode}/reimbursements`, icon: Wallet },
    { name: "โปรไฟล์", href: `/${companyCode}/profile`, icon: User },
    { name: "พนักงาน", href: `/${companyCode}/employees`, icon: Users, permission: "settings:manage-team" },
    { name: "รายงาน", href: `/${companyCode}/reports`, icon: PieChart, permission: "reports:read" },
    { name: "ผู้ติดต่อ", href: `/${companyCode}/contacts`, icon: Users, permission: "contacts:read" },
    { name: "ผังบัญชี", href: `/${companyCode}/accounts`, icon: Tags, permission: "settings:read" },
    { name: "บันทึกระบบ", href: `/${companyCode}/audit-logs`, icon: History, permission: "audit:read" },
    { name: "ตั้งค่า", href: `/${companyCode}/settings`, icon: Settings, permission: "settings:read" },
  ];

  const filteredMainNav = mainNavItems.filter((item) => hasPermission(item.permission));
  const filteredMoreNav = moreNavItems.filter((item) => hasPermission(item.permission));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {filteredMainNav.map((item) => (
          <BottomNavItem key={item.name} href={item.href} icon={item.icon} name={item.name} />
        ))}

        {/* More Menu */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              suppressHydrationWarning
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">อื่นๆ</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
            <SheetTitle className="text-center mb-4">เมนูเพิ่มเติม</SheetTitle>
            <div className="grid gap-1 pb-6">
              {filteredMoreNav.map((item) => (
                <MoreMenuItem
                  key={item.name}
                  href={item.href}
                  icon={item.icon}
                  name={item.name}
                  onClick={() => setMoreSheetOpen(false)}
                />
              ))}

              {/* Change Company Link */}
              <NavLink
                href="/"
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 border-t border-border/50 mt-2 pt-4"
              >
                <ChevronLeft className="h-5 w-5" />
                เปลี่ยนบริษัท
              </NavLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
