import { formatCOP } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Salary",
  freelance: "Freelance",
  crypto_income: "Crypto Income",
  course_sales: "Course Sales",
  bot_revenue: "Bot Revenue",
  food: "Food",
  transport: "Transport",
  housing: "Housing",
  entertainment: "Entertainment",
  health: "Health",
  debt_payment: "Debt Payments",
  investment: "Investment",
  other: "Other",
};

interface DeductionLine {
  label: string;
  amount: number;
}

interface ExpenseLine {
  category: string;
  amount: number;
}

interface Props {
  grossIncome: number;
  deductions: DeductionLine[];
  netIncome: number;
  expenses: ExpenseLine[];
  netCashFlow: number;
  lastMonthNetCashFlow: number | null;
}

export function MonthlyPnL({
  grossIncome,
  deductions,
  netIncome,
  expenses,
  netCashFlow,
  lastMonthNetCashFlow,
}: Props) {
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
        Monthly P&amp;L
      </p>

      {grossIncome === 0 && expenses.length === 0 ? (
        <p className="text-xs text-muted font-mono text-center py-6">
          No transactions logged this month.
        </p>
      ) : (
        <div className="space-y-1 font-mono text-xs">
          {/* Gross income */}
          <div className="flex justify-between">
            <span className="text-muted">Gross Income</span>
            <span className="text-teal">+{formatCOP(grossIncome)}</span>
          </div>

          {/* Deductions */}
          {deductions.map((d) => (
            <div key={d.label} className="flex justify-between pl-3">
              <span className="text-muted/60">- {d.label}</span>
              <span className="text-danger/80">-{formatCOP(d.amount)}</span>
            </div>
          ))}

          {/* Net income */}
          <div className="flex justify-between border-t border-line pt-1">
            <span className="text-muted">Net Income</span>
            <span className="text-bright">+{formatCOP(netIncome)}</span>
          </div>

          {/* Expenses */}
          {expenses.length > 0 && (
            <>
              <div className="pt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted/60">
                  Expenses
                </span>
              </div>
              {expenses.map((e) => (
                <div key={e.category} className="flex justify-between pl-3">
                  <span className="text-muted/80">
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                  <span className="text-danger">-{formatCOP(e.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pl-3 border-t border-line/50 pt-1">
                <span className="text-muted">Total Expenses</span>
                <span className="text-danger">-{formatCOP(totalExpenses)}</span>
              </div>
            </>
          )}

          {/* Net cash flow */}
          <div
            className={`flex justify-between border-t border-line pt-2 font-semibold ${
              netCashFlow >= 0 ? "text-teal" : "text-danger"
            }`}
          >
            <span>Net Cash Flow</span>
            <span>
              {netCashFlow >= 0 ? "+" : ""}
              {formatCOP(netCashFlow)}
            </span>
          </div>

          {lastMonthNetCashFlow != null && (
            <p className="text-[10px] text-muted/60 text-right">
              Last month:{" "}
              <span
                className={
                  lastMonthNetCashFlow >= 0 ? "text-teal/70" : "text-danger/70"
                }
              >
                {lastMonthNetCashFlow >= 0 ? "+" : ""}
                {formatCOP(lastMonthNetCashFlow)}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
