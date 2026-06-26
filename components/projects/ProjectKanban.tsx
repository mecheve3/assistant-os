"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, Pencil, Trash2, CalendarClock, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Task, TaskPriority, TaskStatus } from "@/types";
import { formatDateShort } from "@/lib/utils";

const COLUMNS = [
  { id: "inbox",       label: "Backlog",     headerClass: "text-warn"  },
  { id: "today",       label: "To Do",        headerClass: "text-teal"  },
  { id: "in_progress", label: "In Progress",  headerClass: "text-info"  },
  { id: "done",        label: "Done",          headerClass: "text-muted" },
] as const;

type ColId = "inbox" | "today" | "in_progress" | "done";

const COL_STATUS: Record<ColId, TaskStatus> = {
  inbox: "inbox",
  today: "today",
  in_progress: "in_progress",
  done: "done",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-danger",
  high: "bg-warn",
  medium: "bg-info",
  low: "bg-muted/40",
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
];

// ─── Enhanced Card ────────────────────────────────────────────────────────────

function ProjectTaskCard({
  task,
  onUpdate,
  onDestroy,
}: {
  task: Task;
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
  onDestroy: (taskId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">("idle");

  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isEditing });

  const openEdit = (e: React.PointerEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = useCallback(async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onUpdate(task, {
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate || null,
    });
    setSaving(false);
    setIsEditing(false);
  }, [editTitle, editPriority, editDueDate, task, onUpdate]);

  const handleDelete = async (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"?`)) return;
    await onDestroy(task.id);
  };

  const handleSync = async (e: React.PointerEvent) => {
    e.stopPropagation();
    setSyncStatus("syncing");
    await fetch("/api/calendar/sync-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    });
    setSyncStatus("done");
    setTimeout(() => setSyncStatus("idle"), 2000);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={[
        "bg-raised border rounded p-2.5 select-none",
        isEditing
          ? "border-teal/60 cursor-default"
          : "border-line cursor-grab active:cursor-grabbing",
      ].join(" ")}
    >
      {isEditing ? (
        <div className="space-y-1.5">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright focus:outline-none focus:border-teal"
          />
          <div className="grid grid-cols-2 gap-1">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
              className="bg-base border border-line rounded px-1.5 py-1 text-[10px] text-bright focus:outline-none focus:border-teal"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="bg-base border border-line rounded px-1.5 py-1 text-[10px] text-bright focus:outline-none focus:border-teal"
            />
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={cancelEdit}
              className="text-muted hover:text-bright transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={saveEdit}
              disabled={saving || !editTitle.trim()}
              className="flex items-center gap-1 px-2 py-0.5 bg-teal/20 text-teal text-[10px] font-mono rounded hover:bg-teal/30 disabled:opacity-40 transition-colors"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-muted/40"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-bright leading-snug">{task.title}</p>
              {task.due_date && (
                <p className="text-[9px] font-mono text-muted/50 mt-0.5">
                  {formatDateShort(task.due_date)}
                </p>
              )}
            </div>
          </div>

          {isHovered && (
            <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-line/40">
              <button
                onPointerDown={openEdit}
                className="flex items-center gap-1 text-[9px] font-mono text-muted/50 hover:text-teal transition-colors"
              >
                <Pencil className="w-2.5 h-2.5" />
                Edit
              </button>
              <button
                onPointerDown={handleDelete}
                className="flex items-center gap-1 text-[9px] font-mono text-muted/50 hover:text-danger transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
                Delete
              </button>
              <button
                onPointerDown={handleSync}
                className={[
                  "flex items-center gap-1 text-[9px] font-mono transition-colors ml-auto",
                  syncStatus === "done" ? "text-teal" : "text-muted/50 hover:text-info",
                ].join(" ")}
              >
                <CalendarClock className="w-2.5 h-2.5" />
                {syncStatus === "syncing" ? "…" : syncStatus === "done" ? "Synced" : "Sync"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function ProjectColumn({
  id,
  label,
  headerClass,
  tasks,
  projectId,
  onAddTask,
  onUpdateTask,
  onDestroyTask,
}: {
  id: ColId;
  label: string;
  headerClass: string;
  tasks: Task[];
  projectId: string;
  onAddTask: (colId: ColId, title: string, priority: TaskPriority) => Promise<void>;
  onUpdateTask: (task: Task, changes: Partial<Task>) => Promise<void>;
  onDestroyTask: (taskId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [saving, setSaving] = useState(false);

  void projectId;

  const submit = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    await onAddTask(id, newTitle.trim(), newPriority);
    setNewTitle("");
    setNewPriority("medium");
    setSaving(false);
    setShowForm(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-1 min-w-[200px] bg-card border rounded-lg overflow-hidden flex flex-col transition-colors",
        isOver ? "border-teal/40 bg-teal/5" : "border-line",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-line shrink-0">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${headerClass}`}>{label}</span>
        <span className="text-[10px] font-mono text-muted/60">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 space-y-2 flex-1 min-h-[80px]">
          {tasks.map((task) => (
            <ProjectTaskCard
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDestroy={onDestroyTask}
            />
          ))}
          {tasks.length === 0 && !showForm && (
            <p className="text-[10px] font-mono text-muted/30 text-center py-4">Empty</p>
          )}
        </div>
      </SortableContext>

      <div className="px-2 pb-2 shrink-0">
        {showForm ? (
          <div className="space-y-1.5 p-2 bg-raised border border-line/60 rounded">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setShowForm(false);
              }}
              placeholder="Task title…"
              className="w-full bg-base border border-line rounded px-2 py-1 text-xs text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
            />
            <div className="flex items-center gap-1.5">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="flex-1 bg-base border border-line rounded px-1.5 py-1 text-[10px] text-bright focus:outline-none focus:border-teal"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={submit}
                disabled={saving || !newTitle.trim()}
                className="px-2 py-1 text-[10px] font-mono text-teal border border-teal/30 rounded hover:bg-teal/10 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted/50 hover:text-bright transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono text-muted/50 hover:text-teal hover:bg-raised/50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ProjectKanban ────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  initialTasks: Task[];
}

export function ProjectKanban({ projectId, initialTasks }: Props) {
  const [taskMap, setTaskMap] = useState<Map<string, Task>>(() => {
    const m = new Map<string, Task>();
    initialTasks.forEach((t) => m.set(t.id, t));
    return m;
  });

  const [columnTasks, setColumnTasks] = useState<Record<ColId, string[]>>(() => ({
    inbox: initialTasks.filter((t) => t.status === "inbox").map((t) => t.id),
    today: initialTasks.filter((t) => t.status === "today").map((t) => t.id),
    in_progress: initialTasks.filter((t) => t.status === "in_progress").map((t) => t.id),
    done: initialTasks.filter((t) => t.status === "done").map((t) => t.id),
  }));

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findColumn = useCallback(
    (taskId: string): ColId | null => {
      for (const [col, ids] of Object.entries(columnTasks) as [ColId, string[]][]) {
        if (ids.includes(taskId)) return col;
      }
      return null;
    },
    [columnTasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const fromCol = findColumn(taskId);
    const overId = over.id as string;

    let toCol: ColId | null = null;
    if ((COLUMNS as readonly { id: string }[]).some((c) => c.id === overId)) {
      toCol = overId as ColId;
    } else {
      toCol = findColumn(overId);
    }

    if (!fromCol || !toCol || fromCol === toCol) return;

    const task = taskMap.get(taskId);
    if (!task) return;

    const newStatus = COL_STATUS[toCol];

    setColumnTasks((prev) => ({
      ...prev,
      [fromCol]: prev[fromCol].filter((id) => id !== taskId),
      [toCol!]: [taskId, ...prev[toCol!]],
    }));
    setTaskMap((prev) => {
      const next = new Map(prev);
      next.set(taskId, { ...task, status: newStatus });
      return next;
    });

    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  };

  const updateTask = useCallback(async (task: Task, changes: Partial<Task>) => {
    const updated = { ...task, ...changes };
    setTaskMap((prev) => {
      const next = new Map(prev);
      next.set(task.id, updated);
      return next;
    });
    await supabase.from("tasks").update(changes).eq("id", task.id);
  }, []);

  const destroyTask = useCallback(async (taskId: string) => {
    const col = findColumn(taskId);
    if (col) {
      setColumnTasks((prev) => ({
        ...prev,
        [col]: prev[col].filter((id) => id !== taskId),
      }));
    }
    setTaskMap((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
    await supabase.from("tasks").delete().eq("id", taskId);
  }, [findColumn]);

  const addTask = useCallback(
    async (colId: ColId, title: string, priority: TaskPriority) => {
      const tempId = `temp-${Date.now()}`;
      const status = COL_STATUS[colId];
      const optimistic: Task = {
        id: tempId,
        title,
        priority,
        status,
        project_id: projectId,
        area: null,
        notes: null,
        due_date: null,
        created_at: new Date().toISOString(),
        completed_at: null,
        recurring: false,
        recurrence_frequency: null,
        is_chore: null,
        chore_interval_days: null,
        last_completed_at: null,
        next_due_date: null,
        life_area: null,
        archived_at: null,
      };

      setTaskMap((prev) => new Map(prev).set(tempId, optimistic));
      setColumnTasks((prev) => ({
        ...prev,
        [colId]: [...prev[colId], tempId],
      }));

      const { data: inserted } = await supabase
        .from("tasks")
        .insert({ title, priority, status, project_id: projectId, area: "personal" })
        .select()
        .single();

      if (inserted) {
        const real = inserted as Task;
        setTaskMap((prev) => {
          const next = new Map(prev);
          next.delete(tempId);
          next.set(real.id, real);
          return next;
        });
        setColumnTasks((prev) => ({
          ...prev,
          [colId]: prev[colId].map((id) => (id === tempId ? real.id : id)),
        }));
      }
    },
    [projectId]
  );

  const activeTask = activeId ? taskMap.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <ProjectColumn
            key={col.id}
            id={col.id}
            label={col.label}
            headerClass={col.headerClass}
            tasks={(columnTasks[col.id] ?? []).map((id) => taskMap.get(id)!).filter(Boolean)}
            projectId={projectId}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDestroyTask={destroyTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-raised border border-teal/40 rounded p-2.5 shadow-lg rotate-1">
            <p className="text-xs text-bright">{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
