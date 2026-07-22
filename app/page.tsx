import Link from "next/link";
import { format, startOfWeek, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { todayISO, greeting, formatDateShort } from "@/lib/utils";
import { Habit, HabitLog, Task } from "@/types";
import { AIBriefingCard } from "@/components/home/AIBriefingCard";
import { WeatherWidget } from "@/components/home/WeatherWidget";
import { EnhancedHabits } from "@/components/home/EnhancedHabits";
import { NewsWidget } from "@/components/home/NewsWidget";
import { SportsWidget } from "@/components/home/SportsWidget";

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

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const { reviewed } = await searchParams;
  const today = todayISO();
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [
    { data: tasks },
    { data: habits },
    { data: habitLogs },
    { data: habitSkips },
    { data: lastReview },
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
    supabase
      .from("weekly_reviews")
      .select("week_start_date")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const skippedHabitIds = (habitSkips ?? []).map(
    (s: { habit_id: string }) => s.habit_id
  );

  const todayJS = new Date();
  const isFriday = todayJS.getDay() === 5;
  const thisMondayStr = format(startOfWeek(todayJS, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const reviewDoneThisWeek = lastReview != null && lastReview.week_start_date >= thisMondayStr;
  const showFridayReviewPrompt = isFriday && !reviewDoneThisWeek;

  // Overdue only when review is 2+ weeks stale — avoids false alarm on Monday after Friday review
  const prevWeekMondayStr = format(subDays(startOfWeek(todayJS, { weekStartsOn: 1 }), 7), "yyyy-MM-dd");
  const weeklyReviewOverdue = !lastReview || lastReview.week_start_date < prevWeekMondayStr;

  const topTasks = [...(tasks ?? [])]
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
    .slice(0, 5) as Task[];

  const quote = getDailyQuote();

  const calendarIds = [
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_ID,
    "0gei4aji3p0513df7qc5vlm4jiv9l4ds@import.calendar.google.com",
    "hjq8h0ai6bn8a5cv0sqkc7q5p9rpjjej@import.calendar.google.com",
    "en.usa#holiday@group.v.calendar.google.com",
    "en.co#holiday@group.v.calendar.google.com",
    "878ogioo72nqsns1fas1f0nhajm8rsg4@import.calendar.google.com",
    "vagktll14fc603rfrok0iho7si5idue2@import.calendar.google.com",
  ].filter(Boolean) as string[];
  const calendarParams = calendarIds.map((id) => `src=${encodeURIComponent(id)}`).join("&");
  const calendarEmbedUrl = calendarIds.length
    ? `https://calendar.google.com/calendar/embed?${calendarParams}&ctz=America%2FBogota&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0`
    : "";

  return (
    <div className="p-4 lg:p-6 min-h-full">
      {/* Reviewed banner */}
      {reviewed === "true" && (
        <div className="mb-4 p-3 bg-teal/10 border border-teal/20 rounded-lg flex items-center gap-2">
          <span className="text-teal text-sm">✓</span>
          <p className="text-sm font-mono text-teal">Week reviewed and saved. Good work.</p>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr] gap-4 items-start">

        {/* ═══ LEFT COLUMN (1/3) — Habits, Top Priorities, Sports, Weather, Quote ═══ */}
        <div className="w-full space-y-4">

          {/* Habits */}
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

          {/* Sports */}
          <SportsWidget />

          {/* Weather */}
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

        {/* ═══ RIGHT COLUMN (2/3) — AI Briefing, Calendar, News ═══ */}
        <div className="w-full space-y-4">

          {/* Friday weekly review prompt */}
          {showFridayReviewPrompt && (
            <Link
              href="/weekly-review"
              className="flex items-center gap-2 p-3 bg-warn/5 border border-warn/20 rounded-lg hover:border-warn/40 transition-colors"
            >
              <span className="text-base">📋</span>
              <p className="text-sm font-mono text-warn">
                Friday — time for your weekly review →
              </p>
            </Link>
          )}

          {/* Weekly review overdue warning */}
          {weeklyReviewOverdue && !showFridayReviewPrompt && (
            <div className="bg-card border border-warn/20 rounded-lg p-3 flex items-center gap-3">
              <span className="text-warn">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-warn">
                  Weekly Review Overdue
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {lastReview
                    ? `Last review: week of ${lastReview.week_start_date}`
                    : "No weekly review recorded yet."}
                </p>
              </div>
              <Link
                href="/weekly-review"
                className="text-[10px] font-mono text-teal hover:underline shrink-0"
              >
                Start →
              </Link>
            </div>
          )}

          {/* AI Daily Briefing */}
          <AIBriefingCard />

          {/* Google Calendar embed */}
          {calendarEmbedUrl ? (
            <div className="bg-card border border-line rounded-lg overflow-hidden">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted px-4 pt-4 pb-2">
                Calendar
              </p>
              <iframe
                src={calendarEmbedUrl}
                style={{ border: 0 }}
                width="100%"
                height="320"
                frameBorder={0}
                scrolling="no"
              />
            </div>
          ) : (
            <div className="bg-card border border-line rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📅</span>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
                  Google Calendar
                </p>
              </div>
              <p className="text-xs text-muted/70 mb-4">
                To embed your calendar here:
              </p>
              <ol className="space-y-2">
                {[
                  "Go to calendar.google.com",
                  <>Click the ⚙ gear icon → <span className="text-bright">Settings</span></>,
                  <>Find your calendar under <span className="text-bright">&quot;Settings for my calendars&quot;</span></>,
                  <>Scroll to <span className="text-bright">&quot;Integrate calendar&quot;</span></>,
                  <>Copy the <span className="text-teal">Calendar ID</span> (looks like yourname@gmail.com)</>,
                  <>Open <span className="text-teal font-mono">.env.local</span> in your project folder</>,
                  <><span className="text-teal font-mono">NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_ID=</span><span className="text-bright font-mono">your-calendar-id</span></>,
                  "Restart the dev server",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-mono text-teal shrink-0 mt-0.5 w-4">
                      {i + 1}.
                    </span>
                    <span className="text-xs text-muted/80 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <a
                href="https://calendar.google.com/calendar/r/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-mono text-teal hover:underline"
              >
                Open Google Calendar Settings →
              </a>
            </div>
          )}

          {/* News Feed */}
          <NewsWidget />
        </div>
      </div>
    </div>
  );
}
