"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Habit, HabitLog } from "@/types";
import { isDueOn } from "@/lib/habits";

interface Props {
  habits: Habit[];
  todayLogs: HabitLog[];
  today: string;
}

export function TodayHabits({ habits, todayLogs, today }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(todayLogs.filter((l) => l.completed).map((l) => l.habit_id))
  );
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = async (habit: Habit) => {
    if (loading) return;
    const done = completedIds.has(habit.id);
    setLoading(habit.id);

    // Optimistic update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (done) next.delete(habit.id);
      else next.add(habit.id);
      return next;
    });

    if (done) {
      await supabase
        .from("habit_logs")
        .update({ completed: false })
        .eq("habit_id", habit.id)
        .eq("date", today);
    } else {
      await supabase.from("habit_logs").upsert(
        { habit_id: habit.id, date: today, completed: true },
        { onConflict: "habit_id,date" }
      );
    }

    setLoading(null);
  };

  const todayDateObj = new Date();
  const dueHabits = habits.filter((h) => isDueOn(h, todayDateObj));
  const doneCount = dueHabits.filter((h) => completedIds.has(h.id)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Habits Today
        </p>
        <span className="text-xs font-mono">
          <span
            className={
              doneCount === dueHabits.length && dueHabits.length > 0
                ? "text-teal"
                : "text-bright"
            }
          >
            {doneCount}
          </span>
          <span className="text-muted">/{dueHabits.length}</span>
        </span>
      </div>

      {dueHabits.length === 0 && (
        <p className="text-xs text-muted font-mono text-center py-3">
          No habits due today
        </p>
      )}

      <div className="space-y-1.5">
        {dueHabits.map((habit) => {
          const isDone = completedIds.has(habit.id);
          const isLoading = loading === habit.id;

          return (
            <button
              key={habit.id}
              onClick={() => toggle(habit)}
              disabled={!!loading}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                isDone
                  ? "bg-teal/10 border-teal/25 text-teal"
                  : "bg-raised border-line text-muted hover:text-bright hover:border-line/60"
              } ${isLoading ? "opacity-60" : ""}`}
            >
              <div
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  isDone ? "bg-teal border-teal" : "border-muted/40"
                }`}
              >
                {isDone && (
                  <svg className="w-2.5 h-2.5 text-base" fill="none" viewBox="0 0 10 10">
                    <path
                      d="M1.5 5l2.5 2.5 4.5-4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className={`text-xs flex-1 truncate ${isDone ? "line-through opacity-60" : ""}`}>
                {habit.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
