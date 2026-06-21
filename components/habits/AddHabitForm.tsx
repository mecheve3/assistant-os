"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HabitFrequency } from "@/types";

const CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "productivity", label: "Productivity" },
  { value: "finance", label: "Finance" },
  { value: "learning", label: "Learning" },
  { value: "personal", label: "Personal" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

export function AddHabitForm() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("health");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [monthlyDate, setMonthlyDate] = useState("");
  const [targetStreak, setTargetStreak] = useState("30");

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    await supabase.from("habits").insert({
      name: name.trim(),
      category,
      frequency,
      frequency_days: ["weekly", "bi-weekly"].includes(frequency)
        ? selectedDays.length > 0
          ? selectedDays
          : null
        : null,
      frequency_date:
        frequency === "monthly" ? parseInt(monthlyDate) || null : null,
      target_streak: parseInt(targetStreak) || 30,
      active: true,
    });

    setSaving(false);
    setOpen(false);
    setName("");
    setSelectedDays([]);
    setMonthlyDate("");
    setFrequency("daily");
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 border border-dashed border-line rounded-lg text-xs font-mono text-muted hover:text-bright hover:border-teal/40 transition-colors"
      >
        + Add Habit
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-teal/20 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-widest text-teal">New Habit</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-bright text-xs"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-[10px] font-mono text-muted block mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exercise for 30 min..."
          required
          autoFocus
          className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs text-bright placeholder:text-muted focus:outline-none focus:border-teal"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => {
              setFrequency(e.target.value as HabitFrequency);
              setSelectedDays([]);
              setMonthlyDate("");
            }}
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Target streak</label>
          <input
            type="number"
            value={targetStreak}
            onChange={(e) => setTargetStreak(e.target.value)}
            min="1"
            max="365"
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright focus:outline-none focus:border-teal"
          />
        </div>
      </div>

      {/* Day selector for weekly / bi-weekly */}
      {["weekly", "bi-weekly"].includes(frequency) && (
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1.5">Which day(s)?</label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`text-[9px] font-mono px-2.5 py-1 rounded border transition-colors ${
                  selectedDays.includes(d.value)
                    ? "text-teal border-teal/40 bg-teal/10"
                    : "text-muted border-line hover:border-muted"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date selector for monthly */}
      {frequency === "monthly" && (
        <div>
          <label className="text-[10px] font-mono text-muted block mb-1">Day of month (1–31)</label>
          <input
            type="number"
            value={monthlyDate}
            onChange={(e) => setMonthlyDate(e.target.value)}
            min="1"
            max="31"
            placeholder="e.g. 15"
            className="w-full bg-raised border border-line rounded px-2 py-1.5 text-xs font-mono text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-2 bg-teal text-base text-xs font-mono font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {saving ? "Saving..." : "Add Habit"}
      </button>
    </form>
  );
}
