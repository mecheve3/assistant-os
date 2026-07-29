import Link from "next/link";
import { format, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { todayISO, greeting, formatDateShort } from "@/lib/utils";
import { Habit, HabitLog, Task } from "@/types";
import { AIBriefingCard } from "@/components/home/AIBriefingCard";
import { WeatherWidget } from "@/components/home/WeatherWidget";
import { EnhancedHabits } from "@/components/home/EnhancedHabits";
import { NewsWidget } from "@/components/home/NewsWidget";
import { SportsWidget } from "@/components/home/SportsWidget";
import { GoogleTasksWidget } from "@/components/home/GoogleTasksWidget";

export const dynamic = "force-dynamic";

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES: { text: string; author: string }[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Build something 100 people love, not something 1 million people like.", author: "Paul Graham" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "Perfectionism is the enemy of done.", author: "Unknown" },
  { text: "Speed is a feature.", author: "Unknown" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Absorb what is useful, discard what is not.", author: "Bruce Lee" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "If you can't measure it, you can't improve it.", author: "Peter Drucker" },
  { text: "Every master was once a disaster.", author: "Unknown" },
  { text: "The goal isn't to be busy. The goal is to be productive.", author: "Unknown" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Revenue is vanity, profit is sanity, cash is reality.", author: "Alan Miltz" },
  { text: "If you're not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "An idea without execution is just a dream.", author: "Unknown" },
  { text: "Systems over goals.", author: "James Clear" },
  { text: "Motion is not action.", author: "James Clear" },
  { text: "Work expands to fill the time available.", author: "Parkinson's Law" },
  { text: "You have to be odd to be number one.", author: "Dr. Seuss" },
  { text: "Stop waiting for the perfect moment. Take the moment and make it perfect.", author: "Unknown" },
  { text: "Your most important work is always ahead of you, never behind you.", author: "Stephen Covey" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "The score takes care of itself.", author: "Bill Walsh" },
  { text: "An MVP is not the smallest product. It's the smallest that creates enough value to pay for.", author: "Unknown" },
  { text: "Not everything that counts can be counted.", author: "William Bruce Cameron" },
  { text: "The best marketing is a product that sells itself.", author: "Unknown" },
  { text: "Ship it.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Startups don't die when they run out of money; they die when the founders lose motivation.", author: "Paul Graham" },
  { text: "Move fast. Unless you are breaking stuff, you are not moving fast enough.", author: "Mark Zuckerberg" },
  { text: "Every day you don't ship is a day your competitor might.", author: "Unknown" },
  { text: "Execution eats strategy for breakfast.", author: "Unknown" },
];

function getDailyQuote(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-danger",
  high: "bg-warn",
  medium: "bg-muted/40",
  low: "bg-muted/20",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "text-danger",
  high: "text-warn",
  medium: "text-muted",
  low: "text-muted/60",
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommandCenterPage() {
  const today = todayISO();
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [
    { data: tasks },
    { data: habits },
    { data: habitLogs },
    { data: habitSkips },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .in("status", ["today", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("habits").select("*").eq("active", true).order("created_at"),
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false }),
    supabase
      .from("habit_skips")
      .select("habit_id")
      .eq("date", today),
  ]);

  const skippedHabitIds = (habitSkips ?? []).map(
    (s: { habit_id: string }) => s.habit_id
  );

  const topTasks = [...(tasks ?? [])]
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
    .slice(0, 5) as Task[];

  const quote = getDailyQuote();

  return (
    <div className="p-4 lg:p-6 min-h-full overflow-x-hidden">
      {/*
        3-section layout. Col 2 spans both rows so there is no mid-column gap.
        Mobile DOM order: Habits → AI/Tasks/News → Sports/Weather/Quote
      */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr] gap-4 items-start">

        {/* ─── Section 1 (col 1, row 1): Habits + Top Priorities ─── */}
        <div className="w-full min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">

          <EnhancedHabits
            initialHabits={(habits ?? []) as Habit[]}
            initialLogs={(habitLogs ?? []) as HabitLog[]}
            initialSkippedIds={skippedHabitIds}
            today={today}
          />

          {/* Top 5 Priorities */}
          <div className="bg-card border border-line rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                Top Priorities
              </p>
              <Link
                href="/tasks"
                className="text-[10px] font-mono text-muted hover:text-bright transition-colors"
              >
                All tasks →
              </Link>
            </div>

            {topTasks.length === 0 ? (
              <p className="text-xs text-muted font-mono text-center py-4">
                No active tasks. Clean slate.
              </p>
            ) : (
              <div className="divide-y divide-line/30">
                {topTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        PRIORITY_DOT[task.priority] ?? "bg-muted/40"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-bright truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-mono ${
                            PRIORITY_LABEL[task.priority] ?? "text-muted"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <>
                            <span className="text-muted/40 text-[10px]">·</span>
                            <span className="text-[10px] font-mono text-muted">
                              due {formatDateShort(task.due_date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Section 2 (col 2, rows 1–2): AI Briefing + Google Tasks + News ─── */}
        <div className="w-full min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">

          <AIBriefingCard />

          <GoogleTasksWidget />

          <NewsWidget />
        </div>

        {/* ─── Section 3 (col 1, row 2): Sports + Weather + Quote ─── */}
        <div className="w-full min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">

          <SportsWidget />

          <WeatherWidget />

          {/* Daily quote */}
          <div className="bg-card border border-line rounded-lg p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
              {greeting()}, Miguel
            </p>
            <p className="text-xs text-bright italic leading-relaxed mb-1.5">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-[10px] font-mono text-muted/60">— {quote.author}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
