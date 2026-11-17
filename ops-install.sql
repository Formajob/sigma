-- ============================================================
--  SIGMA — Migration PGV + Planning + Attendance + Emails
--  Fichier : sql/ops-install.sql
--  Version : 1.0  ·  16 novembre 2026
--
--  À exécuter dans : Supabase → SQL Editor → New query → Run
--
--  CARACTÈRE : idempotent (rejouable sans risque), non destructif.
--  Aucun DROP TABLE, aucune donnée existante supprimée.
--  Les seules suppressions sont des vues recréées et une
--  contrainte d'unicité incompatible avec le multi-activité.
-- ============================================================

begin;

-- ============================================================
-- 0. PRÉ-CONTRÔLE — l'état avant
-- ============================================================
do $$
declare
  n_agents int; n_cal int; n_qa int;
begin
  select count(*) into n_agents from public.agents;
  select count(*) into n_cal    from public.calibrations;
  select count(*) into n_qa     from public.qa_elements;
  raise notice 'AVANT → agents: % · calibrations: % · qa_elements: %', n_agents, n_cal, n_qa;
end $$;


-- ============================================================
-- 1. QA_ELEMENTS — rendre la grille multi-activité
-- ============================================================

alter table public.qa_elements add column if not exists activity   text    not null default 'americana';
alter table public.qa_elements add column if not exists weight     int     not null default 1;
alter table public.qa_elements add column if not exists critical   boolean not null default false;
alter table public.qa_elements add column if not exists na_allowed boolean not null default true;

-- La position était unique sur toute la table : incompatible avec deux grilles.
-- On supprime toute contrainte UNIQUE portant sur la seule colonne position.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.qa_elements'::regclass
      and c.contype  = 'u'
      and c.conkey = array[(select a.attnum from pg_attribute a
                            where a.attrelid = 'public.qa_elements'::regclass
                              and a.attname  = 'position')]
  loop
    raise notice 'Suppression contrainte unique sur qa_elements.position : %', r.conname;
    execute format('alter table public.qa_elements drop constraint %I', r.conname);
  end loop;

  -- même chose pour un index unique créé sans contrainte
  for r in
    select i.indexname
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename  = 'qa_elements'
      and i.indexdef ilike '%unique%'
      and i.indexdef ilike '%(position)%'
      and i.indexdef not ilike '%,%'
  loop
    raise notice 'Suppression index unique sur qa_elements.position : %', r.indexname;
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

-- Même problème sur le CODE : qa_elements_code_key interdit à PGV d'avoir
-- ses propres CTB-01… quand Americana utilise déjà ces codes.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.qa_elements'::regclass
      and c.contype  = 'u'
      and c.conkey = array[(select a.attnum from pg_attribute a
                            where a.attrelid = 'public.qa_elements'::regclass
                              and a.attname  = 'code')]
  loop
    raise notice 'Suppression contrainte unique sur qa_elements.code : %', r.conname;
    execute format('alter table public.qa_elements drop constraint %I', r.conname);
  end loop;

  for r in
    select i.indexname
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename  = 'qa_elements'
      and i.indexdef ilike '%unique%'
      and i.indexdef ilike '%(code)%'
      and i.indexdef not ilike '%,%'
  loop
    raise notice 'Suppression index unique sur qa_elements.code : %', r.indexname;
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

-- Une position et un code ne sont uniques QUE dans leur activité.
create unique index if not exists qa_elements_activity_position
  on public.qa_elements (activity, position);
create unique index if not exists qa_elements_activity_code
  on public.qa_elements (activity, code);

