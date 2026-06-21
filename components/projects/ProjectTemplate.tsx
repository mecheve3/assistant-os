"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    placeholder: "What is this project? What problem does it solve?",
  },
  {
    id: "goals",
    label: "Goals",
    placeholder: "What does success look like? Key milestones and targets…",
  },
  {
    id: "notes",
    label: "Notes",
    placeholder: "Research, ideas, references, learnings, decisions…",
  },
  {
    id: "next_steps",
    label: "Next Steps",
    placeholder: "What needs to happen next? Blockers, decisions, immediate actions…",
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

interface Props {
  projectId: string;
  initialNotes: Record<SectionId, string>;
}

export function ProjectTemplate({ projectId, initialNotes }: Props) {
  const [content, setContent] = useState<Record<SectionId, string>>(initialNotes);
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    overview: true,
    goals: true,
    notes: true,
    next_steps: true,
  });
  const [saving, setSaving] = useState<Record<SectionId, boolean>>({
    overview: false,
    goals: false,
    notes: false,
    next_steps: false,
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const save = useCallback(
    async (section: SectionId, value: string) => {
      setSaving((prev) => ({ ...prev, [section]: true }));
      await supabase.from("project_notes").upsert(
        {
          project_id: projectId,
          section,
          content: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,section" }
      );
      setSaving((prev) => ({ ...prev, [section]: false }));
    },
    [projectId]
  );

  const handleChange = (section: SectionId, value: string) => {
    setContent((prev) => ({ ...prev, [section]: value }));
    clearTimeout(timers.current[section]);
    timers.current[section] = setTimeout(() => save(section, value), 500);
  };

  const handleBlur = (section: SectionId, value: string) => {
    clearTimeout(timers.current[section]);
    save(section, value);
  };

  const toggle = (section: SectionId) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-raised/40">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Project Notes
        </p>
      </div>

      <div className="divide-y divide-line/40">
        {SECTIONS.map((s) => {
          const isOpen = expanded[s.id];
          const isSaving = saving[s.id];

          return (
            <div key={s.id}>
              <button
                onClick={() => toggle(s.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-raised/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted/60" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
                  )}
                  <span className="text-sm font-medium text-bright">{s.label}</span>
                </div>
                {isSaving && (
                  <span className="text-[9px] font-mono text-muted/40">saving…</span>
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  <textarea
                    value={content[s.id]}
                    onChange={(e) => handleChange(s.id, e.target.value)}
                    onBlur={(e) => handleBlur(s.id, e.target.value)}
                    placeholder={s.placeholder}
                    rows={4}
                    className="w-full bg-base border border-line/60 rounded px-3 py-2 text-sm text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal/50 resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
