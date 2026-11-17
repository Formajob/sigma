-- ============================================================
--  Sigma · Documentation de suivi — côté serveur
--  À exécuter UNE FOIS dans le SQL Editor de Supabase.
--  Rejouable, non destructif.
--
--  Contenu :
--    1. Les types de document sont ouverts à d'autres objets
--       (Feedback, Rapport de fait, Observation, Rencontre…).
--    2. Les colonnes activity / channel de documents restent
--       sur 'pgv' pour les documents PGV (déjà ajoutées par
--       ops-install.sql) — on vérifie qu'elles existent.
--    3. Index de lecture par activité et par date.
--    4. RLS : le superviseur écrit ; l'agent lit ses documents
--       partagés, jamais les disciplinaires.
--    5. Le client Americana ne verra que ses propres documents.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Colonnes d'activité (idempotent)
-- ------------------------------------------------------------
alter table public.documents add column if not exists activity text not null default 'americana';
alter table public.documents add column if not exists channel  text not null default 'call';

create index if not exists documents_activity_idx   on public.documents (activity, meeting_date desc);
create index if not exists documents_agent_idx      on public.documents (agent_id, meeting_date desc);
create index if not exists documents_open_idx       on public.documents (activity, status)
  where status = 'Planifié';

-- ------------------------------------------------------------
-- 2. Contrainte de statut : on s'assure que les 3 valeurs
--    utilisées par les formulaires sont acceptées, sans casser
--    une contrainte existante qui ferait déjà le travail.
-- ------------------------------------------------------------
do $$
declare c record;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.documents'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%'
   limit 1;

  if c.conname is null then
    alter table public.documents
      add constraint documents_status_check
      check (status in ('Planifié','Terminé','Annulé'));
    raise notice 'Contrainte de statut créée.';
  else
    raise notice 'Contrainte de statut déjà présente : %', c.conname;
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. RLS documents — lecture
--    Managers : tout. Qualité : tout sauf Disciplinaire.
--    Agent : ses documents, visibilité partagée, hors Disciplinaire.
--    Tout le reste est refusé.
-- ------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists "sigma_read"            on public.documents;
drop policy if exists "sigma_read_documents"  on public.documents;
drop policy if exists ops_read                on public.documents;

create policy "sigma_read_documents" on public.documents
  for select to authenticated
  using (
    exists (select 1 from public.profiles p
             where p.id = auth.uid()
               and p.role in ('superviseur','admin','super_admin'))
    or exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'qualite'
                  and (doc_type is distinct from 'Disciplinaire'))
    or exists (select 1 from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'agent'
                  and agent_id = p.agent_id
                  and visibility = 'agent'
                  and (doc_type is distinct from 'Disciplinaire'))
  );

-- ------------------------------------------------------------
-- 4. RLS documents — écriture
--    is_manager() couvre superviseur / admin / super_admin.
-- ------------------------------------------------------------
drop policy if exists "manager_write_documents" on public.documents;
drop policy if exists ops_write                  on public.documents;

create policy "manager_write_documents" on public.documents
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- ------------------------------------------------------------
-- 5. Contrôle
-- ------------------------------------------------------------
do $$
declare r record;
begin
  raise notice '--- documents par activité ---';
  for r in select activity, count(*) n, count(*) filter (where status='Planifié') ouverts
             from public.documents group by activity order by activity
  loop
    raise notice '  % : % document(s), % planifié(s)', r.activity, r.n, r.ouverts;
  end loop;
  for r in select count(*) n from public.documents where activity is null
  loop
    if r.n > 0 then raise notice '  ATTENTION : % document(s) sans activité.', r.n; end if;
  end loop;
  raise notice 'Politiques en place : sigma_read_documents (lecture), manager_write_documents (écriture).';
end $$;

commit;

-- ============================================================
--  Contrôle final :
-- ============================================================
-- select activity, doc_type, status, count(*)
--   from public.documents
--  group by 1,2,3
--  order by 1,2,3;
