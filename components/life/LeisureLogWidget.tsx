"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateDMY } from "@/lib/utils";

interface LeisureEntry {
  id: string;
  type: "book" | "movie" | "restaurant";
  title: string;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  initialEntries: LeisureEntry[];
}

const TYPE_EMOJI: Record<string, string> = {
  book: "📚",
  movie: "🎬",
  restaurant: "🍽",
};

const TYPE_FILTERS = ["all", "book", "movie", "restaurant"] as const;

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="text-[11px] text-warn">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export function LeisureLogWidget({ initialEntries }: Props) {
  const [entries, setEntries] = useState<LeisureEntry[]>(initialEntries);
  const [form, setForm] = useState<{
    type: "book" | "movie" | "restaurant";
    title: string;
    rating: string;
    notes: string;
  }>({ type: "movie", title: "", rating: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<typeof TYPE_FILTERS[number]>("all");

  const save = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("leisure_log")
      .insert({
        type: form.type,
        title: form.title.trim(),
        rating: form.rating ? parseInt(form.rating) : null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();
    if (data) setEntries((prev) => [data as LeisureEntry, ...prev]);
    setForm({ type: "movie", title: "", rating: "", notes: "" });
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("leisure_log").delete().eq("id", id);
  };

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Log</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-[10px] font-mono text-muted hover:text-teal transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Entry"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 p-3 bg-raised rounded-lg border border-line">
          <div className="grid grid-cols-3 gap-2">
            {(["book", "movie", "restaurant"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={[
                  "py-1.5 rounded text-xs font-mono border transition-colors",
                  form.type === t
                    ? "bg-teal/20 text-teal border-teal/40"
                    : "bg-base text-muted border-line hover:border-muted",
                ].join(" ")}
              >
                {TYPE_EMOJI[t]} {t}
              </button>
            ))}
          </div>
          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright focus:outline-none focus:border-teal"
            >
              <option value="">No rating</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
            />
          </div>
          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className="w-full py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Log Entry"}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={[
              "px-2 py-1 rounded text-[10px] font-mono transition-colors",
              filter === t ? "bg-teal/15 text-teal" : "text-muted/50 hover:text-muted",
            ].join(" ")}
          >
            {t === "all" ? "All" : `${TYPE_EMOJI[t]} ${t}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted/50 font-mono text-center py-4">Nothing logged yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 group py-2 border-b border-line/30 last:border-0">
              <span className="text-base shrink-0">{TYPE_EMOJI[entry.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bright">{entry.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Stars rating={entry.rating} />
                  <span className="text-[9px] font-mono text-muted/40">
                    {formatDateDMY(entry.created_at.split("T")[0])}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted/60 mt-0.5">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => remove(entry.id)}
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
