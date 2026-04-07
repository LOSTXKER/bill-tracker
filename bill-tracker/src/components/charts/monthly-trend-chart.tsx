"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/tax-calculator";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

// Chart colors
const COLORS = {
  income: "#10b981", // emerald-500
  expense: "#ef4444", // red-500
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; payload: Record<string, unknown> }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
        <p className="font-medium text-card-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}:
              </span>
              <span className="font-medium text-card-foreground">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          {payload.length >= 2 && (
            <div className="pt-2 mt-2 border-t border-border">
              <span className="text-muted-foreground text-sm">
                สุทธิ:
              </span>
              <span
                className={`ml-2 font-medium ${
                  payload[0].value - payload[1].value >= 0
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {formatCurrency(payload[0].value - payload[1].value)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <BarChart3 className="h-4 w-4 text-amber-500" />
          </div>
          เปรียบเทียบรายรับ-รายจ่าย
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={formatCurrencyCompact}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted-foreground)", opacity: 0.08 }} />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="income"
              fill={COLORS.income}
              name="รายรับ"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="expense"
              fill={COLORS.expense}
              name="รายจ่าย"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
