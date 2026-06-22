import { supabase } from "@/lib/supabase";
import { FinancesDebt } from "@/types";
import { getLiveUSDtoCOP } from "@/lib/utils";
import { FinanceTabBar } from "@/components/finances/FinanceTabBar";
import { DebtCard } from "@/components/finances/DebtCard";
import { DebtCalculator } from "@/components/finances/DebtCalculator";
import { AIDebtStrategy } from "./AIDebtStrategy";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const USD_RATE = await getLiveUSDtoCOP();

  const { data: debts } = await supabase
    .from("finances_debts")
    .select("*")
    .eq("active", true)
    .order("current_balance", { ascending: false });

  const allDebts = (debts ?? []) as FinancesDebt[];

  const totalDebtCOP = allDebts.reduce((s, d) => {
    return (
      s +
      d.current_balance +
      (d.balance_usd ?? 0) * USD_RATE
    );
  }, 0);

  return (
    <div className="p-4 lg:p-6">
      <FinanceTabBar />

      {allDebts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-lg">
          <p className="text-muted text-sm">No active debts. Run seed to load data.</p>
        </div>
      ) : (
        <>
          {/* Debt Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {allDebts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} usdRate={USD_RATE} />
            ))}
          </div>

          {/* Calculator + AI side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DebtCalculator debts={allDebts} usdRate={USD_RATE} />
            <AIDebtStrategy debts={allDebts} totalDebtCOP={totalDebtCOP} />
          </div>
        </>
      )}
    </div>
  );
}
