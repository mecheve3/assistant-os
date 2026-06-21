import { supabase } from "@/lib/supabase";
import { format, subDays, differenceInDays, parseISO } from "date-fns";
import { WeeklyReviewFlow } from "@/components/weekly-review/WeeklyReviewFlow";
import { SyncToCalendarButton } from "@/components/shared/SyncToCalendarButton";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage() {
  const today = new Date();
  const weekAgoDate = format(subDays(today, 7), "yyyy-MM-dd");
  const threeDaysAgo = subDays(today, 3).toISOString();

  const { data: gcToken } = await supabase
    .from("oauth_tokens")
    .select("provider")
    .eq("user_id", "miguel")
    .eq("provider", "google")
    .maybeSingle();
  const calendarConnected = !!gcToken;

  const [
    { data: habits },
    { data: habitLogs },
    { data: completedTasks },
    { data: stalledTasksRaw },
    { data: projects },
    { data: projectUpdates },
    { data: weekTransactions },
    { data: debts },
    { data: lastReview },
  ] = await Promise.all([
    supabase.from("habits").select("id").eq("active", true),
    supabase.from("habit_logs").select("completed").gte("date", weekAgoDate),
    supabase
      .from("tasks")
      .select("id")
      .eq("status", "done")
      .gte("completed_at", subDays(today, 7).toISOString()),
    supabase
      .from("tasks")
      .select("id, title, created_at")
      .in("status", ["today", "in_progress"])
      .lte("created_at", threeDaysAgo),
    supabase
      .from("projects")
      .select("id, name, emoji, stage")
      .neq("stage", "killed")
      .order("name"),
    supabase
      .from("project_updates")
      .select("project_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("finances_transactions")
      .select("amount, type, currency")
      .gte("date", weekAgoDate),
    supabase.from("finances_debts").select("name, current_balance, currency").eq("active", true),
    supabase
      .from("weekly_reviews")
      .select("week_start_date")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Step 1: habit completion %
  const habitCount = habits?.length ?? 0;
  const expectedLogs = habitCount * 7;
  const completedLogs = (habitLogs ?? []).filter((l) => l.completed).length;
  const habitCompletionPct =
    expectedLogs > 0 ? Math.round((completedLogs / expectedLogs) * 100) : 0;

  // Step 1: tasks completed + projects active this week
  const tasksCompletedCount = completedTasks?.length ?? 0;

  const latestByProject = new Map<string, string>();
  for (const u of projectUpdates ?? []) {
    if (!latestByProject.has(u.project_id)) latestByProject.set(u.project_id, u.created_at as string);
  }
  const weekAgoISO = subDays(today, 7).toISOString();
  const projectsUpdatedCount = [...latestByProject.values()].filter(
    (ts) => ts >= weekAgoISO
  ).length;

  // Step 2: stalled tasks
  const stalledTasks = (stalledTasksRaw ?? []).map((t) => ({
    id: t.id,
    title: t.title as string,
    daysSinceCreated: differenceInDays(today, parseISO(t.created_at as string)),
  }));

  // Step 3: projects with stall info
  const projectsWithStall = (projects ?? []).map((p) => {
    const lastUpdateTimestamp = latestByProject.get(p.id) ?? null;
    const lastUpdateDate = lastUpdateTimestamp ? lastUpdateTimestamp.split("T")[0] : null;
    const daysSinceUpdate = lastUpdateTimestamp
      ? differenceInDays(today, parseISO(lastUpdateTimestamp))
      : null;
    return {
      id: p.id,
      name: p.name as string,
      emoji: p.emoji as string | null,
      stage: p.stage as string,
      lastUpdateDate,
      daysSinceUpdate,
    };
  });

  // Step 4: week finances
  const USD_RATE = Number(process.env.USD_TO_COP_RATE ?? "4200");
  const weekIncome = (weekTransactions ?? [])
    .filter((t) => t.type === "income")
    .reduce(
      (s, t) => s + (t.currency === "USD" ? (t.amount as number) * USD_RATE : (t.amount as number)),
      0
    );
  const weekExpenses = (weekTransactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce(
      (s, t) => s + (t.currency === "USD" ? (t.amount as number) * USD_RATE : (t.amount as number)),
      0
    );

  const context = {
    habitCompletionPct,
    tasksCompletedCount,
    projectsUpdatedCount,
    stalledTasks,
    projects: projectsWithStall,
    weekIncome,
    weekExpenses,
    debtBalances: (debts ?? []).map((d) => ({
      name: d.name as string,
      current_balance: d.current_balance as number,
      currency: d.currency as string,
    })),
    lastReviewDate: lastReview?.week_start_date ?? null,
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-xl font-semibold text-bright">Weekly Review</h1>
        </div>
        <SyncToCalendarButton calendarConnected={calendarConnected} mode="review" />
      </div>

      <div className="max-w-2xl">
        <WeeklyReviewFlow context={context} />
      </div>
    </div>
  );
}
