import type { ProjectStage } from "@/types";

const PIPELINE: { key: ProjectStage; label: string }[] = [
  { key: "idea", label: "Idea" },
  { key: "validation", label: "Validate" },
  { key: "building", label: "Build" },
  { key: "revenue", label: "Revenue" },
  { key: "scaling", label: "Scale" },
];

const SPECIAL_STAGES: Partial<Record<ProjectStage, { color: string; label: string }>> = {
  paused: { color: "text-warn", label: "This project is paused." },
  killed: { color: "text-danger", label: "This project has been killed." },
};

interface StagePipelineProps {
  currentStage: ProjectStage;
}

export function StagePipeline({ currentStage }: StagePipelineProps) {
  const pipelineIndex = PIPELINE.findIndex((s) => s.key === currentStage);
  const isSpecial = currentStage in SPECIAL_STAGES;

  return (
    <div>
      <div className={`flex items-center ${isSpecial ? "opacity-30" : ""}`}>
        {PIPELINE.map((stage, i) => {
          const isPast = pipelineIndex >= 0 && i < pipelineIndex;
          const isCurrent = stage.key === currentStage;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`h-px flex-1 min-w-4 mx-1 ${
                    isPast || isCurrent ? "bg-teal/50" : "bg-line"
                  }`}
                />
              )}

              {/* Stage node */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                    isCurrent
                      ? "bg-teal border-teal"
                      : isPast
                      ? "bg-teal/30 border-teal/40"
                      : "bg-transparent border-line"
                  }`}
                />
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider whitespace-nowrap ${
                    isCurrent
                      ? "text-teal font-bold"
                      : isPast
                      ? "text-muted"
                      : "text-muted/40"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {isSpecial && (
        <p
          className={`mt-2 text-xs font-mono ${
            SPECIAL_STAGES[currentStage]?.color ?? "text-muted"
          }`}
        >
          ⚠ {SPECIAL_STAGES[currentStage]?.label}
        </p>
      )}
    </div>
  );
}
