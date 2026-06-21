"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { FinancesAccount, FinancesTransaction, Project } from "@/types";
import { todayISO, formatCOP } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";

const SMMLV_2025 = 1_423_500;

const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "crypto_income", label: "Crypto Income" },
  { value: "course_sales", label: "Course Sales" },
  { value: "bot_revenue", label: "Bot Revenue" },
  { value: "other", label: "Other Income" },
];

const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "housing", label: "Housing" },
  { value: "entertainment", label: "Entertainment" },
  { value: "health", label: "Health" },
  { value: "debt_payment", label: "Debt Payment" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

function calcDeductions(gross: number) {
  const pension = Math.round(gross * 0.04);
  const salud = Math.round(gross * 0.04);
  const solidaridad = gross > 2 * SMMLV_2025 ? Math.round(gross * 0.01) : 0;
  const total = pension + salud + solidaridad;
  return { pension, salud, solidaridad, total };
}

interface Props {
  accounts: FinancesAccount[];
  projects: Project[];
  onSuccess?: (tx: FinancesTransaction) => void;
}

export function AddTransactionForm({ accounts, projects, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"COP" | "USD">("COP");
  const [type, setType] = useState<"income" | "expense" | "transfer" | "investment">("expense");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");

  // Salary mode
  const [isSalary, setIsSalary] = useState(false);
  const [grossAmount, setGrossAmount] = useState("");

  const gross = parseFloat(grossAmount) || 0;
  const deductions = calcDeductions(gross);
  const netSalary = gross - deductions.total;

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = isSalary ? netSalary : parseFloat(amount);
    if (!description.trim() || isNaN(num) || num <= 0) return;

    setSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      date,
      description: description.trim(),
      amount: num,
      currency,
      type,
      category: category || null,
      account_id: accountId || null,
      project_id: projectId || null,
      notes: notes.trim() || null,
    };

    if (isSalary) {
      payload.gross_amount = gross;
      payload.deductions = deductions.total;
      payload.net_amount = netSalary;
    }

    const { data: inserted, error } = await supabase
      .from("finances_transactions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[AddTransactionForm] insert error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setFormError(error.message ?? "Failed to save. Check the browser console.");
      setSaving(false);
      return;
    }

    setSaving(false);

    // Reset form on success only
    setDescription("");
    setAmount("");
    setGrossAmount("");
    setCategory("");
    setAccountId("");
    setProjectId("");
    setNotes("");
    setIsSalary(false);
    setOpen(false);
    setFormError(null);

    onSuccess?.(inserted as FinancesTransaction);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-teal/10 border border-teal/30 text-teal text-xs font-mono rounded hover:bg-teal/20 transition-colors"
      >
        + Add Transaction
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-teal/20 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-teal">
          New Transaction
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-bright text-xs"
        >
          ✕
        </button>
      </div>

      {/* Row 1: Date + Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Date</label>
          <DatePicker value={date} onChange={setDate} className="w-full" />
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as typeof type);
              setCategory("");
              setIsSalary(false);
            }}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-mono text-muted block mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted focus:outline-none focus:border-teal"
        />
      </div>

      {/* Salary toggle (only for income) */}
      {type === "income" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSalary}
            onChange={(e) => {
              setIsSalary(e.target.checked);
              if (e.target.checked) setCategory("salary");
            }}
            className="w-3.5 h-3.5 rounded accent-teal"
          />
          <span className="text-xs font-mono text-muted">
            This is salary (auto-calculate Colombian deductions)
          </span>
        </label>
      )}

      {/* Salary gross input */}
      {isSalary && (
        <div className="bg-raised rounded-lg p-3 space-y-2 border border-line">
          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">
              Gross Amount (COP)
            </label>
            <input
              type="number"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              placeholder="10000000"
              className="w-full bg-card border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
            />
          </div>
          {gross > 0 && (
            <div className="text-[10px] font-mono space-y-0.5">
              <div className="flex justify-between text-muted/70">
                <span>- Pensión (4%)</span>
                <span>-{formatCOP(deductions.pension)}</span>
              </div>
              <div className="flex justify-between text-muted/70">
                <span>- Salud (4%)</span>
                <span>-{formatCOP(deductions.salud)}</span>
              </div>
              {deductions.solidaridad > 0 && (
                <div className="flex justify-between text-muted/70">
                  <span>- Fondo Solidaridad (1%)</span>
                  <span>-{formatCOP(deductions.solidaridad)}</span>
                </div>
              )}
              <div className="flex justify-between text-teal border-t border-line/50 pt-1">
                <span>Net Salary</span>
                <span>{formatCOP(netSalary)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Amount (only if not salary) */}
      {!isSalary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-[10px] font-mono text-muted block mb-1">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="any"
              className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "COP" | "USD")}
              className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      )}

      {/* Category + Account */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">
            Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            <option value="">— none —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project (optional) */}
      {projects.length > 0 && (
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">
            Project Attribution (optional)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            <option value="">— none —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-mono text-muted block mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional context..."
          className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted focus:outline-none focus:border-teal"
        />
      </div>

      {formError && (
        <p className="text-[10px] font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || (!isSalary && !amount) || (isSalary && !grossAmount)}
        className="w-full py-2 bg-teal text-base text-xs font-mono font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {saving ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}
