-- Phase 5 — Recurring tasks
-- Run this in your Supabase SQL editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT
  CHECK (recurrence_frequency IN ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly'));

CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(recurring) WHERE recurring = TRUE;
