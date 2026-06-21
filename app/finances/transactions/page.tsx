import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/lib/supabase";
import { FinancesAccount, FinancesTransaction, Project } from "@/types";
import { FinanceTabBar } from "@/components/finances/FinanceTabBar";
import { TransactionsClient } from "@/components/finances/TransactionsClient";
import { CSVImportWrapper } from "./CSVImportWrapper";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const threeMonthsAgo = format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd");

  const [{ data: transactions, error: txError }, { data: accounts }, { data: projects }] =
    await Promise.all([
      supabase
        .from("finances_transactions")
        .select("*")
        .gte("date", threeMonthsAgo)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("finances_accounts").select("*").order("name"),
      supabase.from("projects").select("id, name, emoji").order("name"),
    ]);

  if (txError) {
    console.error("[TransactionsPage] Supabase query error:", txError);
  }
  console.log("[TransactionsPage] fetched rows:", transactions?.length ?? 0, "since:", threeMonthsAgo);

  const allTransactions = (transactions ?? []) as FinancesTransaction[];
  const allAccounts = (accounts ?? []) as FinancesAccount[];
  const allProjects = (projects ?? []) as Pick<Project, "id" | "name" | "emoji">[];

  return (
    <div className="p-4 lg:p-6">
      <FinanceTabBar />

      <div className="flex justify-end mb-4">
        <CSVImportWrapper accounts={allAccounts} />
      </div>

      <TransactionsClient
        initialTransactions={allTransactions}
        accounts={allAccounts}
        projects={allProjects as Project[]}
      />
    </div>
  );
}
