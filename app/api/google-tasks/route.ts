import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { refreshAccessToken } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

const TASKS_BASE = "https://tasks.googleapis.com/tasks/v1";

interface TokenRow {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  scope: string | null;
}

async function getValidAccessToken(): Promise<string | null> {
  const { data } = await supabase
    .from("oauth_tokens")
    .select("access_token, refresh_token, expiry_date, scope")
    .eq("provider", "google")
    .eq("user_id", "miguel")
    .maybeSingle();

  if (!data) return null;
  const row = data as TokenRow;

  // Tasks scope required
  if (!row.scope?.includes("tasks")) return null;

  // Refresh token if expiring within 60s
  if (row.expiry_date && Date.now() > row.expiry_date - 60_000 && row.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(row.refresh_token);
      const expiryMs = refreshed.expiry_date
        ? Number(refreshed.expiry_date)
        : Date.now() + refreshed.expires_in * 1000;
      await supabase
        .from("oauth_tokens")
        .update({
          access_token: refreshed.access_token,
          expiry_date: expiryMs,
          expires_at: expiryMs,
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "google")
        .eq("user_id", "miguel");
      return refreshed.access_token;
    } catch {
      return null;
    }
  }

  return row.access_token;
}

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ needsAuth: true }, { status: 401 });
  }

  const listsRes = await fetch(`${TASKS_BASE}/users/@me/lists?maxResults=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listsRes.ok) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  const listsData = await listsRes.json();
  const lists: { id: string; title: string }[] = listsData.items ?? [];

  const tasksByList = await Promise.all(
    lists.map(async (list) => {
      try {
        const res = await fetch(
          `${TASKS_BASE}/lists/${list.id}/tasks?showCompleted=false&showHidden=false&maxResults=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return { listId: list.id, list: list.title, tasks: [] };
        const data = await res.json();
        return {
          listId: list.id,
          list: list.title,
          tasks: (data.items ?? []) as { id: string; title: string; due?: string }[],
        };
      } catch {
        return { listId: list.id, list: list.title, tasks: [] };
      }
    })
  );

  return NextResponse.json({ tasksByList });
}

export async function POST(req: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ needsAuth: true }, { status: 401 });
  }

  const { listId, taskId } = (await req.json()) as { listId: string; taskId: string };

  const res = await fetch(`${TASKS_BASE}/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "completed" }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "complete_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
