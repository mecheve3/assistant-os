import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { ResourcesWidget } from "@/components/life/ResourcesWidget";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const [{ data: tasks }, { data: resources }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "growth_resources")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Personal Growth
        </p>
        <h1 className="text-xl font-semibold text-bright">Resources</h1>
        <p className="text-sm text-muted mt-1">Links, articles, tools, and references worth keeping.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <ResourcesWidget
          initialResources={
            (resources ?? []) as {
              id: string;
              title: string;
              url: string | null;
              note: string | null;
              category: string | null;
              created_at: string;
            }[]
          }
        />
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="growth_resources"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
