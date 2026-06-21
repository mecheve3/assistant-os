"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCOP } from "@/lib/utils";

const COLORS = ["#00d4aa", "#3b82f6", "#8b5cf6", "#f59e0b", "#8888aa"];

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Day Job",
  freelance: "Freelance",
  crypto_income: "Crypto Income",
  course_sales: "Course Sales",
  bot_revenue: "Bot Revenue",
  other: "Other",
};

interface IncomeSlice {
  category: string;
  amount: number;
}

interface Props {
  data: IncomeSlice[];
  totalIncome: number;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-line rounded px-2.5 py-1.5 text-[10px] font-mono">
      <p className="text-muted mb-0.5">{payload[0].name}</p>
      <p className="text-bright">{formatCOP(payload[0].value)}</p>
    </div>
  );
};

export function IncomeChart({ data, totalIncome }: Props) {
  const chartData = data.map((d) => ({
    name: CATEGORY_LABELS[d.category] ?? d.category,
    value: d.amount,
  }));

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Income Attribution
      </p>

      {chartData.length === 0 ? (
        <p className="text-xs text-muted font-mono text-center py-6">
          No income recorded this month.
        </p>
      ) : (
        <>
          <div className="relative h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="76%"
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[9px] font-mono text-muted uppercase">Total</p>
                <p className="text-xs font-mono font-bold text-bright">
                  {formatCOP(totalIncome)}
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-[10px] font-mono text-muted">{d.name}</span>
                </div>
                <span className="text-[10px] font-mono text-bright">
                  {formatCOP(d.value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
