// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStage =
  | "idea"
  | "validation"
  | "building"
  | "revenue"
  | "scaling"
  | "paused"
  | "killed";

export type ProjectCategory = "startup" | "side_project" | "day_job";

export interface Project {
  id: string;
  name: string;
  emoji: string | null;
  stage: ProjectStage;
  category: ProjectCategory;
  description: string | null;
  goal_2025: string | null;
  weekly_time_budget_hours: number | null;
  color_hex: string | null;
  inactive: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  date: string;
  what_i_did: string | null;
  what_is_blocked: string | null;
  next_action: string | null;
  energy_spent: number | null;
  momentum_score: number | null;
  created_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "inbox" | "today" | "in_progress" | "done" | "parked";
export type TaskArea = "work" | "personal" | "finance" | "health";

export interface Task {
  id: string;
  title: string;
  project_id: string | null;
  area: TaskArea | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  recurring: boolean | null;
  recurrence_frequency: string | null;
  // Chore fields
  is_chore: boolean | null;
  chore_interval_days: number | null;
  last_completed_at: string | null;
  next_due_date: string | null;
  // Life area
  life_area: string | null;
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekdays" | "weekly" | "bi-weekly" | "monthly";
export type HabitCategory =
  | "health"
  | "productivity"
  | "finance"
  | "learning"
  | "personal";

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory | null;
  frequency: HabitFrequency;
  frequency_days: string[] | null;  // ["mon","wed"] for weekly/bi-weekly
  frequency_date: number | null;    // 1-31 for monthly
  target_streak: number | null;
  active: boolean;
  is_variable: boolean | null;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  notes: string | null;
  scheduled_for_today: boolean | null;
  created_at: string;
}

// ─── Finances ────────────────────────────────────────────────────────────────

export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "crypto"
  | "investment";

export type Currency = "COP" | "USD";

export interface FinancesAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  current_balance: number;
  credit_limit: number | null;
  institution: string | null;
  notes: string | null;
  updated_at: string;
}

export type TransactionType = "income" | "expense" | "transfer" | "investment";

export type TransactionCategory =
  | "salary"
  | "freelance"
  | "crypto_income"
  | "course_sales"
  | "bot_revenue"
  | "food"
  | "transport"
  | "housing"
  | "entertainment"
  | "health"
  | "debt_payment"
  | "investment"
  | "other";

export interface FinancesTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  category: TransactionCategory | null;
  project_id: string | null;
  account_id: string | null;
  notes: string | null;
  created_at: string;
  // Phase 4 additions
  gross_amount: number | null;
  deductions: number | null;
  net_amount: number | null;
}

export interface FinancesDebt {
  id: string;
  name: string;
  institution: string | null;
  total_amount: number;
  current_balance: number;
  currency: Currency;
  interest_rate: number | null;
  minimum_payment: number | null;
  payment_day: number | null;
  strategy: "snowball" | "avalanche" | null;
  active: boolean;
  created_at: string;
  // Phase 4 additions
  type: string | null;
  monthly_payment: number | null;
  balance_usd: number | null;
  minimum_payment_cop: number | null;
  minimum_payment_usd: number | null;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalCategory =
  | "financial"
  | "health"
  | "project"
  | "personal"
  | "learning";
export type GoalStatus = "active" | "achieved" | "dropped";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory | null;
  target_date: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: GoalStatus;
  project_id: string | null;
  created_at: string;
}

// ─── Parking Lot ─────────────────────────────────────────────────────────────

export type ParkingLotCategory = "task" | "idea" | "note" | "link" | "question";

export interface ParkingLotItem {
  id: string;
  content: string;
  category: ParkingLotCategory | null;
  assigned_project_id: string | null;
  processed: boolean;
  created_at: string;
}

// ─── Cognitive Load ───────────────────────────────────────────────────────────

export interface CognitiveLoadLog {
  id: string;
  date: string;
  score: number;
  notes: string | null;
  created_at: string;
}

// ─── Weekly Review ────────────────────────────────────────────────────────────

export interface WeeklyReview {
  id: string;
  week_start_date: string;
  wins: string | null;
  blockers: string | null;
  decisions_made: string | null;
  projects_summary: string | null;
  habits_score: number | null;
  finances_summary: string | null;
  next_week_focus: string | null;
  ai_insights: string | null;
  created_at: string;
}

// ─── Recurring Expenses ───────────────────────────────────────────────────────

export type RecurringFrequency = "monthly" | "annual";

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: string | null;
  frequency: RecurringFrequency;
  month: number | null;   // 1–12 for annual expenses (which month they fall in)
  active: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface AIInsight {
  type: "focus" | "warning" | "opportunity" | "pattern";
  text: string;
  priority: 1 | 2 | 3;
}
