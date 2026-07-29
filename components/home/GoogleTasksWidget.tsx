"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  due?: string;
}

interface TaskList {
  listId: string;
  list: string;
  tasks: TaskItem[];
}

export function GoogleTasksWidget() {
  const [tasksByList, setTasksByList] = useState<TaskList[] | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/google-tasks")
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 401) {
          setNeedsAuth(true);
        } else {
          setTasksByList(json.tasksByList ?? []);
        }
      })
      .catch(() => setNeedsAuth(true))
      .finally(() => setLoading(false));
  }, []);

  const completeTask = async (listId: string, taskId: string) => {
    setCompleting((s) => new Set(s).add(taskId));
    try {
      await fetch("/api/google-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, taskId }),
      });
      setTasksByList((prev) =>
        (prev ?? []).map((l) =>
          l.listId === listId
            ? { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
            : l
        )
      );
    } finally {
      setCompleting((s) => {
        const n = new Set(s);
        n.delete(taskId);
        return n;
      });
    }
  };

  const allTasks = (tasksByList ?? []).flatMap((l) =>
    l.tasks.map((t) => ({ ...t, listId: l.listId }))
  );

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Google Tasks
      </p>

      {loading && (
        <div className="space-y-2">
          {[78, 90, 65].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-raised rounded animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      {!loading && needsAuth && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted/60 font-mono">Google Tasks not connected.</p>
          <a
            href="/api/auth/google"
            className="inline-block text-[10px] font-mono text-teal hover:underline"
          >
            Reconnect Google account →
          </a>
          <p className="text-[9px] font-mono text-muted/40">
            Re-auth required to add Tasks permission.
          </p>
        </div>
      )}

      {!loading && !needsAuth && allTasks.length === 0 && (
        <p className="text-xs text-muted/50 font-mono py-1">No pending tasks.</p>
      )}

      {!loading && !needsAuth && allTasks.length > 0 && (
        <div className="space-y-1">
          {allTasks.slice(0, 8).map((task) => (
            <div key={task.id} className="flex items-center gap-2 py-0.5">
              <button
                onClick={() => completeTask(task.listId, task.id)}
                disabled={completing.has(task.id)}
                className={[
                  "w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                  completing.has(task.id)
                    ? "bg-teal border-teal"
                    : "border-line hover:border-teal",
                ].join(" ")}
              >
                {completing.has(task.id) && (
                  <Check className="w-2.5 h-2.5 text-base" />
                )}
              </button>
              <span className="flex-1 text-xs text-bright truncate">{task.title}</span>
              {task.due && (
                <span className="text-[9px] font-mono text-muted/50 shrink-0">
                  {new Date(task.due).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          ))}
          {allTasks.length > 8 && (
            <p className="text-[9px] font-mono text-muted/40 pt-0.5">
              +{allTasks.length - 8} more in Google Tasks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
