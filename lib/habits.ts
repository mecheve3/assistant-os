import { Habit } from "@/types";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Epoch for bi-weekly parity: Jan 4 2026 (Sunday). Even-numbered weeks are "on" weeks.
const BI_WEEKLY_EPOCH_UTC = Date.UTC(2026, 0, 4);
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function isDueOn(habit: Habit, date: Date): boolean {
  const dow = date.getDay();
  const dom = date.getDate();
  const dayName = DAY_NAMES[dow];

  switch (habit.frequency) {
    case "daily":
      return true;

    case "weekdays":
      return dow >= 1 && dow <= 5;

    case "weekly":
      if (!habit.frequency_days?.length) return dow === 1;
      return habit.frequency_days.includes(dayName);

    case "bi-weekly": {
      if (!habit.frequency_days?.length) return false;
      if (!habit.frequency_days.includes(dayName)) return false;
      const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const weeksFromEpoch = Math.floor((dateUTC - BI_WEEKLY_EPOCH_UTC) / MS_PER_WEEK);
      return weeksFromEpoch % 2 === 0;
    }

    case "monthly":
      return habit.frequency_date === dom;

    default:
      return true;
  }
}

export function formatFrequency(habit: Habit): string {
  switch (habit.frequency) {
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekly": {
      if (!habit.frequency_days?.length) return "Weekly";
      const days = habit.frequency_days.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
      return `Weekly (${days.join(", ")})`;
    }
    case "bi-weekly": {
      if (!habit.frequency_days?.length) return "Bi-weekly";
      const days = habit.frequency_days.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
      return `Bi-weekly (${days.join(", ")})`;
    }
    case "monthly":
      return habit.frequency_date ? `Monthly (day ${habit.frequency_date})` : "Monthly";
    default:
      return String(habit.frequency);
  }
}
