"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  accountId: string;
  currentBalance: number;
  currency: "COP" | "USD";
}

export function InlineAccountBalance({ accountId, currentBalance, currency }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentBalance));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setSaving(true);
    await supabase
      .from("finances_accounts")
      .update({ current_balance: num })
      .eq("id", accountId);
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setValue(String(currentBalance));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          step={currency === "USD" ? "0.01" : "1000"}
          className="w-28 bg-raised border border-teal rounded px-2 py-0.5 text-xs font-mono text-bright focus:outline-none"
        />
        <span className="text-[10px] font-mono text-muted">{currency}</span>
        <button
          onClick={save}
          disabled={saving}
          className="text-teal hover:text-teal/80"
        >
          <Check className="w-3 h-3" />
        </button>
        <button onClick={cancel} className="text-muted hover:text-bright">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="p-1 text-muted hover:text-bright opacity-0 group-hover:opacity-100 transition-opacity"
      title="Edit balance"
    >
      <Pencil className="w-3 h-3" />
    </button>
  );
}