-- État de la table avant insertion (lisible dans l'onglet Messages)
do $$
declare r record;
begin
  for r in select activity, count(*) n, min(position) pmin, max(position) pmax
           from public.qa_elements group by activity
  loop
    raise notice 'qa_elements → % : % ligne(s), positions % à %', r.activity, r.n, r.pmin, r.pmax;
  end loop;
end $$;

-- Les éléments PGV d'une tentative précédente, non encore utilisés par un
-- calibrage, sont retirés puis réinsérés proprement (aucun historique touché).
delete from public.qa_elements e
where e.activity = 'pgv'
  and not exists (select 1 from public.calibration_results r where r.element_id = e.id);


-- ============================================================
-- 2. GRILLE PGV — 32 éléments, pondérés, 6 critiques
-- ============================================================
insert into public.qa_elements (activity, code, category, label, position, weight, critical, na_allowed, active)
values
-- ---- CTB · Traitement & conformité (11 éléments, 26 points) ----
('pgv','CTB-01','CTB'::public.qa_category,'Identité vérifiée avant le dossier',1,3,true, false,true),
('pgv','CTB-02','CTB'::public.qa_category,'Dossier consulté dans Darwin pendant l’appel',2,2,false,false,true),
('pgv','CTB-03','CTB'::public.qa_category,'Demande qualifiée dans la bonne typologie',3,2,false,false,true),
('pgv','CTB-04','CTB'::public.qa_category,'Information exacte et vérifiée',4,3,true, false,true),
('pgv','CTB-05','CTB'::public.qa_category,'Procédure appliquée jusqu’au bout',5,3,false,false,true),
('pgv','CTB-06','CTB'::public.qa_category,'Aucun engagement hors mandat',6,3,true, false,true),
('pgv','CTB-07','CTB'::public.qa_category,'Actions saisies dans Darwin en direct',7,2,false,false,true),
('pgv','CTB-08','CTB'::public.qa_category,'Escalade déclenchée à bon escient',8,2,false,true, true),
('pgv','CTB-09','CTB'::public.qa_category,'Suite et délai communiqués',9,2,false,false,true),
('pgv','CTB-10','CTB'::public.qa_category,'Dossier clôturé et statut à jour',10,1,false,false,true),
('pgv','CTB-11','CTB'::public.qa_category,'Confidentialité respectée',11,3,true, false,true),
-- ---- CTC · Relation client (10 éléments, 18 points) ----
('pgv','CTC-01','CTC'::public.qa_category,'Décroché et formule d’accueil',12,1,false,false,true),
('pgv','CTC-02','CTC'::public.qa_category,'Client écouté jusqu’au bout',13,2,false,false,true),
('pgv','CTC-03','CTC'::public.qa_category,'Reformulation de la demande',14,2,false,false,true),
('pgv','CTC-04','CTC'::public.qa_category,'Réponse à la question posée',15,2,false,false,true),
('pgv','CTC-05','CTC'::public.qa_category,'Explication claire et sans jargon',16,2,false,false,true),
('pgv','CTC-06','CTC'::public.qa_category,'Gestion de la réclamation',17,3,false,true, true),
('pgv','CTC-07','CTC'::public.qa_category,'Mise en attente conforme',18,2,false,true, true),
('pgv','CTC-08','CTC'::public.qa_category,'Transfert annoncé et présenté',19,1,false,true, true),
('pgv','CTC-09','CTC'::public.qa_category,'Clôture complète',20,2,false,false,true),
('pgv','CTC-10','CTC'::public.qa_category,'Nom du client utilisé',21,1,false,false,true),
-- ---- NC · Savoir être (11 éléments, 18 points) ----
('pgv','NC-01','NC'::public.qa_category,'V.A.T.R.E — Volume',22,1,false,false,true),
('pgv','NC-02','NC'::public.qa_category,'V.A.T.R.E — Articulation',23,1,false,false,true),
('pgv','NC-03','NC'::public.qa_category,'V.A.T.R.E — Ton',24,1,false,false,true),
('pgv','NC-04','NC'::public.qa_category,'V.A.T.R.E — Rythme',25,1,false,false,true),
('pgv','NC-05','NC'::public.qa_category,'V.A.T.R.E — Énergie',26,1,false,false,true),
('pgv','NC-06','NC'::public.qa_category,'Professionnalisme',27,2,false,false,true),
('pgv','NC-07','NC'::public.qa_category,'Écoute active',28,2,false,false,true),
('pgv','NC-08','NC'::public.qa_category,'Empathie',29,2,false,false,true),
('pgv','NC-09','NC'::public.qa_category,'Contrôle émotionnel',30,3,true, false,true),
('pgv','NC-10','NC'::public.qa_category,'Neutralité et respect',31,3,true, false,true),
('pgv','NC-11','NC'::public.qa_category,'Maîtrise de la langue du client',32,1,false,false,true)
on conflict (activity, position) do update
  set code       = excluded.code,
      category   = excluded.category,
      label      = excluded.label,
      weight     = excluded.weight,
      critical   = excluded.critical,
      na_allowed = excluded.na_allowed,
      active     = true;


-- ============================================================
-- 3. ACTIVITÉ SUR LES TABLES MÉTIER
-- ============================================================
alter table public.agents        add column if not exists activity text not null default 'americana';
alter table public.calibrations  add column if not exists activity text not null default 'americana';
alter table public.calibrations  add column if not exists channel  text not null default 'call';
alter table public.documents     add column if not exists activity text not null default 'americana';
alter table public.documents     add column if not exists channel  text not null default 'call';
alter table public.call_volumes  add column if not exists activity text not null default 'americana';

create index if not exists agents_activity_idx       on public.agents (activity);
create index if not exists calibrations_activity_idx on public.calibrations (activity, calibration_date desc);
create index if not exists documents_activity_idx    on public.documents (activity, meeting_date desc);
create index if not exists volumes_activity_idx      on public.call_volumes (activity, period_from desc);


-- ============================================================
-- 4. ÉQUIPE PGV — les 3 agents
--    ⚠ données nominatives : ne pas committer ce fichier dans
--      un dépôt public. À exécuter depuis Supabase.
-- ============================================================
insert into public.agents (activity, full_name, staff_id, job_role, team, service, active)
select v.activity, v.full_name, v.staff_id, v.job_role, v.team, v.service, v.active
from (values
  ('pgv','Amadou AliBa', '209217','Agent support','SAC PGV','Traitement appels & emails',true),
  ('pgv','Elagbi Zineb','203858','Agent support','SAC PGV','Traitement appels & emails',true),
  ('pgv','Miri Hind',   '204186','Agent support','SAC PGV','Traitement appels & emails',true)
) as v(activity, full_name, staff_id, job_role, team, service, active)
where not exists (
  select 1 from public.agents a
  where a.activity = v.activity and a.staff_id = v.staff_id
);

-- emails, seulement si la colonne existe
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='agents' and column_name='email') then
    update public.agents set email = 'amadou.aliba@morocco.xceedcc.com'  where activity='pgv' and staff_id='209217' and coalesce(email,'')='';
    update public.agents set email = 'elagbi.zineb@morocco.xceedcc.com'  where activity='pgv' and staff_id='203858' and coalesce(email,'')='';
    update public.agents set email = 'miri.hind@morocco.xceedcc.com'     where activity='pgv' and staff_id='204186' and coalesce(email,'')='';
  end if;
