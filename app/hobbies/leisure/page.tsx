import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { LeisureLogWidget } from "@/components/life/LeisureLogWidget";

export const dynamic = "force-dynamic";

export default async function LeisurePage() {
  const [{ data: tasks }, { data: entries }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "hobby_leisure")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("leisure_log")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const counts = {
    book: (entries ?? []).filter((e: Record<string, unknown>) => e.type === "book").length,
    movie: (entries ?? []).filter((e: Record<string, unknown>) => e.type === "movie").length,
    restaurant: (entries ?? []).filter((e: Record<string, unknown>) => e.type === "restaurant").length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Hobbies
        </p>
        <h1 className="text-xl font-semibold text-bright">Books, Movies &amp; Restaurants</h1>
        <p className="text-sm text-muted mt-1">Track what you&apos;ve read, watched, and experienced.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Stats */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">Logged</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">📚 Books</span>
              <span className="text-sm font-mono font-bold text-bright">{counts.book}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">🎬 Movies</span>
              <span className="text-sm font-mono font-bold text-bright">{counts.movie}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">🍽 Restaurants</span>
              <span className="text-sm font-mono font-bold text-bright">{counts.restaurant}</span>
            </div>
          </div>
        </div>

        {/* Log widget — spans 2 cols */}
        <div className="sm:col-span-2">
          <LeisureLogWidget
            initialEntries={
              (entries ?? []) as {
                id: string;
                type: "book" | "movie" | "restaurant";
                title: string;
                rating: number | null;
                notes: string | null;
                created_at: string;
              }[]
            }
          />
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="hobby_leisure"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
