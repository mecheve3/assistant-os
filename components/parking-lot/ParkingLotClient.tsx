"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ParkingLotItem, Project } from "@/types";
import { formatDistanceToNow, parseISO } from "date-fns";
import { DatePicker } from "@/components/shared/DatePicker";

interface AISuggestion {
  id: string;
  category: "task" | "idea" | "note" | "link";
  project_name: string | null;
  reasoning: string;
}

interface Props {
  unprocessedItems: ParkingLotItem[];
  processedItems: ParkingLotItem[];
  projects: Pick<Project, "id" | "name" | "emoji">[];
}

const CATEGORY_ICONS: Record<string, string> = {
  task: "→",
  idea: "💡",
  note: "📝",
  link: "🔗",
  question: "?",
};

export function ParkingLotClient({ unprocessedItems, processedItems, projects }: Props) {
  const [unprocessed, setUnprocessed] = useState<ParkingLotItem[]>(unprocessedItems);
  const [processed, setProcessed] = useState<ParkingLotItem[]>(processedItems);
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);
  const [processedFilter, setProcessedFilter] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const projectNameMap = new Map(projects.map((p) => [p.name, p.id]));

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);

    const tempId = `temp-${Date.now()}`;
    const optimistic: ParkingLotItem = {
      id: tempId,
      content,
      category: null,
      assigned_project_id: null,
      processed: false,
      created_at: new Date().toISOString(),
    };
    setUnprocessed((prev) => [optimistic, ...prev]);

    const { data } = await supabase
      .from("parking_lot")
      .insert({ content, processed: false })
      .select()
      .single();

    if (data) {
      setUnprocessed((prev) =>
        prev.map((i) => (i.id === tempId ? (data as ParkingLotItem) : i))
      );
    }
  };

  const markProcessed = useCallback(
    async (item: ParkingLotItem, category?: ParkingLotItem["category"]) => {
      const updated = { ...item, processed: true, category: category ?? item.category };
      setUnprocessed((prev) => prev.filter((i) => i.id !== item.id));
      setProcessed((prev) => [updated, ...prev]);
      await supabase
        .from("parking_lot")
        .update({ processed: true, category: category ?? item.category })
        .eq("id", item.id);
    },
    []
  );

  const assignProject = async (item: ParkingLotItem, projectId: string | null) => {
    setUnprocessed((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, assigned_project_id: projectId } : i))
    );
    await supabase.from("parking_lot").update({ assigned_project_id: projectId }).eq("id", item.id);
  };

  const convertToTask = async (item: ParkingLotItem) => {
    await supabase.from("tasks").insert({
      title: item.content,
      priority: taskPriority,
      status: "inbox",
      project_id: taskProjectId || item.assigned_project_id || null,
      due_date: taskDueDate || null,
    });
    await markProcessed(item, "task");
    setConvertingId(null);
    setTaskPriority("medium");
    setTaskProjectId("");
    setTaskDueDate("");
  };

  const aiSort = async () => {
    if (unprocessed.length === 0) return;
    setAiLoading(true);
    const items = unprocessed
      .filter((i) => !i.id.startsWith("temp-"))
      .map((i) => ({ id: i.id, content: i.content }));

    const res = await fetch("/api/ai-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "parking_lot_sort",
        context: { items, projects: projects.map((p) => p.name) },
      }),
    });
    const data = await res.json();
    console.log("[parking-lot] AI sort response:", JSON.stringify(data).slice(0, 500));

    if (data.result?.suggestions) {
      console.log("[parking-lot] suggestions count:", data.result.suggestions.length);
      const map: Record<string, AISuggestion> = {};
      for (const s of data.result.suggestions) map[s.id] = s;
      setSuggestions(map);
    } else {
      console.warn("[parking-lot] no suggestions in result:", data.result);
    }
    setAiLoading(false);
  };

  const applySuggestion = async (item: ParkingLotItem, s: AISuggestion) => {
    const projectId = s.project_name ? (projectNameMap.get(s.project_name) ?? null) : null;
    if (projectId) {
      await supabase
        .from("parking_lot")
        .update({ assigned_project_id: projectId })
        .eq("id", item.id);
    }
    await markProcessed(item, s.category);
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const filteredProcessed = processedFilter
    ? processed.filter((i) => i.category === processedFilter)
    : processed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
      {/* ─── LEFT: Capture + Unprocessed ─── */}
      <div className="space-y-4">
        {/* Capture bar */}
        <form onSubmit={capture} className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="dump anything here — ideas, tasks, links, thoughts..."
            className="w-full bg-card border border-line focus:border-teal rounded-lg px-4 py-3.5 text-base text-bright placeholder:text-muted/40 focus:outline-none transition-colors"
          />
          {saved && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-teal text-sm font-mono">
              ● saved
            </span>
          )}
        </form>

        {/* Header + AI sort */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            Unprocessed — {unprocessed.length} items
          </p>
          <button
            onClick={aiSort}
            disabled={aiLoading || unprocessed.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ai/10 border border-ai/20 text-ai text-[10px] font-mono rounded hover:bg-ai/20 transition-colors disabled:opacity-40"
          >
            {aiLoading ? "◆ Sorting..." : "◆ AI SORT UNPROCESSED"}
          </button>
        </div>

        {/* Unprocessed items */}
        {unprocessed.length === 0 ? (
          <div className="bg-card border border-dashed border-line rounded-lg p-10 text-center">
            <p className="text-sm text-muted">Parking lot is clear. Capture something above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unprocessed.map((item) => (
              <div key={item.id} className="bg-card border border-line rounded-lg p-4">
                {/* Content */}
                <div className="mb-3">
                  {item.category && (
                    <span className="inline-block text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-raised text-muted/70 mb-1.5">
                      {CATEGORY_ICONS[item.category]} {item.category}
                    </span>
                  )}
                  <p className="text-sm text-bright">{item.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted/50">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </span>
                    {item.assigned_project_id && (
                      <span className="text-[10px] font-mono text-ai/70">
                        {projects.find((p) => p.id === item.assigned_project_id)?.emoji}{" "}
                        {projects.find((p) => p.id === item.assigned_project_id)?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {convertingId === item.id ? (
                  <div className="border-t border-line/50 pt-3 space-y-2">
                    <p className="text-[9px] font-mono uppercase text-muted tracking-widest">
                      Convert to Task
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(["urgent", "high", "medium", "low"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className={`text-[9px] font-mono uppercase px-2 py-1 rounded border transition-colors ${
                            taskPriority === p
                              ? p === "urgent"
                                ? "text-danger border-danger/40 bg-danger/10"
                                : p === "high"
                                ? "text-warn border-warn/40 bg-warn/10"
                                : p === "medium"
                                ? "text-info border-info/40 bg-info/10"
                                : "text-muted border-line bg-raised"
                              : "text-muted/40 border-transparent hover:border-line"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={taskProjectId}
                        onChange={(e) => setTaskProjectId(e.target.value)}
                        className="bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
                      >
                        <option value="">— No project —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.emoji} {p.name}
                          </option>
                        ))}
                      </select>
                      <DatePicker value={taskDueDate} onChange={setTaskDueDate} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => convertToTask(item)}
                        className="px-3 py-1.5 bg-teal text-base text-[10px] font-mono font-semibold rounded hover:opacity-90"
                      >
                        Save as Task
                      </button>
                      <button
                        onClick={() => setConvertingId(null)}
                        className="text-muted hover:text-bright text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-line/50 pt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setConvertingId(item.id);
                          setTaskPriority("medium");
                          setTaskProjectId("");
                        }}
                        className="text-[10px] font-mono px-2 py-1 bg-teal/10 text-teal rounded hover:bg-teal/20 transition-colors"
                      >
                        → Task
                      </button>
                      <button
                        onClick={() => markProcessed(item, "idea")}
                        className="text-[10px] font-mono px-2 py-1 bg-raised text-muted rounded hover:text-bright transition-colors"
                      >
                        💡 Idea
                      </button>
                      <button
                        onClick={() => markProcessed(item, "note")}
                        className="text-[10px] font-mono px-2 py-1 bg-raised text-muted rounded hover:text-bright transition-colors"
                      >
                        📝 Note
                      </button>
                      <button
                        onClick={() => markProcessed(item, "link")}
                        className="text-[10px] font-mono px-2 py-1 bg-raised text-muted rounded hover:text-bright transition-colors"
                      >
                        🔗 Link
                      </button>
                      <select
                        value={item.assigned_project_id ?? ""}
                        onChange={(e) => assignProject(item, e.target.value || null)}
                        className="text-[10px] font-mono px-2 py-1 bg-raised border border-line rounded text-muted focus:outline-none focus:border-teal cursor-pointer"
                      >
                        <option value="">Assign Project ▾</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.emoji} {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => markProcessed(item)}
                        className="text-[10px] font-mono px-2 py-1 bg-raised text-muted rounded hover:text-teal transition-colors ml-auto"
                      >
                        ✓ Done
                      </button>
                    </div>

                    {/* AI suggestion */}
                    {suggestions[item.id] && (
                      <div className="mt-2.5 pt-2.5 border-t border-ai/20 flex items-start gap-2">
                        <span className="text-ai text-[10px] font-mono shrink-0 mt-0.5">◆</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-ai/90">
                            {CATEGORY_ICONS[suggestions[item.id].category]}{" "}
                            {suggestions[item.id].category}
                            {suggestions[item.id].project_name &&
                              ` · ${suggestions[item.id].project_name}`}
                          </p>
                          <p className="text-[10px] text-muted/60 mt-0.5">
                            {suggestions[item.id].reasoning}
                          </p>
                        </div>
                        <button
                          onClick={() => applySuggestion(item, suggestions[item.id])}
                          className="shrink-0 text-[9px] font-mono px-2 py-0.5 bg-ai/10 text-ai rounded hover:bg-ai/20 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── RIGHT: Processed ─── */}
      <div className="bg-card border border-line rounded-lg overflow-hidden">
        <button
          onClick={() => setShowProcessed((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-raised/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
              Processed
            </span>
            <span className="text-[10px] font-mono text-teal/70 bg-teal/10 px-1.5 py-0.5 rounded">
              {processed.length}
            </span>
          </div>
          <span className="text-muted text-xs">{showProcessed ? "▲" : "▼"}</span>
        </button>

        {showProcessed && (
          <div className="border-t border-line">
            {/* Filter bar */}
            <div className="flex gap-1 px-3 py-2 border-b border-line/40">
              {["", "task", "idea", "note", "link"].map((f) => (
                <button
                  key={f || "all"}
                  onClick={() => setProcessedFilter(f)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors ${
                    processedFilter === f ? "bg-raised text-bright" : "text-muted/60 hover:text-muted"
                  }`}
                >
                  {!f
                    ? "All"
                    : f === "task"
                    ? "Tasks"
                    : f === "idea"
                    ? "Ideas"
                    : f === "note"
                    ? "Notes"
                    : "Links"}
                </button>
              ))}
            </div>

            {filteredProcessed.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">Nothing here yet</p>
            ) : (
              <div className="divide-y divide-line/30 max-h-[600px] overflow-y-auto">
                {filteredProcessed.map((item) => (
                  <div key={item.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] shrink-0 mt-0.5">
                        {item.category ? CATEGORY_ICONS[item.category] : "·"}
                      </span>
                      <p className="text-xs text-muted/70 flex-1 min-w-0">{item.content}</p>
                    </div>
                    <p className="text-[9px] font-mono text-muted/40 mt-0.5 pl-4">
                      {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
