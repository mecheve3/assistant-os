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

You are now in conversation mode. Answer follow-up questions directly and concisely. Reference his actual tasks and data when relevant. Keep responses under 80 words — this is a chat, not an essay.`,
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
      { data: habitLogs },
      { data: habits },
      { data: todayTasks },
      { data: inboxTasks },
      { data: debts },
    ] = await Promise.all([
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
      supabase
        .from("tasks")
        .select("id, title, priority, due_date")
        .eq("status", "inbox")
        .not("due_date", "is", null)
        .lte("due_date", today)
        .order("due_date"),
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

    // Habit completion rate last 7 days
    const habitCompletionSummary = (habits ?? []).map((h: Record<string, unknown>) => {
      const logs = (habitLogs ?? []).filter(
        (l: Record<string, unknown>) => l.habit_id === h.id
      );
      const completed = logs.filter((l: Record<string, unknown>) => l.completed).length;
      return {
        habit: h.name,
        completed_last_7d: completed,
        total_logs: logs.length,
        done_today: todayHabitLogs.some(
          (l: Record<string, unknown>) => l.habit_id === h.id && l.completed
        ),
      };
    });

    const context = {
      today,
      active_tasks: (todayTasks ?? []).map((t: Record<string, unknown>) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date ?? null,
        area: t.area,
      })),
      overdue_inbox_tasks: (inboxTasks ?? []).map((t: Record<string, unknown>) => ({
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
      })),
      habit_completion_7d: habitCompletionSummary,
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

Focus exclusively on: today's tasks (what needs doing, what's overdue), habit streaks and gaps over the last 7 days, and debt payments due this week. Flag if "Charge headphones" was skipped — it affects work quality. Do NOT comment on projects, project updates, or momentum tracking — Miguel tracks work through his task board, not activity logs.`,
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
