import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/lib/supabase";
import { FinancesAccount, FinancesDebt, RecurringExpense } from "@/types";
import { formatCOP, getLiveUSDtoCOP } from "@/lib/utils";
import { FinanceTabBar } from "@/components/finances/FinanceTabBar";
import { NetWorthBar } from "@/components/finances/NetWorthBar";
import { MonthlyPnL } from "@/components/finances/MonthlyPnL";
import { IncomeChart } from "@/components/finances/IncomeChart";
import { ExpenseChart } from "@/components/finances/ExpenseChart";
import { AIFinancialInsight } from "@/components/finances/AIFinancialInsight";
import { ExpenseProjections } from "@/components/finances/ExpenseProjections";
import Link from "next/link";

export const dynamic = "force-dynamic";

const INCOME_CATEGORIES = new Set([
  "salary",
  "freelance",
  "crypto_income",
  "course_sales",
  "bot_revenue",
]);

export default async function FinancesPage() {
  const USD_RATE = await getLiveUSDtoCOP();
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

  const [{ data: accounts }, { data: debts }, { data: transactions }, { data: recurringRaw }] =
    await Promise.all([
      supabase.from("finances_accounts").select("*").order("name"),
      supabase.from("finances_debts").select("*").eq("active", true),
      supabase
        .from("finances_transactions")
        .select("*")
        .gte("date", lastMonthStart)
        .order("date", { ascending: false }),
      supabase
        .from("recurring_expenses")
        .select("*")
        .eq("active", true)
        .order("amount", { ascending: false }),
    ]);

  const allAccounts = (accounts ?? []) as FinancesAccount[];
  const allDebts = (debts ?? []) as FinancesDebt[];
  const allTxns = transactions ?? [];
  const allRecurring = (recurringRaw ?? []) as RecurringExpense[];

  // ── Net Worth ─────────────────────────────────────────────────────────────
  const copAssets = allAccounts
    .filter((a) => a.currency === "COP" && a.current_balance > 0)
    .reduce((s, a) => s + a.current_balance, 0);
  const usdAssets = allAccounts
    .filter((a) => a.currency === "USD" && a.current_balance > 0)
    .reduce((s, a) => s + a.current_balance * USD_RATE, 0);
  const totalAssets = copAssets + usdAssets;

  const copDebts = allDebts
    .filter((d) => d.currency === "COP")
    .reduce((s, d) => s + d.current_balance, 0);
  const usdDebts = allDebts
    .filter((d) => d.currency === "USD")
    .reduce((s, d) => s + d.current_balance * USD_RATE, 0);
  const extraUsd = allDebts.reduce(
    (s, d) => s + (d.balance_usd ?? 0) * USD_RATE,
    0
  );
  const totalDebt = copDebts + usdDebts + extraUsd;
  const netWorth = totalAssets - totalDebt;

  // ── Split transactions by month ────────────────────────────────────────────
  const thisTxns = allTxns.filter((t) => t.date >= monthStart);
  const lastTxns = allTxns.filter(
    (t) => t.date >= lastMonthStart && t.date < monthStart
  );

  const toMonthlyCOP = (txns: typeof allTxns, typeFilter: string) =>
    txns
      .filter((t) => t.type === typeFilter)
      .reduce(
        (s, t) =>
          s + (t.currency === "USD" ? t.amount * USD_RATE : t.amount),
        0
      );

  // ── Monthly P&L ───────────────────────────────────────────────────────────
  const grossSalaryTxns = thisTxns.filter(
    (t) => t.type === "income" && t.gross_amount != null
  );
  const grossIncome = grossSalaryTxns.reduce((s, t) => s + (t.gross_amount ?? 0), 0);
  const totalDeductions = grossSalaryTxns.reduce(
    (s, t) => s + (t.deductions ?? 0),
    0
  );
  const otherIncome = thisTxns
    .filter((t) => t.type === "income" && t.gross_amount == null)
    .reduce(
      (s, t) =>
        s + (t.currency === "USD" ? t.amount * USD_RATE : t.amount),
      0
    );
  const netIncome =
    thisTxns
      .filter((t) => t.type === "income")
      .reduce(
        (s, t) =>
          s + (t.currency === "USD" ? t.amount * USD_RATE : t.amount),
        0
      );

  const deductionLines =
    totalDeductions > 0
      ? [{ label: "Deductions (pensión/salud/solidaridad)", amount: totalDeductions }]
      : [];

  const expensesByCategory = Object.entries(
    thisTxns
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        const cat = t.category ?? "other";
        const amt = t.currency === "USD" ? t.amount * USD_RATE : t.amount;
        acc[cat] = (acc[cat] ?? 0) + amt;
        return acc;
      }, {})
  ).map(([category, amount]) => ({ category, amount }));

  const totalExpenses = expensesByCategory.reduce((s, e) => s + e.amount, 0);
  const netCashFlow = netIncome - totalExpenses;

  const lastMonthNetIncome = toMonthlyCOP(lastTxns, "income");
  const lastMonthExpenses = toMonthlyCOP(lastTxns, "expense");
  const lastMonthNetCashFlow = lastMonthNetIncome - lastMonthExpenses;

  const momDelta =
    lastMonthNetCashFlow !== 0 || netCashFlow !== 0
      ? netCashFlow - lastMonthNetCashFlow
      : null;

  // ── Income attribution ────────────────────────────────────────────────────
  const incomeByCategory = Object.entries(
    thisTxns
      .filter((t) => t.type === "income")
      .reduce<Record<string, number>>((acc, t) => {
        const cat = t.category ?? "other";
        const amt = t.currency === "USD" ? t.amount * USD_RATE : t.amount;
        acc[cat] = (acc[cat] ?? 0) + amt;
        return acc;
      }, {})
  ).map(([category, amount]) => ({ category, amount }));

  // ── Expense Projections ───────────────────────────────────────────────────
  const GROSS_SALARY = 10_000_000; // COP
  const DEDUCTION_RATE = 0.09;     // pensión 4% + salud 4% + solidaridad 1%
  const monthlyRecurring = allRecurring.filter((e) => e.frequency === "monthly");
  const annualRecurring = allRecurring.filter((e) => e.frequency === "annual");
  const totalMonthlyFixed = monthlyRecurring.reduce((s, e) => s + e.amount, 0);
  const totalMonthlyDebt = allDebts.reduce(
    (s, d) => s + (d.monthly_payment ?? d.minimum_payment ?? 0),
    0
  );
  const estDeductions = Math.round(GROSS_SALARY * DEDUCTION_RATE);
  const estNetSalary = GROSS_SALARY - estDeductions;
  const projectionRemaining = estNetSalary - totalMonthlyFixed - totalMonthlyDebt;

  // ── AI context ────────────────────────────────────────────────────────────
  const aiContext = {
    accounts: allAccounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.current_balance,
      currency: a.currency,
    })),
    debts: allDebts.map((d) => ({
      name: d.name,
      balance: d.current_balance,
      balance_usd: d.balance_usd,
      monthly_payment: d.monthly_payment ?? d.minimum_payment,
      interest_rate: d.interest_rate,
      type: d.type,
    })),
    monthlyIncome: netIncome,
    monthlyExpenses: totalExpenses,
    netWorth,
  };

  return (
    <div className="p-4 lg:p-6">
      <FinanceTabBar />

      {/* Net Worth Bar */}
      <NetWorthBar
        totalAssets={totalAssets}
        totalDebt={totalDebt}
        netWorth={netWorth}
        momDelta={momDelta}
      />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <MonthlyPnL
            grossIncome={grossIncome > 0 ? grossIncome : netIncome + otherIncome}
            deductions={deductionLines}
            netIncome={netIncome}
            expenses={expensesByCategory}
            netCashFlow={netCashFlow}
            lastMonthNetCashFlow={
              lastMonthNetCashFlow !== 0 ? lastMonthNetCashFlow : null
            }
          />
          <AIFinancialInsight context={aiContext} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <IncomeChart
            data={incomeByCategory}
            totalIncome={netIncome}
          />
          <ExpenseChart data={expensesByCategory} />
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-4 flex gap-2">
        <Link
          href="/finances/accounts"
          className="text-[10px] font-mono text-muted hover:text-bright border border-line rounded px-3 py-1.5 transition-colors"
        >
          {allAccounts.length} accounts →
        </Link>
        <span className="text-[10px] font-mono text-muted self-center">
          Rate: 1 USD = {formatCOP(USD_RATE)}
        </span>
      </div>

      {/* Expense Projections */}
      <div className="mt-4">
        <ExpenseProjections
          monthlyExpenses={monthlyRecurring}
          annualExpenses={annualRecurring}
          grossSalary={GROSS_SALARY}
          estDeductions={estDeductions}
          estNetSalary={estNetSalary}
          totalMonthlyFixed={totalMonthlyFixed}
          totalMonthlyDebt={totalMonthlyDebt}
          projectionRemaining={projectionRemaining}
          debts={allDebts.map((d) => ({
            name: d.name,
            monthly_payment: d.monthly_payment ?? d.minimum_payment ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
