import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";

export async function ReadyToSend({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [pendingExpenses, pendingIncomes] = await Promise.all([
    prisma.expense.count({
      where: {
        companyId: company.id,
        status: { in: ["PENDING_PHYSICAL", "READY_TO_SEND"] },
        deletedAt: null,
      },
    }),
    prisma.income.count({
      where: {
        companyId: company.id,
        status: "PENDING_COPY_SEND",
        deletedAt: null,
      },
    }),
  ]);

  const total = pendingExpenses + pendingIncomes;

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          รอส่งบัญชี
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            ไม่มีเอกสารรอส่ง
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                ใบเสร็จรายจ่าย
              </span>
              <Badge variant="secondary" className="font-medium">
                {pendingExpenses} รายการ
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                สำเนาบิลขาย
              </span>
              <Badge variant="secondary" className="font-medium">
                {pendingIncomes} รายการ
              </Badge>
            </div>
            <Button variant="outline" className="w-full mt-2">
              ทำเครื่องหมายว่าส่งแล้ว
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
