-- ============================================================
-- Sigma · Americana — Compléments NON DESTRUCTIFS sur schéma existant
-- Dashboard Supabase → SQL Editor → New query → coller → Run
--
-- PRINCIPE : ton schéma existe déjà (tables + enums), on ne fait
-- QUE des ALTER / INSERT manquants. Aucun CREATE TABLE, aucun DROP.
--
-- PRÉREQUIS : fix-app-role-enum.sql déjà exécuté (RUN 1/2).
-- Puis remplace d0ba7adc-cab9-4de5-a0ec-c4537e25a5db / JAWAD_UUID (Authentication → Users)
-- et exécute ce fichier.
-- ============================================================

-- ---------- 0. Rattrapage colonnes (si absentes uniquement) ----------
-- ============================================================
-- Sigma · Americana — Agents enrichis (colonnes facultatives)
-- À exécuter après install-americana.sql. Non destructif.
-- Dashboard Supabase → SQL Editor → New query → coller → Run
-- ============================================================
-- Toutes les colonnes sont NULL autorisé = facultatives.
-- Le noyau reste : full_name, staff_id, job_role, team, service, active.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS position_num text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS hire_date    date;


-- ---------- 0b. Fiche agent : champs optionnels (sensible = obligatoire, reste = facultatif) ----------
-- Obligatoires (déjà présents) : full_name, staff_id, job_role, team, service
-- Facultatifs ci-dessous : tous nullable, jamais exigés à la saisie.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS position_num text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS hire_date date;
-- Index unique partiel sur l'email (si renseigné) pour éviter les doublons, sans bloquer les null.
CREATE UNIQUE INDEX IF NOT EXISTS agents_email_key ON agents (email) WHERE email IS NOT NULL;

-- ---------- 1. Grille qualité (enums réels : CTB/CTC/NC + Oui/Non/N/A) ----------
-- On insère seulement les positions manquantes, sans toucher à l'existant.
INSERT INTO qa_elements (code, category, label, position, active)
SELECT v.code, v.category::qa_category, v.label, v.position, true
FROM (VALUES
('CTB','CTB','Contrôle des appels',1),
('CTB','CTB','Matrice d’escalade TL/superviseur',2),
('CTB','CTB','Informations CRM/SDM',3),
('CTB','CTB','Notes claires et succinctes',4),
('CTC','CTC','Courtoisie pendant l’appel',5),
('CTC','CTC','Volonté d’aider',6),
('CTC','CTC','Empathie',7),
('CTC','CTC','Questions approfondies',8),
('CTC','CTC','Rappels et plaintes',9),
('CTC','CTC','Connaissance produit',10),
('CTC','CTC','Aucun raccrochage inapproprié',11),
('CTC','CTC','Professionnalisme',12),
('CTC','CTC','Confidentialité des données',13),
('NC','NC','Ouverture rapide et claire',14),
('NC','NC','Mise en attente et transfert',15),
('NC','NC','Utilisation du nom du client',16),
('NC','NC','V.A.T.R.E',17),
('NC','NC','Communication',18),
('NC','NC','Écoute active',19)
) AS v(code, category, label, position)
WHERE NOT EXISTS (SELECT 1 FROM qa_elements q WHERE q.position = v.position);


-- ---------- 4. Objectifs par défaut ----------
-- Schéma réel : goals = table SINGLETON (1 seule ligne).
--   PRIMARY KEY (id) + CHECK (id)  →  id bool TOUJOURS true.
-- Ce pattern force une seule ligne d'objectifs (pas de multi-clients).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM goals WHERE id = true) THEN
    INSERT INTO goals (id, calls_per_agent, calibrations_per_agent, compliance_pct)
    VALUES (true, 450, 8, 85);
  END IF;
END $$;

-- ---------- 5. Vues scores (enums réels : qa_result Oui/Non/N/A) ----------
-- Formule : Oui ÷ (Oui + Non) × 100, N/A exclus.
-- DROP + CREATE (pas OR REPLACE) : 42P16 interdit de retirer des colonnes sinon.
drop view if exists v_weekly_trend;
drop view if exists v_agent_monthly_scores;
drop view if exists v_calibration_category_scores;
drop view if exists v_calibration_scores;
create view v_calibration_scores as
select c.id as calibration_id, c.agent_id,
  count(*) filter (where r.result::text = 'Oui') as ok,
  count(*) filter (where r.result::text in ('Oui','Non')) as evaluated,
  case when count(*) filter (where r.result::text in ('Oui','Non')) = 0 then null
    else round(100.0 * count(*) filter (where r.result::text = 'Oui')
      / count(*) filter (where r.result::text in ('Oui','Non'))) end as pct
from calibrations c
left join calibration_results r on r.calibration_id = c.id
group by c.id, c.agent_id;

create view v_calibration_category_scores as
select c.id as calibration_id, e.category::text as category,
  count(*) filter (where r.result::text = 'Oui') as ok,
  count(*) filter (where r.result::text in ('Oui','Non')) as evaluated,
  case when count(*) filter (where r.result::text in ('Oui','Non')) = 0 then null
    else round(100.0 * count(*) filter (where r.result::text = 'Oui')
      / count(*) filter (where r.result::text in ('Oui','Non'))) end as pct
