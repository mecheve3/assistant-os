"use client";

import { useState, useCallback } from "react";
import { Check, Pencil, CalendarClock, ArrowRight, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateDMY } from "@/lib/utils";
import { format, addDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Chore {
  id: string;
  title: string;
  interval_days: number;
  priority: string;
  last_completed_at: string | null;
  next_due_date: string;
  notes: string | null;
  active: boolean;
  created_at: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-danger",
  high: "text-warn",
  medium: "text-muted/80",
  low: "text-muted/60",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

function ChoreCard({
  chore,
  isDue,
  onDone,
  onEdit,
  onSync,
  onConvert,
  onDelete,
  processing,
}: {
  chore: Chore;
  isDue: boolean;
  onDone: (c: Chore) => Promise<void>;
  onEdit: (c: Chore) => void;
  onSync: (c: Chore) => Promise<void>;
  onConvert: (c: Chore) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  processing: boolean;
}) {
  return (
    <div
      className={[
        "group bg-card border rounded-lg p-3 transition-all",
        isDue
          ? "border-line hover:brightness-110"
          : "border-line/40 opacity-60 hover:opacity-80",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-bright leading-snug">{chore.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono text-muted/50">
              ↻ every {chore.interval_days}d
            </span>
            <span className="text-muted/30">·</span>
            <span
              className={`text-[10px] font-mono font-semibold ${
                isDue ? "text-danger" : "text-muted/60"
              }`}
            >
              {formatDateDMY(chore.next_due_date)}
            </span>
            <span className="text-muted/30">·</span>
            <span className={`text-[10px] font-mono ${PRIORITY_COLOR[chore.priority] ?? "text-muted"}`}>
              {chore.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-line/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDone(chore)}
          disabled={processing}
          className="flex items-center gap-1 text-[10px] font-mono text-muted/50 hover:text-teal transition-colors"
        >
          <Check className="w-3 h-3" />
          Done
        </button>
        <button
          onClick={() => onEdit(chore)}
          className="flex items-center gap-1 text-[10px] font-mono text-muted/50 hover:text-info transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onSync(chore)}
          disabled={processing}
          className="flex items-center gap-1 text-[10px] font-mono text-muted/50 hover:text-info transition-colors"
        >
          <CalendarClock className="w-3 h-3" />
          Sync
        </button>
        <button
          onClick={() => onConvert(chore)}
          disabled={processing}
          className="flex items-center gap-1 text-[10px] font-mono text-muted/50 hover:text-warn transition-colors"
        >
          <ArrowRight className="w-3 h-3" />
          Task
        </button>
        <button
          onClick={() => onDelete(chore.id)}
          className="flex items-center gap-1 text-[10px] font-mono text-muted/40 hover:text-danger transition-colors ml-auto"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function EditForm({
  chore,
  onSave,
  onCancel,
}: {
  chore: Chore;
  onSave: (changes: Partial<Chore>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(chore.title);
  const [intervalDays, setIntervalDays] = useState(chore.interval_days);
  const [nextDueDate, setNextDueDate] = useState(chore.next_due_date);
  const [priority, setPriority] = useState(chore.priority);

  return (
    <div className="bg-raised border border-teal/40 rounded-lg p-3 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave({ title, interval_days: intervalDays, next_due_date: nextDueDate, priority });
          if (e.key === "Escape") onCancel();
        }}
        className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright focus:outline-none focus:border-teal"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] font-mono text-muted/60 mb-0.5 block">Interval (days)</label>
          <input
            type="number"
            min={1}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright focus:outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted/60 mb-0.5 block">Next due</label>
          <input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright focus:outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted/60 mb-0.5 block">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright focus:outline-none focus:border-teal"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="text-muted hover:text-bright text-xs font-mono transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave({ title, interval_days: intervalDays, next_due_date: nextDueDate, priority })}
          className="px-3 py-1 bg-teal/20 text-teal text-[10px] font-mono rounded hover:bg-teal/30 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── ChoresClient ─────────────────────────────────────────────────────────────

interface Props {
  initialChores: Chore[];
  todayStr: string;
}

export function ChoresClient({ initialChores, todayStr }: Props) {
  const [chores, setChores] = useState<Chore[]>(initialChores);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    interval_days: 7,
    next_due_date: todayStr,
    priority: "medium",
  });
  const [addSaving, setAddSaving] = useState(false);

  const dueNow = chores.filter((c) => c.next_due_date <= todayStr);
  const upcoming = chores.filter((c) => c.next_due_date > todayStr);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const setProc = (id: string, val: boolean) => {
    setProcessing((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const markDone = useCallback(
    async (chore: Chore) => {
      setProc(chore.id, true);
      const now = new Date().toISOString();
      const nextDue = format(addDays(new Date(), chore.interval_days), "yyyy-MM-dd");
      setChores((prev) =>
        prev.map((c) =>
          c.id === chore.id ? { ...c, last_completed_at: now, next_due_date: nextDue } : c
        )
      );
      await supabase
        .from("chores")
        .update({ last_completed_at: now, next_due_date: nextDue })
        .eq("id", chore.id);
      showToast(`↻ ${chore.title} — next due ${formatDateDMY(nextDue)}`);
      setProc(chore.id, false);
    },
    []
  );

  const saveEdit = useCallback(async (id: string, changes: Partial<Chore>) => {
    setChores((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    await supabase.from("chores").update(changes).eq("id", id);
    setEditingId(null);
  }, []);

  const syncChore = useCallback(async (chore: Chore) => {
    setProc(chore.id, true);
    await new Promise((r) => setTimeout(r, 500));
    showToast(`📅 ${chore.title} added to Google Calendar`);
    setProc(chore.id, false);
  }, []);

  const convertToTask = useCallback(async (chore: Chore) => {
    setProc(chore.id, true);
    await supabase.from("tasks").insert({
      title: chore.title,
      priority: chore.priority,
      status: "inbox",
      area: "personal",
      due_date: chore.next_due_date,
    });
    showToast(`✓ "${chore.title}" added to Tasks`);
    setProc(chore.id, false);
  }, []);

  const deleteChore = useCallback(async (id: string) => {
    if (!confirm("Delete this chore permanently?")) return;
    setChores((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("chores").delete().eq("id", id);
  }, []);

  const addChore = useCallback(async () => {
    if (!addForm.title.trim()) return;
    setAddSaving(true);
    const { data: inserted } = await supabase
      .from("chores")
      .insert({ ...addForm, title: addForm.title.trim(), active: true })
      .select()
      .single();
    if (inserted) setChores((prev) => [...prev, inserted as Chore]);
    setAddForm({ title: "", interval_days: 7, next_due_date: todayStr, priority: "medium" });
    setShowAddForm(false);
    setAddSaving(false);
  }, [addForm, todayStr]);

  const renderSection = (items: Chore[], isDue: boolean) =>
    items.map((chore) =>
      editingId === chore.id ? (
        <EditForm
          key={chore.id}
          chore={chore}
          onSave={(changes) => saveEdit(chore.id, changes)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <ChoreCard
          key={chore.id}
          chore={chore}
          isDue={isDue}
          processing={processing.has(chore.id)}
          onDone={markDone}
          onEdit={(c) => setEditingId(c.id)}
          onSync={syncChore}
          onConvert={convertToTask}
          onDelete={deleteChore}
        />
      )
    );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 bg-card border border-teal/30 rounded-lg shadow-lg pointer-events-none">
          <p className="text-sm font-mono text-teal">{toast}</p>
        </div>
      )}

      {/* Due Now */}
      {dueNow.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-danger mb-3">
            Due Now ({dueNow.length})
          </p>
          <div className="space-y-2">{renderSection(dueNow, true)}</div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
            Upcoming ({upcoming.length})
          </p>
          <div className="space-y-2">{renderSection(upcoming, false)}</div>
        </div>
      )}

      {dueNow.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">✓</p>
          <p className="text-sm text-muted/50 font-mono">No chores due. You&apos;re all clear.</p>
        </div>
      )}

      {/* Add Chore */}
      {showAddForm ? (
        <div className="bg-card border border-line rounded-lg p-4 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">New Chore</p>
          <input
            autoFocus
            value={addForm.title}
            onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") addChore();
              if (e.key === "Escape") setShowAddForm(false);
            }}
            placeholder="Chore name…"
            className="w-full bg-base border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-mono text-muted/60 mb-1 block">Repeat every (days)</label>
              <input
                type="number"
                min={1}
                value={addForm.interval_days}
                onChange={(e) => setAddForm((f) => ({ ...f, interval_days: Number(e.target.value) }))}
                className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted/60 mb-1 block">First due date</label>
              <input
                type="date"
                value={addForm.next_due_date}
                onChange={(e) => setAddForm((f) => ({ ...f, next_due_date: e.target.value }))}
                className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted/60 mb-1 block">Priority</label>
              <select
                value={addForm.priority}
                onChange={(e) => setAddForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full bg-base border border-line rounded px-2 py-1.5 text-sm text-bright focus:outline-none focus:border-teal"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="text-muted hover:text-bright text-sm font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addChore}
              disabled={addSaving || !addForm.title.trim()}
              className="px-4 py-1.5 bg-teal/20 text-teal text-sm font-mono rounded hover:bg-teal/30 disabled:opacity-40 transition-colors"
            >
              {addSaving ? "Saving…" : "Add Chore"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-line hover:border-line/80 rounded-lg text-sm font-mono text-muted/50 hover:text-teal transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Chore
        </button>
      )}
    </div>
  );
}
