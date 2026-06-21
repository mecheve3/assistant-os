-- Recurring chores system
-- is_chore: true for chore tasks (auto-manage next_due_date on complete)
-- chore_interval_days: days between completions (e.g., 7 = weekly)
-- last_completed_at: when the chore was last marked done
-- next_due_date: auto-computed; task surfaces in inbox when date <= today

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_chore boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS chore_interval_days integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_completed_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_due_date date;

-- Seed 10 recurring chores for Miguel
INSERT INTO tasks (title, priority, status, is_chore, chore_interval_days, next_due_date) VALUES
  ('Clean room & tidy desk',       'medium', 'inbox', true,  7,  CURRENT_DATE),
  ('Do laundry',                   'medium', 'inbox', true,  7,  CURRENT_DATE),
  ('Vacuum apartment',             'medium', 'inbox', true,  14, CURRENT_DATE),
  ('Clean bathroom',               'medium', 'inbox', true,  14, CURRENT_DATE),
  ('Take out trash',               'medium', 'inbox', true,  3,  CURRENT_DATE),
  ('Review & pay bills',           'high',   'inbox', true,  30, CURRENT_DATE),
  ('Backup important files',       'medium', 'inbox', true,  30, CURRENT_DATE),
  ('Restock pantry / groceries',   'medium', 'inbox', true,  7,  CURRENT_DATE),
  ('Check bank accounts & budget', 'high',   'inbox', true,  7,  CURRENT_DATE),
  ('Review subscriptions',         'low',    'inbox', true,  90, CURRENT_DATE)
ON CONFLICT DO NOTHING;
