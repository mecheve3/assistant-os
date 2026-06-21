"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Project } from "@/types";
import { DatePicker } from "@/components/shared/DatePicker";

const CATEGORIES = [
  { value: "financial", label: "Financial" },
  { value: "health", label: "Health" },
  { value: "project", label: "Project" },
  { value: "personal", label: "Personal" },
  { value: "learning", label: "Learning" },
];

interface Props {
  projects: Pick<Project, "id" | "name" | "emoji">[];
}

export function AddGoalForm({ projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("financial");
  const [targetDate, setTargetDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    await supabase.from("goals").insert({
      title: title.trim(),
      category,
      target_date: targetDate || null,
      target_value: targetValue ? parseFloat(targetValue) : null,
      current_value: 0,
      unit: unit.trim() || null,
      project_id: projectId || null,
      description: description.trim() || null,
      status: "active",
    });

    setTitle("");
    setCategory("financial");
    setTargetDate("");
    setTargetValue("");
    setUnit("");
    setProjectId("");
    setDescription("");
    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-raised/30 transition-colors text-left"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          {open ? "▲ Cancel" : "+ Add Goal"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-line p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              autoFocus
              className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-2 text-sm font-mono text-bright focus:outline-none focus:border-teal"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Target Date</label>
              <DatePicker value={targetDate} onChange={setTargetDate} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Target Value</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full bg-raised border border-line rounded px-2 py-2 text-sm font-mono text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="COP, USD, days, %…"
                className="w-full bg-raised border border-line rounded px-2 py-2 text-sm font-mono text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">
              Project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-raised border border-line rounded px-2 py-2 text-sm font-mono text-bright focus:outline-none focus:border-teal"
            >
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Context or motivation…"
              className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-[10px] font-mono text-muted hover:text-bright transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 bg-teal text-base text-[10px] font-mono font-semibold rounded hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Add Goal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
