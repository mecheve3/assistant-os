"use client";

import { useState } from "react";

interface Props {
  calendarConnected: boolean;
  /** What to sync: "tasks" | "habits" | "review" */
  mode: "tasks" | "habits" | "review";
}

export function SyncToCalendarButton({ calendarConnected, mode }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);

  if (!calendarConnected) {
    return (
      <a
        href="/settings"
        className="text-[10px] font-mono text-muted/50 hover:text-muted transition-colors"
        title="Connect Google Calendar in Settings"
      >
        📅 Connect
      </a>
    );
  }

  const sync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch(`/api/calendar/sync-${mode}`, { method: "POST" });
      setResult(res.ok ? "ok" : "error");
    } catch {
      setResult("error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className={`text-[10px] font-mono px-2.5 py-1 border rounded transition-colors disabled:opacity-50 ${
        result === "ok"
          ? "text-teal border-teal/30 bg-teal/10"
          : result === "error"
          ? "text-danger border-danger/30 bg-danger/10"
          : "text-muted border-line hover:border-teal/30 hover:text-teal"
      }`}
      title="Sync to Google Calendar"
    >
      {syncing ? "Syncing…" : result === "ok" ? "✓ Synced" : result === "error" ? "✕ Error" : "📅 Sync"}
    </button>
  );
}
