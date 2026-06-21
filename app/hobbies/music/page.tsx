import { supabase } from "@/lib/supabase";
import { Task } from "@/types";
import { LifeAreaTaskList } from "@/components/life/LifeAreaTaskList";
import { NotesWidget } from "@/components/life/NotesWidget";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const [{ data: tasks }, { data: notes }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("life_area", "hobby_music")
      .not("status", "in", '("done")')
      .order("created_at", { ascending: false }),
    supabase
      .from("music_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Hobbies
        </p>
        <h1 className="text-xl font-semibold text-bright">Music</h1>
        <p className="text-sm text-muted mt-1">
          Your electronic music journey — DJ sets, production, gear notes.
        </p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Quick stats */}
        <div className="bg-card border border-line rounded-lg p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2">Journey</p>
          <p className="text-3xl font-mono font-bold text-bright mb-0.5">{(notes ?? []).length}</p>
          <p className="text-xs text-muted">session logs &amp; notes</p>
        </div>

        {/* Notes widget — spans 2 cols */}
        <div className="lg:col-span-2">
          <NotesWidget
            table="music_notes"
            initialNotes={(notes ?? []) as { id: string; content: string; created_at: string }[]}
            placeholder="Log a DJ set, production session, gear note, or idea…"
            label="Session Log"
          />
        </div>
      </div>

      {/* Task list */}
      <LifeAreaTaskList
        lifeArea="hobby_music"
        initialTasks={(tasks ?? []) as Task[]}
      />
    </div>
  );
}
