import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types";
import { timeAgo, formatDateDMY } from "@/lib/utils";
import { QuickLogModal } from "@/components/projects/QuickLogModal";
import { ShowInactiveToggle } from "@/components/projects/ShowInactiveToggle";

export const dynamic = "force-dynamic";

// ─── Sub-components (server-safe) ─────────────────────────────────────────────

const STAGE_STYLES: Record<string, string> = {
  idea: "text-muted bg-raised border border-line",
  validation: "text-info bg-info/10",
  building: "text-ai bg-ai/10",
  revenue: "text-teal bg-teal/10",
  scaling: "text-teal bg-teal/20",
  paused: "text-warn bg-warn/10",
  killed: "text-danger bg-danger/10",
};

function StagePill({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm ${
        STAGE_STYLES[stage] ?? "text-muted bg-raised"
      }`}
    >
      {stage}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface LatestUpdate {
  project_id: string;
  date: string;
  next_action: string | null;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ showInactive?: string }>;
}) {
  const { showInactive } = await searchParams;
  const showingInactive = showInactive === "1";

  const [projectsResult, updatesResult] = await Promise.all([
    showingInactive
      ? supabase.from("projects").select("*").order("name")
      : supabase.from("projects").select("*").eq("inactive", false).order("name"),
    supabase
      .from("project_updates")
      .select("project_id, date, next_action")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const allProjects: Project[] = projectsResult.data ?? [];
  const activeProjects = allProjects.filter((p) => !p.inactive);
  const inactiveProjects = allProjects.filter((p) => p.inactive);
  // For summary stats, only count active projects
  const projects = activeProjects;
  const allUpdates: LatestUpdate[] = updatesResult.data ?? [];

  // Latest update per project (data is already sorted desc)
  const latestByProject = new Map<string, LatestUpdate>();
  for (const u of allUpdates) {
    if (!latestByProject.has(u.project_id)) {
      latestByProject.set(u.project_id, u);
    }
  }

  // Stage counts for summary bar
  const stageCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});

  const summaryParts = Object.entries(stageCounts)
    .filter(([stage]) => !["paused", "killed"].includes(stage))
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            Portfolio
          </p>
          <h1 className="text-xl font-semibold text-bright">Projects HQ</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary bar */}
          <div className="flex items-center gap-2 text-xs font-mono text-muted hidden sm:flex">
            <span className="text-bright font-medium">
              {projects.length} projects
            </span>
            {summaryParts.map(([stage, count]) => (
              <span key={stage}>
                <span className="text-muted mx-1">·</span>
                <span
                  className={
                    stage === "revenue" || stage === "scaling"
                      ? "text-teal"
                      : stage === "building"
                      ? "text-ai"
                      : stage === "validation"
                      ? "text-info"
                      : "text-muted"
                  }
                >
                  {count}
                </span>{" "}
                {stage}
              </span>
            ))}
          </div>
          <ShowInactiveToggle showingInactive={showingInactive} />
        </div>
      </div>

      {/* Active projects table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-line">
              {["Project", "Stage", "Next Action", "Last Update", ""].map((col) => (
                <th
                  key={col}
                  className={`text-left pb-3 pr-4 text-[10px] font-mono uppercase tracking-widest text-muted font-normal ${
                    col === "Next Action" ? "hidden lg:table-cell" : ""
                  } ${col === "Last Update" ? "hidden md:table-cell" : ""}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeProjects.map((project) => {
              const update = latestByProject.get(project.id) ?? null;
              return (
                <tr key={project.id} className="border-b border-line/40 hover:bg-raised/30 transition-colors group">
                  <td className="py-3.5 pr-4">
                    <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5">
                      <span className="text-lg w-7 text-center shrink-0">{project.emoji}</span>
                      <span className="font-medium transition-colors text-sm text-bright group-hover:text-teal">
                        {project.name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3.5 pr-4"><StagePill stage={project.stage} /></td>
                  <td className="py-3.5 pr-4 hidden lg:table-cell max-w-xs">
                    {update?.next_action ? (
                      <span className="text-bright text-xs">
                        {update.next_action.length > 70 ? `${update.next_action.slice(0, 70)}…` : update.next_action}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 hidden md:table-cell">
                    <span className={`text-xs font-mono ${update ? "text-muted" : "text-muted/50"}`}>
                      {update ? `${timeAgo(update.date)} · ${formatDateDMY(update.date)}` : "Never"}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <QuickLogModal projectId={project.id} projectName={project.name} projectEmoji={project.emoji} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inactive projects section — only when toggle is on */}
      {showingInactive && inactiveProjects.length > 0 && (
        <div className="mt-8 overflow-x-auto -mx-6 px-6">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted/50 mb-4 border-t border-line/40 pt-6">
            Inactive Projects
          </p>
          <table className="w-full min-w-[500px] opacity-50">
            <tbody>
              {inactiveProjects.map((project) => {
                const update = latestByProject.get(project.id) ?? null;
                return (
                  <tr key={project.id} className="border-b border-line/20 hover:bg-raised/20 transition-colors group">
                    <td className="py-3 pr-4">
                      <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5">
                        <span className="text-lg w-7 text-center shrink-0 grayscale">{project.emoji}</span>
                        <span className="font-medium text-sm text-muted group-hover:text-bright transition-colors">
                          {project.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-line/60 text-muted/60 uppercase tracking-wider">
                          inactive
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4"><StagePill stage={project.stage} /></td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <span className="text-muted/60 text-xs">
                        {update?.next_action ? update.next_action.slice(0, 60) : "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <span className="text-xs font-mono text-muted/50">{update ? timeAgo(update.date) : "Never"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
