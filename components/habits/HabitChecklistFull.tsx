"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Habit, HabitFrequency } from "@/types";
import { isDueOn, formatFrequency } from "@/lib/habits";
import { format } from "date-fns";

interface Props {
  habits: Habit[];
  todayCompleted: string[];
  streaks: Record<string, number>;
  monthlyScores: Record<string, number>;
}

const CATEGORY_ORDER = ["health", "productivity", "finance", "learning", "personal"];

const CATEGORIES = ["health", "productivity", "finance", "learning", "personal"] as const;

const FREQUENCIES: HabitFrequency[] = ["daily", "weekdays", "weekly", "bi-weekly", "monthly"];

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

export function HabitChecklistFull({ habits, todayCompleted, streaks, monthlyScores }: Props) {
  const router = useRouter();
  const todayDate = new Date();
  const [completed, setCompleted] = useState<Set<string>>(new Set(todayCompleted));
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFrequency, setEditFrequency] = useState<HabitFrequency>("daily");
  const [editFreqDays, setEditFreqDays] = useState<string[]>([]);
  const [editFreqDate, setEditFreqDate] = useState("");
  const [editStreak, setEditStreak] = useState("30");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setDeletingId(null);
    setEditName(habit.name);
    setEditCategory(habit.category ?? "health");
    setEditFrequency(habit.frequency);
    setEditFreqDays(habit.frequency_days ?? []);
    setEditFreqDate(String(habit.frequency_date ?? ""));
    setEditStreak(String(habit.target_streak ?? 30));
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    setEditSaving(true);
    await supabase
      .from("habits")
      .update({
        name: editName.trim(),
        category: editCategory,
        frequency: editFrequency,
        frequency_days: ["weekly", "bi-weekly"].includes(editFrequency)
          ? editFreqDays.length > 0 ? editFreqDays : null
          : null,
        frequency_date:
          editFrequency === "monthly" ? (parseInt(editFreqDate) || null) : null,
        target_streak: parseInt(editStreak) || 30,
      })
      .eq("id", editingId);
    setEditSaving(false);
    setEditingId(null);
    router.refresh();
  };

  const confirmDelete = async (habitId: string) => {
    setRemovedIds((prev) => new Set(prev).add(habitId));
    setDeletingId(null);
    await supabase.from("habit_logs").delete().eq("habit_id", habitId);
    await supabase.from("habits").delete().eq("id", habitId);
    router.refresh();
  };

  const toggle = async (habitId: string) => {
    if (toggling.has(habitId)) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const nowDone = !completed.has(habitId);

    setToggling((prev) => new Set(prev).add(habitId));
    setCompleted((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(habitId);
      else next.delete(habitId);
      return next;
    });

    if (nowDone) {
      await supabase
        .from("habit_logs")
        .upsert(
          { habit_id: habitId, date: todayStr, completed: true },
          { onConflict: "habit_id,date" }
        );
    } else {
      await supabase
        .from("habit_logs")
        .update({ completed: false })
        .eq("habit_id", habitId)
        .eq("date", todayStr);
    }

    setToggling((prev) => {
      const next = new Set(prev);
      next.delete(habitId);
      return next;
    });
    router.refresh();
  };

  const toggleDay = (day: string) => {
    setEditFreqDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const visibleHabits = habits.filter((h) => !removedIds.has(h.id));
  const dueToday = visibleHabits.filter((h) => isDueOn(h, todayDate));
  const notDueToday = visibleHabits.filter((h) => !isDueOn(h, todayDate));

  const grouped = dueToday.reduce<Record<string, Habit[]>>((acc, h) => {
    const cat = h.category ?? "personal";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(h);
    return acc;
  }, {});

  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);
  const doneCount = dueToday.filter((h) => completed.has(h.id)).length;

  const renderEditForm = (habit: Habit) => (
    <div className="mx-3 mb-2 p-3 bg-raised rounded-lg border border-teal/20 space-y-2">
      <div>
        <label className="text-[9px] font-mono text-muted block mb-1">Name</label>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          autoFocus
          className="w-full bg-card border border-line focus:border-teal rounded px-2 py-1.5 text-xs text-bright focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Category</label>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full bg-card border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Frequency</label>
          <select
            value={editFrequency}
            onChange={(e) => {
              setEditFrequency(e.target.value as HabitFrequency);
              setEditFreqDays([]);
              setEditFreqDate("");
            }}
            className="w-full bg-card border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {["weekly", "bi-weekly"].includes(editFrequency) && (
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Days</label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                  editFreqDays.includes(d.value)
                    ? "text-teal border-teal/40 bg-teal/10"
                    : "text-muted border-line hover:border-muted"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {editFrequency === "monthly" && (
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Day of month (1–31)</label>
          <input
            type="number"
            value={editFreqDate}
            onChange={(e) => setEditFreqDate(e.target.value)}
            min="1"
            max="31"
            placeholder="e.g. 15"
            className="w-full bg-card border border-line rounded px-2 py-1.5 text-xs font-mono text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
          />
        </div>
      )}
      <div>
        <label className="text-[9px] font-mono text-muted block mb-1">Target streak</label>
        <input
          type="number"
          value={editStreak}
          onChange={(e) => setEditStreak(e.target.value)}
          min="1"
          max="365"
          className="w-full bg-card border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancelEdit}
          className="text-[9px] font-mono text-muted hover:text-bright transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveEdit}
          disabled={editSaving || !editName.trim()}
          className="text-[9px] font-mono px-3 py-1 bg-teal text-base rounded hover:opacity-90 disabled:opacity-50"
        >
          {editSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );

  const renderHabitRow = (habit: Habit, isDue: boolean) => {
    const done = completed.has(habit.id);
    const streak = streaks[habit.id] ?? 0;
    const score = monthlyScores[habit.id] ?? 0;
    const isToggling = toggling.has(habit.id);
    const isEditing = editingId === habit.id;
    const isDeleting = deletingId === habit.id;

    return (
      <div key={habit.id} className="group">
        <div
          className={[
            "flex items-center gap-3 px-3 py-2.5 rounded transition-colors",
            isDue && !done ? "hover:bg-raised/60" : "",
            isDue && done ? "bg-teal/5" : "",
            !isDue ? "opacity-40" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Checkbox */}
          <button
            onClick={() => isDue && toggle(habit.id)}
            disabled={!isDue || isToggling}
            className={[
              "w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all",
              done ? "bg-teal border-teal" : "border-line",
              !isDue ? "cursor-default" : "",
            ].join(" ")}
          >
            {done && (
              <svg className="w-2.5 h-2.5 text-base" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5L4 7.5L8.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          {/* Name */}
          <span
            onClick={() => isDue && toggle(habit.id)}
            className={[
              "flex-1 text-sm cursor-pointer select-none",
              done ? "line-through text-muted" : isDue ? "text-bright" : "text-muted",
            ].join(" ")}
          >
            {habit.name}
            {!isDue && (
              <span className="ml-1.5 text-[9px] font-mono text-muted/40">
                {formatFrequency(habit)}
              </span>
            )}
          </span>

          {/* Streak */}
          {streak > 0 && isDue && (
            <span className="text-[10px] font-mono text-warn shrink-0">🔥{streak}d</span>
          )}

          {/* Monthly score */}
          {isDue && (
            <span
              className={`text-[10px] font-mono shrink-0 w-8 text-right ${
                score >= 80 ? "text-teal" : score >= 50 ? "text-warn" : "text-muted/60"
              }`}
            >
              {score}%
            </span>
          )}

          {/* Edit / Delete — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                isEditing ? cancelEdit() : startEdit(habit);
              }}
              className="text-[9px] font-mono text-muted/50 hover:text-teal transition-colors px-1 py-0.5"
              title="Edit"
            >
              ✎
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(isDeleting ? null : habit.id);
                setEditingId(null);
              }}
              className="text-[9px] font-mono text-muted/50 hover:text-danger transition-colors px-1 py-0.5"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Edit form */}
        {isEditing && renderEditForm(habit)}

        {/* Delete confirmation */}
        {isDeleting && (
          <div className="flex items-center gap-2 px-3 py-2 mx-3 mb-1 bg-danger/5 border border-danger/20 rounded-lg">
            <span className="text-[10px] font-mono text-danger flex-1">
              Delete &ldquo;{habit.name}&rdquo;?
            </span>
            <button
              onClick={() => confirmDelete(habit.id)}
              className="text-[9px] font-mono px-2 py-1 bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20"
            >
              Delete
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="text-[9px] font-mono text-muted hover:text-bright px-2 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Today&apos;s Checklist
        </p>
        <span className="text-xs font-mono text-bright">
          {doneCount}/{dueToday.length}
        </span>
      </div>

      {visibleHabits.length === 0 && (
        <p className="text-xs text-muted text-center py-8">No habits yet. Add one below.</p>
      )}

      {/* Due today — grouped by category */}
      {sortedCategories.map((cat) => (
        <div key={cat} className="mb-4 last:mb-0">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted/50 mb-1.5 px-1">
            {cat}
          </p>
          <div className="space-y-0.5">
            {grouped[cat].map((habit) => renderHabitRow(habit, true))}
          </div>
        </div>
      ))}

      {/* Not due today */}
      {notDueToday.length > 0 && (
        <div className="mt-4 pt-3 border-t border-line/40">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted/30 mb-1.5 px-1">
            Not Due Today
          </p>
          <div className="space-y-0.5">
            {notDueToday.map((habit) => renderHabitRow(habit, false))}
          </div>
        </div>
      )}
    </div>
  );
}
