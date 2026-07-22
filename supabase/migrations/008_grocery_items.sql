-- Grocery items: master list organized by category
-- checked = user needs to buy this on the next trip
-- is_permanent = item is part of the standing list (shown even when unchecked)
-- is_default = starts checked by default (the [x] items from master list)

CREATE TABLE IF NOT EXISTS grocery_items (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  category_emoji TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_permanent BOOLEAN NOT NULL DEFAULT TRUE,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  checked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items (category, sort_order);

-- Disable RLS so the app can read/write without extra policy setup
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_grocery" ON grocery_items FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed: Bebidas ───────────────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Cerveza',    'Bebidas', '🥤', 1,  true,  true),
  ('Cuate',      'Bebidas', '🥤', 2,  false, false),
  ('Electrolit', 'Bebidas', '🥤', 3,  true,  true),
  ('Gaseosa',    'Bebidas', '🥤', 4,  false, false),
  ('Gatorade',   'Bebidas', '🥤', 5,  false, false),
  ('Ginger Beer','Bebidas', '🥤', 6,  true,  true),
  ('Hatsu',      'Bebidas', '🥤', 7,  false, false),
  ('Red Bull',   'Bebidas', '🥤', 8,  true,  true),
  ('Ron',        'Bebidas', '🥤', 9,  true,  true),
  ('Soda',       'Bebidas', '🥤', 10, false, false),
  ('Tequila',    'Bebidas', '🥤', 11, true,  true);

-- ─── Seed: Limpieza del Hogar ─────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Alcohol',                  'Limpieza del Hogar', '🧹', 1,  true,  true),
  ('Ambientador',              'Limpieza del Hogar', '🧹', 2,  true,  true),
  ('Baterias',                 'Limpieza del Hogar', '🧹', 3,  true,  true),
  ('Bolsas de basura',         'Limpieza del Hogar', '🧹', 4,  true,  true),
  ('Bolsas ziploc',            'Limpieza del Hogar', '🧹', 5,  true,  true),
  ('Desengrasante',            'Limpieza del Hogar', '🧹', 6,  true,  true),
  ('Desinfectante',            'Limpieza del Hogar', '🧹', 7,  true,  true),
  ('Detergente',               'Limpieza del Hogar', '🧹', 8,  true,  true),
  ('Esponja',                  'Limpieza del Hogar', '🧹', 9,  true,  true),
  ('Insecticida',              'Limpieza del Hogar', '🧹', 10, true,  true),
  ('Lavaloza',                 'Limpieza del Hogar', '🧹', 11, true,  true),
  ('Limpia Juntas',            'Limpieza del Hogar', '🧹', 12, true,  true),
  ('Limpia pisos',             'Limpieza del Hogar', '🧹', 13, true,  true),
  ('Limpia vidrios',           'Limpieza del Hogar', '🧹', 14, true,  true),
  ('Papel higiénico',          'Limpieza del Hogar', '🧹', 15, true,  true),
  ('Papel toalla',             'Limpieza del Hogar', '🧹', 16, true,  true),
  ('Pastillas azules sanitario','Limpieza del Hogar','🧹', 17, true,  true),
  ('Pato',                     'Limpieza del Hogar', '🧹', 18, true,  true),
  ('Servilletas',              'Limpieza del Hogar', '🧹', 19, true,  true),
  ('Suavizante',               'Limpieza del Hogar', '🧹', 20, false, false);

-- ─── Seed: Medicina y Salud ──────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Dolex',       'Medicina y Salud', '💊', 1, true, true),
  ('Dolex Gripa', 'Medicina y Salud', '💊', 2, true, true);

-- ─── Seed: Carnes y Proteínas ────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Alitas',      'Carnes y Proteínas', '🍗', 1, true,  true),
  ('Atún',        'Carnes y Proteínas', '🍗', 2, true,  true),
  ('Camarones',   'Carnes y Proteínas', '🍗', 3, false, false),
  ('Carne de res','Carnes y Proteínas', '🍗', 4, false, false),
  ('Jamones',     'Carnes y Proteínas', '🍗', 5, true,  true),
  ('Pollo',       'Carnes y Proteínas', '🍗', 6, true,  true),
  ('Salchichas',  'Carnes y Proteínas', '🍗', 7, true,  true);

-- ─── Seed: Lácteos y Derivados ───────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Crema de leche',  'Lácteos y Derivados', '🥚', 1,  true, true),
  ('Huevos',          'Lácteos y Derivados', '🥚', 2,  true, true),
  ('Leche',           'Lácteos y Derivados', '🥚', 3,  true, true),
  ('Mantequilla',     'Lácteos y Derivados', '🥚', 4,  true, true),
  ('Queso cheddar',   'Lácteos y Derivados', '🥚', 5,  true, true),
  ('Queso crema',     'Lácteos y Derivados', '🥚', 6,  true, true),
  ('Queso parmesano', 'Lácteos y Derivados', '🥚', 7,  true, true),
  ('Queso pepper jack','Lácteos y Derivados','🥚', 8,  true, true),
  ('Queso tajadas',   'Lácteos y Derivados', '🥚', 9,  true, true),
  ('Sour Cream',      'Lácteos y Derivados', '🥚', 10, true, true);

-- ─── Seed: Frutas y Verduras ─────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Ajo',       'Frutas y Verduras', '🍅', 1,  true,  true),
  ('Aguacate',  'Frutas y Verduras', '🍅', 2,  true,  true),
  ('Banano',    'Frutas y Verduras', '🍅', 3,  true,  true),
  ('Cebolla',   'Frutas y Verduras', '🍅', 4,  true,  true),
  ('Cilantro',  'Frutas y Verduras', '🍅', 5,  true,  true),
  ('Lechuga',   'Frutas y Verduras', '🍅', 6,  true,  true),
  ('Limones',   'Frutas y Verduras', '🍅', 7,  false, false),
  ('Mandarinas','Frutas y Verduras', '🍅', 8,  true,  true),
  ('Manzanas',  'Frutas y Verduras', '🍅', 9,  true,  true),
  ('Papa',      'Frutas y Verduras', '🍅', 10, true,  true),
  ('Repollo',   'Frutas y Verduras', '🍅', 11, true,  true),
  ('Tomates',   'Frutas y Verduras', '🍅', 12, true,  true),
  ('Zanahoria', 'Frutas y Verduras', '🍅', 13, true,  true);

-- ─── Seed: Panadería y Harinas ───────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Arepas',            'Panadería y Harinas', '🍞', 1, true,  true),
  ('Croissants',        'Panadería y Harinas', '🍞', 2, false, false),
  ('Masa para Pizza',   'Panadería y Harinas', '🍞', 3, true,  true),
  ('Pan tajado',        'Panadería y Harinas', '🍞', 4, false, false),
  ('Pancakes',          'Panadería y Harinas', '🍞', 5, true,  true),
  ('Papas a la francesa','Panadería y Harinas','🍞', 6, true,  true),
  ('Tortillas',         'Panadería y Harinas', '🍞', 7, true,  true),
  ('Waffles',           'Panadería y Harinas', '🍞', 8, true,  true);

-- ─── Seed: Granos y Cereales ─────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Arroz', 'Granos y Cereales', '☕', 1, true, true),
  ('Café',  'Granos y Cereales', '☕', 2, true, true),
  ('Cereal','Granos y Cereales', '☕', 3, true, true),
  ('Maíz',  'Granos y Cereales', '☕', 4, true, true),
  ('Milo',  'Granos y Cereales', '☕', 5, true, true),
  ('Pasta', 'Granos y Cereales', '☕', 6, true, true),
  ('Sopa',  'Granos y Cereales', '☕', 7, true, true);

-- ─── Seed: Aceites y Condimentos ─────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Aceite de girasol','Aceites y Condimentos', '🧂', 1,  true, true),
  ('Aceite de oliva',  'Aceites y Condimentos', '🧂', 2,  true, true),
  ('Azúcar',           'Aceites y Condimentos', '🧂', 3,  true, true),
  ('Mayonesa',         'Aceites y Condimentos', '🧂', 4,  true, true),
  ('Miel',             'Aceites y Condimentos', '🧂', 5,  true, true),
  ('Panela',           'Aceites y Condimentos', '🧂', 6,  true, true),
  ('Paprika',          'Aceites y Condimentos', '🧂', 7,  true, true),
  ('Pimienta',         'Aceites y Condimentos', '🧂', 8,  true, true),
  ('Sal',              'Aceites y Condimentos', '🧂', 9,  true, true),
  ('Salsa de tomate',  'Aceites y Condimentos', '🧂', 10, true, true),
  ('Salsa BBQ',        'Aceites y Condimentos', '🧂', 11, true, true),
  ('Salsa Picante',    'Aceites y Condimentos', '🧂', 12, true, true),
  ('Pasta de tomate',  'Aceites y Condimentos', '🧂', 13, true, true);

-- ─── Seed: Snacks y Dulces ───────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Bon Ice', 'Snacks y Dulces', '🍭', 1, true, true),
  ('Ducales', 'Snacks y Dulces', '🍭', 2, true, true),
  ('Helado',  'Snacks y Dulces', '🍭', 3, true, true),
  ('Mekato',  'Snacks y Dulces', '🍭', 4, true, true),
  ('Saltín',  'Snacks y Dulces', '🍭', 5, true, true);

-- ─── Seed: Cuidado Personal ──────────────────────────────────────────────────
INSERT INTO grocery_items (name, category, category_emoji, sort_order, is_default, checked) VALUES
  ('Cepillo de dientes', 'Cuidado Personal', '🪥', 1,  true, true),
  ('Crema de afeitar',   'Cuidado Personal', '🪥', 2,  true, true),
  ('Crema de dientes',   'Cuidado Personal', '🪥', 3,  true, true),
  ('Cuchilla de afeitar','Cuidado Personal', '🪥', 4,  true, true),
  ('Desodorante',        'Cuidado Personal', '🪥', 5,  true, true),
  ('Enjuague bucal',     'Cuidado Personal', '🪥', 6,  true, true),
  ('Jabón ducha',        'Cuidado Personal', '🪥', 7,  true, true),
  ('Jabón manos',        'Cuidado Personal', '🪥', 8,  true, true),
  ('Protector',          'Cuidado Personal', '🪥', 9,  true, true),
  ('Repelente',          'Cuidado Personal', '🪥', 10, true, true),
  ('Seda dental',        'Cuidado Personal', '🪥', 11, true, true),
  ('Shampoo',            'Cuidado Personal', '🪥', 12, true, true),
  ('Talco',              'Cuidado Personal', '🪥', 13, true, true),
  ('Tónico',             'Cuidado Personal', '🪥', 14, true, true);
