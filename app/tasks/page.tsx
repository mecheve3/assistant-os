import { supabase } from "@/lib/supabase";
import { Task, Project } from "@/types";
import { format } from "date-fns";
import { TasksClient } from "@/components/tasks/TasksClient";
import { SyncToCalendarButton } from "@/components/shared/SyncToCalendarButton";

export const dynamic = "force-dynamic";

function shouldRegenerateToday(
  freq: string | null,
  completedAt: string,
  dow: number
): boolean {
  const f = freq ?? "daily";
  const completedDate = new Date(completedAt);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (f) {
    case "daily":    return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekly":   return daysSince >= 7;
    case "biweekly": return daysSince >= 14;
    case "monthly":
      return (
        now.getFullYear() > completedDate.getFullYear() ||
        now.getMonth() > completedDate.getMonth()
      );
    default:         return true;
  }
}

export default async function TasksPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const dow = new Date().getDay();

  // Regenerate recurring tasks that were completed before today
  const { data: doneRecurring } = await supabase
    .from("tasks")
    .select("id, recurrence_frequency, completed_at")
    .eq("recurring", true)
    .eq("status", "done");

  const toRegen = (doneRecurring ?? []).filter((t) => {
    if (!t.completed_at) return false;
    const completedDay = t.completed_at.split("T")[0];
    if (completedDay >= today) return false;
    return shouldRegenerateToday(t.recurrence_frequency, t.completed_at, dow);
  });

  if (toRegen.length > 0) {
    await supabase
      .from("tasks")
      .update({ status: "today", completed_at: null })
      .in("id", toRegen.map((t) => t.id));
  }

  // Fix 6: Auto-archive done tasks older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: toArchive } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "done")
    .is("archived_at", null)
    .lt("updated_at", twentyFourHoursAgo);

  if ((toArchive ?? []).length > 0) {
    await supabase
      .from("tasks")
      .update({ archived_at: new Date().toISOString() })
      .in("id", (toArchive ?? []).map((t: { id: string }) => t.id));
  }

  // Fix 7: Auto-promote overdue inbox tasks to Today
  const { data: overdueInbox } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "inbox")
    .lte("due_date", today)
    .is("archived_at", null);

  if ((overdueInbox ?? []).length > 0) {
    await supabase
      .from("tasks")
      .update({ status: "today" })
      .in("id", (overdueInbox ?? []).map((t: { id: string }) => t.id));
  }

  // Check Google Calendar connection
  const { data: gcToken } = await supabase
    .from("oauth_tokens")
    .select("provider")
    .eq("user_id", "miguel")
    .eq("provider", "google")
    .maybeSingle();
  const calendarConnected = !!gcToken;

  // Auto-surface parked chores whose next_due_date has arrived
  const { data: dueChores } = await supabase
    .from("tasks")
    .select("id")
    .eq("is_chore", true)
    .eq("status", "parked")
    .lte("next_due_date", today);

  if ((dueChores ?? []).length > 0) {
    await supabase
      .from("tasks")
      .update({ status: "inbox" })
      .in("id", (dueChores ?? []).map((t) => t.id));
  }

  // Fetch all active tasks + recent done (non-archived) + archived
  const [{ data: openTasks }, { data: doneTasks }, { data: archivedTasks }, { data: projects }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .in("status", ["inbox", "today", "in_progress", "parked"])
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "done")
      .is("archived_at", null)
      .order("completed_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(50),
    supabase.from("projects").select("id,name,emoji").order("name"),
  ]);

  const allOpen = (openTasks ?? []) as Task[];
  const allDone = (doneTasks ?? []) as Task[];
  const allArchived = (archivedTasks ?? []) as Task[];
  const allProjects = (projects ?? []) as Pick<Project, "id" | "name" | "emoji">[];

  const todayTasks = allOpen.filter(
    (t) => (t.status === "today" || t.status === "in_progress") && !t.is_chore
  );
  const inboxTasks = allOpen.filter((t) => t.status === "inbox" && !t.is_chore);
  const parkedTasks = allOpen.filter((t) => t.status === "parked" && !t.is_chore);
  const choreTasks = allOpen.filter((t) => t.is_chore && t.status !== "parked");

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-xl font-semibold text-bright">Tasks</h1>
        </div>
        <SyncToCalendarButton calendarConnected={calendarConnected} mode="tasks" />
      </div>

      <TasksClient
        todayTasks={todayTasks}
        inboxTasks={inboxTasks}
        parkedTasks={parkedTasks}
        doneTasks={allDone}
        choreTasks={choreTasks}
        archivedTasks={allArchived}
        projects={allProjects}
        calendarConnected={calendarConnected}
      />
    </div>
  );
}
