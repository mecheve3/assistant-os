import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  await supabase
    .from("oauth_tokens")
    .delete()
    .eq("user_id", "miguel")
    .eq("provider", "google");

  return NextResponse.json({ ok: true });
}
