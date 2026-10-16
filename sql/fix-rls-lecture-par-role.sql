-- ============================================================
-- SIGMA · Patch RLS lecture par rôle (C1 — CRITIQUE)
-- Contexte : les politiques "sigma_read" autorisent TOUT utilisateur
-- authentifié à LIRE toutes les données. Le filtrage par rôle n'existe
-- que côté front (contournable via la console ou l'API directe).
-- Ce patch resserre la LECTURE côté serveur. Les politiques d'ÉCRITURE
-- existantes (managers / calibration writers) sont inchangées.
--
-- Règles appliquées :
--  - agents/tout le monde : grille QA + objectifs lisibles par tous les authentifiés.
--  - superviseur / admin / super_admin : lecture totale.
--  - qualite : tout SAUF les documents Disciplinaire.
--  - agent : uniquement SES calibrages, SES résultats via la jointure,
--    SES volumes, et les documents le concernant AVEC visibility='agent'
--    (jamais les 'supervisor'). Jamais les disciplinaires des autres.
--
-- À exécuter dans Supabase → SQL Editor. Idempotent (DROP IF EXISTS).
-- APRÈS exécution : tester chaque rôle dans l'app (agent, qualite,
-- superviseur) avant de considérer la prod sécurisée.
-- ============================================================

-- Helpers : rôle + agent lié de l'appelant.
create or replace function sigma_my_role() returns text
language sql stable security definer set search_path = public as
$$ select role::text from profiles where id = auth.uid() $$;

create or replace function sigma_my_agent() returns uuid
language sql stable security definer set search_path = public as
$$ select agent_id from profiles where id = auth.uid() $$;

-- ---------- Tables de référence : lecture pour tout authentifié ----------
drop policy if exists "sigma_read" on qa_elements;
create policy "sigma_read_qa" on qa_elements
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));

drop policy if exists "sigma_read" on goals;
create policy "sigma_read_goals" on goals
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));

-- ---------- agents ----------
drop policy if exists "sigma_read" on agents;
create policy "sigma_read_agents" on agents
  for select to authenticated
  using (
    sigma_my_role() in ('superviseur','qualite','admin','super_admin')
    or id = sigma_my_agent()
  );

-- ---------- calibrations ----------
drop policy if exists "sigma_read" on calibrations;
create policy "sigma_read_calibrations" on calibrations
  for select to authenticated
  using (
    sigma_my_role() in ('superviseur','qualite','admin','super_admin')
    or agent_id = sigma_my_agent()
  );

-- ---------- calibration_results : via le calibrage parent ----------
drop policy if exists "sigma_read" on calibration_results;
create policy "sigma_read_results" on calibration_results
  for select to authenticated
  using (
    sigma_my_role() in ('superviseur','qualite','admin','super_admin')
    or exists (
      select 1 from calibrations c
      where c.id = calibration_results.calibration_id
        and c.agent_id = sigma_my_agent()
    )
  );

-- ---------- documents ----------
-- qualite : tout sauf Disciplinaire. agent : ses docs partagés ('agent')
-- uniquement, jamais les 'supervisor'. Managers : tout.
drop policy if exists "sigma_read" on documents;
create policy "sigma_read_documents" on documents
  for select to authenticated
  using (
    sigma_my_role() in ('superviseur','admin','super_admin')
    or (
      sigma_my_role() = 'qualite'
      and (doc_type is distinct from 'Disciplinaire')
    )
    or (
      sigma_my_role() = 'agent'
      and agent_id = sigma_my_agent()
      and visibility = 'agent'
      and (doc_type is distinct from 'Disciplinaire')
    )
  );

-- ---------- call_volumes ----------
drop policy if exists "sigma_read" on call_volumes;
create policy "sigma_read_volumes" on call_volumes
  for select to authenticated
  using (
    sigma_my_role() in ('superviseur','qualite','admin','super_admin')
    or agent_id = sigma_my_agent()
  );

-- ---------- Vérification (décommenter après exécution) ----------
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public'
--    and tablename in ('agents','qa_elements','calibrations','calibration_results','documents','call_volumes','goals')
--  order by tablename, policyname;
