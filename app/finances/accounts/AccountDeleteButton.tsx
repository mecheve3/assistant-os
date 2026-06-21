"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AccountDeleteButton({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from("finances_accounts").delete().eq("id", accountId);
    router.refresh();
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] font-mono text-danger">Delete {accountName}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-[9px] font-mono px-2 py-0.5 bg-danger/10 text-danger border border-danger/30 rounded hover:bg-danger/20 disabled:opacity-50"
        >
          {deleting ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-[9px] font-mono text-muted hover:text-bright px-1"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-muted/40 hover:text-danger transition-all px-1.5 py-0.5 shrink-0"
      title={`Delete ${accountName}`}
    >
      ✕
    </button>
  );
}
