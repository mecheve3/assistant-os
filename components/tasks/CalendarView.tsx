"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { Task, Project } from "@/types";

const PRIORITY_PILL: Record<string, string> = {
  urgent: "bg-danger/20 text-danger",
  high:   "bg-warn/20 text-warn",
  medium: "bg-info/20 text-info",
  low:    "bg-muted/10 text-muted",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-danger",
  high:   "bg-warn",
  medium: "bg-info",
  low:    "bg-muted/40",
};

interface Props {
  allTasks: Task[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
  onUpdate: (task: Task, changes: Partial<Task>) => Promise<void>;
}

interface InlineEditProps {
  task: Task;
  onSave: (changes: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

function InlineEdit({ task, onSave, onCancel }: InlineEditProps) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-1.5 py-1">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="w-full bg-raised border border-line focus:border-teal rounded px-2 py-1 text-xs text-bright focus:outline-none"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Task["priority"])}
        className="w-full bg-raised border border-line rounded px-2 py-1 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
      >
        {(["urgent", "high", "medium", "low"] as const).map((p) => (
          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-[9px] font-mono text-muted hover:text-bright"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (!title.trim()) return;
            setSaving(true);
            await onSave({ title: title.trim(), priority });
            setSaving(false);
          }}
          disabled={saving || !title.trim()}
          className="text-[9px] font-mono px-2 py-0.5 bg-teal text-base rounded disabled:opacity-40"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function CalendarView({ allTasks, projects, onUpdate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Group tasks by due_date
  const tasksByDate = new Map<string, Task[]>();
  for (const task of allTasks) {
    if (!task.due_date) continue;
    const list = tasksByDate.get(task.due_date) ?? [];
    tasksByDate.set(task.due_date, [...list, task]);
  }

  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedTasks = selectedDateStr ? (tasksByDate.get(selectedDateStr) ?? []) : [];

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      {/* Calendar grid */}
      <div className="bg-card border border-line rounded-lg overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <button
            onClick={prevMonth}
            className="text-muted hover:text-bright px-2 py-0.5 text-sm transition-colors"
          >
            ‹
          </button>
          <span className="text-sm font-mono font-medium text-bright">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={nextMonth}
            className="text-muted hover:text-bright px-2 py-0.5 text-sm transition-colors"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-line">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[9px] font-mono text-muted/50 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(dateStr) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateStr}
                onClick={() =>
                  setSelectedDay(
                    selectedDay && isSameDay(day, selectedDay) ? null : day
                  )
                }
                className={[
                  "min-h-[72px] p-1 border-b border-r border-line/30 cursor-pointer transition-colors",
                  inMonth ? "hover:bg-raised/30" : "opacity-25 pointer-events-none",
                  isSelected ? "bg-teal/5" : "",
                ].join(" ")}
              >
                <div className="mb-0.5">
                  <span
                    className={[
                      "text-[10px] font-mono inline-flex w-5 h-5 items-center justify-center rounded-full",
                      isTodayDate
                        ? "bg-teal text-base font-bold"
                        : "text-muted",
                    ].join(" ")}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`text-[8px] font-mono px-1 py-0.5 rounded truncate leading-tight ${
                        PRIORITY_PILL[task.priority] ?? "bg-muted/10 text-muted"
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] font-mono text-muted/40 px-1">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="bg-card border border-line rounded-lg overflow-hidden flex flex-col">
        {selectedDay ? (
          <>
            <div className="px-4 py-3 border-b border-line shrink-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                {format(selectedDay, "EEEE, MMM d")}
              </p>
              <p className="text-[10px] font-mono text-muted/50 mt-0.5">
                {selectedTasks.length === 0
                  ? "No tasks due"
                  : `${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-line/40">
              {selectedTasks.length === 0 ? (
                <p className="text-xs text-muted/40 font-mono text-center py-10">
                  Nothing due this day
                </p>
              ) : (
                selectedTasks.map((task) => {
                  const proj = task.project_id ? projectMap.get(task.project_id) : null;
                  const isEditing = editingTaskId === task.id;

                  return (
                    <div key={task.id} className="px-3 py-2.5">
                      {isEditing ? (
                        <InlineEdit
                          task={task}
                          onSave={async (changes) => {
                            await onUpdate(task, changes);
                            setEditingTaskId(null);
                          }}
                          onCancel={() => setEditingTaskId(null)}
                        />
                      ) : (
                        <div
                          className="flex items-start gap-2 cursor-pointer group"
                          onClick={() => setEditingTaskId(task.id)}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              PRIORITY_DOT[task.priority] ?? "bg-muted/40"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-bright leading-snug group-hover:text-teal transition-colors">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {proj && (
                                <span className="text-[9px] font-mono text-muted/60">
                                  {proj.emoji} {proj.name}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono capitalize ${
                                  task.status === "done"
                                    ? "text-muted/40 line-through"
                                    : "text-muted/50"
                                }`}
                              >
                                {task.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-muted/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            ✎
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[10px] font-mono text-muted/30 text-center leading-relaxed">
              Click a day<br />to see its tasks
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
