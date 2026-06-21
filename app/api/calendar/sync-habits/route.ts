import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { format, addDays } from "date-fns";
import { isDueOn } from "@/lib/habits";
import { Habit } from "@/types";

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

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("active", true);

  if (!habits?.length) return NextResponse.json({ synced: 0 });

  const today = new Date();
  let synced = 0;

  for (const h of habits as Habit[]) {
    if (!isDueOn(h, today)) continue;
    const dateStr = format(today, "yyyy-MM-dd");
    try {
      await createCalendarEvent(accessToken, {
        summary: `[Habit] ${h.name}`,
        description: `Category: ${h.category ?? "—"}\nSynced from Personal OS`,
        start: { date: dateStr },
        end: { date: format(addDays(today, 1), "yyyy-MM-dd") },
        colorId: "2",
      });
      synced++;
    } catch (err) {
      console.error("[sync-habits] error:", err);
    }
  }

  return NextResponse.json({ synced });
}
