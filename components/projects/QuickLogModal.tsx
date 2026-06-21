"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";

interface QuickLogModalProps {
  projectId: string;
  projectName: string;
  projectEmoji: string | null;
}

function ScoreRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">
        {label}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-7 h-7 text-xs font-mono rounded-sm transition-colors ${
              n === value
                ? "bg-teal text-base font-bold"
                : n < value
                ? "bg-teal/15 text-teal"
                : "bg-raised text-muted hover:text-bright"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickLogModal({
  projectId,
  projectName,
  projectEmoji,
}: QuickLogModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    what_i_did: "",
    what_is_blocked: "",
    next_action: "",
    momentum_score: 7,
    energy_spent: 3,
  });

  const close = () => {
    setOpen(false);
    setForm({ what_i_did: "", what_is_blocked: "", next_action: "", momentum_score: 7, energy_spent: 3 });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.what_i_did.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("project_updates").insert({
      project_id: projectId,
      date: todayISO(),
      what_i_did: form.what_i_did.trim(),
      what_is_blocked: form.what_is_blocked.trim() || null,
      next_action: form.next_action.trim() || null,
      momentum_score: form.momentum_score,
      energy_spent: form.energy_spent,
    });

    setSaving(false);
    if (!error) {
      close();
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-muted hover:text-teal border border-line hover:border-teal rounded transition-colors"
      >
        <Zap className="w-3 h-3" />
        Log
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-md bg-card border border-line rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <span className="text-base">{projectEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                  Log Update
                </p>
                <p className="text-sm text-bright font-medium truncate">{projectName}</p>
              </div>
              <button onClick={close} className="text-muted hover:text-bright">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
                  What I did <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.what_i_did}
                  onChange={(e) => setForm((f) => ({ ...f, what_i_did: e.target.value }))}
                  placeholder="Describe what you worked on..."
                  required
                  className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted resize-none focus:outline-none focus:border-teal transition-colors font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
                  What&apos;s blocked
                </label>
                <textarea
                  rows={2}
                  value={form.what_is_blocked}
                  onChange={(e) => setForm((f) => ({ ...f, what_is_blocked: e.target.value }))}
                  placeholder="Any blockers or dependencies?"
                  className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted resize-none focus:outline-none focus:border-warn transition-colors font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
                  Next action
                </label>
                <input
                  type="text"
                  value={form.next_action}
                  onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
                  placeholder="The one thing to do next..."
                  className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted focus:outline-none focus:border-teal transition-colors font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ScoreRow
                  label="Momentum"
                  value={form.momentum_score}
                  max={10}
                  onChange={(v) => setForm((f) => ({ ...f, momentum_score: v }))}
                />
                <ScoreRow
                  label="Energy spent"
                  value={form.energy_spent}
                  max={5}
                  onChange={(v) => setForm((f) => ({ ...f, energy_spent: v }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-1.5 text-xs font-mono text-muted hover:text-bright transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.what_i_did.trim() || saving}
                  className="px-4 py-1.5 bg-teal text-base text-xs font-mono font-medium rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {saving ? "Saving…" : "Log Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
