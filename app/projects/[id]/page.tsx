import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Project, Task } from "@/types";
import { ProjectKanban } from "@/components/projects/ProjectKanban";
import { ProjectTemplate } from "@/components/projects/ProjectTemplate";

export const dynamic = "force-dynamic";

const STAGE_STYLES: Record<string, string> = {
  idea: "text-muted bg-raised border border-line",
  validation: "text-info bg-info/10",
  building: "text-ai bg-ai/10",
  revenue: "text-teal bg-teal/10",
  scaling: "text-teal bg-teal/20",
  paused: "text-warn bg-warn/10",
  killed: "text-danger bg-danger/10",
};

type SectionId = "overview" | "goals" | "notes" | "next_steps";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projectResult, tasksResult, notesResult] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("project_notes")
      .select("section, content")
      .eq("project_id", id),
  ]);

  const project: Project | null = projectResult.data;
  if (!project) notFound();

  const tasks: Task[] = tasksResult.data ?? [];

  const notesMap: Record<SectionId, string> = {
    overview: "",
    goals: "",
    notes: "",
    next_steps: "",
  };

  for (const note of (notesResult.data ?? []) as { section: string; content: string | null }[]) {
    if (note.section in notesMap) {
      notesMap[note.section as SectionId] = note.content ?? "";
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-bright transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All projects
      </Link>

      {/* Inactive banner */}
      {project.inactive && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-warn/5 border border-warn/25 rounded-lg">
          <span className="text-warn text-base">⏸</span>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-warn">
              Inactive Project
            </p>
            <p className="text-xs text-muted/70 mt-0.5">
              This project is archived and not shown in active views.
            </p>
          </div>
        </div>
      )}

      {/* Project header */}
      <div
        className="rounded-lg p-4 border border-line"
        style={{ borderLeftColor: project.color_hex ?? undefined, borderLeftWidth: 3 }}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">{project.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-bright">{project.name}</h1>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm ${
                  STAGE_STYLES[project.stage] ?? "text-muted bg-raised"
                }`}
              >
                {project.stage}
              </span>
              <span className="text-[10px] font-mono text-muted bg-raised px-2 py-0.5 rounded-sm">
                {project.category.replace("_", " ")}
              </span>
            </div>
            {project.description && (
              <p className="text-muted text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Project Kanban */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">Tasks</p>
        <ProjectKanban projectId={project.id} initialTasks={tasks} />
      </div>

      {/* Project Notes (Notion-style template) */}
      <ProjectTemplate projectId={project.id} initialNotes={notesMap} />
    </div>
  );
}
