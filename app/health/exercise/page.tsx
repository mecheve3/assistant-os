import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { format, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ExercisePage() {
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [{ data: tasks }, { data: weekLogs }, { data: healthHabits }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "health_exercise")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_logs")
      .select("*, habits(name, category)")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .eq("completed", true),
    supabase.from("habits").select("*").eq("category", "health").eq("active", true),
  ]);

  // Count completed health habit logs this week
  const healthHabitIds = new Set((healthHabits ?? []).map((h: Record<string, unknown>) => h.id));
  const workoutsThisWeek = (weekLogs ?? []).filter(
    (l: Record<string, unknown>) => healthHabitIds.has(l.habit_id)
  ).length;

  // Find streak for the first health habit
  const primaryHabit = (healthHabits ?? [])[0] as Record<string, unknown> | undefined;
  let streakDays = 0;
  if (primaryHabit) {
    const { data: recentLogs } = await supabase
      .from("habit_logs")
      .select("date, completed")
      .eq("habit_id", primaryHabit.id)
      .eq("completed", true)
      .order("date", { ascending: false })
      .limit(60);

    if (recentLogs && recentLogs.length > 0) {
      const logDates = new Set(recentLogs.map((l: Record<string, unknown>) => l.date as string));
      const d = new Date();
      for (let i = 0; i < 60; i++) {
        const ds = format(d, "yyyy-MM-dd");
        if (logDates.has(ds)) { streakDays++; } else if (i > 0) { break; }
        d.setDate(d.getDate() - 1);
      }
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Health &amp; Wellness
        </p>
        <h1 className="text-xl font-semibold text-bright">Exercise</h1>
        <p className="text-sm text-muted mt-1">Track workouts, gym sessions, and physical activity.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Workouts this week */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            This Week&apos;s Workouts
          </p>
          <p className="text-3xl font-mono font-bold text-bright mb-0.5">{workoutsThisWeek}</p>
          <p className="text-xs text-muted">completed health habit logs</p>
        </div>

        {/* Streak */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            Current Streak
          </p>
          {primaryHabit ? (
            <>
              <p className="text-3xl font-mono font-bold text-warn mb-0.5">🔥 {streakDays}d</p>
              <p className="text-xs text-muted">{String(primaryHabit.name)}</p>
            </>
          ) : (
            <p className="text-xs text-muted/50 font-mono">No health habits configured yet.</p>
          )}
        </div>

        {/* Active health habits */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            Health Habits
          </p>
          <p className="text-3xl font-mono font-bold text-teal mb-0.5">{(healthHabits ?? []).length}</p>
          <p className="text-xs text-muted">active habits in category</p>
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="health_exercise"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
