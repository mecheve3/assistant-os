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
    .order("updated_at", { ascending: false })
    .limit(1)
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

  const listsRes = await fetch(`${TASKS_BASE}/users/@me/lists?maxResults=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listsRes.ok) {
    const errText = await listsRes.text().catch(() => "");
    console.error(`[google-tasks] Lists fetch failed: ${listsRes.status} ${errText}`);
    // 401/403 = missing Tasks scope → send user back through re-auth
    if (listsRes.status === 401 || listsRes.status === 403) {
      return NextResponse.json({ needsAuth: true }, { status: 401 });
    }
    return NextResponse.json(
      { error: "lists_failed", status: listsRes.status },
      { status: 200 }
    );
  }

  const listsData = await listsRes.json();
  const lists: { id: string; title: string }[] = listsData.items ?? [];
  console.log(`[google-tasks] Found ${lists.length} task list(s): ${lists.map((l) => l.title).join(", ")}`);

  const tasksByList = await Promise.all(
    lists.map(async (list) => {
      try {
        const res = await fetch(
          `${TASKS_BASE}/lists/${list.id}/tasks?showCompleted=false&maxResults=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`[google-tasks] Tasks fetch failed for "${list.title}": ${res.status} ${errText}`);
          return { listId: list.id, list: list.title, tasks: [], error: `${res.status}` };
        }
        const data = await res.json();
        const tasks = (data.items ?? []) as { id: string; title: string; due?: string; status?: string }[];
        const pending = tasks.filter((t) => t.status !== "completed");
        console.log(`[google-tasks] List "${list.title}": ${pending.length} pending tasks`);
        return { listId: list.id, list: list.title, tasks: pending };
      } catch (err) {
        console.error(`[google-tasks] Exception for "${list.title}":`, err);
        return { listId: list.id, list: list.title, tasks: [], error: "exception" };
      }
    })
  );

  return NextResponse.json({ tasksByList, listCount: lists.length });
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
