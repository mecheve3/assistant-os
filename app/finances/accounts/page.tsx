import { supabase } from "@/lib/supabase";
import { FinancesAccount } from "@/types";
import { formatCOP, formatUSD } from "@/lib/utils";
import { InlineAccountBalance } from "./InlineAccountBalance";
import { AddAccountForm } from "./AddAccountForm";
import { AccountDeleteButton } from "./AccountDeleteButton";

export const dynamic = "force-dynamic";

const USD_RATE = Number(process.env.USD_TO_COP_RATE ?? "4200");

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  crypto: "Crypto",
  investment: "Investment",
};

const TYPE_COLOR: Record<string, string> = {
  checking: "text-teal bg-teal/10",
  savings: "text-info bg-info/10",
  credit_card: "text-warn bg-warn/10",
  crypto: "text-ai bg-ai/10",
  investment: "text-teal bg-teal/10",
};

function AccountRow({ account }: { account: FinancesAccount }) {
  const balance =
    account.currency === "COP"
      ? formatCOP(account.current_balance)
      : formatUSD(account.current_balance);
  const isNegative = account.current_balance < 0;

  return (
    <div className="group flex items-center gap-3 py-3 border-b border-line/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-bright">{account.name}</span>
          <span
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
              TYPE_COLOR[account.type] ?? "text-muted bg-raised"
            }`}
          >
            {TYPE_LABELS[account.type] ?? account.type}
          </span>
        </div>
        {account.institution && (
          <p className="text-[10px] text-muted">{account.institution}</p>
        )}
      </div>
      <InlineAccountBalance
        accountId={account.id}
        currentBalance={account.current_balance}
        currency={account.currency}
      />
      <div className="text-right shrink-0">
        <p className={`text-sm font-mono font-semibold ${isNegative ? "text-danger" : "text-bright"}`}>
          {balance}
        </p>
        {account.currency === "USD" && (
          <p className="text-[10px] font-mono text-muted/60">
            ~{formatCOP(account.current_balance * USD_RATE)}
          </p>
        )}
      </div>
      <AccountDeleteButton accountId={account.id} accountName={account.name} />
    </div>
  );
}

export default async function AccountsPage() {
  const { data: accounts } = await supabase
    .from("finances_accounts")
    .select("*")
    .order("name");

  const allAccounts = (accounts ?? []) as FinancesAccount[];

  const copAccounts = allAccounts.filter((a) => a.currency === "COP");
  const usdAccounts = allAccounts.filter((a) => a.currency === "USD");

  const copTotal = copAccounts.reduce((s, a) => s + a.current_balance, 0);
  const usdTotal = usdAccounts.reduce((s, a) => s + a.current_balance, 0);
  const grandTotalCOP = copTotal + usdTotal * USD_RATE;

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            Finances
          </p>
          <h1 className="text-xl font-semibold text-bright">Accounts</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-muted">Total (COP equiv.)</p>
          <p
            className={`text-xl font-mono font-bold ${
              grandTotalCOP >= 0 ? "text-teal" : "text-danger"
            }`}
          >
            {formatCOP(grandTotalCOP)}
          </p>
        </div>
      </div>

      {/* COP Section */}
      <div className="bg-card border border-line rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            COP Accounts
          </p>
          <span className="text-xs font-mono text-bright">{formatCOP(copTotal)}</span>
        </div>
        {copAccounts.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">No COP accounts</p>
        ) : (
          copAccounts.map((a) => <AccountRow key={a.id} account={a} />)
        )}
      </div>

      {/* USD Section */}
      <div className="bg-card border border-line rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            USD Accounts
          </p>
          <div className="text-right">
            <p className="text-xs font-mono text-bright">{formatUSD(usdTotal)}</p>
            <p className="text-[10px] font-mono text-muted/60">
              ~{formatCOP(usdTotal * USD_RATE)}
            </p>
          </div>
        </div>
        {usdAccounts.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">No USD accounts</p>
        ) : (
          usdAccounts.map((a) => <AccountRow key={a.id} account={a} />)
        )}
      </div>

      {/* Add Account Form */}
      <AddAccountForm />
    </div>
  );
}
