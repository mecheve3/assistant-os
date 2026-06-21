import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/auth/google/callback — handle OAuth code exchange and store tokens
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?google_error=${error ?? "no_code"}`);
  }

  try {
    const tokens = await exchangeCode(code);

    // expiry_date and expires_at are bigint (Unix ms) — never pass an ISO string
    const expiryMs = tokens.expiry_date
      ? Number(tokens.expiry_date)
      : tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : Date.now() + 3600 * 1000; // default 1 hour

    const { error: dbErr } = await supabase.from("oauth_tokens").upsert(
      {
        provider: "google",
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expiry_date: expiryMs,
        expires_at: expiryMs,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        id_token: tokens.id_token ?? null,
        user_id: "miguel",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );

    if (dbErr) {
      console.error("[google-callback] DB error full:", JSON.stringify(dbErr, null, 2));
      return NextResponse.redirect(`${base}/settings?google_error=db_error`);
    }

    return NextResponse.redirect(`${base}/settings?google_connected=true`);
  } catch (err) {
    console.error("[google-callback] exchange error:", err);
    return NextResponse.redirect(`${base}/settings?google_error=exchange_failed`);
  }
}
