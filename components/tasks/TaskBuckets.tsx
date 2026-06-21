"use client";

import { useState, useCallback, useRef } from "react";
import { Task, Project } from "@/types";
import { format, isPast, isToday, parse } from "date-fns";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-danger",
  high: "bg-warn",
  medium: "bg-info",
  low: "bg-muted/40",
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "text-danger bg-danger/10",
  high: "text-warn bg-warn/10",
  medium: "text-info bg-info/10",
  low: "text-muted bg-raised",
};

export interface AddChoreData {
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  intervalDays: number;
  nextDueDate: string;
}

interface Props {
  todayTasks: Task[];
  inboxTasks: Task[];
  parkedTasks: Task[];
  doneTasks: Task[];
  choreTasks: Task[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
  processing: Set<string>;
  calendarConnected?: boolean;
  onComplete: (task: Task) => void;
  onPromote: (task: Task) => void;
  onPark: (task: Task) => void;
  onUnpark: (task: Task) => void;
  onUncomplete: (task: Task) => void;
  onDestroy: (task: Task) => void;
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
  onAddChore: (data: AddChoreData) => Promise<void>;
}

export function TaskBuckets({
  todayTasks,
  inboxTasks,
  parkedTasks,
  doneTasks,
  choreTasks,
  projects,
  processing,
  calendarConnected,
  onComplete,
  onPromote,
  onPark,
  onUnpark,
  onUncomplete,
  onDestroy,
  onUpdate,
  onAddChore,
}: Props) {
  const [showParked, setShowParked] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showAddChore, setShowAddChore] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSync = useCallback(async (taskId?: string) => {
    if (!calendarConnected) {
      showToast("Connect Google Calendar in Settings first", false);
      return;
    }
    try {
      const res = await fetch("/api/calendar/sync-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskId ? { taskId } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Sync failed", false);
      } else {
        showToast(taskId ? "📅 Added to Google Calendar" : `📅 ${data.synced ?? 0} task(s) synced`, true);
      }
    } catch {
      showToast("Sync failed", false);
    }
  }, [calendarConnected, showToast]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          className={`px-4 py-2 rounded-lg text-xs font-mono flex items-center justify-between gap-2 cursor-pointer ${
            toast.ok
              ? "bg-teal/10 text-teal border border-teal/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}
        >
          <span>{toast.message}</span>
          <span className="opacity-50">×</span>
        </div>
      )}

      {/* Today + Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-teal/30 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-teal">Today</span>
              {todayTasks.some((t) => t.due_date) && (
                <button
                  onClick={() => handleSync()}
                  className="text-[9px] font-mono text-ai/50 hover:text-ai transition-colors"
                  title="Sync all tasks with due dates to Google Calendar"
                >
                  📅
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-muted">{todayTasks.length}</span>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No tasks for today</p>
          ) : (
            <div className="divide-y divide-line/40">
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectMap={projectMap}
                  projects={projects}
                  processing={processing.has(task.id)}
                  calendarConnected={calendarConnected}
                  onSync={task.due_date ? () => handleSync(task.id) : undefined}
                  primary={{ label: "✓ Done", onClick: () => onComplete(task) }}
                  secondary={[
                    { label: "Park", onClick: () => onPark(task) },
                  ]}
                  onDestroy={onDestroy}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-warn/20 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-[10px] font-mono uppercase tracking-widest text-warn">Inbox</span>
            <span className="text-xs font-mono text-muted">{inboxTasks.length}</span>
          </div>
          {inboxTasks.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">Inbox zero 🎉</p>
          ) : (
            <div className="divide-y divide-line/40">
              {inboxTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectMap={projectMap}
                  projects={projects}
                  processing={processing.has(task.id)}
                  calendarConnected={calendarConnected}
                  onSync={task.due_date ? () => handleSync(task.id) : undefined}
                  primary={{ label: "→ Today", onClick: () => onPromote(task) }}
                  secondary={[
                    { label: "✓ Done", onClick: () => onComplete(task) },
                    { label: "Park", onClick: () => onPark(task) },
                  ]}
                  onDestroy={onDestroy}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chores */}
      <div className="bg-card border border-ai/20 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="text-[10px] font-mono uppercase tracking-widest text-ai">↻ Chores Due</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">{choreTasks.length}</span>
            <button
              onClick={() => setShowAddChore((v) => !v)}
              className="text-[10px] font-mono text-ai/70 hover:text-ai transition-colors px-2 py-0.5 rounded hover:bg-ai/10"
            >
              {showAddChore ? "✕ Cancel" : "+ Add Chore"}
            </button>
          </div>
        </div>

        {showAddChore && (
          <AddChoreForm
            onAdd={async (data) => {
              await onAddChore(data);
              setShowAddChore(false);
            }}
            onCancel={() => setShowAddChore(false)}
          />
        )}

        {choreTasks.length > 0 ? (
          <div className="divide-y divide-line/40">
            {choreTasks.map((task) => (
              <ChoreRow
                key={task.id}
                task={task}
                processing={processing.has(task.id)}
                onComplete={onComplete}
                onDestroy={onDestroy}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        ) : (
          !showAddChore && (
            <p className="text-[10px] font-mono text-muted/40 text-center py-4">No chores due</p>
          )
        )}
      </div>

      {/* Parked + Done */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-line rounded-lg overflow-hidden">
          <button
            onClick={() => setShowParked((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-raised/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Parked</span>
              <span className="text-[10px] font-mono text-muted/60 bg-raised px-1.5 py-0.5 rounded">
                {parkedTasks.length}
              </span>
            </div>
            <span className="text-muted text-xs">{showParked ? "▲" : "▼"}</span>
          </button>
          {showParked && (
            <div className="border-t border-line">
              {parkedTasks.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">Nothing parked</p>
              ) : (
                <div className="divide-y divide-line/40">
                  {parkedTasks.map((task) => (
                    <CompactRow
                      key={task.id}
                      task={task}
                      projects={projects}
                      processing={processing.has(task.id)}
                      allowEdit
                      actions={[
                        { label: "↑ Inbox", onClick: () => onUnpark(task) },
                      ]}
                      onDestroy={onDestroy}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-line rounded-lg overflow-hidden">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-raised/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Completed</span>
              <span className="text-[10px] font-mono text-teal/70 bg-teal/10 px-1.5 py-0.5 rounded">
                {doneTasks.length}
              </span>
            </div>
            <span className="text-muted text-xs">{showDone ? "▲" : "▼"}</span>
          </button>
          {showDone && (
            <div className="border-t border-line">
              {doneTasks.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No completed tasks</p>
              ) : (
                <div className="divide-y divide-line/40">
                  {doneTasks.map((task) => (
                    <CompactRow
                      key={task.id}
                      task={task}
                      processing={processing.has(task.id)}
                      strikethrough
                      actions={[{ label: "↩ Undo", onClick: () => onUncomplete(task) }]}
                      onDestroy={onDestroy}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const AREAS = ["work", "personal", "finance", "health"] as const;
const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

function TaskRow({
  task,
  projectMap,
  projects,
  processing,
  primary,
  secondary,
  calendarConnected,
  onSync,
  onDestroy,
  onUpdate,
}: {
  task: Task;
  projectMap: Map<string, Pick<Project, "id" | "name" | "emoji">>;
  projects: Pick<Project, "id" | "name" | "emoji">[];
  processing: boolean;
  primary: TaskAction;
  secondary: TaskAction[];
  calendarConnected?: boolean;
  onSync?: () => void;
  onDestroy: (task: Task) => void;
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editArea, setEditArea] = useState(task.area ?? "personal");
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "");
  const [editProjectId, setEditProjectId] = useState(task.project_id ?? "");

  const project = task.project_id ? projectMap.get(task.project_id) : null;

  let overdue = false;
  if (task.due_date) {
    const d = parse(task.due_date, "yyyy-MM-dd", new Date());
    overdue = isPast(d) && !isToday(d);
  }

  const startEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditArea(task.area ?? "personal");
    setEditDueDate(task.due_date ?? "");
    setEditProjectId(task.project_id ?? "");
    setEditing(true);
    setConfirmDelete(false);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onUpdate(task, {
      title: editTitle.trim(),
      priority: editPriority,
      area: editArea as Task["area"],
      due_date: editDueDate || null,
      project_id: editProjectId || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className={`px-4 py-3 hover:bg-raised/30 transition-colors ${processing ? "opacity-50" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-muted/40"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-bright leading-snug break-words">{task.title}</p>
            {task.recurring && (
              <span
                className="text-[11px] text-ai shrink-0 leading-none"
                title={`Repeats ${task.recurrence_frequency ?? "daily"}`}
              >
                ↻
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {task.priority !== "medium" && (
              <span
                className={`text-[9px] font-mono uppercase px-1 py-0.5 rounded ${PRIORITY_BADGE[task.priority]}`}
              >
                {task.priority}
              </span>
            )}
            {project && (
              <span className="text-[10px] text-muted/70 truncate max-w-[120px]">
                {project.emoji} {project.name}
              </span>
            )}
            {task.due_date && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                  overdue
                    ? "bg-danger/10 text-danger border-danger/30"
                    : "bg-raised text-muted/70 border-line/40"
                }`}
              >
                {overdue ? "⚠ " : ""}
                {format(parse(task.due_date, "yyyy-MM-dd", new Date()), "dd/MM")}
              </span>
            )}
          </div>
        </div>

        {/* Desktop hover actions */}
        <div
          className={`hidden lg:flex items-center gap-1 shrink-0 transition-opacity duration-100 ${
            showActions ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={primary.onClick}
            className="px-2 py-1 bg-teal/20 text-teal text-[10px] font-mono rounded hover:bg-teal/30 transition-colors whitespace-nowrap"
          >
            {primary.label}
          </button>
          {secondary.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="px-2 py-1 text-[10px] font-mono rounded transition-colors whitespace-nowrap bg-raised text-muted hover:text-bright"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={startEdit}
            className="px-1.5 py-1 text-[10px] font-mono text-muted/50 hover:text-teal transition-colors"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => { setConfirmDelete(true); setEditing(false); }}
            className="px-1.5 py-1 text-[10px] font-mono text-muted/50 hover:text-danger transition-colors"
            title="Delete"
          >
            ✕
          </button>
          {onSync && (
            <button
              onClick={onSync}
              className="px-2 py-1 bg-ai/10 text-ai text-[10px] font-mono rounded hover:bg-ai/20 transition-colors"
              title={calendarConnected ? "Add to Google Calendar" : "Connect Google Calendar in Settings first"}
            >
              📅
            </button>
          )}
        </div>

        {/* Mobile tap trigger */}
        <button
          onClick={() => setShowActions((v) => !v)}
          className="lg:hidden text-muted/40 hover:text-muted text-base leading-none shrink-0 ml-1"
        >
          ⋮
        </button>
      </div>

      {/* Mobile inline actions */}
      {showActions && (
        <div className="flex items-center gap-1.5 mt-2 pl-4 lg:hidden flex-wrap">
          <button
            onClick={primary.onClick}
            className="px-2 py-1 bg-teal/20 text-teal text-[10px] font-mono rounded"
          >
            {primary.label}
          </button>
          {secondary.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="px-2 py-1 text-[10px] font-mono rounded text-muted bg-raised"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={startEdit}
            className="px-2 py-1 text-[10px] font-mono rounded text-teal bg-teal/10"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => { setConfirmDelete(true); setEditing(false); }}
            className="px-2 py-1 text-[10px] font-mono rounded text-danger bg-danger/10"
          >
            ✕ Delete
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-danger/5 border border-danger/20 rounded">
          <span className="text-[10px] font-mono text-danger flex-1">Delete this task?</span>
          <button
            onClick={() => { onDestroy(task); setConfirmDelete(false); }}
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

      {/* Inline edit form */}
      {editing && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1.5 text-xs text-bright focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
              className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <select
              value={editArea}
              onChange={(e) => setEditArea(e.target.value as (typeof AREAS)[number])}
              className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal [color-scheme:dark]"
            />
            <select
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
              className="bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[9px] font-mono text-muted hover:text-bright px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !editTitle.trim()}
              className="text-[9px] font-mono px-3 py-1 bg-teal text-base rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddChoreForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: AddChoreData) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [intervalDays, setIntervalDays] = useState("7");
  const [priority, setPriority] = useState<AddChoreData["priority"]>("low");
  const [nextDueDate, setNextDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({
      title: title.trim(),
      priority,
      intervalDays: parseInt(intervalDays) || 7,
      nextDueDate: nextDueDate || new Date().toISOString().split("T")[0],
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-ai/10 bg-ai/3 space-y-2">
      <p className="text-[9px] font-mono uppercase tracking-widest text-ai/70 mb-1">New Chore</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chore name..."
        autoFocus
        className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted/40 focus:outline-none"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Repeat every (days)</label>
          <input
            type="number"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            min="1"
            className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as AddChoreData["priority"])}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
          >
            {(["urgent", "high", "medium", "low"] as const).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted block mb-1">First due date</label>
          <input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal [color-scheme:dark]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-[9px] font-mono text-muted hover:text-bright px-2">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="text-[9px] font-mono px-3 py-1.5 bg-ai/20 text-ai border border-ai/30 rounded hover:bg-ai/30 disabled:opacity-40 transition-colors"
        >
          {saving ? "Adding…" : "Add Chore"}
        </button>
      </div>
    </form>
  );
}

function ChoreRow({
  task,
  processing,
  onComplete,
  onDestroy,
  onUpdate,
}: {
  task: Task;
  processing: boolean;
  onComplete: (task: Task) => void;
  onDestroy: (task: Task) => void;
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editInterval, setEditInterval] = useState(String(task.chore_interval_days ?? 7));
  const [editNextDue, setEditNextDue] = useState(task.next_due_date ?? "");

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onUpdate(task, {
      title: editTitle.trim(),
      chore_interval_days: parseInt(editInterval) || 7,
      next_due_date: editNextDue || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`px-4 py-3 hover:bg-raised/20 transition-colors ${processing ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-ai text-sm shrink-0" title="Recurring chore">↻</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-bright leading-snug">{task.title}</p>
          <p className="text-[9px] font-mono text-muted/50 mt-0.5">
            Every {task.chore_interval_days ?? 7} days
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onComplete(task)}
            disabled={processing}
            className="px-2 py-1 bg-teal/20 text-teal text-[10px] font-mono rounded hover:bg-teal/30 transition-colors"
          >
            ✓ Done
          </button>
          <button
            onClick={() => { setEditing((v) => !v); setConfirmDelete(false); }}
            className="px-1.5 py-1 text-[10px] font-mono text-muted/50 hover:text-teal transition-colors"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => { setConfirmDelete((v) => !v); setEditing(false); }}
            className="px-1.5 py-1 text-[10px] font-mono text-muted/50 hover:text-danger transition-colors"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-danger/5 border border-danger/20 rounded">
          <span className="text-[10px] font-mono text-danger flex-1">Delete this chore?</span>
          <button
            onClick={() => { onDestroy(task); setConfirmDelete(false); }}
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

      {editing && (
        <div className="mt-2 pt-2 border-t border-line space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1.5 text-xs text-bright focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Interval (days)</label>
              <input
                type="number"
                value={editInterval}
                onChange={(e) => setEditInterval(e.target.value)}
                min="1"
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted block mb-1">Next due</label>
              <input
                type="date"
                value={editNextDue}
                onChange={(e) => setEditNextDue(e.target.value)}
                className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal [color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="text-[9px] font-mono text-muted hover:text-bright px-2 py-1">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="text-[9px] font-mono px-3 py-1 bg-teal text-base rounded hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactRow({
  task,
  projects,
  processing,
  actions,
  strikethrough = false,
  onDestroy,
  onUpdate,
  allowEdit = false,
}: {
  task: Task;
  projects?: Pick<Project, "id" | "name" | "emoji">[];
  processing: boolean;
  actions: TaskAction[];
  strikethrough?: boolean;
  onDestroy?: (task: Task) => void;
  onUpdate?: (task: Task, changes: Partial<Task>) => Promise<void>;
  allowEdit?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "");
  const [editProjectId, setEditProjectId] = useState(task.project_id ?? "");

  const saveEdit = async () => {
    if (!editTitle.trim() || !onUpdate) return;
    setSaving(true);
    await onUpdate(task, {
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate || null,
      project_id: editProjectId || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className={`px-4 py-2.5 hover:bg-raised/20 transition-colors ${processing ? "opacity-50" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            strikethrough ? "bg-teal/40" : (PRIORITY_DOT[task.priority] ?? "bg-muted/40")
          }`}
        />
        <p
          className={`flex-1 text-xs min-w-0 truncate ${
            strikethrough ? "line-through text-muted/40" : "text-muted"
          }`}
        >
          {task.title}
        </p>
        <div
          className={`flex items-center gap-1 shrink-0 transition-opacity duration-100 ${
            showActions ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                action.danger
                  ? "text-danger hover:bg-danger/10"
                  : "text-muted hover:text-bright hover:bg-raised"
              }`}
            >
              {action.label}
            </button>
          ))}
          {allowEdit && onUpdate && (
            <button
              onClick={() => { setEditing((v) => !v); setConfirmDelete(false); }}
              className="px-1 py-0.5 text-[9px] font-mono text-muted/50 hover:text-teal transition-colors"
              title="Edit"
            >
              ✎
            </button>
          )}
          {onDestroy && (
            <button
              onClick={() => { setConfirmDelete((v) => !v); setEditing(false); }}
              className="px-1 py-0.5 text-[9px] font-mono text-muted/50 hover:text-danger transition-colors"
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {confirmDelete && onDestroy && (
        <div className="flex items-center gap-2 mt-1.5 p-1.5 bg-danger/5 border border-danger/20 rounded text-[9px] font-mono">
          <span className="text-danger flex-1">Delete?</span>
          <button onClick={() => { onDestroy(task); setConfirmDelete(false); }} className="text-danger hover:bg-danger/10 px-1.5 py-0.5 rounded border border-danger/30">Yes</button>
          <button onClick={() => setConfirmDelete(false)} className="text-muted hover:text-bright px-1">No</button>
        </div>
      )}

      {editing && allowEdit && onUpdate && (
        <div className="mt-2 pt-2 border-t border-line space-y-1.5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1 text-xs text-bright focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
              className="bg-raised border border-line rounded px-2 py-1 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="bg-raised border border-line rounded px-2 py-1 text-[10px] font-mono text-bright focus:outline-none focus:border-teal [color-scheme:dark]"
            />
          </div>
          {projects && (
            <select
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
              className="w-full bg-raised border border-line rounded px-2 py-1 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
            >
              <option value="">— No project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="text-[9px] font-mono text-muted hover:text-bright px-1 py-0.5">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="text-[9px] font-mono px-2 py-0.5 bg-teal text-base rounded disabled:opacity-50">
              {saving ? "…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
