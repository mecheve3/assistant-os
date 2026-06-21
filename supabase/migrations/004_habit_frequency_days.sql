-- Migration 004: Extended habit frequency types
-- Adds frequency_days (for weekly/bi-weekly) and frequency_date (for monthly) columns

ALTER TABLE habits ADD COLUMN IF NOT EXISTS frequency_days TEXT[];
ALTER TABLE habits ADD COLUMN IF NOT EXISTS frequency_date INTEGER;

-- Update HabitFrequency check constraint to include new types
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_frequency_check;
ALTER TABLE habits ADD CONSTRAINT habits_frequency_check
  CHECK (frequency IN ('daily', 'weekdays', 'weekly', 'bi-weekly', 'monthly'));
