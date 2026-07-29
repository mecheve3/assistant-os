import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/auth/google/status — debug: show stored token info (no secrets)
export async function GET() {
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("provider, user_id, scope, expiry_date, updated_at")
    .eq("provider", "google")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    user_id: data.user_id,
    scope: data.scope,
    has_tasks_scope: data.scope?.includes("tasks") ?? false,
    expiry_date: data.expiry_date,
    expires_at: data.expiry_date ? new Date(data.expiry_date).toISOString() : null,
    updated_at: data.updated_at,
  });
}
