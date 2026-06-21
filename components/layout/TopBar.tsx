"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { greeting } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Command Center",
  "/projects": "Projects HQ",
  "/finances": "Finances",
  "/finances/transactions": "Transactions",
  "/finances/debts": "Debts",
  "/habits": "Habits",
  "/tasks": "Tasks",
  "/goals": "Goals",
  "/parking-lot": "Parking Lot",
  "/weekly-review": "Weekly Review",
};

function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await supabase.from("parking_lot").insert({ content: text.trim() });
    setSaving(false);
    setText("");
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-card border border-line rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <span className="text-xs font-mono uppercase tracking-widest text-muted">
            Quick Capture → Parking Lot
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-muted hover:text-bright"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder="Type anything — task, idea, link, question... Enter to save."
            className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted resize-none focus:outline-none focus:border-teal transition-colors"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted font-mono">
              Enter to save · Shift+Enter for newline · Esc to cancel
            </span>
            <button
              onClick={save}
              disabled={!text.trim() || saving}
              className="px-3 py-1.5 bg-teal text-base text-xs font-mono font-medium rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/projects/") ? "Project" : pathname.slice(1));

  const now = new Date();
  const dateStr = format(now, "EEEE, MMMM d");

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-line bg-card">
        {/* Left — page title + date */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Mobile spacer so title doesn't overlap hamburger */}
          <div className="w-6 lg:hidden" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-bright truncate">
              {title}
            </h1>
            <p className="text-[11px] font-mono text-muted hidden sm:block">
              {greeting()} · {dateStr}
            </p>
          </div>
        </div>

        {/* Right — quick add */}
        <button
          onClick={() => setCaptureOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-raised border border-line hover:border-teal text-muted hover:text-teal rounded text-xs font-mono transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Quick Capture</span>
        </button>
      </header>

      {captureOpen && (
        <QuickCaptureModal onClose={() => setCaptureOpen(false)} />
      )}
    </>
  );
}
