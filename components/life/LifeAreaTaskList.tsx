"use client";

import { useState, useCallback } from "react";
import { Check, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Task } from "@/types";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-danger",
  high: "bg-warn",
  medium: "bg-info/60",
  low: "bg-muted/30",
};

const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low"] as const;

interface Props {
  lifeArea: string;
  initialTasks: Task[];
}

export function LifeAreaTaskList({ lifeArea, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [adding, setAdding] = useState(false);

  const add = useCallback(async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    const { data } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        priority,
        status: "inbox",
        area: "personal",
        life_area: lifeArea,
      })
      .select()
      .single();
    if (data) setTasks((prev) => [data as Task, ...prev]);
    setTitle("");
    setAdding(false);
  }, [title, priority, lifeArea, adding]);

  const complete = useCallback(async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
  }, []);

  const destroy = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  }, []);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Tasks
      </p>

      {/* Quick add */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add task… (Enter to save)"
          className="flex-1 bg-raised border border-line rounded px-3 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
        />
        <div className="flex items-center gap-0.5">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={[
                "w-5 h-5 rounded text-[9px] font-mono font-bold border transition-colors",
                priority === p
                  ? p === "urgent" ? "bg-danger/20 text-danger border-danger/40"
                    : p === "high" ? "bg-warn/20 text-warn border-warn/40"
                    : p === "medium" ? "bg-info/20 text-info border-info/40"
                    : "bg-raised text-muted border-line"
                  : "text-muted/30 border-transparent",
              ].join(" ")}
            >
              {p[0].toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={add}
          disabled={adding || !title.trim()}
          className="px-3 py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          {adding ? "…" : "Add"}
        </button>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-xs text-muted/50 font-mono text-center py-6">
          No tasks here yet.
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2.5 py-2 group border-b border-line/30 last:border-0">
              <button
                onClick={() => complete(task)}
                className="w-4 h-4 rounded border border-line hover:border-teal flex items-center justify-center shrink-0 transition-colors group/check"
                title="Mark done"
              >
                <Check className="w-2.5 h-2.5 text-teal opacity-0 group-hover/check:opacity-100 transition-opacity" />
              </button>

              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-muted/30"}`}
              />

              <span className="text-sm text-bright flex-1 truncate">{task.title}</span>

              {task.due_date && (
                <span className="text-[10px] font-mono text-muted/60 shrink-0">
                  {task.due_date}
                </span>
              )}

              <button
                onClick={() => destroy(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all shrink-0"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
