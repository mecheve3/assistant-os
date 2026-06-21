import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { ShoppingListWidget } from "@/components/life/ShoppingListWidget";
import { differenceInDays, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const [{ data: tasks }, { data: shoppingList }, { data: lastGrocery }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "home_shopping")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("shopping_list")
      .select("*")
      .order("bought")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("completed_at")
      .eq("life_area", "home_shopping")
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const daysSinceGrocery = lastGrocery?.completed_at
    ? differenceInDays(new Date(), parseISO(lastGrocery.completed_at))
    : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Home &amp; Daily Life
        </p>
        <h1 className="text-xl font-semibold text-bright">Shopping &amp; Groceries</h1>
        <p className="text-sm text-muted mt-1">Shopping list, grocery runs, and purchase tracking.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Grocery run status */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
            Grocery Run
          </p>
          {daysSinceGrocery === null ? (
            <p className="text-xs text-muted/60 mb-3">No grocery run recorded yet.</p>
          ) : (
            <p className={`text-2xl font-mono font-bold mb-1 ${daysSinceGrocery > 7 ? "text-warn" : "text-teal"}`}>
              {daysSinceGrocery}d ago
            </p>
          )}
          <p className="text-[10px] text-muted/60 mb-3">
            {daysSinceGrocery != null && daysSinceGrocery > 7 ? "⚠ Overdue — run needed" : "Mark grocery task done in the task list to update."}
          </p>
        </div>

        {/* Shopping list */}
        <ShoppingListWidget
          initialItems={
            (shoppingList ?? []) as {
              id: string;
              item: string;
              bought: boolean;
              created_at: string;
            }[]
          }
        />
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="home_shopping"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
