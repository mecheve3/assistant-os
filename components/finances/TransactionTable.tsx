"use client";

import { useState, useMemo } from "react";
import { FinancesTransaction, FinancesAccount, Project } from "@/types";
import { formatCOP, formatUSD } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Salary",
  freelance: "Freelance",
  crypto_income: "Crypto Income",
  course_sales: "Course Sales",
  bot_revenue: "Bot Revenue",
  food: "Food",
  transport: "Transport",
  housing: "Housing",
  entertainment: "Entertainment",
  health: "Health",
  debt_payment: "Debt Payment",
  investment: "Investment",
  other: "Other",
};

const PAGE_SIZE = 25;

interface Props {
  transactions: FinancesTransaction[];
  accounts: FinancesAccount[];
  projects: Project[];
}

export function TransactionTable({ transactions, accounts, projects }: Props) {
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, `${p.emoji} ${p.name}`])),
    [projects]
  );

  // Available months from data
  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (monthFilter && !t.date.startsWith(monthFilter)) return false;
        if (typeFilter && t.type !== typeFilter) return false;
        if (categoryFilter && t.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortField === "date") return a.date.localeCompare(b.date) * dir;
        return (a.amount - b.amount) * dir;
      });
  }, [transactions, monthFilter, typeFilter, categoryFilter, sortField, sortDir]);

  const total = filtered.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const sortIcon = (field: "date" | "amount") => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}
          className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-muted focus:outline-none focus:border-teal"
        >
          <option value="">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-muted focus:outline-none focus:border-teal"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="investment">Investment</option>
          <option value="transfer">Transfer</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-muted focus:outline-none focus:border-teal"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {(monthFilter || typeFilter || categoryFilter) && (
          <button
            onClick={() => { setMonthFilter(""); setTypeFilter(""); setCategoryFilter(""); setPage(0); }}
            className="text-[10px] font-mono text-muted hover:text-bright px-2"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-[10px] font-mono text-muted self-center">
          {total} transactions
        </span>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-line rounded-lg">
          <p className="text-sm text-muted">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[600px] text-xs">
            <thead>
              <tr className="border-b border-line">
                <th
                  className="text-left pb-2 pr-3 text-[10px] font-mono text-muted font-normal cursor-pointer hover:text-bright"
                  onClick={() => toggleSort("date")}
                >
                  Date{sortIcon("date")}
                </th>
                <th className="text-left pb-2 pr-3 text-[10px] font-mono text-muted font-normal">
                  Description
                </th>
                <th className="text-left pb-2 pr-3 text-[10px] font-mono text-muted font-normal hidden md:table-cell">
                  Category
                </th>
                <th className="text-left pb-2 pr-3 text-[10px] font-mono text-muted font-normal hidden lg:table-cell">
                  Account
                </th>
                <th
                  className="text-right pb-2 pr-3 text-[10px] font-mono text-muted font-normal cursor-pointer hover:text-bright"
                  onClick={() => toggleSort("amount")}
                >
                  Amount{sortIcon("amount")}
                </th>
                <th className="text-left pb-2 text-[10px] font-mono text-muted font-normal hidden lg:table-cell">
                  Project
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => {
                const isIncome = t.type === "income";
                const isExpense = t.type === "expense";
                return (
                  <tr
                    key={t.id}
                    className="border-b border-line/30 hover:bg-raised/40 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono text-muted/80">
                      {t.date}
                    </td>
                    <td className="py-2.5 pr-3 text-bright max-w-[180px] truncate">
                      {t.description}
                    </td>
                    <td className="py-2.5 pr-3 text-muted hidden md:table-cell">
                      {t.category ? (CATEGORY_LABELS[t.category] ?? t.category) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted hidden lg:table-cell">
                      {t.account_id ? (accountMap.get(t.account_id) ?? "—") : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">
                      <span
                        className={
                          isIncome
                            ? "text-teal"
                            : isExpense
                            ? "text-danger"
                            : "text-muted"
                        }
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {t.currency === "USD"
                          ? formatUSD(t.amount)
                          : formatCOP(t.amount)}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted hidden lg:table-cell">
                      {t.project_id ? (projectMap.get(t.project_id) ?? "—") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[10px] font-mono text-muted hover:text-bright disabled:opacity-40 px-2 py-1"
          >
            ← Prev
          </button>
          <span className="text-[10px] font-mono text-muted">
            Page {page + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
            className="text-[10px] font-mono text-muted hover:text-bright disabled:opacity-40 px-2 py-1"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
