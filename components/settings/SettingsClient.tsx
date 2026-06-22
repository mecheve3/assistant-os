"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface Props {
  googleConnected: boolean;
  gcScope: string | null;
  usdRate: string;
}

export function SettingsClient({ googleConnected, gcScope, usdRate }: Props) {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("google_connected") === "true";
  const googleError = searchParams.get("google_error");

  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    window.location.href = "/settings";
  };

  return (
    <div className="space-y-8">

      {/* ─── Integrations ─── */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
          Integrations
        </h2>
        <div className="bg-card border border-line rounded-lg divide-y divide-line">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-raised flex items-center justify-center text-base">
                📅
              </div>
              <div>
                <p className="text-sm text-bright font-medium">Google Calendar</p>
                <p className="text-[10px] font-mono text-muted/60">
                  {googleConnected
                    ? gcScope?.includes("events")
                      ? "Connected — read & write events"
                      : "Connected — read only"
                    : "Sync tasks and habits to your calendar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(justConnected || googleConnected) && (
                <span className="text-[9px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded">
                  ● Connected
                </span>
              )}
              {googleError && (
                <span className="text-[9px] font-mono text-danger bg-danger/10 px-2 py-0.5 rounded">
                  ✕ {googleError.replace(/_/g, " ")}
                </span>
              )}
              {googleConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-[10px] font-mono px-3 py-1.5 border border-line rounded hover:border-danger/40 hover:text-danger transition-colors text-muted disabled:opacity-50"
                >
                  {disconnecting ? "..." : "Disconnect"}
                </button>
              ) : (
                <a
                  href="/api/auth/google"
                  className="text-[10px] font-mono px-3 py-1.5 bg-teal/10 text-teal border border-teal/30 rounded hover:bg-teal/20 transition-colors"
                >
                  Connect
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Personal Info ─── */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
          Personal Info
        </h2>
        <div className="bg-card border border-line rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Name</label>
              <p className="text-sm text-bright">Miguel</p>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted block mb-1">Location</label>
              <p className="text-sm text-bright">Medellín, Colombia</p>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted block mb-1">Email</label>
            <p className="text-sm text-bright font-mono">mecheve3@hotmail.com</p>
          </div>
          <p className="text-[10px] font-mono text-muted/40 italic">
            Profile info is managed directly in the database for now.
          </p>
        </div>
      </section>

      {/* ─── OS Preferences ─── */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
          OS Preferences
        </h2>
        <div className="bg-card border border-line rounded-lg divide-y divide-line">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-bright">Theme</p>
              <p className="text-[10px] font-mono text-muted/60">Dark mode only — hardcoded</p>
            </div>
            <span className="text-[10px] font-mono text-muted bg-raised px-2 py-1 rounded">Dark</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-bright">Currency</p>
              <p className="text-[10px] font-mono text-muted/60">Primary currency for finances</p>
            </div>
            <span className="text-[10px] font-mono text-muted bg-raised px-2 py-1 rounded">COP</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-bright">USD Rate</p>
              <p className="text-[10px] font-mono text-muted/60">
                Live rate from Frankfurter API
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted bg-raised px-2 py-1 rounded">
              {usdRate}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Data ─── */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">Data</h2>
        <div className="bg-card border border-line rounded-lg divide-y divide-line">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-bright">Reset Habits</p>
              <p className="text-[10px] font-mono text-muted/60">
                Wipe all habits + logs and seed Miguel&apos;s real routine
              </p>
            </div>
            <ResetButton
              label="Reset"
              url="/api/reset-habits"
              confirmText="Wipe all habits?"
            />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-bright">SQL Migrations</p>
              <p className="text-[10px] font-mono text-muted/60">
                Run new migrations in Supabase SQL editor
              </p>
            </div>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono px-3 py-1.5 border border-line rounded text-muted hover:text-bright transition-colors"
            >
              Open Supabase ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResetButton({
  label,
  url,
  confirmText,
}: {
  label: string;
  url: string;
  confirmText: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setLoading(true);
    await fetch(url, { method: "POST" });
    setLoading(false);
    setDone(true);
    setConfirm(false);
  };

  if (done) {
    return (
      <span className="text-[10px] font-mono text-teal">✓ Done</span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-danger">{confirmText}</span>
        <button
          onClick={run}
          disabled={loading}
          className="text-[9px] font-mono px-2 py-1 bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20 disabled:opacity-50"
        >
          {loading ? "..." : "Yes, reset"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-[9px] font-mono text-muted hover:text-bright"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-[10px] font-mono px-3 py-1.5 border border-line rounded text-muted hover:border-danger/40 hover:text-danger transition-colors"
    >
      {label}
    </button>
  );
}