from calibrations c
join calibration_results r on r.calibration_id = c.id
join qa_elements e on e.id = r.element_id
group by c.id, e.category;

create view v_agent_monthly_scores as
select c.agent_id, date_trunc('month', c.calibration_date)::date as month,
  round(avg(s.pct)) as avg_score, count(*) as calibrations
from calibrations c
join v_calibration_scores s on s.calibration_id = c.id
group by c.agent_id, date_trunc('month', c.calibration_date)::date;

create view v_weekly_trend as
select date_trunc('week', c.calibration_date)::date as week,
  count(*) as calibrations, round(avg(s.pct)) as avg_score
from calibrations c
left join v_calibration_scores s on s.calibration_id = c.id
group by date_trunc('week', c.calibration_date)::date;

-- ---------- 6. RLS (schéma réel : profiles.id = auth.users.id) ----------
create or replace function is_manager() returns boolean
language sql security definer set search_path = public as
$$ select exists (select 1 from profiles
    where id = auth.uid()
    and role::text in ('superviseur','admin','super_admin')) $$;

alter table agents enable row level security;
alter table profiles enable row level security;
alter table qa_elements enable row level security;
alter table calibrations enable row level security;
alter table calibration_results enable row level security;
alter table documents enable row level security;
alter table call_volumes enable row level security;
alter table goals enable row level security;

drop policy if exists "sigma_read" on agents;
drop policy if exists "sigma_read" on qa_elements;
drop policy if exists "sigma_read" on calibrations;
drop policy if exists "sigma_read" on calibration_results;
drop policy if exists "sigma_read" on documents;
drop policy if exists "sigma_read" on call_volumes;
drop policy if exists "sigma_read" on goals;
drop policy if exists "own_profile" on profiles;
drop policy if exists "manager_write_agents" on agents;
drop policy if exists "manager_write_calibrations" on calibrations;
drop policy if exists "manager_write_results" on calibration_results;
drop policy if exists "manager_write_documents" on documents;
drop policy if exists "manager_write_volumes" on call_volumes;
drop policy if exists "manager_write_goals" on goals;

create policy "sigma_read" on agents for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on qa_elements for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on calibrations for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on calibration_results for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on documents for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on call_volumes for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "sigma_read" on goals for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid()));
create policy "own_profile" on profiles for select to authenticated
  using (id = auth.uid() or is_manager());
create policy "manager_write_agents" on agents
  for all to authenticated using (is_manager()) with check (is_manager());
create policy "manager_write_calibrations" on calibrations
  for all to authenticated using (is_manager()) with check (is_manager());
create policy "manager_write_results" on calibration_results
  for all to authenticated using (is_manager()) with check (is_manager());
create policy "manager_write_documents" on documents
  for all to authenticated using (is_manager()) with check (is_manager());
create policy "manager_write_volumes" on call_volumes
  for all to authenticated using (is_manager()) with check (is_manager());
create policy "manager_write_goals" on goals
  for all to authenticated using (is_manager()) with check (is_manager());

-- ---------- 7. Tes 2 accès (REMPLACE LES UUID, schéma réel : id + full_name) ----------
-- d0ba7adc-cab9-4de5-a0ec-c4537e25a5db = uid de Omar.idoulahian@gmail.com · JAWAD_UUID = uid de jawad@acx.ma
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'profiles' AND column_name = 'client') THEN
    UPDATE profiles SET role = 'admin', client = 'americana', full_name = coalesce(full_name, 'Omar')
      WHERE id = 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db';
    INSERT INTO profiles (id, full_name, role, client)
    SELECT 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db', 'Omar', 'admin', 'americana'
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db');
    UPDATE profiles SET role = 'super_admin', client = 'americana', full_name = coalesce(full_name, 'Jawad')
      WHERE id = '491b3b2c-17f8-40cf-935b-9a9e65226592';
    INSERT INTO profiles (id, full_name, role, client)
    SELECT '491b3b2c-17f8-40cf-935b-9a9e65226592', 'Jawad', 'super_admin', 'americana'
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = '491b3b2c-17f8-40cf-935b-9a9e65226592');
  ELSE
    UPDATE profiles SET role = 'admin', full_name = coalesce(full_name, 'Omar')
      WHERE id = 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db';
    INSERT INTO profiles (id, full_name, role)
    SELECT 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db', 'Omar', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'd0ba7adc-cab9-4de5-a0ec-c4537e25a5db');
    UPDATE profiles SET role = 'super_admin', full_name = coalesce(full_name, 'Jawad')
      WHERE id = '491b3b2c-17f8-40cf-935b-9a9e65226592';
    INSERT INTO profiles (id, full_name, role)
    SELECT '491b3b2c-17f8-40cf-935b-9a9e65226592', 'Jawad', 'super_admin'
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = '491b3b2c-17f8-40cf-935b-9a9e65226592');
  END IF;
END $$;

-- ---------- 8. Vérification ----------
-- select count(*) as qa_elements from qa_elements;  -- attendu : 19
-- select count(*) as goals from goals;              -- attendu : >= 1
-- select role from profiles;                        -- attendu : admin + super_admin

