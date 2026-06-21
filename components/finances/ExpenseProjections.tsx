"use client";

import { useState } from "react";
import { RecurringExpense } from "@/types";
import { formatCOP } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const CATEGORY_COLOR: Record<string, string> = {
  housing:     "text-info",
  debt:        "text-danger",
  transport:   "text-warn",
  health:      "text-teal",
  subscription:"text-ai",
  food:        "text-warn",
  education:   "text-info",
  insurance:   "text-muted",
  utilities:   "text-muted",
  savings:     "text-teal",
  other:       "text-muted",
};

interface AIProjectionResult {
  stressful_months: Array<{ month: string; extra_cost: number; reason: string }>;
  monthly_savings_target: number;
  optimization_tips: string[];
}

interface Props {
  monthlyExpenses: RecurringExpense[];
  annualExpenses: RecurringExpense[];
  grossSalary: number;
  estDeductions: number;
  estNetSalary: number;
  totalMonthlyFixed: number;
  totalMonthlyDebt: number;
  projectionRemaining: number;
  debts: Array<{ name: string; monthly_payment: number }>;
}

export function ExpenseProjections({
  monthlyExpenses,
  annualExpenses,
  grossSalary,
  estDeductions,
  estNetSalary,
  totalMonthlyFixed,
  totalMonthlyDebt,
  projectionRemaining,
  debts,
}: Props) {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIProjectionResult | null>(null);
  const [aiError, setAiError] = useState(false);

  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Group annual expenses by month
  const annualByMonth: Record<number, RecurringExpense[]> = {};
  for (const e of annualExpenses) {
    const m = e.month ?? 1;
    if (!annualByMonth[m]) annualByMonth[m] = [];
    annualByMonth[m].push(e);
  }

  const totalAnnual = annualExpenses.reduce((s, e) => s + e.amount, 0);

  const remainingColor =
    projectionRemaining > 1_000_000
      ? "text-teal"
      : projectionRemaining > 500_000
      ? "text-warn"
      : "text-danger";

  const runAI = async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "expense_projection",
          context: {
            grossSalaryCOP: grossSalary,
            estDeductionsCOP: estDeductions,
            estNetSalaryCOP: estNetSalary,
            totalMonthlyFixedCOP: totalMonthlyFixed,
            totalMonthlyDebtCOP: totalMonthlyDebt,
            remainingAfterFixedCOP: projectionRemaining,
            totalAnnualOneOffCOP: totalAnnual,
            monthlyExpenses: monthlyExpenses.map((e) => ({
              name: e.name,
              amount: e.amount,
              category: e.category,
            })),
            annualExpenses: annualExpenses.map((e) => ({
              name: e.name,
              amount: e.amount,
              month: MONTH_NAMES[(e.month ?? 1) - 1],
              category: e.category,
            })),
            debts,
          },
        }),
      });
      const data = await res.json();
      if (data.result?.stressful_months) {
        setAiResult(data.result as AIProjectionResult);
      } else {
        setAiError(true);
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-raised/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono transition-transform ${open ? "rotate-90" : ""}`}>
            ▶
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
            Expense Projections
          </span>
          {monthlyExpenses.length > 0 && (
            <span className="text-[9px] font-mono text-muted/50 bg-raised px-1.5 py-0.5 rounded">
              {formatCOP(totalMonthlyFixed)}/mo fixed
            </span>
          )}
        </div>
        <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-line divide-y divide-line/60">

          {/* ── Section 1: Monthly Fixed Costs ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                Fixed Monthly Expenses
              </p>
              <p className="text-[10px] font-mono text-bright font-bold">
                {formatCOP(totalMonthlyFixed)}
              </p>
            </div>
            {monthlyExpenses.length === 0 ? (
              <p className="text-xs text-muted/50 text-center py-3">No monthly expenses found</p>
            ) : (
              <div className="space-y-1">
                {monthlyExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[9px] font-mono uppercase ${
                          CATEGORY_COLOR[e.category ?? "other"] ?? "text-muted"
                        }`}
                      >
                        {e.category ?? "other"}
                      </span>
                      <span className="text-xs text-bright truncate">{e.name}</span>
                    </div>
                    <span className="text-xs font-mono text-muted shrink-0 ml-2">
                      {formatCOP(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Annual Calendar ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                Annual Expense Calendar
              </p>
              <p className="text-[9px] font-mono text-muted/60">
                Total one-offs: {formatCOP(totalAnnual)}
              </p>
            </div>
            {annualExpenses.length === 0 ? (
              <p className="text-xs text-muted/50 text-center py-3">No annual expenses found</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {MONTH_NAMES.map((name, i) => {
                  const monthNum = i + 1;
                  const items = annualByMonth[monthNum] ?? [];
                  const monthTotal = items.reduce((s, e) => s + e.amount, 0);
                  const isCurrent = monthNum === currentMonth;
                  const isNext = monthNum === (currentMonth % 12) + 1;

                  return (
                    <div
                      key={name}
                      className={`rounded-lg p-2 border text-center ${
                        isCurrent
                          ? "border-warn/40 bg-warn/5"
                          : isNext
                          ? "border-warn/20 bg-warn/3"
                          : items.length > 0
                          ? "border-line/60 bg-raised/30"
                          : "border-line/30 bg-transparent"
                      }`}
                    >
                      <p
                        className={`text-[9px] font-mono uppercase mb-1 ${
                          isCurrent ? "text-warn" : isNext ? "text-warn/70" : "text-muted/50"
                        }`}
                      >
                        {name}
                        {isCurrent && <span className="ml-0.5">●</span>}
                      </p>
                      {items.length > 0 ? (
                        <>
                          {items.map((e) => (
                            <p
                              key={e.id}
                              className="text-[8px] font-mono text-muted/70 leading-tight truncate"
                              title={e.name}
                            >
                              {e.name.length > 12 ? e.name.slice(0, 11) + "…" : e.name}
                            </p>
                          ))}
                          <p className={`text-[9px] font-mono mt-1 ${isCurrent || isNext ? "text-warn" : "text-bright"}`}>
                            {formatCOP(monthTotal)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[9px] font-mono text-muted/20">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 3: Monthly Cash Flow Projection ── */}
          <div className="p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
              Monthly Cash Flow Projection
            </p>
            <div className="space-y-2">
              {/* Gross */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted/70">Gross Salary (est.)</span>
                <span className="text-xs font-mono text-bright">{formatCOP(grossSalary)}</span>
              </div>
              {/* Deductions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted/70">
                  Deductions (−9% pensión/salud/solidaridad)
                </span>
                <span className="text-xs font-mono text-danger">−{formatCOP(estDeductions)}</span>
              </div>
              {/* Net salary */}
              <div className="flex items-center justify-between pt-1.5 border-t border-line/40">
                <span className="text-xs text-bright font-medium">Net Take-Home</span>
                <span className="text-xs font-mono text-teal font-bold">{formatCOP(estNetSalary)}</span>
              </div>
              {/* Fixed expenses */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted/70">Fixed Monthly Expenses</span>
                <span className="text-xs font-mono text-danger">−{formatCOP(totalMonthlyFixed)}</span>
              </div>
              {/* Debt payments */}
              {totalMonthlyDebt > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted/70">Debt Payments</span>
                    <div className="flex flex-wrap gap-x-2 mt-0.5">
                      {debts.filter((d) => d.monthly_payment > 0).map((d) => (
                        <span key={d.name} className="text-[9px] font-mono text-muted/40">
                          {d.name}: {formatCOP(d.monthly_payment)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-danger ml-2 shrink-0">
                    −{formatCOP(totalMonthlyDebt)}
                  </span>
                </div>
              )}
              {/* Remaining */}
              <div className="flex items-center justify-between pt-2 border-t border-line/60">
                <div>
                  <span className="text-sm font-semibold text-bright">Remaining</span>
                  <p className="text-[9px] font-mono text-muted/50">
                    Available for savings, travel, variable expenses
                  </p>
                </div>
                <span className={`text-base font-mono font-bold ${remainingColor}`}>
                  {formatCOP(projectionRemaining)}
                </span>
              </div>
              {/* Color legend */}
              <div className="flex gap-3 pt-1">
                <span className="text-[8px] font-mono text-teal">● &gt;$1M = comfortable</span>
                <span className="text-[8px] font-mono text-warn">● $500K–$1M = tight</span>
                <span className="text-[8px] font-mono text-danger">● &lt;$500K = critical</span>
              </div>
            </div>
          </div>

          {/* ── Section 4: AI Projection Insight ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                AI Projection Insight
              </p>
              {!aiResult && (
                <button
                  onClick={runAI}
                  disabled={aiLoading}
                  className="text-[10px] font-mono px-3 py-1.5 bg-ai/10 text-ai border border-ai/30 rounded hover:bg-ai/20 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? "Analyzing…" : "✦ Analyze"}
                </button>
              )}
              {aiResult && (
                <button
                  onClick={() => { setAiResult(null); setAiError(false); }}
                  className="text-[9px] font-mono text-muted/40 hover:text-muted transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {aiError && (
              <p className="text-xs text-danger font-mono">Analysis failed — try again.</p>
            )}

            {!aiResult && !aiLoading && !aiError && (
              <p className="text-xs text-muted/40 font-mono italic">
                Click Analyze to identify stressful months, savings targets, and optimization tips.
              </p>
            )}

            {aiLoading && (
              <div className="space-y-2">
                {[90, 70, 80].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 bg-raised rounded animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            )}

            {aiResult && (
              <div className="space-y-4">
                {/* Stressful months */}
                <div>
                  <p className="text-[9px] font-mono uppercase text-warn/70 mb-2">
                    Most Financially Stressful Months
                  </p>
                  <div className="space-y-1.5">
                    {aiResult.stressful_months.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 bg-warn/5 border border-warn/15 rounded"
                      >
                        <span className="text-[9px] font-mono text-warn shrink-0 w-6">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-bright">{m.month}</span>
                            <span className="text-[9px] font-mono text-danger">
                              +{formatCOP(m.extra_cost)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted/70 mt-0.5">{m.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Savings target */}
                <div className="flex items-center justify-between p-3 bg-teal/5 border border-teal/20 rounded">
                  <div>
                    <p className="text-[9px] font-mono uppercase text-teal/70">
                      Recommended Monthly Savings Target
                    </p>
                    <p className="text-[10px] text-muted/60 mt-0.5">
                      For travel fund + investments
                    </p>
                  </div>
                  <p className="text-base font-mono font-bold text-teal">
                    {formatCOP(aiResult.monthly_savings_target)}
                  </p>
                </div>

                {/* Optimization tips */}
                <div>
                  <p className="text-[9px] font-mono uppercase text-ai/70 mb-2">
                    Optimization Opportunities
                  </p>
                  <div className="space-y-1.5">
                    {aiResult.optimization_tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-ai text-[10px] shrink-0 mt-0.5">✦</span>
                        <p className="text-xs text-muted/80">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
