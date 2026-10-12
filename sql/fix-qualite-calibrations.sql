-- ============================================================
-- SIGMA · Patch droits qualité — calibrages uniquement
-- Contexte : le front autorise `qualite` à créer/modifier/supprimer des
-- calibrages (pas les documents), mais is_manager() ne couvre que
-- superviseur/admin/super_admin → les écritures qualité étaient refusées.
-- À exécuter dans Supabase → SQL Editor. Idempotent.
-- ============================================================

-- 1) Helper RLS : appelant autorisé sur les calibrages (managers + qualité).
create or replace function is_calibration_writer() returns boolean
language sql security definer set search_path = public as
$$ select exists (select 1 from profiles
    where id = auth.uid()
    and role::text in ('superviseur','qualite','admin','super_admin')) $$;

-- 2) Remplace les politiques d'écriture des 2 tables de calibrage.
drop policy if exists "manager_write_calibrations" on calibrations;
drop policy if exists "manager_write_results" on calibration_results;

create policy "writer_write_calibrations" on calibrations
  for all to authenticated using (is_calibration_writer()) with check (is_calibration_writer());
create policy "writer_write_results" on calibration_results
  for all to authenticated using (is_calibration_writer()) with check (is_calibration_writer());

-- 3) Vérification (décommenter)
-- select policyname, cmd, roles from pg_policies
--  where tablename in ('calibrations','calibration_results') order by 1;
