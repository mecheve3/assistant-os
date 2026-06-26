"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek } from "date-fns";

interface ReviewContext {
  habitCompletionPct: number;
  tasksCompletedCount: number;
  projectsUpdatedCount: number;
  stalledTasks: Array<{ id: string; title: string; daysSinceCreated: number }>;
  projects: Array<{
    id: string;
    name: string;
    emoji: string | null;
    stage: string;
    lastUpdateDate: string | null;
    daysSinceUpdate: number | null;
  }>;
  weekIncome: number;
  weekExpenses: number;
  debtBalances: Array<{ name: string; current_balance: number; currency: string }>;
  lastReviewDate: string | null;
}

interface AISummary {
  summary: string;
  patterns: string[];
  recommendations: string[];
  one_thing: string;
}

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

// Steps: 1=Wins, 2=Blockers, 3=Projects, 4=Decisions, 5=Summary (Finance removed)
const STEP_LABELS = ["Wins", "Blockers", "Projects", "Decisions", "Summary"];
const TOTAL_STEPS = 5;

export function WeeklyReviewFlow({ context }: { context: ReviewContext }) {
  const router = useRouter();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [step, setStep] = useState(1);
  const [wins, setWins] = useState("");
  const [blockers, setBlockers] = useState("");
  const [projectDecisions, setProjectDecisions] = useState<
    Record<string, "active" | "pause" | "kill">
  >({});
  const [decisions, setDecisions] = useState("");
  const [focusAreas, setFocusAreas] = useState(["", "", ""]);
  const [cogLoad, setCogLoad] = useState(5);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Conversation thread
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convInput, setConvInput] = useState("");
  const [convTyping, setConvTyping] = useState(false);
  const convEndRef = useRef<HTMLDivElement>(null);

  const stalledProjects = context.projects.filter(
    (p) =>
      (p.daysSinceUpdate == null || p.daysSinceUpdate >= 7) &&
      !["paused", "killed"].includes(p.stage)
  );
  const allStalledDecided = stalledProjects.every((p) => projectDecisions[p.id]);
  const canGoNext = step !== 3 || stalledProjects.length === 0 || allStalledDecided;

  // Load existing conversation when reaching the summary step
  useEffect(() => {
    if (step !== TOTAL_STEPS) return;
    supabase
      .from("weekly_review_conversations")
      .select("role, content")
      .eq("week_start_date", weekStart)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data?.length) {
          setConvMessages(data as ConvMessage[]);
        }
      });
  }, [step, weekStart]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  const handleProjectDecision = async (
    projectId: string,
    decision: "active" | "pause" | "kill"
  ) => {
    setProjectDecisions((prev) => ({ ...prev, [projectId]: decision }));
    if (decision !== "active") {
      await supabase
        .from("projects")
        .update({ stage: decision === "pause" ? "paused" : "killed" })
        .eq("id", projectId);
    }
  };

  const generateAI = async () => {
    setAiLoading(true);
    const ctx = {
      wins,
      blockers,
      decisions,
      focusAreas: focusAreas.filter(Boolean),
      cogLoadForecast: cogLoad,
      weekData: {
        habitCompletionPct: context.habitCompletionPct,
        tasksCompleted: context.tasksCompletedCount,
        projectsUpdated: context.projectsUpdatedCount,
        projectDecisions,
      },
    };
    const res = await fetch("/api/ai-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "weekly_review", context: ctx }),
    });
    const data = await res.json();
    if (data.result?.summary) {
      setAiSummary(data.result as AISummary);
    }
    setAiLoading(false);
  };

  const saveReview = async () => {
    setSaving(true);
    await supabase.from("weekly_reviews").upsert(
      {
        week_start_date: weekStart,
        wins,
        blockers,
        decisions_made: decisions,
        projects_summary: Object.entries(projectDecisions)
          .map(([id, d]) => {
            const proj = context.projects.find((p) => p.id === id);
            return `${proj?.name ?? id}: ${d}`;
          })
          .join(", "),
        next_week_focus: focusAreas.filter(Boolean).join("\n"),
        habits_score: context.habitCompletionPct,
        finances_summary: null,
        ai_insights: aiSummary ? JSON.stringify(aiSummary) : null,
      },
      { onConflict: "week_start_date" }
    );
    setSaving(false);
    router.push("/?reviewed=true");
  };

  const sendConvMessage = async () => {
    const text = convInput.trim();
    if (!text || convTyping) return;
    setConvInput("");

    const userMsg: ConvMessage = { role: "user", content: text };
    setConvMessages((prev) => [...prev, userMsg]);
    setConvTyping(true);

    await supabase.from("weekly_review_conversations").insert({
      week_start_date: weekStart,
      role: "user",
      content: text,
    });

    const weeklyContext = {
      wins,
      blockers,
      decisions,
      focusAreas: focusAreas.filter(Boolean),
      aiSummary,
    };

    const res = await fetch("/api/ai-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "weekly_review",
        conversationMode: true,
        messages: convMessages,
        userMessage: text,
        weeklyContext,
      }),
    });
    const data = await res.json();
    const reply = data.reply ?? "I couldn't respond right now. Try again.";

    const assistantMsg: ConvMessage = { role: "assistant", content: reply };
    setConvMessages((prev) => [...prev, assistantMsg]);
    setConvTyping(false);

    await supabase.from("weekly_review_conversations").insert({
      week_start_date: weekStart,
      role: "assistant",
      content: reply,
    });
  };

  const TA =
    "w-full bg-raised border border-line focus:border-teal rounded-lg px-4 py-3 text-sm text-bright placeholder:text-muted/40 focus:outline-none resize-none";

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-muted">
            STEP {step} OF {TOTAL_STEPS}
          </span>
          <span className="text-[10px] font-mono text-muted">
            {STEP_LABELS[step - 1].toUpperCase()}
          </span>
        </div>
        <div className="h-1 bg-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <div className="bg-card border border-line rounded-lg p-6">
        {/* ── Step 1: Wins ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-bright mb-1">
                What went well this week?
              </h2>
              <p className="text-[10px] font-mono text-muted">
                Wins, breakthroughs, shipped things, personal victories.
              </p>
            </div>
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              rows={6}
              placeholder="List your wins — big and small…"
              className={TA}
              autoFocus
            />
          </div>
        )}

        {/* ── Step 2: Blockers ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-bright mb-1">
                What was blocked or hard?
              </h2>
              <p className="text-[10px] font-mono text-muted">
                Obstacles, decisions avoided, things that drained energy.
              </p>
            </div>
            {context.stalledTasks.length > 0 && (
              <div className="p-3 bg-warn/5 border border-warn/20 rounded-lg">
                <p className="text-[9px] font-mono uppercase text-warn/70 mb-2">
                  Tasks stuck in Today for 3+ days
                </p>
                {context.stalledTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-0.5">
                    <span className="text-[10px] font-mono text-warn w-6 shrink-0">
                      {t.daysSinceCreated}d
                    </span>
                    <p className="text-xs text-muted">{t.title}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={4}
              placeholder="What slowed you down? What are you avoiding?"
              className={TA}
              autoFocus
            />
          </div>
        )}

        {/* ── Step 3: Projects ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-bright mb-1">Project Heartbeat</h2>
              <p className="text-[10px] font-mono text-muted">
                {context.projects.length === 0
                  ? "No projects found. Add projects in Projects HQ first."
                  : stalledProjects.length > 0
                  ? `${stalledProjects.length} project${
                      stalledProjects.length > 1 ? "s" : ""
                    } stalled 7+ days — force a decision to continue.`
                  : "All projects have recent activity."}
              </p>
            </div>
            {context.projects.length === 0 ? (
              <p className="text-sm text-muted/50 text-center py-6">No projects to review.</p>
            ) : (
              <div className="space-y-2">
                {context.projects.map((p) => {
                  const isStalled =
                    (p.daysSinceUpdate == null || p.daysSinceUpdate >= 7) &&
                    !["paused", "killed"].includes(p.stage);
                  const isPaused = p.stage === "paused";
                  const decision = projectDecisions[p.id];
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isStalled
                          ? "border-warn/20 bg-warn/5"
                          : isPaused
                          ? "border-line/60 bg-raised/20 opacity-60"
                          : "border-line bg-raised/30"
                      }`}
                    >
                      <span className="text-base shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-bright truncate">{p.name}</p>
                        <p
                          className={`text-[9px] font-mono ${
                            p.daysSinceUpdate == null
                              ? "text-warn/70"
                              : p.daysSinceUpdate >= 7
                              ? "text-warn/70"
                              : "text-muted/50"
                          }`}
                        >
                          {isPaused
                            ? "Paused"
                            : p.lastUpdateDate
                            ? `Updated ${p.daysSinceUpdate}d ago`
                            : "Never updated"}
                        </p>
                      </div>
                      {isStalled ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {(["active", "pause", "kill"] as const).map((d) => (
                            <button
                              key={d}
                              onClick={() => handleProjectDecision(p.id, d)}
                              className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                                decision === d
                                  ? d === "active"
                                    ? "text-teal border-teal/40 bg-teal/10"
                                    : d === "pause"
                                    ? "text-warn border-warn/40 bg-warn/10"
                                    : "text-danger border-danger/40 bg-danger/10"
                                  : "text-muted/50 border-line hover:border-muted"
                              }`}
                            >
                              {d === "active" ? "✓ Active" : d === "pause" ? "⏸ Pause" : "✕ Kill"}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={`text-[9px] font-mono shrink-0 ${
                            isPaused ? "text-warn" : "text-teal"
                          }`}
                        >
                          {isPaused ? "⏸" : "✓"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!canGoNext && (
              <p className="text-xs font-mono text-warn text-center">
                Decide on all stalled projects to continue
              </p>
            )}
          </div>
        )}

        {/* ── Step 4: Decisions & Focus ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-bright mb-1">Decisions & Focus</h2>
              <p className="text-[10px] font-mono text-muted">
                What did you decide? What will you focus on next week?
              </p>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1.5">
                Decisions made this week
              </label>
              <textarea
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                rows={3}
                placeholder="Strategic decisions, commitments, things you chose…"
                className={TA}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-muted block">
                3 Focus Areas for Next Week
              </label>
              {focusAreas.map((area, i) => (
                <input
                  key={i}
                  type="text"
                  value={area}
                  onChange={(e) =>
                    setFocusAreas((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  placeholder={`Focus ${i + 1}…`}
                  className="w-full bg-raised border border-line focus:border-teal rounded-lg px-4 py-2.5 text-sm text-bright placeholder:text-muted/40 focus:outline-none"
                />
              ))}
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted block mb-2">
                Predicted Cognitive Load Next Week
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={cogLoad}
                  onChange={(e) => setCogLoad(Number(e.target.value))}
                  className="flex-1 accent-teal"
                />
                <span className="text-sm font-mono text-bright w-6 text-center">{cogLoad}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] font-mono text-muted/40">Low</span>
                <span className="text-[9px] font-mono text-muted/40">High</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: AI Summary + Conversation ── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-bright mb-1">AI Weekly Summary</h2>
              <p className="text-[10px] font-mono text-muted">
                Generate an honest assessment of your week, then save.
              </p>
            </div>

            {!aiSummary ? (
              <div className="text-center py-10">
                <button
                  onClick={generateAI}
                  disabled={aiLoading}
                  className="px-6 py-3 bg-ai/10 border border-ai/20 text-ai font-mono text-sm rounded-lg hover:bg-ai/20 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? "◆ Analyzing your week…" : "◆ Generate Summary"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="border-l-4 border-ai bg-ai/5 rounded-r-lg p-4">
                  <p className="text-[9px] font-mono uppercase text-ai/60 mb-2">Summary</p>
                  <p className="text-sm text-bright leading-relaxed">{aiSummary.summary}</p>
                </div>

                {/* Patterns */}
                {aiSummary.patterns?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono uppercase text-muted mb-2">Patterns</p>
                    <div className="space-y-1.5">
                      {aiSummary.patterns.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-ai text-[10px] shrink-0 mt-0.5">◆</span>
                          <p className="text-sm text-muted">{p}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiSummary.recommendations?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono uppercase text-muted mb-2">
                      Recommendations
                    </p>
                    <div className="space-y-1.5">
                      {aiSummary.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[9px] font-mono text-muted/40 mt-1 shrink-0 w-3">
                            {i + 1}
                          </span>
                          <p className="text-sm text-muted">{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ONE THING */}
                {aiSummary.one_thing && (
                  <div className="border border-teal/30 bg-teal/5 rounded-lg p-4">
                    <p className="text-[9px] font-mono uppercase text-teal/60 mb-2">
                      ONE THING FOR MONDAY
                    </p>
                    <p className="text-lg font-mono font-bold text-teal leading-snug">
                      {aiSummary.one_thing}
                    </p>
                  </div>
                )}

                {/* ── Conversation thread ── */}
                <div className="border border-line rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-raised/40 border-b border-line">
                    <p className="text-[9px] font-mono uppercase text-muted/60">
                      Ask a follow-up about your week
                    </p>
                  </div>

                  {convMessages.length > 0 && (
                    <div className="max-h-64 overflow-y-auto p-3 space-y-3">
                      {convMessages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                              m.role === "user"
                                ? "bg-teal/15 text-bright"
                                : "bg-raised text-muted border border-line/60"
                            }`}
                          >
                            {m.role === "assistant" && (
                              <span className="text-[9px] font-mono text-ai/70 block mb-1">◆</span>
                            )}
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {convTyping && (
                        <div className="flex justify-start">
                          <div className="bg-raised border border-line/60 px-3 py-2 rounded-lg">
                            <span className="text-[10px] font-mono text-ai/60">◆ thinking…</span>
                          </div>
                        </div>
                      )}
                      <div ref={convEndRef} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-2 border-t border-line/40">
                    <input
                      type="text"
                      value={convInput}
                      onChange={(e) => setConvInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendConvMessage(); } }}
                      placeholder="Ask a follow-up about your week…"
                      className="flex-1 bg-transparent text-xs text-bright placeholder:text-muted/40 focus:outline-none px-1"
                    />
                    <button
                      onClick={sendConvMessage}
                      disabled={!convInput.trim() || convTyping}
                      className="text-[10px] font-mono text-teal hover:text-teal/70 disabled:opacity-30 transition-colors px-2 py-1 shrink-0"
                    >
                      Send →
                    </button>
                  </div>
                </div>

                <button
                  onClick={saveReview}
                  disabled={saving}
                  className="w-full py-3 bg-teal text-base font-mono font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? "Saving…" : "Save Week & Finish"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div
          className={`flex items-center ${step > 1 ? "justify-between" : "justify-end"} mt-6 pt-4 border-t border-line`}
        >
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-[10px] font-mono text-muted hover:text-bright transition-colors"
            >
              ← Back
            </button>
          )}
          {step < TOTAL_STEPS && (
            <button
              onClick={() => { if (canGoNext) setStep((s) => s + 1); }}
              disabled={!canGoNext}
              className="px-6 py-2 bg-teal/10 border border-teal/20 text-teal text-[10px] font-mono rounded hover:bg-teal/20 transition-colors disabled:opacity-40"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
