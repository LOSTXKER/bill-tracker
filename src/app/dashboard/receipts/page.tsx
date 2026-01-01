import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatShortDate } from '@/lib/utils';

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  
  const currentMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1;
  const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear();
  const statusFilter = params.status;

  // Build query
  let query = supabase
    .from('receipts')
    .select('*, expense_categories(*), profiles!receipts_uploaded_by_fkey(full_name)')
    .eq('period_month', currentMonth)
    .eq('period_year', currentYear)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: receipts, error } = await query;

  // Get stats
  const totalCount = receipts?.length || 0;
  const pendingCount = receipts?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = receipts?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = receipts?.filter(r => r.status === 'rejected').length || 0;

  const totalAmount = receipts?.reduce((sum, r) => {
    return sum + Number(r.user_amount || r.total_amount || r.amount || 0);
  }, 0) || 0;

  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">รายการสลิป</h1>
          <p className="text-slate-400 mt-1">
            {months[currentMonth - 1]} {currentYear + 543} • {totalCount} รายการ • {formatCurrency(totalAmount)}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="w-full md:w-auto">
            <Receipt className="w-4 h-4 mr-2" />
            อัปโหลดสลิป
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/receipts?month=${currentMonth}&year=${currentYear}`}>
                <Badge 
                  variant={!statusFilter ? 'success' : 'default'}
                  className="cursor-pointer px-4 py-2"
                >
                  ทั้งหมด ({totalCount})
                </Badge>
              </Link>
              <Link href={`/dashboard/receipts?status=pending&month=${currentMonth}&year=${currentYear}`}>
                <Badge 
                  variant={statusFilter === 'pending' ? 'warning' : 'default'}
                  className="cursor-pointer px-4 py-2"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  รอดำเนินการ ({pendingCount})
                </Badge>
              </Link>
              <Link href={`/dashboard/receipts?status=approved&month=${currentMonth}&year=${currentYear}`}>
                <Badge 
                  variant={statusFilter === 'approved' ? 'success' : 'default'}
                  className="cursor-pointer px-4 py-2"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  อนุมัติแล้ว ({approvedCount})
                </Badge>
              </Link>
              <Link href={`/dashboard/receipts?status=rejected&month=${currentMonth}&year=${currentYear}`}>
                <Badge 
                  variant={statusFilter === 'rejected' ? 'error' : 'default'}
                  className="cursor-pointer px-4 py-2"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  ปฏิเสธ ({rejectedCount})
                </Badge>
              </Link>
            </div>

            {/* Month/Year Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select 
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                defaultValue={currentMonth}
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select 
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                defaultValue={currentYear}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <option key={year} value={year}>{year + 543}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts List */}
      {receipts && receipts.length > 0 ? (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="hover:border-slate-700 transition-colors">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Receipt Image Preview */}
                  <div className="w-full md:w-24 h-32 md:h-24 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                    {receipt.image_url ? (
                      <img 
                        src={receipt.image_url} 
                        alt="Receipt" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Receipt Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-white truncate">
                          {receipt.user_vendor_name || receipt.vendor_name || 'ไม่ระบุชื่อร้าน'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {receipt.expense_categories?.name_th || 'ไม่ระบุหมวด'} • 
                          {receipt.receipt_date && formatShortDate(receipt.receipt_date)}
                        </p>
                      </div>
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

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">ยอดรวม: </span>
                        <span className="font-semibold text-white">
                          {formatCurrency(receipt.user_amount || receipt.total_amount || receipt.amount || 0)}
                        </span>
                      </div>
                      {receipt.has_vat && receipt.vat_amount && (
                        <div>
                          <span className="text-slate-500">VAT: </span>
                          <span className="text-slate-300">{formatCurrency(receipt.vat_amount)}</span>
                        </div>
                      )}
                      {receipt.ai_confidence && (
                        <div>
                          <span className="text-slate-500">AI: </span>
                          <span className="text-emerald-400">{receipt.ai_confidence}%</span>
                        </div>
                      )}
                    </div>

                    {receipt.user_notes && (
                      <p className="mt-2 text-sm text-slate-400 truncate">
                        หมายเหตุ: {receipt.user_notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/receipts/${receipt.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        ดูรายละเอียด
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="glass">
          <CardContent className="py-16 text-center">
            <Receipt className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">ไม่พบรายการสลิป</h3>
            <p className="text-slate-400 mb-6">
              {statusFilter 
                ? `ไม่มีรายการที่มีสถานะ "${statusFilter === 'pending' ? 'รอดำเนินการ' : statusFilter === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}" ในเดือนนี้`
                : 'ยังไม่มีสลิปในเดือนนี้'}
            </p>
            <Link href="/dashboard/upload">
              <Button>
                <Receipt className="w-4 h-4 mr-2" />
                อัปโหลดสลิปแรก
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