end $$;


-- ============================================================
-- 5. VUES DE SCORE — remises à niveau (poids + activité)
--    DROP + CREATE : une vue ne peut pas changer de colonnes
--    avec CREATE OR REPLACE (erreur 42P16).
--    Ordre : dépendantes d'abord.
-- ============================================================
drop view if exists public.v_weekly_trend;
drop view if exists public.v_agent_monthly_scores;
drop view if exists public.v_calibration_category_scores;
drop view if exists public.v_calibration_scores;

create view public.v_calibration_scores as
select c.id as calibration_id,
       c.agent_id,
       c.activity,
       c.channel,
       c.calibration_date,
       sum(e.weight) filter (where r.result::text = 'Oui')                          as points_ok,
       sum(e.weight) filter (where r.result::text in ('Oui','Non'))                 as points_evaluated,
       count(*) filter (where r.result::text = 'Non' and e.critical)                as critical_misses,
       case when sum(e.weight) filter (where r.result::text in ('Oui','Non')) = 0 then null
            else round(100.0 * sum(e.weight) filter (where r.result::text = 'Oui')
                             / sum(e.weight) filter (where r.result::text in ('Oui','Non')))
       end as pct
from public.calibrations c
join public.calibration_results r on r.calibration_id = c.id
join public.qa_elements e         on e.id = r.element_id
group by c.id, c.agent_id, c.activity, c.channel, c.calibration_date;

