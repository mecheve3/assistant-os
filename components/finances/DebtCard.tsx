"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FinancesDebt } from "@/types";
import { formatCOP, formatUSD } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  mortgage: "Mortgage",
  credit_card: "Credit Card",
  personal: "Personal Loan",
  auto: "Auto Loan",
  student: "Student Loan",
  other: "Other",
};

const TYPE_COLOR: Record<string, string> = {
  mortgage: "text-info bg-info/10",
  credit_card: "text-warn bg-warn/10",
  personal: "text-ai bg-ai/10",
  other: "text-muted bg-raised",
};

interface Props {
  debt: FinancesDebt;
  usdRate: number;
}

export function DebtCard({ debt, usdRate }: Props) {
  const router = useRouter();

  const [editingRate, setEditingRate] = useState(false);
  const [rateValue, setRateValue] = useState(String(debt.interest_rate ?? ""));
  const [saving, setSaving] = useState(false);

  const saveRate = async () => {
    const num = parseFloat(rateValue);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await supabase
      .from("finances_debts")
      .update({ interest_rate: num })
      .eq("id", debt.id);
    setSaving(false);
    setEditingRate(false);
    router.refresh();
  };

  // COP equivalent balance
  const balanceCOP =
    debt.current_balance +
    (debt.balance_usd ?? 0) * usdRate;

  const paidOff = Math.max(0, debt.total_amount - debt.current_balance);
  const pctPaid =
    debt.total_amount > 0
      ? Math.min(100, (paidOff / debt.total_amount) * 100)
      : 0;

  // Monthly payment (use the most specific column available)
  const monthlyPmt =
    debt.monthly_payment ??
    debt.minimum_payment ??
    null;

  // Projected payoff (simplified, no interest if rate is null)
  let projectedMonths: number | null = null;
  if (monthlyPmt && monthlyPmt > 0 && balanceCOP > 0) {
    if (!debt.interest_rate) {
      projectedMonths = Math.ceil(balanceCOP / monthlyPmt);
    } else {
      // With interest: standard amortization
      const r = debt.interest_rate / 100 / 12;
      if (r > 0) {
        projectedMonths = Math.ceil(
          Math.log(monthlyPmt / (monthlyPmt - r * balanceCOP)) / Math.log(1 + r)
        );
      } else {
        projectedMonths = Math.ceil(balanceCOP / monthlyPmt);
      }
    }
  }

  const payoffDate = projectedMonths
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + projectedMonths);
        return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
      })()
    : null;

  const debtType = debt.type ?? "other";

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-semibold text-bright">{debt.name}</h3>
            <span
              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                TYPE_COLOR[debtType] ?? "text-muted bg-raised"
              }`}
            >
              {TYPE_LABELS[debtType] ?? debtType}
            </span>
          </div>
          {debt.institution && (
            <p className="text-[10px] text-muted font-mono">{debt.institution}</p>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="mb-3">
        <p className="text-[9px] font-mono text-muted/60 uppercase mb-0.5">
          Remaining Balance
        </p>
        <p className="text-2xl font-mono font-bold text-danger">
          {formatCOP(debt.current_balance)}
        </p>
        {debt.balance_usd != null && debt.balance_usd > 0 && (
          <p className="text-xs font-mono text-danger/70 mt-0.5">
            + {formatUSD(debt.balance_usd)} USD
            <span className="text-muted/50 ml-1">
              (~{formatCOP(debt.balance_usd * usdRate)})
            </span>
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-mono text-muted mb-1">
          <span>Paid off</span>
          <span>{pctPaid.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-danger/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full"
            style={{ width: `${pctPaid}%` }}
          />
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mb-3">
        {monthlyPmt && (
          <div className="bg-raised rounded p-2">
            <p className="text-muted/60 mb-0.5">Monthly Payment</p>
            <p className="text-bright">{formatCOP(monthlyPmt)}</p>
            {debt.minimum_payment_usd != null && debt.minimum_payment_usd > 0 && (
              <p className="text-muted/60">+ {formatUSD(debt.minimum_payment_usd)}</p>
            )}
          </div>
        )}

        <div className="bg-raised rounded p-2">
          <p className="text-muted/60 mb-0.5">Interest Rate</p>
          {editingRate ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRate();
                  if (e.key === "Escape") setEditingRate(false);
                }}
                autoFocus
                min="0"
                step="0.01"
                className="w-12 bg-card border border-teal rounded px-1 py-0.5 text-bright focus:outline-none"
              />
              <span className="text-muted">%</span>
              <button onClick={saveRate} disabled={saving} className="text-teal">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingRate(false)} className="text-muted">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingRate(true)}
              className="flex items-center gap-1 group text-left"
            >
              <span className="text-bright">
                {debt.interest_rate != null
                  ? `${debt.interest_rate}% EA`
                  : "—"}
              </span>
              <Pencil className="w-2.5 h-2.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {debt.payment_day && (
          <div className="bg-raised rounded p-2">
            <p className="text-muted/60 mb-0.5">Due Day</p>
            <p className="text-bright">Day {debt.payment_day}</p>
          </div>
        )}

        {payoffDate && (
          <div className="bg-raised rounded p-2">
            <p className="text-muted/60 mb-0.5">Proj. Payoff</p>
            <p className="text-teal capitalize">{payoffDate}</p>
          </div>
        )}
      </div>

      {!debt.interest_rate && (
        <p className="text-[9px] font-mono text-muted/50 italic">
          Add interest rate for more accurate projections
        </p>
      )}
    </div>
  );
}
