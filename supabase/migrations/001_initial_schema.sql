-- Personal OS — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push

-- ─── Projects ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  stage TEXT NOT NULL DEFAULT 'idea'
    CHECK (stage IN ('idea', 'validation', 'building', 'revenue', 'scaling', 'paused', 'killed')),
  category TEXT NOT NULL DEFAULT 'side_project'
    CHECK (category IN ('startup', 'side_project', 'day_job')),
  description TEXT,
  goal_2025 TEXT,
  weekly_time_budget_hours DECIMAL(4,1),
  color_hex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Project Updates ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  what_i_did TEXT,
  what_is_blocked TEXT,
  next_action TEXT,
  energy_spent INTEGER CHECK (energy_spent BETWEEN 1 AND 5),
  momentum_score INTEGER CHECK (momentum_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_date ON project_updates(date DESC);

-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  area TEXT CHECK (area IN ('work', 'personal', 'finance', 'health')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'today', 'in_progress', 'done', 'parked')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ─── Habits ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('health', 'productivity', 'finance', 'learning', 'personal')),
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekdays', 'weekly')),
  target_streak INTEGER DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Habit Logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);

-- ─── Finance Accounts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finances_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('checking', 'savings', 'credit_card', 'crypto', 'investment')),
  currency TEXT NOT NULL DEFAULT 'COP'
    CHECK (currency IN ('COP', 'USD')),
  current_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(18,2),
  institution TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Finance Transactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finances_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP'
    CHECK (currency IN ('COP', 'USD')),
  type TEXT NOT NULL
    CHECK (type IN ('income', 'expense', 'transfer', 'investment')),
  category TEXT CHECK (category IN (
    'salary', 'freelance', 'crypto_income', 'course_sales', 'bot_revenue',
    'food', 'transport', 'housing', 'entertainment', 'health',
    'debt_payment', 'investment', 'other'
  )),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  account_id UUID REFERENCES finances_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON finances_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON finances_transactions(type);

-- ─── Finance Debts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finances_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT,
  total_amount DECIMAL(18,2) NOT NULL,
  current_balance DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP'
    CHECK (currency IN ('COP', 'USD')),
  interest_rate DECIMAL(5,2),
  minimum_payment DECIMAL(18,2),
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  strategy TEXT CHECK (strategy IN ('snowball', 'avalanche')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Goals ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('financial', 'health', 'project', 'personal', 'learning')),
  target_date DATE,
  target_value DECIMAL(18,2),
  current_value DECIMAL(18,2) DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'achieved', 'dropped')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Parking Lot ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parking_lot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('task', 'idea', 'note', 'link', 'question')),
  assigned_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cognitive Load Log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cognitive_load_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date)
);

-- ─── Weekly Reviews ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL UNIQUE,
  wins TEXT,
  blockers TEXT,
  decisions_made TEXT,
  projects_summary TEXT,
  habits_score DECIMAL(5,2) CHECK (habits_score BETWEEN 0 AND 100),
  finances_summary TEXT,
  next_week_focus TEXT,
  ai_insights TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
