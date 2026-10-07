-- Jënd-Jaay : schéma initial
-- Acheteurs et fournisseurs partagent la table profiles (role = 'buyer' | 'supplier').

create extension if not exists "pgcrypto";

create type user_role as enum ('buyer', 'supplier');
create type request_status as enum ('open', 'accepted', 'closed');
create type offer_status as enum ('pending', 'accepted', 'rejected');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  role user_role not null,
  name text not null,
  phone_whatsapp text,
  city text not null,
  zones_served text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text not null,
  unit text not null,                 -- kg, sac, litre, caisse...
  unit_price_fcfa integer not null check (unit_price_fcfa >= 0),
  stock_qty numeric,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  raw_text text not null,             -- demande libre (texte ou transcription vocale)
  parsed jsonb,                       -- sortie structurée de l'IA : items, lieu, délai
  delivery_city text,
  needed_by date,
  status request_status not null default 'open',
  created_at timestamptz not null default now()
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  supplier_id uuid not null references profiles(id) on delete cascade,
  total_fcfa integer not null check (total_fcfa >= 0),
  delivery_date date,
  note text,
  match_score numeric,                -- score de matching calculé par l'IA
  ai_summary text,                    -- résumé / justification générée
  status offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);

create index on products (supplier_id);
create index on products (category);
create index on requests (buyer_id, status);
create index on offers (request_id);

-- Row Level Security
alter table profiles enable row level security;
alter table products enable row level security;
alter table requests enable row level security;
alter table offers enable row level security;

create policy "profiles lisibles" on profiles for select using (true);
create policy "profil modifiable par son propriétaire" on profiles
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy "produits lisibles" on products for select using (true);
create policy "fournisseur gère ses produits" on products for all
  using (supplier_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (supplier_id in (select id from profiles where auth_user_id = auth.uid()));

create policy "demandes ouvertes lisibles" on requests for select using (true);
create policy "acheteur gère ses demandes" on requests for all
  using (buyer_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (buyer_id in (select id from profiles where auth_user_id = auth.uid()));

create policy "offres visibles par les parties" on offers for select using (
  supplier_id in (select id from profiles where auth_user_id = auth.uid())
  or request_id in (
    select r.id from requests r
    join profiles p on p.id = r.buyer_id
    where p.auth_user_id = auth.uid()
  )
);
create policy "fournisseur gère ses offres" on offers for all
  using (supplier_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (supplier_id in (select id from profiles where auth_user_id = auth.uid()));
