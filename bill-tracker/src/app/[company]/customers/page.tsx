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
import { Plus, Search, Users, Phone, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface CustomersPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const { company: companyCode } = await params;
  const { search } = await searchParams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            ลูกค้า
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            จัดการข้อมูลลูกค้าและประวัติการซื้อขาย
          </p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มลูกค้า
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="ค้นหาชื่อลูกค้า..."
          defaultValue={search}
          className="pl-10"
        />
      </div>

      {/* Customers List */}
      <Suspense fallback={<CustomersSkeleton />}>
        <CustomersList companyCode={companyCode} search={search} />
      </Suspense>
    </div>
  );
}

async function CustomersList({
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

  const customers = await prisma.customer.findMany({
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
        select: { incomes: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Get total revenue per customer
  const customerStats = await prisma.income.groupBy({
    by: ["customerId"],
    where: {
      companyId: company.id,
      customerId: { not: null },
    },
    _sum: { netReceived: true },
    _count: true,
  });

  const statsMap = new Map(
    customerStats.map((s: typeof customerStats[number]) => [
      s.customerId,
      { total: Number(s._sum.netReceived) || 0, count: s._count },
    ])
  );

  if (customers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          ยังไม่มีลูกค้า
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          เพิ่มลูกค้าเพื่อติดตามยอดขายและเอกสาร
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มลูกค้ารายแรก
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายชื่อลูกค้า ({customers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
              <TableHead>ติดต่อ</TableHead>
              <TableHead className="text-center">เครดิต (วัน)</TableHead>
              <TableHead className="text-center">รายการ</TableHead>
              <TableHead className="text-right">ยอดขายรวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer: typeof customers[number]) => {
              const stats = statsMap.get(customer.id) || { total: 0, count: 0 };
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {customer.name}
                        </p>
                        {customer.address && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.taxId ? (
                      <code className="text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {customer.taxId}
                      </code>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                      {!customer.phone && !customer.email && (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.paymentTermDays > 0 ? (
                      <Badge variant="outline">{customer.paymentTermDays} วัน</Badge>
                    ) : (
                      <Badge variant="secondary">เงินสด</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{stats.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
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

function CustomersSkeleton() {
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
