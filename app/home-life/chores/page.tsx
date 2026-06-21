import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ChoresClient, Chore } from "@/components/life/ChoresClient";

export const dynamic = "force-dynamic";

export default async function ChoresPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: chores } = await supabase
    .from("chores")
    .select("*")
    .eq("active", true)
    .order("next_due_date", { ascending: true });

  const allChores = (chores ?? []) as Chore[];
  const dueNowCount = allChores.filter((c) => c.next_due_date <= todayStr).length;
  const upcomingCount = allChores.filter((c) => c.next_due_date > todayStr).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Home &amp; Daily Life
        </p>
        <h1 className="text-xl font-semibold text-bright">Household Chores</h1>
        <p className="text-sm text-muted mt-1">
          {dueNowCount > 0 ? (
            <span className="text-danger font-medium">{dueNowCount} due today</span>
          ) : (
            <span>All clear</span>
          )}
          {upcomingCount > 0 && (
            <span className="text-muted/60"> · {upcomingCount} upcoming this week</span>
          )}
        </p>
      </div>

      <ChoresClient initialChores={allChores} todayStr={todayStr} />
    </div>
  );
}
