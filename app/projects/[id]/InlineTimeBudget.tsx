"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InlineTimeBudgetProps {
  projectId: string;
  currentValue: number | null;
}

export function InlineTimeBudget({
  projectId,
  currentValue,
}: InlineTimeBudgetProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentValue ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    await supabase
      .from("projects")
      .update({ weekly_time_budget_hours: num })
      .eq("id", projectId);
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setValue(String(currentValue ?? ""));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="w-20 bg-raised border border-teal rounded px-2 py-1 text-sm font-mono text-bright focus:outline-none"
        />
        <span className="text-xs text-muted font-mono">hrs/wk</span>
        <button
          onClick={save}
          disabled={saving}
          className="text-teal hover:text-teal/80"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="text-muted hover:text-bright">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 group"
    >
      <span className="text-2xl font-mono font-bold text-bright">
        {currentValue != null ? currentValue : "—"}
      </span>
      {currentValue != null && (
        <span className="text-xs text-muted font-mono">hrs/wk</span>
      )}
      {currentValue == null && (
        <span className="text-xs text-muted">not set</span>
      )}
      <Pencil className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
