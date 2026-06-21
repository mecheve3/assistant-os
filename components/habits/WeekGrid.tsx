import { Habit, HabitLog } from "@/types";
import { isDueOn } from "@/lib/habits";
import { format, parse } from "date-fns";

interface Props {
  habits: Habit[];
  logs: HabitLog[];
  last7: string[]; // yyyy-MM-dd, oldest first
}

export function WeekGrid({ habits, logs, last7 }: Props) {
  const completedSet = new Set(
    logs.filter((l) => l.completed).map((l) => `${l.habit_id}:${l.date}`)
  );
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4">
        Last 7 Days
      </p>

      {/* Day headers */}
      <div className="grid mb-3" style={{ gridTemplateColumns: "1fr repeat(7, 26px)" }}>
        <div />
        {last7.map((date) => {
          const d = parse(date, "yyyy-MM-dd", new Date());
          const isToday = date === todayStr;
          return (
            <div key={date} className="text-center">
              <p
                className={`text-[9px] font-mono uppercase leading-tight ${
                  isToday ? "text-teal" : "text-muted/50"
                }`}
              >
                {format(d, "EEE")[0]}
              </p>
              <p
                className={`text-[9px] font-mono leading-tight ${
                  isToday ? "text-teal font-bold" : "text-muted/30"
                }`}
              >
                {format(d, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Habit rows */}
      <div className="space-y-1.5">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="grid items-center"
            style={{ gridTemplateColumns: "1fr repeat(7, 26px)" }}
          >
            <p className="text-[10px] text-muted truncate pr-2">{habit.name}</p>
            {last7.map((date) => {
              const d = parse(date, "yyyy-MM-dd", new Date());
              const skip = !isDueOn(habit, d);
              const done = completedSet.has(`${habit.id}:${date}`);
              const isFuture = date > todayStr;

              return (
                <div key={date} className="flex items-center justify-center">
                  {isFuture ? (
                    <div className="w-4 h-4 rounded-sm" />
                  ) : skip ? (
                    <div className="w-3 h-0.5 bg-line/40 rounded-full mx-auto" />
                  ) : done ? (
                    <div className="w-4 h-4 rounded-sm bg-teal" />
                  ) : (
                    <div className="w-4 h-4 rounded-sm border border-line/60" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {habits.length === 0 && (
        <p className="text-xs text-muted text-center py-4">No habits yet</p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-line/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-teal" />
          <span className="text-[9px] font-mono text-muted/60">Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-line/60" />
          <span className="text-[9px] font-mono text-muted/60">Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-line/40 rounded-full" />
          <span className="text-[9px] font-mono text-muted/60">Skip</span>
        </div>
      </div>
    </div>
  );
}
