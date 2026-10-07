-- Données de démonstration (fictives) : fournisseurs alimentaires Thiès / Dakar / Mbour.
-- À appliquer après la migration : npm run db:seed
insert into profiles (id, role, name, phone_whatsapp, city, zones_served) values
  ('11111111-0000-0000-0000-000000000001', 'supplier', 'Grossiste Diop & Fils', '221770000001', 'Thiès', array['Thiès','Mbour','Dakar']),
  ('11111111-0000-0000-0000-000000000002', 'supplier', 'Marché Central Légumes', '221770000002', 'Dakar', array['Dakar','Rufisque','Thiès']),
  ('11111111-0000-0000-0000-000000000003', 'supplier', 'Ferme Sow Maraîchage', '221770000003', 'Thiès', array['Thiès','Tivaouane']),
  ('11111111-0000-0000-0000-000000000004', 'supplier', 'Pêcherie Mbour Fraîcheur', '221770000004', 'Mbour', array['Mbour','Thiès','Dakar']),
  ('22222222-0000-0000-0000-000000000001', 'buyer', 'Restaurant Teranga Thiès', '221780000001', 'Thiès', array['Thiès']);

insert into products (supplier_id, name, category, unit, unit_price_fcfa, stock_qty) values
  ('11111111-0000-0000-0000-000000000001', 'Oignon', 'légumes', 'kg', 450, 2000),
  ('11111111-0000-0000-0000-000000000001', 'Pomme de terre', 'légumes', 'kg', 500, 1500),
  ('11111111-0000-0000-0000-000000000001', 'Riz brisé', 'céréales', 'sac 50kg', 21000, 300),
  ('11111111-0000-0000-0000-000000000001', 'Huile végétale', 'épicerie', 'bidon 20L', 28000, 80),
  ('11111111-0000-0000-0000-000000000002', 'Oignon', 'légumes', 'kg', 420, 3000),
  ('11111111-0000-0000-0000-000000000002', 'Pomme de terre', 'légumes', 'kg', 520, 1000),
  ('11111111-0000-0000-0000-000000000002', 'Tomate', 'légumes', 'kg', 600, 800),
  ('11111111-0000-0000-0000-000000000002', 'Carotte', 'légumes', 'kg', 550, 600),
  ('11111111-0000-0000-0000-000000000003', 'Oignon', 'légumes', 'kg', 480, 700),
  ('11111111-0000-0000-0000-000000000003', 'Chou', 'légumes', 'kg', 350, 500),
  ('11111111-0000-0000-0000-000000000003', 'Piment', 'légumes', 'kg', 1500, 100),
  ('11111111-0000-0000-0000-000000000004', 'Thiof', 'poisson', 'kg', 4500, 120),
  ('11111111-0000-0000-0000-000000000004', 'Sardinelle', 'poisson', 'kg', 1200, 400),
  ('11111111-0000-0000-0000-000000000004', 'Crevettes', 'poisson', 'kg', 6500, 60);

insert into requests (buyer_id, raw_text, delivery_city, needed_by, status) values
  ('22222222-0000-0000-0000-000000000001',
   'Il me faut 50 kg d''oignons et 20 kg de pommes de terre pour demain à Thiès',
   'Thiès', current_date + 1, 'open');
