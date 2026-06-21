"use client";

import { useState } from "react";
import { FinancesDebt } from "@/types";
import { formatCOP } from "@/lib/utils";

interface Props {
  debts: FinancesDebt[];
  totalDebtCOP: number;
}

interface DebtOptResult {
  recommended_strategy: "snowball" | "avalanche";
  reasoning: string;
  payoff_order: string[];
  monthly_extra_needed: number;
}

export function AIDebtStrategy({ debts, totalDebtCOP }: Props) {
  const [result, setResult] = useState<DebtOptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "debt_optimization",
          context: {
            debts: debts.map((d) => ({
              name: d.name,
              balance_cop: d.current_balance,
              balance_usd: d.balance_usd,
              monthly_payment: d.monthly_payment ?? d.minimum_payment,
              interest_rate: d.interest_rate,
              type: d.type,
            })),
            total_debt_cop: totalDebtCOP,
          },
        }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRan(true);
    }
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          AI Debt Strategy
        </p>
      </div>

      {!ran && !loading && (
        <div className="text-center py-6">
          <p className="text-xs text-muted mb-3">
            Total debt:{" "}
            <span className="text-danger font-mono">{formatCOP(totalDebtCOP)}</span>
          </p>
          <p className="text-xs text-muted mb-4">
            Get a personalized snowball vs avalanche recommendation for your
            specific situation.
          </p>
          <button
            onClick={analyze}
            className="px-4 py-2 bg-ai/10 border border-ai/30 text-ai text-xs font-mono rounded hover:bg-ai/20 transition-colors"
          >
            Get Debt Strategy
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-2 py-4 animate-pulse">
          {[90, 70, 80].map((w, i) => (
            <div key={i} className="h-3 bg-raised rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {ran && !loading && !result && (
        <p className="text-xs text-muted font-mono text-center py-4">
          No result — try again.
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div
            className={`p-3 rounded border text-xs ${
              result.recommended_strategy === "avalanche"
                ? "border-info/20 bg-info/5"
                : "border-teal/20 bg-teal/5"
            }`}
          >
            <p className="font-semibold text-bright mb-1">
              Recommended:{" "}
              <span
                className={
                  result.recommended_strategy === "avalanche"
                    ? "text-info"
                    : "text-teal"
                }
              >
                {result.recommended_strategy === "avalanche"
                  ? "📈 Avalanche"
                  : "🏔 Snowball"}
              </span>
            </p>
            <p className="text-muted leading-relaxed">{result.reasoning}</p>
          </div>

          {result.payoff_order?.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted mb-1.5">
                Payoff order
              </p>
              <ol className="space-y-1">
                {result.payoff_order.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted font-mono w-4">{i + 1}.</span>
                    <span className="text-bright">{name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.monthly_extra_needed > 0 && (
            <div className="bg-raised rounded p-2.5 text-xs font-mono">
              <span className="text-muted">Extra/month to accelerate: </span>
              <span className="text-teal">
                {formatCOP(result.monthly_extra_needed)}
              </span>
            </div>
          )}

          <button
            onClick={analyze}
            disabled={loading}
            className="w-full text-[10px] font-mono text-muted hover:text-bright transition-colors text-center py-1"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
