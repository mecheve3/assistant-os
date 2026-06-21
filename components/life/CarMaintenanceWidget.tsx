"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateDMY, todayISO } from "@/lib/utils";

interface CarLog {
  id: string;
  date: string;
  description: string;
  cost: number | null;
  created_at: string;
}

interface Props {
  initialLogs: CarLog[];
}

export function CarMaintenanceWidget({ initialLogs }: Props) {
  const [logs, setLogs] = useState<CarLog[]>(initialLogs);
  const [form, setForm] = useState({ date: todayISO(), description: "", cost: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (!form.description.trim() || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("car_maintenance_log")
      .insert({
        date: form.date,
        description: form.description.trim(),
        cost: form.cost ? parseFloat(form.cost) : null,
      })
      .select()
      .single();
    if (data) setLogs((prev) => [data as CarLog, ...prev]);
    setForm({ date: todayISO(), description: "", cost: "" });
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("car_maintenance_log").delete().eq("id", id);
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Maintenance Log
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-[10px] font-mono text-muted hover:text-teal transition-colors"
        >
          {showForm ? "Cancel" : "+ Log"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 p-3 bg-raised rounded-lg border border-line">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-muted uppercase tracking-wider block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full bg-base border border-line rounded px-2 py-1.5 text-xs text-bright focus:outline-none focus:border-teal font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted uppercase tracking-wider block mb-1">Cost (COP)</label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="Optional"
                className="w-full bg-base border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
              />
            </div>
          </div>
          <input
            autoFocus
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="What was done? *"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
          />
          <button
            onClick={save}
            disabled={saving || !form.description.trim()}
            className="w-full py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Save Log Entry"}
          </button>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-muted/50 font-mono text-center py-4">No maintenance logged yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 group py-2 border-b border-line/30 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bright">{log.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted/60">{formatDateDMY(log.date)}</span>
                  {log.cost != null && (
                    <span className="text-[10px] font-mono text-warn">
                      ${log.cost.toLocaleString("es-CO")}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(log.id)}
                className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
