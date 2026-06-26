"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Task, Project } from "@/types";
import { QuickAddTask, AddTaskData } from "./QuickAddTask";
import { KanbanView } from "./KanbanView";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function byPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );
}

// ─── Archived accordion ───────────────────────────────────────────────────────

function ArchivedSection({
  tasks,
  onRestore,
}: {
  tasks: Task[];
  onRestore: (task: Task) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  if (!tasks.length) return null;

  return (
    <div className="mt-6 border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-card hover:bg-raised/30 transition-colors"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Archived ({tasks.length})
        </span>
        <span className="text-[9px] font-mono text-muted/40">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="divide-y divide-line/30">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-muted/50 line-through flex-1 truncate">
                {task.title}
              </span>
              <button
                onClick={() => onRestore(task)}
                className="text-[9px] font-mono text-teal hover:text-teal/70 shrink-0 transition-colors"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TasksClient ──────────────────────────────────────────────────────────────

interface Props {
  todayTasks: Task[];
  inboxTasks: Task[];
  parkedTasks: Task[];
  doneTasks: Task[];
  choreTasks: Task[];
  archivedTasks: Task[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
  calendarConnected?: boolean;
}

export function TasksClient({
  todayTasks: initialToday,
  inboxTasks: initialInbox,
  parkedTasks: initialParked,
  doneTasks: initialDone,
  choreTasks: initialChores,
  archivedTasks: initialArchived,
  projects,
}: Props) {
  const [today, setToday] = useState<Task[]>(byPriority(initialToday));
  const [inbox, setInbox] = useState<Task[]>(byPriority(initialInbox));
  const [parked, setParked] = useState<Task[]>(initialParked);
  const [done, setDone] = useState<Task[]>(initialDone);
  const [chores, setChores] = useState<Task[]>(initialChores);
  const [archived, setArchived] = useState<Task[]>(initialArchived);

  const addTask = useCallback(async (data: AddTaskData) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      title: data.title,
      priority: data.priority,
      status: data.status,
      project_id: data.project_id ?? null,
      due_date: data.due_date ?? null,
      area: null,
      notes: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      recurring: data.recurring ?? false,
      recurrence_frequency: data.recurrence_frequency ?? null,
      is_chore: null,
      chore_interval_days: null,
      last_completed_at: null,
      next_due_date: null,
      life_area: data.life_area ?? null,
      archived_at: null,
    };

    if (data.status === "today") {
      setToday((prev) => byPriority([...prev, optimistic]));
    } else {
      setInbox((prev) => byPriority([...prev, optimistic]));
    }

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert({
        title: data.title,
        priority: data.priority,
        status: data.status,
        area: "personal",
        project_id: data.project_id || null,
        due_date: data.due_date || null,
        recurring: data.recurring ?? false,
        recurrence_frequency: data.recurrence_frequency ?? null,
        life_area: data.life_area || null,
      })
      .select()
      .single();

    if (error) {
      if (data.status === "today") {
        setToday((prev) => prev.filter((t) => t.id !== tempId));
      } else {
        setInbox((prev) => prev.filter((t) => t.id !== tempId));
      }
      return;
    }

    if (inserted) {
      const real = inserted as Task;
      if (data.status === "today") {
        setToday((prev) => byPriority(prev.map((t) => (t.id === tempId ? real : t))));
      } else {
        setInbox((prev) => byPriority(prev.map((t) => (t.id === tempId ? real : t))));
      }
    }
  }, []);

  const update = useCallback(async (task: Task, changes: Partial<Task>) => {
    const newStatus = (changes.status ?? task.status) as Task["status"];
    const nowIso = new Date().toISOString();
    const completedAtPatch =
      changes.status === "done" && task.status !== "done" ? { completed_at: nowIso } : {};
    const updatedTask = { ...task, ...changes, ...completedAtPatch };
    const applyToList = (list: Task[]) =>
      list.map((t) => (t.id === task.id ? updatedTask : t));

    if (changes.status && changes.status !== task.status) {
      setToday((prev) => prev.filter((t) => t.id !== task.id));
      setInbox((prev) => prev.filter((t) => t.id !== task.id));
      setParked((prev) => prev.filter((t) => t.id !== task.id));
      setDone((prev) => prev.filter((t) => t.id !== task.id));

      if (newStatus === "today" || newStatus === "in_progress") {
        setToday((prev) => byPriority([...prev, updatedTask]));
      } else if (newStatus === "inbox") {
        setInbox((prev) => byPriority([...prev, updatedTask]));
      } else if (newStatus === "parked") {
        setParked((prev) => [updatedTask, ...prev]);
      } else if (newStatus === "done") {
        setDone((prev) => [updatedTask, ...prev]);
      }
    } else {
      if (task.status === "today" || task.status === "in_progress") {
        setToday((prev) => byPriority(applyToList(prev)));
      } else if (task.status === "inbox") {
        setInbox((prev) => byPriority(applyToList(prev)));
      } else if (task.status === "parked") {
        setParked((prev) => applyToList(prev));
      } else if (task.status === "done") {
        setDone((prev) => applyToList(prev));
      }
    }

    await supabase.from("tasks").update({ ...changes, ...completedAtPatch }).eq("id", task.id);
  }, []);

  const destroy = useCallback(async (task: Task) => {
    setToday((prev) => prev.filter((t) => t.id !== task.id));
    setInbox((prev) => prev.filter((t) => t.id !== task.id));
    setParked((prev) => prev.filter((t) => t.id !== task.id));
    setDone((prev) => prev.filter((t) => t.id !== task.id));
    setChores((prev) => prev.filter((t) => t.id !== task.id));
    await supabase.from("tasks").delete().eq("id", task.id);
  }, []);

  const restore = useCallback(async (task: Task) => {
    setArchived((prev) => prev.filter((t) => t.id !== task.id));
    await supabase
      .from("tasks")
      .update({ status: "today", archived_at: null })
      .eq("id", task.id);
  }, []);

  // suppress unused var warning for chores (kept for future use)
  void chores;

  return (
    <>
      <QuickAddTask projects={projects} onAdd={addTask} />

      <div className="mt-4">
        <KanbanView
          todayTasks={today}
          inboxTasks={inbox}
          doneTasks={done}
          projects={projects}
          onUpdate={update}
          onDestroy={destroy}
        />
      </div>

      <ArchivedSection tasks={archived} onRestore={restore} />
    </>
  );
}
