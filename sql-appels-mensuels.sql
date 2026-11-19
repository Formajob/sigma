-- Saisie mensuelle des appels traités par agent, réservée aux responsables PGV.
-- Chaque upsert remplace le total du mois; aucun cumul automatique.
create table if not exists public.agent_monthly_activity (
  id uuid primary key default gen_random_uuid(),
  activity text not null,
  month_start date not null check (extract(day from month_start) = 1),
  agent_id uuid not null references public.agents(id) on delete cascade,
  calls_treated integer not null default 0 check (calls_treated >= 0),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (activity, month_start, agent_id)
);
create index if not exists agent_monthly_activity_month_idx
  on public.agent_monthly_activity(activity, month_start desc, agent_id);

alter table public.agent_monthly_activity enable row level security;
drop policy if exists ama_pgv_read on public.agent_monthly_activity;
drop policy if exists ama_pgv_manager_write on public.agent_monthly_activity;
create policy ama_pgv_read on public.agent_monthly_activity
  for select to authenticated using (
    activity = 'pgv' and exists (
      select 1 from public.profiles p where p.id=auth.uid() and p.activity='pgv'
        and (p.role::text in ('superviseur','admin','super_admin','qualite') or p.agent_id=agent_monthly_activity.agent_id)
    )
  );
create policy ama_pgv_manager_write on public.agent_monthly_activity
  for all to authenticated using (
    activity = 'pgv' and exists (
      select 1 from public.profiles p where p.id=auth.uid() and p.activity='pgv'
        and p.role::text in ('superviseur','admin','super_admin')
    )
  ) with check (
    activity = 'pgv' and exists (
      select 1 from public.profiles p where p.id=auth.uid() and p.activity='pgv'
        and p.role::text in ('superviseur','admin','super_admin')
    )
  );
