import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { NotesWidget } from "@/components/life/NotesWidget";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const [{ data: tasks }, { data: notes }, { data: learningHabits }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "growth_learning")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("habits")
      .select("*")
      .eq("category", "learning")
      .eq("active", true),
  ]);

  const hasLearningHabit = (learningHabits ?? []).length > 0;
  const primaryHabit = (learningHabits ?? [])[0] as Record<string, unknown> | undefined;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Personal Growth
        </p>
        <h1 className="text-xl font-semibold text-bright">Learning</h1>
        <p className="text-sm text-muted mt-1">Courses, books, skills, and knowledge building.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Learning streak widget */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            Learning Habit
          </p>
          {hasLearningHabit ? (
            <>
              <p className="text-sm text-bright mb-0.5">{String(primaryHabit?.name)}</p>
              <p className="text-xs text-muted">Track it via the Habits widget on the dashboard.</p>
            </>
          ) : (
            <p className="text-xs text-muted/50">
              Add a &quot;learning&quot; category habit on the dashboard to track your daily learning streak.
            </p>
          )}
        </div>

        {/* Notes — takes up 2 cols */}
        <div className="lg:col-span-2">
          <NotesWidget
            table="learning_notes"
            initialNotes={(notes ?? []) as { id: string; content: string; created_at: string }[]}
            placeholder="What did you learn today?"
            label="Learning Journal"
          />
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="growth_learning"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
