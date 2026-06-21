import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { formatDateDMY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const [{ data: tasks }, { data: chores }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "home_maintenance")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("is_chore", true)
      .not("title", "ilike", "%car%")
      .not("title", "ilike", "%wash%")
      .not("status", "in", '("done")')
      .order("next_due_date", { ascending: true, nullsFirst: false }),
  ]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Home &amp; Daily Life
        </p>
        <h1 className="text-xl font-semibold text-bright">Home Maintenance</h1>
        <p className="text-sm text-muted mt-1">Household chores, repairs, and upkeep tasks.</p>
      </div>

      {/* Chores widget */}
      <div className="bg-card border border-line rounded-lg p-4 mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
          Recurring Chores
        </p>
        {(chores ?? []).length === 0 ? (
          <p className="text-xs text-muted/50 font-mono text-center py-4">
            No recurring chores found. Add them in Tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {(chores as Task[]).map((chore) => {
              const overdue = chore.next_due_date && chore.next_due_date < today;
              return (
                <div key={chore.id} className="flex items-center justify-between py-2 border-b border-line/30 last:border-0">
                  <div>
                    <p className="text-sm text-bright">{chore.title}</p>
                    <p className={`text-[10px] font-mono ${overdue ? "text-danger" : "text-muted/60"}`}>
                      {chore.next_due_date
                        ? `Next: ${formatDateDMY(chore.next_due_date)} ${overdue ? "⚠ OVERDUE" : ""}`
                        : "No due date set"}
                    </p>
                  </div>
                  {chore.chore_interval_days && (
                    <span className="text-[9px] font-mono text-muted/50 bg-raised px-1.5 py-0.5 rounded">
                      every {chore.chore_interval_days}d
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="home_maintenance"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
