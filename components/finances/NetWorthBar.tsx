import { formatCOP } from "@/lib/utils";

interface Props {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  momDelta: number | null;
}

export function NetWorthBar({ totalAssets, totalDebt, netWorth, momDelta }: Props) {
  const isPositive = netWorth >= 0;
  const momPositive = momDelta != null && momDelta >= 0;

  return (
    <div className="bg-card border border-line rounded-lg p-5 mb-4">
      <div className="grid grid-cols-3 gap-4 sm:gap-8">
        {/* Assets */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">
            Total Assets
          </p>
          <p className="text-xl sm:text-2xl font-mono font-bold text-bright">
            {formatCOP(totalAssets)}
          </p>
        </div>

        {/* Debt */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">
            Total Debt
          </p>
          <p className="text-xl sm:text-2xl font-mono font-bold text-danger">
            {totalDebt > 0 ? `-${formatCOP(totalDebt)}` : formatCOP(0)}
          </p>
        </div>

        {/* Net Worth */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">
            Net Worth
          </p>
          <p
            className={`text-xl sm:text-2xl font-mono font-bold ${
              isPositive ? "text-teal" : "text-danger"
            }`}
          >
            {formatCOP(netWorth)}
          </p>
          {momDelta != null && (
            <p
              className={`text-xs font-mono mt-0.5 ${
                momPositive ? "text-teal" : "text-danger"
              }`}
            >
              {momPositive ? "↑" : "↓"} {formatCOP(Math.abs(momDelta))} MoM
            </p>
          )}
        </div>
      </div>

      {/* Asset vs Debt progress bar */}
      {(totalAssets > 0 || totalDebt > 0) && (
        <div className="mt-4">
          <div className="h-1.5 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, (totalAssets / (totalAssets + totalDebt)) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-mono text-teal">Assets</span>
            <span className="text-[9px] font-mono text-danger">Debt</span>
          </div>
        </div>
      )}
    </div>
  );
}
