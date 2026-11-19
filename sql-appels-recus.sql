-- Migration PGV : ajoute le volume d’appels reçus saisi par agent et par jour.
-- À exécuter dans Supabase → SQL Editor avant d’utiliser le nouveau champ.
alter table public.agent_daily_activity
  add column if not exists calls_received integer not null default 0
  check (calls_received >= 0);

-- Vérification de la colonne et des valeurs existantes (initialisées à zéro).
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'agent_daily_activity'
   and column_name = 'calls_received';
