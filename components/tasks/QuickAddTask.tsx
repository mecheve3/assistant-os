"use client";

import { useState } from "react";
import { Project } from "@/types";
import { DatePicker } from "@/components/shared/DatePicker";

export interface AddTaskData {
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "inbox" | "today";
  project_id?: string | null;
  due_date?: string | null;
  recurring?: boolean;
  recurrence_frequency?: string | null;
  life_area?: string | null;
}

const PRIORITIES = [
  { value: "urgent", label: "U", title: "Urgent", color: "text-danger bg-danger/10 border-danger/30" },
  { value: "high",   label: "H", title: "High",   color: "text-warn bg-warn/10 border-warn/30" },
  { value: "medium", label: "M", title: "Medium", color: "text-info bg-info/10 border-info/30" },
  { value: "low",    label: "L", title: "Low",    color: "text-muted bg-raised border-transparent" },
];

const FREQUENCIES = [
  { value: "daily",    label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly",  label: "Monthly" },
];

interface Props {
  projects: Pick<Project, "id" | "name" | "emoji">[];
  onAdd: (data: AddTaskData) => Promise<void>;
}

export function QuickAddTask({ projects, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<AddTaskData["priority"]>("medium");
  const [status, setStatus] = useState<"inbox" | "today">("inbox");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    await onAdd({
      title: title.trim(),
      priority,
      status,
      project_id: projectId || null,
      due_date: dueDate || null,
      recurring,
      recurrence_frequency: recurring ? recurrenceFrequency : null,
    });

    setTitle("");
    setDueDate("");
    setProjectId("");
    setRecurring(false);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-line rounded-lg p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task..."
          className="flex-1 bg-transparent text-sm text-bright placeholder:text-muted focus:outline-none"
        />

        {/* Priority buttons */}
        <div className="flex items-center gap-0.5">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.title}
              onClick={() => setPriority(p.value as AddTaskData["priority"])}
              className={[
                "w-6 h-6 rounded border text-[10px] font-mono font-bold transition-colors",
                priority === p.value ? p.color : "text-muted/40 border-transparent hover:text-muted",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Status pill toggle */}
        <div className="flex rounded border border-line overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setStatus("inbox")}
            className={[
              "px-2 py-1 text-[10px] font-mono transition-colors",
              status === "inbox"
                ? "bg-teal text-base"
                : "bg-raised text-muted hover:text-bright",
            ].join(" ")}
          >
            Inbox
          </button>
          <button
            type="button"
            onClick={() => setStatus("today")}
            className={[
              "px-2 py-1 text-[10px] font-mono border-l border-line transition-colors",
              status === "today"
                ? "bg-teal text-base"
                : "bg-raised text-muted hover:text-bright",
            ].join(" ")}
          >
            Today
          </button>
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-3 py-1.5 bg-teal text-base text-xs font-mono font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          {saving ? "..." : "Add"}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-line space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
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
              <label className="text-[10px] font-mono text-muted block mb-1">Due Date</label>
              <DatePicker value={dueDate} onChange={setDueDate} className="w-full" />
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-teal"
              />
              <span className="text-[10px] font-mono text-muted select-none">Recurring</span>
            </label>

            {recurring && (
              <select
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value)}
                className="bg-raised border border-line rounded px-2 py-1 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}

            {recurring && (
              <span className="text-[10px] font-mono text-ai">
                ↻ Will regenerate automatically
              </span>
            )}
          </div>
        </div>
    </form>
  );
}
