import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google-calendar";

// GET /api/auth/google — redirect user to Google OAuth consent screen
export async function GET() {
  const url = buildAuthUrl();
  return NextResponse.redirect(url);
}
