"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Habit, HabitLog } from "@/types";
import { isDueOn } from "@/lib/habits";

// ─── Exact display order for fixed habits ─────────────────────────────────────

const HABIT_ORDER = [
  "Charge headphones",
  "Check email",
  "Check calendar",
  "Crypto bot report",
  "Check news",
  "Call mom",
  "Gym workout",
  "Protein + creatine shake",
  "30 min learning block",
];

function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    const ai = HABIT_ORDER.indexOf(a.name);
    const bi = HABIT_ORDER.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  initialSkippedIds: string[];
  today: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnhancedHabits({
  initialHabits,
  initialLogs,
  initialSkippedIds,
  today,
}: Props) {
  const [habits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set(initialSkippedIds));
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Re-fetch today's skips on mount to catch any that didn't arrive via SSR
  useEffect(() => {
    supabase
      .from("habit_skips")
      .select("habit_id")
      .eq("date", today)
      .then(({ data, error }) => {
        if (error) {
          console.error("[habit_skips] fetch error:", error);
          return;
        }
        if (data) {
          setSkippedIds(new Set(data.map((r: { habit_id: string }) => r.habit_id)));
        }
      });
  }, [today]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingVariable, setAddingVariable] = useState<Set<string>>(new Set());

  // Build today's log index
  const todayLogMap = new Map<string, HabitLog>();
  for (const log of logs) {
    if (log.date === today) todayLogMap.set(log.habit_id, log);
  }

  const todayJS = new Date();

  // Fixed habits: is_variable != true
  const fixedHabits = habits.filter((h) => h.is_variable !== true);
  // Variable habits: is_variable === true
  const variableHabits = habits.filter((h) => h.is_variable === true);

  // Fixed habits due today, excluding skipped ones
  const fixedDueToday = fixedHabits.filter(
    (h) => isDueOn(h, todayJS) && !skippedIds.has(h.id)
  );

  // Variable habits scheduled for today (log with scheduled_for_today=true)
  const scheduledVariable = variableHabits.filter((h) => {
    const log = todayLogMap.get(h.id);
    return log?.scheduled_for_today === true;
  });

  // Variable habits NOT yet scheduled today (for dropdown)
  const availableVariable = variableHabits.filter((h) => {
    const log = todayLogMap.get(h.id);
    return !log?.scheduled_for_today;
  });

  // Habits to display
  const habitsToShow = [...sortHabits(fixedDueToday), ...scheduledVariable];

  // Count done today
  const doneCount =
    fixedDueToday.filter((h) => todayLogMap.get(h.id)?.completed).length +
    scheduledVariable.filter((h) => todayLogMap.get(h.id)?.completed).length;
  const totalToday = habitsToShow.length;

  const toggle = useCallback(
    async (habit: Habit) => {
      if (toggling.has(habit.id)) return;
      setToggling((s) => new Set(s).add(habit.id));

      const existing = todayLogMap.get(habit.id);
      if (existing) {
        const newCompleted = !existing.completed;
        setLogs((prev) =>
          prev.map((l) => (l.id === existing.id ? { ...l, completed: newCompleted } : l))
        );
        await supabase
          .from("habit_logs")
          .update({ completed: newCompleted })
          .eq("id", existing.id);
      } else {
        const { data: inserted } = await supabase
          .from("habit_logs")
          .insert({ habit_id: habit.id, date: today, completed: true })
          .select()
          .single();
        if (inserted) setLogs((prev) => [...prev, inserted as HabitLog]);
      }

      setToggling((s) => {
        const next = new Set(s);
        next.delete(habit.id);
        return next;
      });
    },
    [toggling, todayLogMap, today]
  );

  const skipForToday = useCallback(
    async (habit: Habit) => {
      // Optimistic update
      setSkippedIds((prev) => new Set([...prev, habit.id]));
      const { error } = await supabase
        .from("habit_skips")
        .upsert({ habit_id: habit.id, date: today }, { onConflict: "habit_id,date" });
      if (error) {
        console.error("[habit_skips] insert error:", error);
        // Rollback optimistic update
        setSkippedIds((prev) => {
          const next = new Set(prev);
          next.delete(habit.id);
          return next;
        });
      }
    },
    [today]
  );

  const scheduleVariable = useCallback(
    async (habit: Habit) => {
      if (addingVariable.has(habit.id)) return;
      setAddingVariable((s) => new Set(s).add(habit.id));

      const { data: inserted } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, date: today, completed: false, scheduled_for_today: true })
        .select()
        .single();
      if (inserted) setLogs((prev) => [...prev, inserted as HabitLog]);

      setAddingVariable((s) => {
        const next = new Set(s);
        next.delete(habit.id);
        return next;
      });
      setShowDropdown(false);
    },
    [addingVariable, today]
  );

  const removeVariableToday = useCallback(
    async (habit: Habit) => {
      const log = todayLogMap.get(habit.id);
      if (!log) return;
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      await supabase.from("habit_logs").delete().eq("id", log.id);
    },
    [todayLogMap]
  );

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Habits</p>
          <span className="text-[10px] font-mono text-muted/60">
            {doneCount}/{totalToday}
          </span>
        </div>

        {availableVariable.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-mono text-muted hover:text-teal transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add today&apos;s habits
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-line rounded-lg shadow-lg py-1 min-w-[160px]">
                  {availableVariable.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => scheduleVariable(h)}
                      disabled={addingVariable.has(h.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-bright hover:bg-raised/60 transition-colors disabled:opacity-40"
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Habit rows */}
      <div className="space-y-1">
        {habitsToShow.map((habit) => {
          const log = todayLogMap.get(habit.id);
          const done = log?.completed ?? false;
          const isVariable = habit.is_variable === true;

          return (
            <div key={habit.id} className="flex items-center gap-2 group py-0.5">
              <button
                onClick={() => toggle(habit)}
                disabled={toggling.has(habit.id)}
                className={[
                  "w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                  done ? "bg-teal border-teal" : "border-line hover:border-teal",
                ].join(" ")}
              >
                {done && <Check className="w-2.5 h-2.5 text-base" />}
              </button>

              <span
                className={`flex-1 text-xs truncate ${
                  done ? "line-through text-muted/50" : "text-bright"
                }`}
              >
                {habit.name}
              </span>

              {/* Variable habit: ✕ removes the log for today */}
              {isVariable && !done && (
                <button
                  onClick={() => removeVariableToday(habit)}
                  title="Remove from today"
                  className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Fixed habit: ✕ skips for today (only when not done) */}
              {!isVariable && !done && (
                <button
                  onClick={() => skipForToday(habit)}
                  title="Skip today"
                  className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-muted transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {habitsToShow.length === 0 && (
          <p className="text-xs text-muted/50 font-mono text-center py-4">
            No habits due today.
          </p>
        )}
      </div>
    </div>
  );
}
