-- Démarche-Bi : mesures du back-office.
-- device_id : un code tiré au hasard sur le téléphone, sans lien avec une personne, une adresse ou un compte. Il sert
-- seulement à compter les utilisateurs. Il disparaît avec la ligne, après 90 jours.
alter table question_logs add column device_id uuid;
create index on question_logs (device_id);

-- Les passages vers e-Sénégal. Supprimés eux aussi après 90 jours.
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('esenegal')),
  fiche_slug text,
  device_id uuid
);
create index on usage_events (created_at);

-- Les totaux par jour, gardés sans limite : aucun texte de question, aucun code de téléphone.
create table usage_daily (
  day date primary key,
  questions int not null default 0,
  answered int not null default 0,
  voice int not null default 0,
  devices int not null default 0,
  esenegal int not null default 0
);
create table usage_daily_fiches (
  day date not null,
  fiche_slug text not null,
  questions int not null,
  primary key (day, fiche_slug)
);
