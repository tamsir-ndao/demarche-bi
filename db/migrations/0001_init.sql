-- Démarche-Bi : journal anonyme et avis des utilisateurs (OPTIONNEL).
-- L'application fonctionne sans base de données. Aucune donnée personnelle n'est stockée :
-- pas d'adresse IP, pas d'identifiant, pas de compte. Les questions sont tronquées à 500 caractères.

create table question_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question text not null check (char_length(question) <= 500),
  language text check (language in ('fr', 'wo', 'mixte')),   -- détectée par l'IA
  channel text not null default 'text' check (channel in ('text', 'voice')),
  answered boolean not null,                                   -- false = « je ne sais pas »
  fiche_slugs text[] not null default '{}'                     -- fiches utilisées pour répondre
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_log_id uuid references question_logs(id) on delete cascade,
  helpful boolean not null,
  comment text check (comment is null or char_length(comment) <= 500)
);

create index on question_logs (created_at);
create index on question_logs (answered);
create index on feedback (question_log_id);

-- Purge conseillée (à lancer régulièrement) :
--   delete from question_logs where created_at < now() - interval '90 days';
