import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Goal, Project } from "@/types";
import { GoalCard } from "@/components/goals/GoalCard";
import { AddGoalForm } from "@/components/goals/AddGoalForm";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = ["financial", "health", "project", "personal", "learning"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financial",
  health: "Health",
  project: "Projects",
  personal: "Personal",
  learning: "Learning",
};

export default async function GoalsPage() {
  const [{ data: goals }, { data: projects }] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .order("target_date", { ascending: true, nullsFirst: false }),
    supabase.from("projects").select("id,name,emoji").neq("stage", "killed").order("name"),
  ]);

  const allGoals = (goals ?? []) as Goal[];
  const allProjects = (projects ?? []) as Pick<Project, "id" | "name" | "emoji">[];
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  const grouped: Record<string, Goal[]> = {};
  for (const goal of allGoals) {
    const cat = goal.category ?? "personal";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(goal);
  }

  const activeCount = allGoals.filter((g) => g.status === "active").length;
  const achievedCount = allGoals.filter((g) => g.status === "achieved").length;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-xl font-semibold text-bright">Goals</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-[10px] font-mono text-muted mb-0.5">Active</p>
            <p className="text-lg font-mono font-bold text-bright">{activeCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono text-muted mb-0.5">Achieved</p>
            <p className="text-lg font-mono font-bold text-teal">{achievedCount}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl space-y-8">
        {CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).map((cat) => (
          <div key={cat}>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[cat].map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  projectName={goal.project_id ? (projectMap.get(goal.project_id)?.name ?? null) : null}
                  projects={allProjects}
                />
              ))}
            </div>
          </div>
        ))}

        {allGoals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-1">No goals yet</p>
            <p className="text-xs text-muted/50">Add your first goal below</p>
          </div>
        )}

        <AddGoalForm projects={allProjects} />
      </div>
    </div>
  );
}
