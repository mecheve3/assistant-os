"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { FinancesAccount } from "@/types";
import { CSVImportModal } from "@/components/finances/CSVImportModal";

interface Props {
  accounts: FinancesAccount[];
}

export function CSVImportWrapper({ accounts }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-raised border border-line text-muted hover:text-bright text-xs font-mono rounded transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        Import CSV
      </button>

      {open && (
        <CSVImportModal accounts={accounts} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
