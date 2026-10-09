-- ============================================================
-- Sigma · Americana — Seed grille + vues scores + RLS
-- À exécuter APRÈS supabase-americana.sql
-- Formule imposée : score = Oui ÷ (Oui + Non) × 100 (N/A exclus)
-- ============================================================

-- ---------- Grille qualité (même ordre que QA_GRID de la maquette) ----------
insert into qa_elements (code, label, position) values
('CTB','Contrôle des appels',1),
('CTB','Matrice d’escalade TL/superviseur',2),
('CTB','Informations CRM/SDM',3),
('CTB','Notes claires et succinctes',4),
('CTC','Courtoisie pendant l’appel',5),
('CTC','Volonté d’aider',6),
('CTC','Empathie',7),
('CTC','Questions approfondies',8),
('CTC','Rappels et plaintes',9),
('CTC','Connaissance produit',10),
('CTC','Aucun raccrochage inapproprié',11),
('CTC','Professionnalisme',12),
('CTC','Confidentialité des données',13),
('NC','Ouverture rapide et claire',14),
('NC','Mise en attente et transfert',15),
('NC','Utilisation du nom du client',16),
('NC','V.A.T.R.E',17),
('NC','Communication',18),
('NC','Écoute active',19)
on conflict (position) do nothing;

-- ---------- Vue : score global par calibrage ----------
create or replace view v_calibration_scores as
select c.id as calibration_id, c.agent_id,
  count(*) filter (where r.value = 'Oui') as ok,
  count(*) filter (where r.value in ('Oui','Non')) as evaluated,
  case when count(*) filter (where r.value in ('Oui','Non')) = 0 then null
    else round(100.0 * count(*) filter (where r.value = 'Oui')
      / count(*) filter (where r.value in ('Oui','Non'))) end as pct
from calibrations c
left join calibration_results r on r.calibration_id = c.id
group by c.id, c.agent_id;

-- ---------- Vue : score par famille (CTB / CTC / NC) ----------
create or replace view v_calibration_category_scores as
select c.id as calibration_id, e.code as category,
  count(*) filter (where r.value = 'Oui') as ok,
  count(*) filter (where r.value in ('Oui','Non')) as evaluated,
  case when count(*) filter (where r.value in ('Oui','Non')) = 0 then null
    else round(100.0 * count(*) filter (where r.value = 'Oui')
      / count(*) filter (where r.value in ('Oui','Non'))) end as pct
from calibrations c
join calibration_results r on r.calibration_id = c.id
join qa_elements e on e.id = r.element_id
group by c.id, e.code;

-- ---------- Vue : score mensuel moyen par agent ----------
create or replace view v_agent_monthly_scores as
select c.agent_id, date_trunc('month', c.date)::date as month,
  round(avg(s.pct)) as avg_score, count(*) as calibrations
from calibrations c
join v_calibration_scores s on s.calibration_id = c.id
where c.status = 'Terminé'
group by c.agent_id, date_trunc('month', c.date)::date;

-- ---------- Vue : tendance hebdo ----------
create or replace view v_weekly_trend as
select date_trunc('week', c.date)::date as week,
  count(*) as calibrations, round(avg(s.pct)) as avg_score
from calibrations c
left join v_calibration_scores s on s.calibration_id = c.id
group by date_trunc('week', c.date)::date;

-- ---------- RLS : lecture si profil, écriture managers ----------
-- Hiérarchie : agent/qualite = lecture · superviseur/admin/super_admin = écriture
create or replace function is_manager() returns boolean
language sql security definer as
$$ select exists (select 1 from profiles
    where user_id = auth.uid()
    and role in ('superviseur','admin','super_admin')) $$;

alter table agents enable row level security;
alter table profiles enable row level security;
alter table qa_elements enable row level security;
alter table calibrations enable row level security;
alter table calibration_results enable row level security;
alter table documents enable row level security;
alter table call_volumes enable row level security;
alter table goals enable row level security;

create policy "sigma_read" on agents for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on qa_elements for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on calibrations for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on calibration_results for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on documents for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on call_volumes for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "sigma_read" on goals for select to authenticated
  using (exists (select 1 from profiles where user_id = auth.uid()));
create policy "own_profile" on profiles for select to authenticated
  using (user_id = auth.uid() or is_manager());
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

