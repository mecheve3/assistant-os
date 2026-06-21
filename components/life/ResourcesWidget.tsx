"use client";

import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Resource {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
  category: string | null;
  created_at: string;
}

interface Props {
  initialResources: Resource[];
}

export function ResourcesWidget({ initialResources }: Props) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [form, setForm] = useState({ title: "", url: "", note: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("resources")
      .insert({
        title: form.title.trim(),
        url: form.url.trim() || null,
        note: form.note.trim() || null,
        category: form.category.trim() || null,
      })
      .select()
      .single();
    if (data) setResources((prev) => [data as Resource, ...prev]);
    setForm({ title: "", url: "", note: "", category: "" });
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("resources").delete().eq("id", id);
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Saved Resources
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-[10px] font-mono text-muted hover:text-teal transition-colors"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 p-3 bg-raised rounded-lg border border-line">
          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
          />
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="URL (optional)"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal font-mono text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Category"
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
            />
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Note"
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
            />
          </div>
          <button
            onClick={save}
            disabled={saving || !form.title.trim()}
            className="w-full py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Save Resource"}
          </button>
        </div>
      )}

      {resources.length === 0 ? (
        <p className="text-xs text-muted/50 font-mono text-center py-4">No resources saved yet.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-start gap-2 group py-2 border-b border-line/30 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-bright truncate">{r.title}</p>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal hover:text-teal/70 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {r.category && (
                  <span className="text-[9px] font-mono text-muted/50 bg-raised px-1.5 py-0.5 rounded">
                    {r.category}
                  </span>
                )}
                {r.note && <p className="text-xs text-muted/70 mt-0.5 truncate">{r.note}</p>}
              </div>
              <button
                onClick={() => remove(r.id)}
                className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all shrink-0 mt-0.5"
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