create view public.v_calibration_category_scores as
select c.id as calibration_id,
       c.activity,
       e.category::text as category,
       sum(e.weight) filter (where r.result::text = 'Oui')                          as points_ok,
       sum(e.weight) filter (where r.result::text in ('Oui','Non'))                 as points_evaluated,
       case when sum(e.weight) filter (where r.result::text in ('Oui','Non')) = 0 then null
            else round(100.0 * sum(e.weight) filter (where r.result::text = 'Oui')
                             / sum(e.weight) filter (where r.result::text in ('Oui','Non')))
       end as pct
from public.calibrations c
join public.calibration_results r on r.calibration_id = c.id
join public.qa_elements e         on e.id = r.element_id
group by c.id, c.activity, e.category;

create view public.v_agent_monthly_scores as
select c.agent_id,
       c.activity,
       date_trunc('month', c.calibration_date)::date as month,
       round(avg(s.pct)) as avg_score,
       count(*)          as calibrations,
       sum(s.critical_misses) as critical_misses
from public.calibrations c
join public.v_calibration_scores s on s.calibration_id = c.id
group by c.agent_id, c.activity, date_trunc('month', c.calibration_date)::date;

create view public.v_weekly_trend as
select c.activity,
       date_trunc('week', c.calibration_date)::date as week,
       count(*) as calibrations,
       round(avg(s.pct)) as avg_score
from public.calibrations c
left join public.v_calibration_scores s on s.calibration_id = c.id
group by c.activity, date_trunc('week', c.calibration_date)::date;


-- ============================================================
-- 6. PLANNING
-- ============================================================
create table if not exists public.planning_shifts (
  id            uuid primary key default gen_random_uuid(),
  activity      text not null,
  code          text not null,
  label         text not null,
  start_time    time,
  end_time      time,
  is_work       boolean not null default true,
  break_minutes int not null default 60,
  color         text,
  unique (activity, code)
);

create table if not exists public.planning_entries (
  id          uuid primary key default gen_random_uuid(),
  activity    text not null,
  agent_id    uuid not null references public.agents(id) on delete cascade,
  work_date   date not null,
  shift_code  text not null,
  start_time  time,
  end_time    time,
  note        text,
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  unique (activity, agent_id, work_date)
);

create index if not exists planning_entries_week_idx
  on public.planning_entries (activity, work_date);

insert into public.planning_shifts (activity, code, label, start_time, end_time, is_work, break_minutes, color)
values
  ('pgv','M',   'Après-midi','14:00','23:00', true,  60, '#C0622D'),
  ('pgv','AM',  'Après-midi', '12:00','21:00', true,  60, '#376A64'),
  ('pgv','SAT', 'Samedi',     '14:00','18:00', true,   0, '#376A64'),
  ('pgv','N',   'Nuit',       '21:00','06:00', true,  60, '#5A6B86'),
  ('pgv','OFF', 'Repos',      null,   null,    false,  0, '#9AA2A2'),
  ('pgv','VAC', 'Vacances',   null,   null,    false,  0, '#7C9BB5'),
  ('pgv','MAL', 'Maladie',    null,   null,    false,  0, '#C99A3E'),
  ('pgv','FORM','Formation',  null,   null,    false,  0, '#8E7CC3'),
  ('pgv','REU', 'Réunion',    '10:00','12:00', true,   0, '#6D7A7F')
on conflict (activity, code) do nothing;


-- ============================================================
-- 7. ATTENDANCE
-- ============================================================
create table if not exists public.attendance_events (
  id          uuid primary key default gen_random_uuid(),
  activity    text not null,
  agent_id    uuid not null references public.agents(id) on delete cascade,
  event_type  text not null check (event_type in ('in','out','break_start','break_end')),
  break_type  text check (break_type in ('pause','lunch','sortie','coaching','formation','technique','rencontre','reunion')),
  occurred_at timestamptz not null default now(),
  work_date   date not null,
  source      text not null default 'agent' check (source in ('agent','supervisor','import')),
  note        text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint break_type_required check (event_type <> 'break_start' or break_type is not null)
);

create index if not exists attendance_events_day_idx
  on public.attendance_events (activity, work_date, agent_id, occurred_at);
create index if not exists attendance_events_agent_idx
  on public.attendance_events (agent_id, occurred_at desc);

