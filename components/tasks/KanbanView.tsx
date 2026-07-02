"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
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
import { Pencil, Trash2, CalendarClock, Check, X } from "lucide-react";
import { Task, Project, TaskPriority } from "@/types";
import { formatDateShort } from "@/lib/utils";

const COLUMNS = [
  { id: "inbox",       label: "Inbox",       headerClass: "text-warn"  },
  { id: "today",       label: "Today",        headerClass: "text-teal"  },
  { id: "in_progress", label: "In Progress",  headerClass: "text-info"  },
  { id: "done",        label: "Done",         headerClass: "text-muted" },
] as const;

type ColumnId = "inbox" | "today" | "in_progress" | "done";

// Pointer-within first so empty columns always register; fall back to rect intersection
function customCollision(args: Parameters<typeof pointerWithin>[0]) {
  const pw = pointerWithin(args);
  return pw.length > 0 ? pw : rectIntersection(args);
}

const COL_TO_STATUS: Record<ColumnId, Task["status"]> = {
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

// ─── Card ────────────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  projectName,
  projects,
  onUpdate,
  onDestroy,
}: {
  task: Task;
  projectName?: string;
  projects: Pick<Project, "id" | "name" | "emoji">[];
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
  onDestroy: (task: Task) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">("idle");

  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.due_date ?? "");
  const [editProject, setEditProject] = useState(task.project_id ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isEditing });

  const openEdit = (e: React.PointerEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ?? "");
    setEditProject(task.project_id ?? "");
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
      project_id: editProject || null,
    });
    setSaving(false);
    setIsEditing(false);
  }, [editTitle, editPriority, editDueDate, editProject, task, onUpdate]);

  const handleDelete = async (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"?`)) return;
    await onDestroy(task);
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
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
          <select
            value={editProject}
            onChange={(e) => setEditProject(e.target.value)}
            className="w-full bg-base border border-line rounded px-1.5 py-1 text-[10px] text-bright focus:outline-none focus:border-teal"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji ?? ""} {p.name}</option>
            ))}
          </select>
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
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {projectName && (
                  <span className="text-[9px] font-mono text-muted/60 truncate max-w-[100px]">
                    {projectName}
                  </span>
                )}
                {task.due_date && (() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const dueStr = task.due_date!.split("T")[0];
                  const isOverdue = dueStr < todayStr && task.status !== "done";
                  const isToday = dueStr === todayStr;
                  return (
                    <span className={`text-[9px] font-mono ${isOverdue ? "text-red-400" : isToday ? "text-amber-400" : "text-muted/50"}`}>
                      {isOverdue ? "⚠ " : ""}{formatDateShort(task.due_date!)}
                    </span>
                  );
                })()}
              </div>
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

function KanbanColumn({
  id,
  label,
  headerClass,
  tasks,
  projects,
  onUpdate,
  onDestroy,
}: {
  id: ColumnId;
  label: string;
  headerClass: string;
  tasks: Task[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
  onDestroy: (task: Task) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-1 min-w-[200px] bg-card border rounded-lg overflow-hidden transition-colors",
        isOver ? "border-teal/40 bg-teal/5" : "border-line",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${headerClass}`}>
          {label}
        </span>
        <span className="text-[10px] font-mono text-muted/60">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 space-y-2 min-h-[120px]">
          {tasks.map((task) => {
            const proj = task.project_id ? projectMap.get(task.project_id) : null;
            return (
              <KanbanCard
                key={task.id}
                task={task}
                projectName={proj ? `${proj.emoji ?? ""} ${proj.name}` : undefined}
                projects={projects}
                onUpdate={onUpdate}
                onDestroy={onDestroy}
              />
            );
          })}
          {tasks.length === 0 && (
            <p className="text-[10px] font-mono text-muted/30 text-center py-6">Drop here</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── KanbanView ───────────────────────────────────────────────────────────────

interface Props {
  todayTasks: Task[];
  inboxTasks: Task[];
  doneTasks: Task[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
  onDestroy: (task: Task) => Promise<void>;
}

export function KanbanView({
  todayTasks,
  inboxTasks,
  doneTasks,
  projects,
  onUpdate,
  onDestroy,
}: Props) {
  const allTasks = [...inboxTasks, ...todayTasks, ...doneTasks];

  const [taskMap, setTaskMap] = useState<Map<string, Task>>(() => {
    const m = new Map<string, Task>();
    allTasks.forEach((t) => m.set(t.id, t));
    return m;
  });

  const [columnTasks, setColumnTasks] = useState<Record<ColumnId, string[]>>(() => ({
    inbox: inboxTasks.map((t) => t.id),
    today: todayTasks.filter((t) => t.status === "today").map((t) => t.id),
    in_progress: todayTasks.filter((t) => t.status === "in_progress").map((t) => t.id),
    done: doneTasks.map((t) => t.id),
  }));

  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync from parent when tasks change externally (optimistic QuickAdd, temp→real ID swap, etc.)
  useEffect(() => {
    setTaskMap(() => {
      const m = new Map<string, Task>();
      [...inboxTasks, ...todayTasks, ...doneTasks].forEach((t) => m.set(t.id, t));
      return m;
    });
    setColumnTasks({
      inbox:       inboxTasks.map((t) => t.id),
      today:       todayTasks.filter((t) => t.status === "today").map((t) => t.id),
      in_progress: todayTasks.filter((t) => t.status === "in_progress").map((t) => t.id),
      done:        doneTasks.map((t) => t.id),
    });
  }, [inboxTasks, todayTasks, doneTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findColumn = useCallback(
    (taskId: string): ColumnId | null => {
      for (const [col, ids] of Object.entries(columnTasks) as [ColumnId, string[]][]) {
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

    let toCol: ColumnId | null = null;
    if ((COLUMNS as readonly { id: string }[]).some((c) => c.id === overId)) {
      toCol = overId as ColumnId;
    } else {
      toCol = findColumn(overId);
    }

    if (!fromCol || !toCol || fromCol === toCol) return;

    const task = taskMap.get(taskId);
    if (!task) return;

    const newStatus = COL_TO_STATUS[toCol];

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

    await onUpdate(task, { status: newStatus });
  };

  // Remove task from local state after delete
  const handleDestroy = useCallback(async (task: Task) => {
    const col = findColumn(task.id);
    if (col) {
      setColumnTasks((prev) => ({
        ...prev,
        [col]: prev[col].filter((id) => id !== task.id),
      }));
    }
    setTaskMap((prev) => {
      const next = new Map(prev);
      next.delete(task.id);
      return next;
    });
    await onDestroy(task);
  }, [findColumn, onDestroy]);

  const activeTask = activeId ? taskMap.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            headerClass={col.headerClass}
            tasks={(columnTasks[col.id] ?? []).map((id) => taskMap.get(id)!).filter(Boolean)}
            projects={projects}
            onUpdate={onUpdate}
            onDestroy={handleDestroy}
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
