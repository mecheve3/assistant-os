"use client";

import Link from "next/link";

export function ShowInactiveToggle({ showingInactive }: { showingInactive: boolean }) {
  return (
    <Link
      href={showingInactive ? "/projects" : "/projects?showInactive=1"}
      className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
        showingInactive
          ? "bg-muted/10 text-muted border-line hover:border-muted"
          : "text-muted/50 border-line/50 hover:text-muted hover:border-line"
      }`}
    >
      {showingInactive ? "Hide inactive" : "Show inactive"}
    </Link>
  );
}
