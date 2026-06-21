"use client";

import { useState } from "react";
import { Zap, TrendingUp, DollarSign } from "lucide-react";

interface Recommendation {
  title: string;
  action: string;
  impact: string;
  priority: 1 | 2 | 3;
}

interface FinancialContext {
  accounts: unknown;
  debts: unknown;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
}

const PRIORITY_ICON = [Zap, TrendingUp, DollarSign];
const PRIORITY_COLOR = ["text-danger", "text-warn", "text-info"];
const PRIORITY_BORDER = ["border-danger/20 bg-danger/5", "border-warn/20 bg-warn/5", "border-info/20 bg-info/5"];

interface Props {
  context: FinancialContext;
}

export function AIFinancialInsight({ context }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "finance_advisor", context }),
      });
      const data = await res.json();
      if (Array.isArray(data.result?.recommendations)) {
        setRecs(data.result.recommendations);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRan(true);
    }
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            ◆ AI Financial Advisor
          </p>
        </div>
      </div>

      {!ran && !loading && (
        <div className="text-center py-4">
          <p className="text-xs text-muted mb-3">
            Get personalized debt strategy and savings recommendations.
          </p>
          <button
            onClick={analyze}
            className="px-4 py-2 bg-ai/10 border border-ai/30 text-ai text-xs font-mono rounded hover:bg-ai/20 transition-colors"
          >
            Analyze My Finances
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-2 py-2">
          {[80, 95, 70].map((w, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-4 h-4 bg-raised rounded shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-raised rounded" style={{ width: `${w}%` }} />
                <div className="h-2 bg-raised rounded" style={{ width: `${w - 20}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {ran && !loading && recs.length === 0 && (
        <p className="text-xs text-muted font-mono text-center py-4">
          No recommendations returned. Try again.
        </p>
      )}

      {recs.length > 0 && (
        <div className="space-y-2">
          {recs
            .sort((a, b) => a.priority - b.priority)
            .map((rec, i) => {
              const Icon = PRIORITY_ICON[(rec.priority - 1) % 3];
              return (
                <div
                  key={i}
                  className={`p-3 rounded border text-xs ${
                    PRIORITY_BORDER[(rec.priority - 1) % 3]
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        PRIORITY_COLOR[(rec.priority - 1) % 3]
                      }`}
                    />
                    <span className="font-semibold text-bright">{rec.title}</span>
                  </div>
                  <p className="text-muted leading-relaxed mb-1">{rec.action}</p>
                  {rec.impact && (
                    <p className="text-[10px] font-mono text-muted/60">{rec.impact}</p>
                  )}
                </div>
              );
            })}
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full text-[10px] font-mono text-muted hover:text-bright transition-colors text-center py-1"
          >
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  );
}
