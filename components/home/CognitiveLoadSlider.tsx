"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cognitiveLoadLabel, cognitiveLoadColor } from "@/lib/utils";

interface Props {
  today: string;
  initialScore: number | null;
}

export function CognitiveLoadSlider({ today, initialScore }: Props) {
  const [score, setScore] = useState(initialScore ?? 5);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(
    initialScore != null ? "saved" : "idle"
  );

  const save = async (val: number) => {
    setStatus("saving");
    await supabase
      .from("cognitive_load_log")
      .upsert({ date: today, score: val }, { onConflict: "date" });
    setStatus("saved");
  };

  const pct = ((score - 1) / 9) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Cognitive Load
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-semibold ${cognitiveLoadColor(score)}`}>
            {cognitiveLoadLabel(score)}
          </span>
          <span className="text-xs font-mono text-muted/60">{score}/10</span>
          {status === "saving" && (
            <span className="text-[9px] font-mono text-muted animate-pulse">saving</span>
          )}
          {status === "saved" && (
            <span className="text-[9px] font-mono text-teal">✓</span>
          )}
        </div>
      </div>

      <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={score}
        onChange={(e) => {
          setScore(Number(e.target.value));
          setStatus("idle");
        }}
        onMouseUp={(e) => save(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => save(Number((e.target as HTMLInputElement).value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--color-teal) 0%, var(--color-teal) ${pct}%, var(--color-line) ${pct}%, var(--color-line) 100%)`,
        }}
      />

      <div className="flex justify-between mt-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="text-[9px] font-mono text-muted/40">
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
