-- Jënd-Jaay : schéma initial (Postgres, compatible Neon)
-- Acheteurs et fournisseurs partagent la table profiles (role = 'buyer' | 'supplier').
-- Les droits d'accès sont appliqués côté serveur (routes API Next.js), pas par RLS.

create type user_role as enum ('buyer', 'supplier');
create type request_status as enum ('open', 'accepted', 'closed');
create type offer_status as enum ('pending', 'accepted', 'rejected');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  name text not null,
  email text unique,                  -- connexion (à brancher avec l'authentification, J9)
  password_hash text,                 -- jamais le mot de passe en clair
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
  match_score numeric,                -- score de matching calculé en code
  ai_summary text,                    -- résumé / justification générée par l'IA
  status offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);

create index on products (supplier_id);
create index on products (category);
create index on requests (buyer_id, status);
create index on offers (request_id);
