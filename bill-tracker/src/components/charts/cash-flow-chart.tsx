"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface CashFlowData {
  month: string;
  income: number;
  expense: number;
  netFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

// Chart colors
const COLORS = {
  income: "#10b981",  // emerald-500
  expense: "#ef4444", // red-500
  netFlow: "#3b82f6", // blue-500
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          กระแสเงินสด 6 เดือนย้อนหลัง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#374151"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value: number | undefined) => formatCurrency(value || 0)}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke={COLORS.income}
              strokeWidth={2}
              name="รายรับ"
              dot={{ fill: COLORS.income, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke={COLORS.expense}
              strokeWidth={2}
              name="รายจ่าย"
              dot={{ fill: COLORS.expense, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="netFlow"
              stroke={COLORS.netFlow}
              strokeWidth={2}
              name="สุทธิ"
              dot={{ fill: COLORS.netFlow, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
