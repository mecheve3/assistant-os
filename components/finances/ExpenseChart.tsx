"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCOP } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  transport: "Transport",
  housing: "Housing",
  entertainment: "Entertainment",
  health: "Health",
  debt_payment: "Debt Payments",
  investment: "Investment",
  other: "Other",
  freelance: "Freelance",
  salary: "Salary",
  crypto_income: "Crypto",
  course_sales: "Courses",
  bot_revenue: "Bot Rev.",
};

interface ExpenseSlice {
  category: string;
  amount: number;
}

interface Props {
  data: ExpenseSlice[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-line rounded px-2.5 py-1.5 text-[10px] font-mono">
      <p className="text-muted mb-0.5">{label}</p>
      <p className="text-danger">{formatCOP(payload[0].value)}</p>
    </div>
  );
};

export function ExpenseChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const chartData = sorted.map((d) => ({
    name: CATEGORY_LABELS[d.category] ?? d.category,
    amount: d.amount,
  }));

  const barHeight = 20;
  const chartHeight = Math.max(100, chartData.length * barHeight + 20);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Expense Breakdown
      </p>

      {chartData.length === 0 ? (
        <p className="text-xs text-muted font-mono text-center py-6">
          No expenses recorded this month.
        </p>
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{
                  fill: "#8888aa",
                  fontSize: 10,
                  fontFamily: "var(--font-mono, monospace)",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1a1a24" }} />
              <Bar dataKey="amount" radius={[0, 2, 2, 0]} maxBarSize={10}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? "#ef4444" : `rgba(239,68,68,${0.85 - i * 0.08})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
