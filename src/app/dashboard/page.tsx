import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ArrowUpRight,
  Upload,
  FileText,
  PieChart
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, getMonthName } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Get user from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();

  // Get profile using Prisma
  const profile = user ? await prisma.profile.findUnique({
    where: { id: user.id },
    include: { company: true },
  }) : null;

  // Get receipts stats for current month using Prisma
  const receipts = await prisma.receipt.findMany({
    where: {
      periodMonth: currentMonth,
      periodYear: currentYear,
    },
  });

  const totalReceipts = receipts.length;
  const pendingReceipts = receipts.filter(r => r.status === 'pending').length;
  const approvedReceipts = receipts.filter(r => r.status === 'approved').length;
  
  const totalAmount = receipts.reduce((sum, r) => {
    const amount = r.userAmount || r.totalAmount || r.amount || 0;
    return sum + Number(amount);
  }, 0);

  // Get recent receipts using Prisma
  const recentReceipts = await prisma.receipt.findMany({
    include: {
      category: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  // Get category breakdown
  const receiptsWithCategory = await prisma.receipt.findMany({
    where: {
      periodMonth: currentMonth,
      periodYear: currentYear,
    },
    include: {
      category: true,
    },
  });

  const categoryBreakdown = receiptsWithCategory.reduce((acc, r) => {
    const categoryName = r.category?.nameTh || 'อื่นๆ';
    const amount = Number(r.userAmount || r.totalAmount || r.amount || 0);
    
    if (!acc[categoryName]) {
      acc[categoryName] = { count: 0, amount: 0 };
    }
    acc[categoryName].count++;
    acc[categoryName].amount += amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            สวัสดี, {profile?.fullName || 'คุณ'}! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            สรุปค่าใช้จ่าย {getMonthName(currentMonth)} {currentYear + 543}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button size="lg" className="group w-full md:w-auto">
            <Upload className="w-5 h-5 mr-2" />
            อัปโหลดสลิป
            <ArrowUpRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Amount */}
        <Card variant="gradient" className="col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">ยอดรวมเดือนนี้</p>
                <p className="text-2xl md:text-3xl font-bold text-gradient mt-2">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Receipts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">สลิปทั้งหมด</p>
                <p className="text-2xl md:text-3xl font-bold text-white mt-2">{totalReceipts}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">รอดำเนินการ</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-400 mt-2">{pendingReceipts}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">อนุมัติแล้ว</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-2">{approvedReceipts}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Receipts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              รายการล่าสุด
            </CardTitle>
            <Link href="/dashboard/receipts">
              <Button variant="ghost" size="sm">
                ดูทั้งหมด
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReceipts.length > 0 ? (
              <div className="space-y-4">
                {recentReceipts.map((receipt) => (
                  <div 
                    key={receipt.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {receipt.userVendorName || receipt.vendorName || 'ไม่ระบุชื่อร้าน'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {receipt.category?.nameTh || 'ไม่ระบุหมวด'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatCurrency(Number(receipt.userAmount || receipt.totalAmount || receipt.amount || 0))}
                      </p>
                      <Badge 
                        variant={
                          receipt.status === 'approved' ? 'success' : 
                          receipt.status === 'rejected' ? 'error' : 'warning'
                        }
                      >
                        {receipt.status === 'approved' ? 'อนุมัติ' : 
                         receipt.status === 'rejected' ? 'ปฏิเสธ' : 'รอดำเนินการ'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">ยังไม่มีรายการสลิป</p>
                <Link href="/dashboard/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    อัปโหลดสลิปแรก
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-teal-400" />
              ตามหมวดหมู่
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryBreakdown).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .slice(0, 6)
                  .map(([category, data]) => {
                    const percentage = totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0;
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300">{category}</span>
                          <span className="text-sm text-slate-400">
                            {formatCurrency(data.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <PieChart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">ยังไม่มีข้อมูลหมวดหมู่</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="glass">
        <CardContent className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/upload" className="group">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/50 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">อัปโหลดสลิป</span>
              </div>
            </Link>
            
            <Link href="/dashboard/receipts" className="group">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/50 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">ดูรายการ</span>
              </div>
            </Link>
            
            <Link href="/dashboard/receipts?status=pending" className="group">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">รอดำเนินการ</span>
              </div>
            </Link>
            
            <Link href="/dashboard/settings" className="group">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/50 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 transition-all">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PieChart className="w-7 h-7 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">รายงาน</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
