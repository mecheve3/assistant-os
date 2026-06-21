import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { CarMaintenanceWidget } from "@/components/life/CarMaintenanceWidget";
import { formatDateDMY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarPage() {
  const today = new Date().toISOString().split("T")[0];

  const [{ data: tasks }, { data: carLogs }, { data: carWashChore }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "home_car")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("car_maintenance_log")
      .select("*")
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("*")
      .eq("is_chore", true)
      .or("title.ilike.%car wash%,title.ilike.%car%")
      .not("status", "in", '("done")')
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const washOverdue = carWashChore?.next_due_date && carWashChore.next_due_date < today;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Home &amp; Daily Life
        </p>
        <h1 className="text-xl font-semibold text-bright">Car Maintenance</h1>
        <p className="text-sm text-muted mt-1">Car wash schedule, maintenance log, and vehicle tasks.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Car wash status */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            Next Car Wash
          </p>
          {carWashChore ? (
            <>
              <p className={`text-xl font-mono font-bold mb-0.5 ${washOverdue ? "text-danger" : "text-bright"}`}>
                {carWashChore.next_due_date
                  ? formatDateDMY(carWashChore.next_due_date)
                  : "Not scheduled"}
              </p>
              {washOverdue && (
                <p className="text-xs text-danger">⚠ Overdue — schedule a wash</p>
              )}
              {!washOverdue && (
                <p className="text-xs text-muted">Complete in Tasks to reset timer.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted/50">
              Add a &quot;car wash&quot; chore in Tasks to track this automatically.
            </p>
          )}
        </div>

        {/* Maintenance log */}
        <CarMaintenanceWidget
          initialLogs={
            (carLogs ?? []) as {
              id: string;
              date: string;
              description: string;
              cost: number | null;
              created_at: string;
            }[]
          }
        />
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="home_car"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
