-- ── 009_habits_and_projects.sql ──────────────────────────────────────────────
-- Fix habits schedule + add Personal Assistant project + update emojis

-- Fix 6a: Family lunch → Wednesday
UPDATE habits
SET frequency_days = ARRAY['wed']
WHERE LOWER(name) LIKE '%family lunch%';

-- Fix 6b: Abs + Learning block → variable pool
UPDATE habits SET is_variable = true WHERE LOWER(name) LIKE '%abs%' AND active = true;
UPDATE habits SET is_variable = true WHERE LOWER(name) LIKE '%learning block%' AND active = true;

-- Fix 6c: Merge two Serenno sales habits into one fixed habit
UPDATE habits SET name = 'Check Serenno sales'
WHERE name = 'Serenno sales (morning check)';

DELETE FROM habit_logs
WHERE habit_id IN (
  SELECT id FROM habits WHERE name = 'Serenno sales (afternoon check)'
);
DELETE FROM habit_skips
WHERE habit_id IN (
  SELECT id FROM habits WHERE name = 'Serenno sales (afternoon check)'
);
DELETE FROM habits WHERE name = 'Serenno sales (afternoon check)';

-- Fix 4: Add Personal Assistant project (idempotent)
INSERT INTO projects (name, emoji, stage, category, description, inactive)
SELECT
  'Personal Assistant',
  '🤖',
  'building',
  'side_project',
  'AI-powered personal OS and automation system',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE LOWER(name) = 'personal assistant'
);

-- Fix 5: Update project emojis (leave Godfather''s Table and day job untouched)
UPDATE projects SET emoji = '💤' WHERE LOWER(name) LIKE '%sleep apnea%';
UPDATE projects SET emoji = '😎' WHERE LOWER(name) LIKE '%serenno%';
UPDATE projects SET emoji = '📉'
WHERE LOWER(name) LIKE '%smartcryptotrader%'
   OR LOWER(name) LIKE '%smart crypto trader%';
UPDATE projects SET emoji = '📈' WHERE LOWER(name) LIKE '%crypto bot%';
