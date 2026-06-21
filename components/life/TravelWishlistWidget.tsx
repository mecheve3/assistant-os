"use client";

import { useState } from "react";
import { Trash2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TripItem {
  id: string;
  destination: string;
  target_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Props {
  initialItems: TripItem[];
}

const STATUS_COLORS: Record<string, string> = {
  wishlist: "text-muted/60 bg-raised",
  planned: "text-info bg-info/10",
  booked: "text-teal bg-teal/10",
  done: "text-muted/40 bg-raised line-through",
};

export function TravelWishlistWidget({ initialItems }: Props) {
  const [items, setItems] = useState<TripItem[]>(initialItems);
  const [form, setForm] = useState({ destination: "", target_date: "", notes: "", status: "wishlist" });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (!form.destination.trim() || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("travel_wishlist")
      .insert({
        destination: form.destination.trim(),
        target_date: form.target_date || null,
        notes: form.notes.trim() || null,
        status: form.status,
      })
      .select()
      .single();
    if (data) setItems((prev) => [data as TripItem, ...prev]);
    setForm({ destination: "", target_date: "", notes: "", status: "wishlist" });
    setShowForm(false);
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await supabase.from("travel_wishlist").update({ status }).eq("id", id);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("travel_wishlist").delete().eq("id", id);
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Trip Wishlist
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-[10px] font-mono text-muted hover:text-teal transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Destination"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-2 p-3 bg-raised rounded-lg border border-line">
          <input
            autoFocus
            type="text"
            value={form.destination}
            onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
            placeholder="Destination *"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright focus:outline-none focus:border-teal font-mono"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="bg-base border border-line rounded px-2 py-1.5 text-xs text-bright focus:outline-none focus:border-teal"
            >
              <option value="wishlist">Wishlist</option>
              <option value="planned">Planned</option>
              <option value="booked">Booked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)"
            className="w-full bg-base border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
          />
          <button
            onClick={save}
            disabled={saving || !form.destination.trim()}
            className="w-full py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Add to Wishlist"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted/50 font-mono text-center py-4">No trips planned yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 group py-2 border-b border-line/30 last:border-0">
              <MapPin className="w-3.5 h-3.5 text-muted/50 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm text-bright ${item.status === "done" ? "line-through text-muted/50" : ""}`}>
                    {item.destination}
                  </p>
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[item.status] ?? "text-muted bg-raised"}`}
                  >
                    <option value="wishlist">Wishlist</option>
                    <option value="planned">Planned</option>
                    <option value="booked">Booked</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                {item.target_date && (
                  <p className="text-[10px] font-mono text-muted/50 mt-0.5">{item.target_date}</p>
                )}
                {item.notes && (
                  <p className="text-xs text-muted/60 mt-0.5">{item.notes}</p>
                )}
              </div>
              <button
                onClick={() => remove(item.id)}
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
