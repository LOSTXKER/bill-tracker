import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Building2, Phone, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface VendorsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function VendorsPage({ params, searchParams }: VendorsPageProps) {
  const { company: companyCode } = await params;
  const { search } = await searchParams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            ผู้ขาย / ร้านค้า
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            จัดการข้อมูลผู้ขายและร้านค้าที่ทำธุรกรรมด้วย
          </p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มผู้ขาย
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="ค้นหาชื่อผู้ขาย..."
          defaultValue={search}
          className="pl-10"
        />
      </div>

      {/* Vendors List */}
      <Suspense fallback={<VendorsSkeleton />}>
        <VendorsList companyCode={companyCode} search={search} />
      </Suspense>
    </div>
  );
}

async function VendorsList({
  companyCode,
  search,
}: {
  companyCode: string;
  search?: string;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const vendors = await prisma.vendor.findMany({
    where: {
      companyId: company.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { taxId: { contains: search } },
        ],
      }),
    },
    include: {
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Get total spending per vendor
  const vendorStats = await prisma.expense.groupBy({
    by: ["vendorId"],
    where: {
      companyId: company.id,
      vendorId: { not: null },
    },
    _sum: { netPaid: true },
    _count: true,
  });

  const statsMap = new Map(
    vendorStats.map((s: typeof vendorStats[number]) => [s.vendorId, { total: Number(s._sum.netPaid) || 0, count: s._count }])
  );

  if (vendors.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          ยังไม่มีผู้ขาย
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          เพิ่มผู้ขายเพื่อติดตามการทำธุรกรรม
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มผู้ขายรายแรก
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายชื่อผู้ขาย ({vendors.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
              <TableHead>ติดต่อ</TableHead>
              <TableHead className="text-center">รายการ</TableHead>
              <TableHead className="text-right">ยอดซื้อรวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor: typeof vendors[number]) => {
              const stats: { total: number; count: number } = statsMap.get(vendor.id) || { total: 0, count: 0 };
              return (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {vendor.name}
                        </p>
                        {vendor.address && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {vendor.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vendor.taxId ? (
                      <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {vendor.taxId}
                      </code>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                      {!vendor.phone && !vendor.email && (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{stats.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(stats.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VendorsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
