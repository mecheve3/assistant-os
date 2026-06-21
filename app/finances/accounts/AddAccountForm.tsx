"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "crypto", label: "Crypto" },
  { value: "investment", label: "Investment" },
];

export function AddAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [currency, setCurrency] = useState<"COP" | "USD">("COP");
  const [balance, setBalance] = useState("0");
  const [institution, setInstitution] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    await supabase.from("finances_accounts").insert({
      name: name.trim(),
      type,
      currency,
      current_balance: parseFloat(balance) || 0,
      institution: institution.trim() || null,
      credit_limit: creditLimit ? parseFloat(creditLimit) : null,
    });

    setSaving(false);
    setOpen(false);
    setName("");
    setBalance("0");
    setInstitution("");
    setCreditLimit("");
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 border border-dashed border-line rounded-lg text-xs font-mono text-muted hover:text-bright hover:border-teal/40 transition-colors"
      >
        + Add Account
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
          New Account
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-bright text-xs"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bancolombia..."
            required
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted focus:outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "COP" | "USD")}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Balance</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            step={currency === "USD" ? "0.01" : "1000"}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">
            Institution (optional)
          </label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Bancolombia..."
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted focus:outline-none focus:border-teal"
          />
        </div>
        {type === "credit_card" && (
          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">
              Credit Limit (optional)
            </label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              step="1000"
              placeholder="0"
              className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-2 bg-teal text-base text-xs font-mono font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {saving ? "Saving..." : "Add Account"}
      </button>
    </form>
  );
}