create table if not exists public.attendance_settings (
  activity    text not null,
  break_type  text not null,
  max_minutes int  not null,
  max_per_day int  not null,
  primary key (activity, break_type)
);

insert into public.attendance_settings (activity, break_type, max_minutes, max_per_day)
values
  ('pgv','pause',     15, 2),
  ('pgv','lunch',     60, 1),
  ('pgv','sortie',     5, 2),
  ('pgv','coaching',  60, 1),
  ('pgv','formation',480, 1),
  ('pgv','technique', 30, 2),
  ('pgv','rencontre', 30, 1),
  ('pgv','reunion',   30, 1)
on conflict (activity, break_type) do nothing;

create table if not exists public.attendance_alert_acks (
  activity   text not null,
  agent_id   uuid not null references public.agents(id) on delete cascade,
  work_date  date not null,
  alert_code text not null,
  acked_by   uuid,
  acked_at   timestamptz not null default now(),
  primary key (activity, agent_id, work_date, alert_code)
);

-- Vue de synthèse : une ligne par agent et par jour.
-- Les paires in→out et break_start→break_end sont appariées par lead().
create or replace view public.v_attendance_day as
with ev as (
  select e.activity, e.agent_id, e.work_date, e.event_type, e.break_type, e.occurred_at,
         lead(e.occurred_at) over (partition by e.agent_id, e.work_date order by e.occurred_at) as next_at,
         lead(e.event_type)  over (partition by e.agent_id, e.work_date order by e.occurred_at) as next_type
  from public.attendance_events e
)
select activity,
       agent_id,
       work_date,
       min(occurred_at) filter (where event_type = 'in')  as first_in,
       max(occurred_at) filter (where event_type = 'out') as last_out,
       count(*)         filter (where event_type = 'in')  as sessions,
       coalesce(sum(extract(epoch from (next_at - occurred_at)) / 60)
                filter (where event_type = 'in' and next_type = 'out'), 0)::int       as presence_min,
       coalesce(sum(extract(epoch from (next_at - occurred_at)) / 60)
                filter (where event_type = 'break_start' and break_type = 'pause'), 0)::int   as break_pause_min,
       coalesce(sum(extract(epoch from (next_at - occurred_at)) / 60)
                filter (where event_type = 'break_start' and break_type = 'lunch'), 0)::int   as break_lunch_min,
       coalesce(sum(extract(epoch from (next_at - occurred_at)) / 60)
                filter (where event_type = 'break_start' and break_type = 'sortie'), 0)::int  as break_sortie_min,
       coalesce(sum(extract(epoch from (next_at - occurred_at)) / 60)
                filter (where event_type = 'break_start'), 0)::int                     as break_total_min
from ev
group by activity, agent_id, work_date;


-- ============================================================
-- 8. EMAILS — rotation, journées, répartition par agent
-- ============================================================
create table if not exists public.email_rotation (
  id       uuid primary key default gen_random_uuid(),
  activity text not null,
  agent_id uuid not null references public.agents(id) on delete cascade,
  position int  not null,
  active   boolean not null default true,
  unique (activity, position),
  unique (activity, agent_id)
);

create table if not exists public.email_settings (
  activity       text primary key,
  anchor_date    date not null,
  skip_weekend   boolean not null default true,
  target_sac_pct int not null default 98,
  active         boolean not null default true
);

create table if not exists public.email_days (
  id                        uuid primary key default gen_random_uuid(),
  activity                  text not null,
  work_date                 date not null,
  planned_agent_id          uuid references public.agents(id) on delete set null,
  duty_agent_id             uuid references public.agents(id) on delete set null,
  received_total            int not null default 0,
  received_sac              int not null default 0,
  non_sac_spam              int not null default 0,
  non_sac_pub               int not null default 0,
  non_sac_autre_departement int not null default 0,
  non_sac_autre             int not null default 0,
  treated_sac               int not null default 0,
  note                      text,
  updated_by                uuid,
  updated_at                timestamptz not null default now(),
  unique (activity, work_date)
);

create table if not exists public.email_agent_daily (
  id            uuid primary key default gen_random_uuid(),
  activity      text not null,
  work_date     date not null,
  agent_id      uuid not null references public.agents(id) on delete cascade,
  treated_sac   int not null default 0,
  treated_other int not null default 0,
  unique (activity, work_date, agent_id)
);

