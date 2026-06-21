import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { format, addDays } from "date-fns";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const taskId: string | undefined = body.taskId;

  // Get stored tokens
  const { data: tokenRow } = await supabase
    .from("oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", "miguel")
    .eq("provider", "google")
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 401 });
  }

  let accessToken = tokenRow.access_token as string;

  // expires_at is stored as Unix ms bigint
  if (tokenRow.expires_at && new Date(Number(tokenRow.expires_at)) <= new Date()) {
    if (!tokenRow.refresh_token) {
      return NextResponse.json({ error: "Token expired and no refresh token" }, { status: 401 });
    }
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
      accessToken = refreshed.access_token;
      const expiresAtMs = Date.now() + refreshed.expires_in * 1000;
      await supabase
        .from("oauth_tokens")
        .update({ access_token: accessToken, expires_at: expiresAtMs, updated_at: new Date().toISOString() })
        .eq("user_id", "miguel")
        .eq("provider", "google");
    } catch (err) {
      console.error("[sync-tasks] refresh error:", err);
      return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
    }
  }

  // Fetch specific task or all tasks with due dates
  let query = supabase
    .from("tasks")
    .select("id, title, due_date, priority")
    .not("due_date", "is", null);

  if (taskId) {
    query = query.eq("id", taskId);
  } else {
    query = query.in("status", ["today", "inbox"]);
  }

  const { data: tasks } = await query;

  if (!tasks?.length) {
    return NextResponse.json({ synced: 0 });
  }

  let synced = 0;
  for (const task of tasks) {
    try {
      const dueDate = task.due_date as string;
      await createCalendarEvent(accessToken, {
        summary: `[Task] ${task.title}`,
        description: `Priority: ${task.priority}\nSynced from Personal OS`,
        start: { date: dueDate },
        end: { date: format(addDays(new Date(dueDate), 1), "yyyy-MM-dd") },
        colorId: task.priority === "urgent" ? "11" : task.priority === "high" ? "5" : "7",
      });
      synced++;
    } catch (err) {
      console.error("[sync-tasks] event create error:", err);
    }
  }

  return NextResponse.json({ synced });
}
