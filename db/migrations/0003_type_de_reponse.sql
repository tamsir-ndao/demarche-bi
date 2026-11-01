-- Le type de réponse, pour séparer les démarches qui manquent des sujets hors démarches.
alter table question_logs add column answer_type text check (answer_type in ('fiche', 'inconnue', 'hors_domaine', 'interdit'));
create index on question_logs (answer_type);
alter table usage_daily add column unknown int not null default 0;