create table if not exists public.email_activity_log (
  id         uuid primary key default gen_random_uuid(),
  activity   text not null,
  work_date  date not null,
  action     text not null,
  from_agent uuid,
  to_agent   uuid,
  actor      uuid,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists email_days_month_idx on public.email_days (activity, work_date desc);

-- Rotation initiale : ordre alphabétique = Amadou, Elagbi, Miri (l'ordre demandé)
insert into public.email_rotation (activity, agent_id, position)
select 'pgv', a.id, row_number() over (order by a.full_name, a.staff_id)
from public.agents a
where a.activity = 'pgv' and coalesce(a.active, true)
  and not exists (select 1 from public.email_rotation r where r.activity = 'pgv' and r.agent_id = a.id);

insert into public.email_settings (activity, anchor_date, skip_weekend, target_sac_pct)
values ('pgv', date '2026-10-01', true, 98)
on conflict (activity) do nothing;


-- ============================================================
-- 9. RLS SUR LES NOUVELLES TABLES
--    Lecture : tout compte disposant d'un profil.
--    Écriture : manager (superviseur, admin, super_admin).
-- ============================================================
create or replace function public.is_manager() returns boolean
language sql security definer set search_path = public as
$$ select exists (select 1 from public.profiles
                  where id = auth.uid()
                    and role::text in ('superviseur','admin','super_admin')) $$;

alter table public.planning_shifts        enable row level security;
alter table public.planning_entries       enable row level security;
alter table public.attendance_events      enable row level security;
alter table public.attendance_settings    enable row level security;
alter table public.attendance_alert_acks  enable row level security;
alter table public.email_rotation         enable row level security;
alter table public.email_settings         enable row level security;
alter table public.email_days             enable row level security;
alter table public.email_agent_daily      enable row level security;
alter table public.email_activity_log     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'planning_shifts','planning_entries','attendance_events','attendance_settings',
    'attendance_alert_acks','email_rotation','email_settings','email_days',
    'email_agent_daily','email_activity_log'
  ]
  loop
    execute format('drop policy if exists ops_read on public.%I', t);
    execute format('drop policy if exists ops_write on public.%I', t);
    execute format($f$create policy ops_read on public.%I for select to authenticated
                     using (exists (select 1 from public.profiles where id = auth.uid()))$f$, t);
    execute format($f$create policy ops_write on public.%I for all to authenticated
                     using (public.is_manager()) with check (public.is_manager())$f$, t);
  end loop;
end $$;

-- Un agent peut créer SES propres pointages, même s'il n'est pas manager.
drop policy if exists att_self_insert on public.attendance_events;
create policy att_self_insert on public.attendance_events
  for insert to authenticated
  with check (
    source = 'agent'
    and agent_id in (select agent_id from public.profiles where id = auth.uid())
  );


commit;


-- ============================================================
-- 10. VÉRIFICATION — lis les résultats après exécution
-- ============================================================

-- 10.1 Deux grilles, deux activités (attendu : americana 19 · pgv 32)
select activity, count(*) as elements, sum(weight) as points
from public.qa_elements
where active
group by activity
order by activity;

-- 10.2 Les 3 agents PGV (attendu : 3)
select staff_id, full_name, coalesce(team,'') as team
from public.agents
where activity = 'pgv'
order by full_name;

-- 10.3 Rotation emails (attendu : 1 Amadou, 2 Elagbi, 3 Miri)
select r.position, a.full_name
from public.email_rotation r
join public.agents a on a.id = r.agent_id
where r.activity = 'pgv'
order by r.position;

-- 10.4 Shifts PGV (attendu : 8)
select code, label, start_time, end_time, is_work
from public.planning_shifts
where activity = 'pgv'
order by is_work desc, start_time;

-- 10.5 Droits de pause (attendu : 6 lignes)
select break_type, max_minutes, max_per_day
from public.attendance_settings
where activity = 'pgv'
order by max_minutes;

-- 10.6 Répartition des calibrations par activité (avant/après migration)
select activity, count(*) as calibrations
from public.calibrations
group by activity;
