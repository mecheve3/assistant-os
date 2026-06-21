import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ParkingLotClient } from "@/components/parking-lot/ParkingLotClient";
import { ParkingLotItem, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function ParkingLotPage() {
  const [{ data: unprocessed }, { data: processed }, { data: projects }] = await Promise.all([
    supabase
      .from("parking_lot")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("parking_lot")
      .select("*")
      .eq("processed", true)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("projects").select("id,name,emoji").neq("stage", "killed").order("name"),
  ]);

  const unprocessedCount = unprocessed?.length ?? 0;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-xl font-semibold text-bright">Parking Lot</h1>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-mono text-muted mb-0.5">Unprocessed</p>
          <p className={`text-lg font-mono font-bold ${unprocessedCount > 0 ? "text-warn" : "text-teal"}`}>
            {unprocessedCount}
          </p>
        </div>
      </div>

      <ParkingLotClient
        unprocessedItems={(unprocessed ?? []) as ParkingLotItem[]}
        processedItems={(processed ?? []) as ParkingLotItem[]}
        projects={(projects ?? []) as Pick<Project, "id" | "name" | "emoji">[]}
      />
    </div>
  );
}
