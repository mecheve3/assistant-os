import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { AIInsight } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const HABITS_TO_WATCH = ["Charge headphones"];

const SYSTEM_BASE = `You are Miguel's personal operating system co-pilot. Miguel is a software entrepreneur in Medellín, Colombia managing multiple simultaneous projects while holding a day job. He thinks in systems, moves fast, and values honest, direct feedback over encouragement.`;

// ─── Conversation mode ────────────────────────────────────────────────────────

async function handleConversation(body: {
  messages: { role: string; content: string }[];
  userMessage: string;
  insights: AIInsight[];
}) {
  const { messages, userMessage, insights } = body;

  const briefingSummary =
    insights.length > 0
      ? `Today's briefing:\n${insights.map((i) => `- [${i.type}] ${i.text}`).join("\n")}`
      : "";

  const history = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: `${SYSTEM_BASE}

${briefingSummary}

You are now in conversation mode. Answer follow-up questions directly and concisely. Reference his actual projects and data when relevant. Keep responses under 80 words — this is a chat, not an essay.`,
    messages: [...history, { role: "user", content: userMessage }],
  });

  const reply =
    msg.content[0].type === "text"
      ? msg.content[0].text
      : "I couldn't respond right now.";

  return NextResponse.json({ reply });
}

// ─── Briefing mode ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.conversationMode) {
    return handleConversation(body);
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const [
      { data: projects },
      { data: recentUpdates },
      { data: habitLogs },
      { data: habits },
      { data: todayTasks },
      { data: debts },
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("inactive", false).order("name"),
      supabase
        .from("project_updates")
        .select("*, projects(name)")
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false }),
      supabase
        .from("habit_logs")
        .select("*, habits(name)")
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false }),
      supabase.from("habits").select("*").eq("active", true),
      supabase
        .from("tasks")
        .select("*")
        .in("status", ["today", "in_progress"])
        .order("priority"),
      supabase.from("finances_debts").select("*").eq("active", true),
    ]);

    const todayHabitLogs = (habitLogs ?? []).filter(
      (l: Record<string, unknown>) => l.date === today
    );
    const habitNameMap = new Map(
      (habits ?? []).map((h: Record<string, unknown>) => [h.id, h.name])
    );

    const habitsToWatchStatus = HABITS_TO_WATCH.map((name) => {
      const habit = (habits ?? []).find(
        (h: Record<string, unknown>) => h.name === name
      );
      if (!habit) return { name, status: "not found" };
      const log = todayHabitLogs.find(
        (l: Record<string, unknown>) => l.habit_id === habit.id
      );
      return { name, completed_today: log?.completed ?? false };
    });

    const context = {
      today,
      projects: (projects ?? []).map((p: Record<string, unknown>) => ({
        name: p.name,
        stage: p.stage,
        last_update:
          (recentUpdates ?? [])
            .filter((u: Record<string, unknown>) => u.project_id === p.id)
            .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
              String(b.date).localeCompare(String(a.date))
            )[0]?.date ?? "no updates",
      })),
      recent_project_updates: (recentUpdates ?? []).slice(0, 10).map(
        (u: Record<string, unknown>) => ({
          project: (u.projects as Record<string, unknown>)?.name,
          date: u.date,
          what_i_did: u.what_i_did,
          next_action: u.next_action,
          what_is_blocked: u.what_is_blocked,
        })
      ),
      todays_tasks: todayTasks ?? [],
      habit_completion_7d: (habitLogs ?? []).map(
        (l: Record<string, unknown>) => ({
          habit: habitNameMap.get(l.habit_id as string) ?? l.habit_id,
          date: l.date,
          completed: l.completed,
        })
      ),
      habits_to_watch: habitsToWatchStatus,
      active_debts: (debts ?? []).map((d: Record<string, unknown>) => ({
        name: d.name,
        balance: d.current_balance,
        currency: d.currency,
        payment_day: d.payment_day,
      })),
    };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: `Today's context for Miguel:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
      system: `${SYSTEM_BASE}

Analyze the provided context and return exactly 3-5 insights as a JSON array. Each insight must have:
- type: "focus" | "warning" | "opportunity" | "pattern"
- text: max 25 words — actionable, specific, no fluff
- priority: 1 | 2 | 3 (1 = act on this today, 3 = keep in mind)

Respond with ONLY valid JSON, no markdown, no prose:
{"insights": [...]}

Prioritize ruthlessly: projects stalling (no updates 7+ days), overdue tasks, habit streak gaps, debt payments due this week. Flag if "Charge headphones" habit was skipped — it affects work quality. Identify cross-project patterns. Be the advisor who tells Miguel what he needs to hear.`,
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    let insights: AIInsight[] = [];
    try {
      const parsed = JSON.parse(raw);
      insights = parsed.insights ?? [];
    } catch {
      insights = [
        {
          type: "warning",
          text: "AI briefing parse error — check API response format.",
          priority: 3,
        },
      ];
    }

    return NextResponse.json({
      insights,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI briefing error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
