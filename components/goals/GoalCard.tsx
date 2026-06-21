"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Goal, Project } from "@/types";
import { differenceInDays, parseISO } from "date-fns";
import { DatePicker } from "@/components/shared/DatePicker";

const CATEGORY_COLOR: Record<string, string> = {
  financial: "#00d4aa",
  health: "#00d4aa",
  project: "#8b5cf6",
  personal: "#f59e0b",
  learning: "#3b82f6",
};

const STATUS_PILL: Record<string, string> = {
  active: "text-teal bg-teal/10",
  achieved: "text-info bg-info/10",
  dropped: "text-muted bg-raised",
};

const CATEGORIES = [
  { value: "financial", label: "Financial" },
  { value: "health", label: "Health" },
  { value: "project", label: "Project" },
  { value: "personal", label: "Personal" },
  { value: "learning", label: "Learning" },
];

interface Props {
  goal: Goal;
  projectName?: string | null;
  projects: Pick<Project, "id" | "name" | "emoji">[];
}

export function GoalCard({ goal, projectName, projects }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"view" | "update" | "edit">("view");

  useEffect(() => setMounted(true), []);

  const formatValue = (n: number) =>
    mounted ? n.toLocaleString("es-CO") : n.toString();
  const [displayValue, setDisplayValue] = useState(goal.current_value ?? 0);
  const [newValue, setNewValue] = useState(String(goal.current_value ?? 0));
  const [removed, setRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editCategory, setEditCategory] = useState<string>(goal.category ?? "financial");
  const [editTargetDate, setEditTargetDate] = useState(goal.target_date ?? "");
  const [editTargetValue, setEditTargetValue] = useState(String(goal.target_value ?? ""));
  const [editUnit, setEditUnit] = useState(goal.unit ?? "");
  const [editProjectId, setEditProjectId] = useState(goal.project_id ?? "");
  const [editStatus, setEditStatus] = useState<Goal["status"]>(goal.status);

  if (removed) return null;

  const pct =
    goal.target_value != null && goal.target_value > 0
      ? Math.min(100, Math.round((displayValue / goal.target_value) * 100))
      : null;

  const todayStr = new Date().toISOString().split("T")[0];
  const daysLeft =
    goal.target_date ? differenceInDays(parseISO(goal.target_date), parseISO(todayStr)) : null;

  const borderColor = CATEGORY_COLOR[goal.category ?? "financial"] ?? "#00d4aa";
  const barColor = CATEGORY_COLOR[goal.category ?? "financial"] ?? "#00d4aa";

  const handleUpdateProgress = async () => {
    const val = parseFloat(newValue);
    if (isNaN(val)) { setError("Enter a valid number"); return; }
    setSaving(true);
    setError(null);
    const newStatus: Goal["status"] =
      goal.target_value != null && val >= goal.target_value ? "achieved" : goal.status;
    const { error: err } = await supabase
      .from("goals")
      .update({ current_value: val, status: newStatus })
      .eq("id", goal.id);
    if (err) {
      console.error("[GoalCard] update error:", err.code, err.message);
      setError(err.message);
      setSaving(false);
      return;
    }
    setDisplayValue(val);
    setSaving(false);
    setMode("view");
    router.refresh();
  };

  const handleEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("goals")
      .update({
        title: editTitle.trim(),
        category: editCategory,
        target_date: editTargetDate || null,
        target_value: editTargetValue ? parseFloat(editTargetValue) : null,
        unit: editUnit.trim() || null,
        project_id: editProjectId || null,
        status: editStatus,
      })
      .eq("id", goal.id);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setMode("view");
    router.refresh();
  };

  const handleDelete = async () => {
    setRemoved(true);
    await supabase.from("goals").delete().eq("id", goal.id);
    router.refresh();
  };

  return (
    <div
      className="bg-card border border-line rounded-lg p-4"
      style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-bright font-medium leading-snug">{goal.title}</p>
          {projectName && (
            <p className="text-[10px] font-mono text-muted/60 mt-0.5">{projectName}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              STATUS_PILL[goal.status] ?? "text-muted bg-raised"
            }`}
          >
            {goal.status}
          </span>
          <button
            onClick={() => {
              setMode((m) => (m === "edit" ? "view" : "edit"));
              setConfirmDelete(false);
              setError(null);
            }}
            className="text-[9px] font-mono text-muted/40 hover:text-teal transition-colors px-1"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => {
              setConfirmDelete((v) => !v);
              setMode("view");
            }}
            className="text-[9px] font-mono text-muted/40 hover:text-danger transition-colors px-1"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {pct != null && (
        <div className="mb-2">
          <div className="h-2 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[9px] font-mono text-muted/60">
              {formatValue(displayValue)} /{" "}
              {formatValue(goal.target_value ?? 0)} {goal.unit ?? ""}
            </p>
            <p className="text-[9px] font-mono text-muted/60">{pct}%</p>
          </div>
        </div>
      )}

      {/* Days remaining */}
      {daysLeft != null && (
        <p
          className={`text-[10px] font-mono mb-2 ${
            daysLeft < 0 ? "text-danger" : daysLeft <= 14 ? "text-warn" : "text-muted/50"
          }`}
        >
          {daysLeft < 0 ? "OVERDUE" : daysLeft === 0 ? "Due today" : `${daysLeft} days left`}
        </p>
      )}

      {/* Inline error */}
      {error && <p className="text-[10px] font-mono text-danger mb-2">{error}</p>}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-danger/5 border border-danger/20 rounded">
          <span className="text-[10px] font-mono text-danger flex-1">Delete this goal?</span>
          <button
            onClick={handleDelete}
            className="text-[9px] font-mono px-2 py-0.5 bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[9px] font-mono text-muted hover:text-bright"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Progress update row */}
      {goal.status === "active" && goal.target_value != null && mode === "update" && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdateProgress();
              if (e.key === "Escape") setMode("view");
            }}
            className="flex-1 bg-raised border border-line focus:border-teal rounded px-2 py-1 text-xs font-mono text-bright focus:outline-none"
          />
          {goal.unit && (
            <span className="text-[10px] font-mono text-muted/60 shrink-0">{goal.unit}</span>
          )}
          <button
            onClick={handleUpdateProgress}
            disabled={saving}
            className="px-2 py-1 bg-teal text-base text-[9px] font-mono rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "..." : "Save"}
          </button>
          <button
            onClick={() => setMode("view")}
            className="text-muted hover:text-bright text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Update progress button */}
      {goal.status === "active" && goal.target_value != null && mode === "view" && (
        <button
          onClick={() => setMode("update")}
          className="text-[9px] font-mono text-muted/50 hover:text-muted transition-colors"
        >
          Update Progress
        </button>
      )}

      {/* Edit form */}
      {mode === "edit" && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <div>
            <label className="text-[9px] font-mono text-muted block mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1.5 text-xs text-bright focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Goal["status"])}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              >
                <option value="active">Active</option>
                <option value="achieved">Achieved</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Target Value</label>
              <input
                type="number"
                value={editTargetValue}
                onChange={(e) => setEditTargetValue(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Unit</label>
              <input
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                placeholder="COP, USD, days…"
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Target Date</label>
              <DatePicker value={editTargetDate} onChange={setEditTargetDate} className="w-full" />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Project</label>
              <select
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-[9px] font-mono text-muted hover:text-bright transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={saving || !editTitle.trim()}
              className="text-[9px] font-mono px-3 py-1 bg-teal text-base rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
