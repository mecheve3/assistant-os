import { supabase } from "@/lib/supabase";
import { Habit, HabitLog } from "@/types";
import { isDueOn } from "@/lib/habits";
import { format, subDays, startOfMonth, eachDayOfInterval } from "date-fns";
import { HabitChecklistFull } from "@/components/habits/HabitChecklistFull";
import { WeekGrid } from "@/components/habits/WeekGrid";
import { AddHabitForm } from "@/components/habits/AddHabitForm";
import { SyncToCalendarButton } from "@/components/shared/SyncToCalendarButton";

export const dynamic = "force-dynamic";

function computeStreak(habit: Habit, logs: HabitLog[]): number {
  const completedDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.date)
  );

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 90; i++) {
    const d = subDays(today, i);
    const dateStr = format(d, "yyyy-MM-dd");

    if (!isDueOn(habit, d)) continue;

    // Today not done yet — don't break streak
    if (i === 0 && !completedDates.has(dateStr)) continue;

    if (completedDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function computeMonthlyScore(habit: Habit, logs: HabitLog[]): number {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: today });

  const completedDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.date)
  );

  let applicable = 0;
  let completed = 0;

  for (const day of days) {
    if (!isDueOn(habit, day)) continue;
    applicable++;
    if (completedDates.has(format(day, "yyyy-MM-dd"))) completed++;
  }

  if (applicable === 0) return 100;
  return Math.round((completed / applicable) * 100);
}

export default async function HabitsPage() {
  const todayDate = new Date();
  const todayStr = format(todayDate, "yyyy-MM-dd");
  const since = format(subDays(todayDate, 90), "yyyy-MM-dd");

  const { data: gcToken } = await supabase
    .from("oauth_tokens")
    .select("provider")
    .eq("user_id", "miguel")
    .eq("provider", "google")
    .maybeSingle();
  const calendarConnected = !!gcToken;

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from("habits").select("*").eq("active", true).order("category").order("name"),
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false }),
  ]);

  const allHabits = (habits ?? []) as Habit[];
  const allLogs = (logs ?? []) as HabitLog[];

  const todayCompleted = new Set(
    allLogs.filter((l) => l.date === todayStr && l.completed).map((l) => l.habit_id)
  );

  const streaks: Record<string, number> = {};
  const monthlyScores: Record<string, number> = {};
  for (const habit of allHabits) {
    streaks[habit.id] = computeStreak(habit, allLogs);
    monthlyScores[habit.id] = computeMonthlyScore(habit, allLogs);
  }

  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(todayDate, 6 - i), "yyyy-MM-dd")
  );

  const dueHabits = allHabits.filter((h) => isDueOn(h, todayDate));
  const todayScore =
    dueHabits.length === 0
      ? 0
      : Math.round(
          (dueHabits.filter((h) => todayCompleted.has(h.id)).length / dueHabits.length) * 100
        );

  const overallMonthly =
    allHabits.length === 0
      ? 0
      : Math.round(
          Object.values(monthlyScores).reduce((s, v) => s + v, 0) / allHabits.length
        );

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            {format(todayDate, "EEEE, MMMM d")}
          </p>
          <h1 className="text-xl font-semibold text-bright">Habits</h1>
        </div>
        <div className="flex items-center gap-5">
          <SyncToCalendarButton calendarConnected={calendarConnected} mode="habits" />
          <div className="text-center">
            <p className="text-[10px] font-mono text-muted mb-0.5">Today</p>
            <p
              className={`text-lg font-mono font-bold ${
                todayScore >= 80
                  ? "text-teal"
                  : todayScore >= 50
                  ? "text-warn"
                  : "text-danger"
              }`}
            >
              {todayScore}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono text-muted mb-0.5">This Month</p>
            <p
              className={`text-lg font-mono font-bold ${
                overallMonthly >= 80
                  ? "text-teal"
                  : overallMonthly >= 50
                  ? "text-warn"
                  : "text-danger"
              }`}
            >
              {overallMonthly}%
            </p>
          </div>
        </div>
      </div>

      {/* Add Habit — prominent at top */}
      <div className="mb-4">
        <AddHabitForm />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <HabitChecklistFull
          habits={allHabits}
          todayCompleted={Array.from(todayCompleted)}
          streaks={streaks}
          monthlyScores={monthlyScores}
        />
        <WeekGrid habits={allHabits} logs={allLogs} last7={last7} />
      </div>
    </div>
  );
}
