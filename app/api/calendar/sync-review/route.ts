import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

export async function POST() {
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

  if (tokenRow.expires_at && new Date(tokenRow.expires_at as string) <= new Date()) {
    if (!tokenRow.refresh_token) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }
    const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
    accessToken = refreshed.access_token;
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("oauth_tokens")
      .update({ access_token: accessToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("user_id", "miguel")
      .eq("provider", "google");
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Block out weekly review time (Sunday evening)
  const reviewDay = format(addDays(weekEnd, 0), "yyyy-MM-dd");
  try {
    await createCalendarEvent(accessToken, {
      summary: "Weekly Review — Personal OS",
      description: "Weekly review session: wins, blockers, projects, finances, decisions.",
      start: { date: reviewDay },
      end: { date: format(addDays(weekEnd, 1), "yyyy-MM-dd") },
      colorId: "9",
    });
  } catch (err) {
    console.error("[sync-review] error:", err);
    return NextResponse.json({ error: "Failed to create review event" }, { status: 500 });
  }

  return NextResponse.json({ synced: 1, reviewDay });
}
