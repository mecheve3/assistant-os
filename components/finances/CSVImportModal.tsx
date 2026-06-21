"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { X, Upload, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FinancesAccount } from "@/types";
import { todayISO } from "@/lib/utils";

type Step = "upload" | "mapping" | "importing" | "done";

interface ParsedRow {
  [key: string]: string;
}

interface ImportSummary {
  imported: number;
  skipped: number;
}

function detectCrypto(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase());
  return lower.some((h) => h.includes("side")) && lower.some((h) => h.includes("pair"));
}

function findCol(headers: string[], ...keywords: string[]): string {
  for (const kw of keywords) {
    const found = headers.find((h) => h.toLowerCase().includes(kw));
    if (found) return found;
  }
  return headers[0] ?? "";
}

interface Props {
  accounts: FinancesAccount[];
  onClose: () => void;
}

export function CSVImportModal({ accounts, onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isCrypto, setIsCrypto] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Generic mapping state
  const [colDate, setColDate] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [colType, setColType] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<"COP" | "USD">("COP");
  const [defaultType, setDefaultType] = useState<"income" | "expense">("expense");
  const [defaultAccountId, setDefaultAccountId] = useState("");

  const handleFile = (file: File) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data as ParsedRow[];
        const hdrs = result.meta.fields ?? [];
        setRows(parsed);
        setHeaders(hdrs);
        const crypto = detectCrypto(hdrs);
        setIsCrypto(crypto);

        if (!crypto) {
          setColDate(findCol(hdrs, "date", "fecha", "time"));
          setColDesc(findCol(hdrs, "description", "desc", "concept", "name", "narration"));
          setColAmount(findCol(hdrs, "amount", "value", "total", "monto", "valor"));
          setColType(findCol(hdrs, "type", "kind", "debit", "credit"));
        }

        setStep("mapping");
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setStep("importing");
    let imported = 0;
    let skipped = 0;
    const today = todayISO();

    const batch: Record<string, unknown>[] = [];

    for (const row of rows) {
      try {
        if (isCrypto) {
          const dateRaw = row["Date"] ?? row["date"] ?? row["Time"] ?? today;
          const pair = row["Pair"] ?? row["pair"] ?? row["Symbol"] ?? "";
          const side = (row["Side"] ?? row["side"] ?? row["Type"] ?? "BUY").toUpperCase();
          const amountRaw = parseFloat(
            row["Amount"] ?? row["amount"] ?? row["Quantity"] ?? "0"
          );
          if (isNaN(amountRaw) || amountRaw <= 0) { skipped++; continue; }

          const dateStr = dateRaw.split("T")[0].split(" ")[0];
          batch.push({
            date: dateStr,
            description: `${pair} ${side}`,
            amount: amountRaw,
            currency: "USD",
            type: side === "SELL" ? "income" : "investment",
            category: side === "SELL" ? "crypto_income" : "investment",
            account_id: defaultAccountId || null,
            notes: `price: ${row["Price"] ?? ""} | fee: ${row["Fee"] ?? ""}`,
          });
          imported++;
        } else {
          const dateRaw = row[colDate] ?? today;
          const desc = (row[colDesc] ?? "Import").trim();
          const amountRaw = parseFloat((row[colAmount] ?? "0").replace(/[^0-9.-]/g, ""));
          if (isNaN(amountRaw) || !desc) { skipped++; continue; }

          let txType: string = defaultType;
          if (colType) {
            const rawType = (row[colType] ?? "").toLowerCase();
            if (rawType.includes("income") || rawType.includes("credit")) txType = "income";
            else if (rawType.includes("expense") || rawType.includes("debit")) txType = "expense";
          }

          batch.push({
            date: dateRaw.split("T")[0].split(" ")[0],
            description: desc,
            amount: Math.abs(amountRaw),
            currency: defaultCurrency,
            type: txType,
            category: null,
            account_id: defaultAccountId || null,
          });
          imported++;
        }
      } catch {
        skipped++;
      }
    }

    // Insert in chunks of 50
    for (let i = 0; i < batch.length; i += 50) {
      await supabase.from("finances_transactions").insert(batch.slice(i, i + 50));
    }

    setSummary({ imported, skipped });
    setStep("done");
    router.refresh();
  };

  const preview = rows.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card border border-line rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <p className="text-xs font-mono uppercase tracking-widest text-muted">
            CSV Import
          </p>
          <button onClick={onClose} className="text-muted hover:text-bright">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-line rounded-lg p-10 text-center cursor-pointer hover:border-teal/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted mb-1">
                Drop a CSV file here or click to browse
              </p>
              <p className="text-[10px] font-mono text-muted/60">
                Supports: standard bank exports, crypto trade history (Binance, etc.)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* ── Step: Mapping ── */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2.5 rounded bg-raised">
                {isCrypto ? (
                  <p className="text-xs text-teal font-mono">
                    ◆ Crypto trade history detected ({rows.length} trades)
                  </p>
                ) : (
                  <p className="text-xs text-info font-mono">
                    Generic CSV detected ({rows.length} rows)
                  </p>
                )}
              </div>

              {/* Preview */}
              <div className="overflow-x-auto border border-line rounded">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-line">
                      {headers.slice(0, 6).map((h) => (
                        <th key={h} className="text-left px-2 py-1.5 text-muted/70">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-line/30">
                        {headers.slice(0, 6).map((h) => (
                          <td key={h} className="px-2 py-1 text-muted truncate max-w-[120px]">
                            {row[h] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapping UI — generic only */}
              {!isCrypto && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Date column", colDate, setColDate],
                    ["Description column", colDesc, setColDesc],
                    ["Amount column", colAmount, setColAmount],
                    ["Type column (optional)", colType, setColType],
                  ].map(([label, value, setter]) => (
                    <div key={label as string}>
                      <label className="text-[10px] font-mono text-muted block mb-1">
                        {label as string}
                      </label>
                      <select
                        value={value as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
                      >
                        <option value="">— skip —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div>
                    <label className="text-[10px] font-mono text-muted block mb-1">
                      Default Type
                    </label>
                    <select
                      value={defaultType}
                      onChange={(e) => setDefaultType(e.target.value as "income" | "expense")}
                      className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-muted block mb-1">
                      Currency
                    </label>
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value as "COP" | "USD")}
                      className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Account */}
              <div>
                <label className="text-[10px] font-mono text-muted block mb-1">
                  Import to Account (optional)
                </label>
                <select
                  value={defaultAccountId}
                  onChange={(e) => setDefaultAccountId(e.target.value)}
                  className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[10px] font-mono text-bright focus:outline-none focus:border-teal"
                >
                  <option value="">— no account —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("upload")}
                  className="flex-1 py-2 text-xs font-mono text-muted border border-line rounded hover:text-bright"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 py-2 text-xs font-mono bg-teal text-base rounded hover:opacity-90"
                >
                  Import {rows.length} rows
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === "importing" && (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-mono text-muted">Importing transactions…</p>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && summary && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-teal/10 border border-teal/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-teal" />
              </div>
              <p className="text-sm font-mono text-bright">Import complete</p>
              <p className="text-xs font-mono text-muted">
                {summary.imported} imported · {summary.skipped} skipped
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-teal/10 border border-teal/30 text-teal text-xs font-mono rounded hover:bg-teal/20"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
