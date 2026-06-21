import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";

export const dynamic = "force-dynamic";

export default async function FoodPage() {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("life_area", "health_food")
    .not("status", "in", '("done")')
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Health &amp; Wellness
        </p>
        <h1 className="text-xl font-semibold text-bright">Food</h1>
        <p className="text-sm text-muted mt-1">Meal planning, nutrition goals, and dietary tracking.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Placeholder */}
        <div className="bg-card border border-line border-dashed rounded-lg p-4 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
              Nutrition Tracking
            </p>
            <span className="text-[9px] font-mono text-muted/40 bg-raised px-1.5 py-0.5 rounded">Phase 10</span>
          </div>
          <p className="text-xs text-muted/50">
            Calorie tracking, macro goals, and meal logs coming in Phase 10.
          </p>
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="health_food"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
