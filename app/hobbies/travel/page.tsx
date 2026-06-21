import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { TravelWishlistWidget } from "@/components/life/TravelWishlistWidget";

export const dynamic = "force-dynamic";

export default async function TravelPage() {
  const [{ data: tasks }, { data: wishlist }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "hobby_travel")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("travel_wishlist")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const planned = (wishlist ?? []).filter((t: Record<string, unknown>) => t.status !== "done" && t.status !== "wishlist");
  const done = (wishlist ?? []).filter((t: Record<string, unknown>) => t.status === "done");

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Hobbies
        </p>
        <h1 className="text-xl font-semibold text-bright">Travel</h1>
        <p className="text-sm text-muted mt-1">Trip wishlist, planned adventures, and travel notes.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Stats */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">Overview</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Wishlist</span>
              <span className="text-sm font-mono font-bold text-bright">
                {(wishlist ?? []).filter((t: Record<string, unknown>) => t.status === "wishlist").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Planned/Booked</span>
              <span className="text-sm font-mono font-bold text-info">{planned.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Completed</span>
              <span className="text-sm font-mono font-bold text-teal">{done.length}</span>
            </div>
          </div>
        </div>

        {/* Wishlist widget — spans 2 cols */}
        <div className="sm:col-span-2">
          <TravelWishlistWidget
            initialItems={
              (wishlist ?? []) as {
                id: string;
                destination: string;
                target_date: string | null;
                notes: string | null;
                status: string;
                created_at: string;
              }[]
            }
          />
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="hobby_travel"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
