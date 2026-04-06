"use client";

import React from "react";
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

interface DataPoint {
  month: string;
  income: number;
  expense: number;
}

interface RevenueExpenseTrendChartProps {
  data: DataPoint[];
}

const TICK_STYLE: React.CSSProperties = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
};

function formatShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function XTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" style={TICK_STYLE}>
      {payload?.value}
    </text>
  );
}

function YTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" style={TICK_STYLE}>
      {payload !== undefined ? formatShort(payload.value) : ""}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur shadow-lg p-3 text-sm space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">
            {p.name === "income" ? "รายรับ" : "รายจ่าย"}:
          </span>
          <span className="font-medium">
            {p.value.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueExpenseTrendChart({ data }: RevenueExpenseTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        ไม่มีข้อมูล
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={<XTick />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={<YTick />}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (value === "income" ? "รายรับ" : "รายจ่าย")}
          wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "var(--muted-foreground)" }}
        />
        <Bar dataKey="income" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="expense" fill="hsl(0 84% 60%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
