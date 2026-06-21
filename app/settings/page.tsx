import { supabase } from "@/lib/supabase";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { data: gcToken } = await supabase
    .from("oauth_tokens")
    .select("provider, expires_at, scope")
    .eq("user_id", "miguel")
    .eq("provider", "google")
    .maybeSingle();

  const googleConnected = !!gcToken;
  const usdRate = process.env.USD_TO_COP_RATE ?? "4200";

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Configuration
        </p>
        <h1 className="text-xl font-semibold text-bright">Settings</h1>
      </div>

      <SettingsClient
        googleConnected={googleConnected}
        gcScope={gcToken?.scope ?? null}
        usdRate={usdRate}
      />
    </div>
  );
}
