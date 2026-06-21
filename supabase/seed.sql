-- Personal OS — Seed Data
-- Run AFTER the schema migration. Safe to run only once.
-- The API route /api/seed runs this programmatically if preferred.

-- ─── 6 Projects ──────────────────────────────────────────────────────────────

INSERT INTO projects (name, emoji, stage, category, description, goal_2025, color_hex)
VALUES
  (
    'Sleep Apnea Belt',
    '🫁',
    'validation',
    'startup',
    'Hardware medical device for passive sleep apnea monitoring and intervention.',
    'Complete prototype v1 and validate with 10 real users',
    '#3b82f6'
  ),
  (
    'Serenno',
    '💚',
    'validation',
    'startup',
    'Anti-nausea wristbands using acupressure — targeting travelers and chemo patients.',
    'Validate product-market fit and secure first 50 pre-orders',
    '#00d4aa'
  ),
  (
    'Godfather''s Table',
    '♟️',
    'building',
    'side_project',
    'Online strategy game with negotiation, alliances, and political simulation mechanics.',
    'Ship MVP with core game loop and onboard first 100 players',
    '#8b5cf6'
  ),
  (
    'Crypto Bot Fleet',
    '🤖',
    'revenue',
    'side_project',
    'Automated crypto trading bots running on multiple exchanges with custom strategies.',
    'Reach $2,000/month in consistent bot revenue',
    '#f59e0b'
  ),
  (
    'SmartCryptoTraderHQ',
    '📈',
    'revenue',
    'side_project',
    'Online crypto trading courses — from beginner to algo trading.',
    'Hit $3,000/month in course revenue and launch advanced bot-building course',
    '#00d4aa'
  ),
  (
    'Day Job',
    '💼',
    'scaling',
    'day_job',
    'Product Owner — payroll software for US entertainment industry. Scrum team of 8.',
    'Deliver Q3 roadmap on time and get performance review rating of Exceeds',
    '#6b7280'
  )
ON CONFLICT DO NOTHING;

-- ─── Default Habits ───────────────────────────────────────────────────────────

INSERT INTO habits (name, category, frequency, target_streak)
VALUES
  ('Morning routine', 'health', 'daily', 30),
  ('Exercise', 'health', 'daily', 30),
  ('Review tasks', 'productivity', 'daily', 30),
  ('No unnecessary spending', 'finance', 'daily', 30),
  ('Read / learn 20 min', 'learning', 'daily', 30),
  ('Project deep work block', 'productivity', 'weekdays', 20)
ON CONFLICT DO NOTHING;

-- ─── Placeholder Finance Accounts ─────────────────────────────────────────────

INSERT INTO finances_accounts (name, type, currency, current_balance, institution)
VALUES
  ('Bancolombia Checking', 'checking', 'COP', 0, 'Bancolombia'),
  ('Nequi', 'checking', 'COP', 0, 'Nequi'),
  ('Credit Card 1', 'credit_card', 'COP', 0, NULL),
  ('Binance', 'crypto', 'USD', 0, 'Binance'),
  ('Investment Portfolio', 'investment', 'USD', 0, NULL)
ON CONFLICT DO NOTHING;
