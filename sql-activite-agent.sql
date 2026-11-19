-- ⚠ Prérequis : la table public.agents doit exister avec la colonne `activity`.
--   Si ce n'est pas le cas, exécute d'abord ops-install.sql (flux Sigma).
-- ============================================================
-- Sigma · Activité quotidienne de l'agent (appels + emails)
-- Activité `pgv` (et `vdm` pour la même chose)
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

create table if not exists public.agent_daily_activity (
  id            uuid primary key default gen_random_uuid(),
  activity      text not null,
  work_date     date not null,
  agent_id      uuid not null references public.agents(id) on delete cascade,
  calls_received int not null default 0 check (calls_received >= 0),
  calls_treated int  not null default 0 check (calls_treated >= 0),
  note          text,
  updated_by    uuid,
  updated_at    timestamptz not null default now(),
  unique (activity, work_date, agent_id)
);

-- Migration idempotente pour les installations déjà en service.
alter table public.agent_daily_activity
  add column if not exists calls_received int not null default 0
  check (calls_received >= 0);

create index if not exists agent_daily_activity_month_idx
  on public.agent_daily_activity (activity, work_date desc, agent_id);

-- La note par agent sur les emails
alter table public.email_agent_daily add column if not exists note text;

-- La note sur la journée emails (déjà prévue) et la répartition des emails par agent
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_agent_daily_activity_work_date_agent_id_key'
  ) then
    alter table public.email_agent_daily
      add constraint email_agent_daily_activity_work_date_agent_id_key
      unique (activity, work_date, agent_id);
  end if;
end $$;

-- RLS : lecture pour tout le service, écriture pour l'agent lui-même
alter table public.agent_daily_activity enable row level security;

drop policy if exists ada_read on public.agent_daily_activity;
create policy ada_read on public.agent_daily_activity
  for select to authenticated using (true);

drop policy if exists ada_write_self on public.agent_daily_activity;
create policy ada_write_self on public.agent_daily_activity
  for insert to authenticated with check (
    agent_id = (select p.agent_id from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superviseur','admin','super_admin'))
  );

drop policy if exists ada_update_self on public.agent_daily_activity;
create policy ada_update_self on public.agent_daily_activity
  for update to authenticated using (
    agent_id = (select p.agent_id from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('superviseur','admin','super_admin'))
  );

-- Vue de synthèse par agent et par jour : cadence, emails, net de présence
create or replace view public.v_agent_day as
select
  a.activity,
  a.agent_id,
  a.work_date,
  a.calls_treated,
  coalesce(e.treated_sac, 0)   as emails_sac,
  coalesce(e.treated_other, 0) as emails_other,
  a.calls_treated + coalesce(e.treated_sac,0) + coalesce(e.treated_other,0) as actions_total,
  v.presence_min, v.break_total_min,
  greatest(0, coalesce(v.presence_min,0) - coalesce(v.break_total_min,0)) as net_min
from public.agent_daily_activity a
left join public.email_agent_daily e
  on e.activity = a.activity and e.work_date = a.work_date and e.agent_id = a.agent_id
left join public.v_attendance_day v
  on v.activity = a.activity and v.work_date = a.work_date and v.agent_id = a.agent_id;

-- ============================================================
-- Équipe PGV (rappel, idempotent) — utile si la fiche manque
-- ============================================================
insert into public.agents (activity, full_name, staff_id, job_role, team, service, active)
select v.activity, v.full_name, v.staff_id, v.job_role, v.team, v.service, v.active
from (values
  ('pgv','Amadou AliBa', '209217','Agent SAC','SAC PGV','Traitement appels & emails',true),
  ('pgv','Elagbi Zineb','203858','Agent SAC','SAC PGV','Traitement appels & emails',true),
  ('pgv','Miri Hind',   '204186','Agent SAC','SAC PGV','Traitement appels & emails',true)
) as v(activity, full_name, staff_id, job_role, team, service, active)
where not exists (
  select 1 from public.agents a
  where a.activity = v.activity and a.staff_id = v.staff_id
);

-- Corrige le job_role des fiches PGV déjà présentes.
update public.agents
   set job_role = 'Agent SAC'
 where activity = 'pgv' and staff_id in ('209217', '203858', '204186');
