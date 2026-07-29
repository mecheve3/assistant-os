import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types";
import { ShowInactiveToggle } from "@/components/projects/ShowInactiveToggle";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ showInactive?: string }>;
}) {
  const { showInactive } = await searchParams;
  const showingInactive = showInactive === "1";

  const { data } = showingInactive
    ? await supabase.from("projects").select("*").order("name")
    : await supabase.from("projects").select("*").eq("inactive", false).order("name");

  const allProjects = (data ?? []) as Project[];
  const activeProjects = allProjects.filter((p) => !p.inactive);
  const inactiveProjects = allProjects.filter((p) => p.inactive);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
            Portfolio
          </p>
          <h1 className="text-xl font-semibold text-bright">Projects HQ</h1>
        </div>
        <ShowInactiveToggle showingInactive={showingInactive} />
      </div>

      <div className="space-y-0.5">
        {activeProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-raised/40 transition-colors group"
          >
            <span className="text-xl w-8 text-center shrink-0">{project.emoji}</span>
            <span className="text-sm text-bright group-hover:text-teal transition-colors font-medium">
              {project.name}
            </span>
            <span className="ml-auto text-muted/20 group-hover:text-teal text-xs transition-colors">
              →
            </span>
          </Link>
        ))}
      </div>

      {showingInactive && inactiveProjects.length > 0 && (
        <div className="mt-6 pt-6 border-t border-line/40">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted/50 mb-3">
            Inactive
          </p>
          <div className="space-y-0.5 opacity-50">
            {inactiveProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-raised/30 transition-colors group"
              >
                <span className="text-xl w-8 text-center shrink-0 grayscale">
                  {project.emoji}
                </span>
                <span className="text-sm text-muted group-hover:text-bright transition-colors">
                  {project.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
