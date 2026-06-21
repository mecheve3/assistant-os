"use client";

import { useState } from "react";
import { FinancesAccount, FinancesTransaction, Project } from "@/types";
import { AddTransactionForm } from "./AddTransactionForm";
import { TransactionTable } from "./TransactionTable";

interface Props {
  initialTransactions: FinancesTransaction[];
  accounts: FinancesAccount[];
  projects: Project[];
}

export function TransactionsClient({ initialTransactions, accounts, projects }: Props) {
  const [transactions, setTransactions] = useState<FinancesTransaction[]>(initialTransactions);

  const handleSuccess = (tx: FinancesTransaction) => {
    // Prepend so it appears at top (table is sorted date desc server-side)
    setTransactions((prev) => [tx, ...prev]);
  };

  return (
    <>
      <AddTransactionForm
        accounts={accounts}
        projects={projects}
        onSuccess={handleSuccess}
      />
      <div className="bg-card border border-line rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            Transactions (last 3 months)
          </p>
          <span className="text-[10px] font-mono text-muted/60">{transactions.length} total</span>
        </div>
        <TransactionTable
          transactions={transactions}
          accounts={accounts}
          projects={projects}
        />
      </div>
    </>
  );
}
