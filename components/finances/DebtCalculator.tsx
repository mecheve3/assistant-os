"use client";

import { useState, useMemo } from "react";
import { FinancesDebt } from "@/types";
import { formatCOP } from "@/lib/utils";

interface DebtState {
  id: string;
  name: string;
  balance: number;
  minPayment: number;
  rate: number;
  paidAtMonth: number | null;
  totalInterest: number;
}

function simulatePayoff(
  debts: FinancesDebt[],
  extraPayment: number,
  method: "snowball" | "avalanche",
  usdRate: number
): { months: number; debtStates: DebtState[]; totalInterest: number } {
  const state: DebtState[] = debts.map((d) => {
    const balanceCOP = d.current_balance + (d.balance_usd ?? 0) * usdRate;
    const minPmt =
      (d.monthly_payment ?? d.minimum_payment ?? null) ??
      Math.max(Math.ceil(balanceCOP * 0.02), 50_000);
    return {
      id: d.id,
      name: d.name,
      balance: balanceCOP,
      minPayment: minPmt,
      rate: d.interest_rate ?? 0,
      paidAtMonth: null,
      totalInterest: 0,
    };
  });

  // Sort by method
  const sortKey = (s: DebtState) =>
    method === "snowball" ? s.balance : -(s.rate ?? 0);
  state.sort((a, b) => sortKey(a) - sortKey(b));

  const MAX_MONTHS = 600;
  let month = 0;

  while (state.some((s) => s.balance > 0) && month < MAX_MONTHS) {
    month++;

    // Freed payments from already-paid debts roll into extra
    let rolledExtra = extraPayment;
    for (const s of state) {
      if (s.balance <= 0 && s.paidAtMonth !== null) {
        rolledExtra += s.minPayment;
      }
    }

    // Find first unpaid debt (target for extra)
    const targetIdx = state.findIndex((s) => s.balance > 0);

    for (let i = 0; i < state.length; i++) {
      const s = state[i];
      if (s.balance <= 0) continue;

      const monthlyRate = s.rate / 100 / 12;
      const interest = s.balance * monthlyRate;
      s.totalInterest += interest;
      s.balance += interest;

      const payment =
        i === targetIdx
          ? Math.min(s.balance, s.minPayment + rolledExtra)
          : Math.min(s.balance, s.minPayment);

      s.balance = Math.max(0, s.balance - payment);

      if (s.balance <= 0 && s.paidAtMonth === null) {
        s.paidAtMonth = month;
      }
    }
  }

  return {
    months: month,
    debtStates: state,
    totalInterest: state.reduce((sum, s) => sum + s.totalInterest, 0),
  };
}

function monthsToDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
}

interface Props {
  debts: FinancesDebt[];
  usdRate: number;
}

export function DebtCalculator({ debts, usdRate }: Props) {
  const [method, setMethod] = useState<"snowball" | "avalanche">("snowball");
  const [extra, setExtra] = useState(0);

  const activeDebts = debts.filter((d) => d.active && d.current_balance > 0);

  const result = useMemo(
    () => simulatePayoff(activeDebts, extra, method, usdRate),
    [activeDebts, extra, method, usdRate]
  );

  const baseline = useMemo(
    () => simulatePayoff(activeDebts, 0, method, usdRate),
    [activeDebts, method, usdRate]
  );

  const monthsSaved = baseline.months - result.months;
  const interestSaved = baseline.totalInterest - result.totalInterest;

  const hasRates = activeDebts.some((d) => d.interest_rate != null);

  if (activeDebts.length === 0) {
    return (
      <div className="bg-card border border-line rounded-lg p-4">
        <p className="text-xs text-muted font-mono text-center py-6">
          No active debts to calculate.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
        Payoff Calculator
      </p>

      {/* Method toggle */}
      <div className="flex gap-1 p-0.5 bg-raised rounded mb-4 w-fit">
        {(["snowball", "avalanche"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              method === m
                ? "bg-card text-bright border border-line"
                : "text-muted hover:text-bright"
            }`}
          >
            {m === "snowball" ? "🏔 Snowball" : "📈 Avalanche"}
          </button>
        ))}
      </div>

      {method === "avalanche" && !hasRates && (
        <p className="text-[10px] font-mono text-warn mb-3">
          ⚠ Add interest rates to debts for avalanche to work correctly. Using
          balance order as fallback.
        </p>
      )}

      {/* Extra payment slider */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label className="text-[10px] font-mono text-muted">
            Extra Monthly Payment
          </label>
          <span className="text-xs font-mono text-bright">
            {formatCOP(extra)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="500000"
          step="25000"
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-line"
          style={{
            background: `linear-gradient(to right, var(--color-teal) 0%, var(--color-teal) ${(extra / 500000) * 100}%, var(--color-line) ${(extra / 500000) * 100}%, var(--color-line) 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono text-muted/40">{formatCOP(0)}</span>
          <span className="text-[9px] font-mono text-muted/40">{formatCOP(500_000)}</span>
        </div>
      </div>

      {/* Results per debt */}
      <div className="space-y-2 mb-4">
        {result.debtStates.map((ds) => (
          <div
            key={ds.id}
            className="flex items-center justify-between bg-raised rounded p-2.5"
          >
            <div>
              <p className="text-xs text-bright">{ds.name}</p>
              {hasRates && (
                <p className="text-[10px] font-mono text-muted">
                  Interest: {formatCOP(ds.totalInterest)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-teal">
                {ds.paidAtMonth ? monthsToDate(ds.paidAtMonth) : "—"}
              </p>
              <p className="text-[10px] font-mono text-muted">
                {ds.paidAtMonth ? `${ds.paidAtMonth} months` : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-line pt-3 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted">Debt-free by</span>
          <span className="text-teal font-semibold">
            {monthsToDate(result.months)}
          </span>
        </div>
        {hasRates && (
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted">Total interest</span>
            <span className="text-danger">{formatCOP(result.totalInterest)}</span>
          </div>
        )}

        {extra > 0 && (
          <div className="mt-3 p-2.5 bg-teal/5 border border-teal/20 rounded space-y-1.5">
            <p className="text-[10px] font-mono text-teal uppercase tracking-wide">
              vs minimum payments only
            </p>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted">Time saved</span>
              <span className={monthsSaved > 0 ? "text-teal" : "text-muted"}>
                {monthsSaved > 0 ? `${monthsSaved} months sooner` : "No change"}
              </span>
            </div>
            {hasRates && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-muted">Interest saved</span>
                <span className={interestSaved > 0 ? "text-teal" : "text-muted"}>
                  {interestSaved > 0 ? formatCOP(interestSaved) : "—"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* What-if section */}
        {extra === 0 && (
          <div className="mt-3 p-2.5 bg-raised rounded border border-line/50">
            <p className="text-[10px] font-mono text-muted mb-2">What if you added…</p>
            {[100_000, 200_000].map((e) => {
              const r = simulatePayoff(activeDebts, e, method, usdRate);
              const saved = baseline.months - r.months;
              return (
                <div key={e} className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="text-muted">+{formatCOP(e)}/mo</span>
                  <span className="text-teal">
                    {saved > 0 ? `${saved} months sooner` : "Same"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
