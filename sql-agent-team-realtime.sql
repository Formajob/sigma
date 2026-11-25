-- Sigma PGV — accès agent à la présence/planning de l’équipe et au calendrier
-- partagé des calibrages + publication Realtime.
-- Pré-requis : sql-fix-isolation-pgv.sql et les tables métier sont déjà installés.
-- Les agents gardent des droits SELECT uniquement; les écritures métier restent
-- réservées aux responsables par les policies existantes.

begin;

-- N’accorde à authenticated que les colonnes du répertoire d’équipe nécessaires
-- (l’adresse email des collègues n’est pas accessible par l’API client).
revoke select on public.agents from anon, authenticated;
grant select (id, full_name, staff_id, active, team, activity) on public.agents to authenticated;

-- Annuaire minimal : les écrans n’interrogent que id/nom/matricule/statut/équipe,
-- jamais l’adresse email d’un collègue.
drop policy if exists agents_team_directory_read on public.agents;
create policy agents_team_directory_read on public.agents
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (public.sigma_is_activity_manager(activity)
         or exists (
           select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role::text = 'agent'
              and p.activity = public.sigma_current_activity()
         ))
  );

-- Planning de l’équipe visible aux agents PGV en lecture seule. Les policies
-- d’écriture managers existantes ne sont pas modifiées.
drop policy if exists planning_entries_team_read on public.planning_entries;
create policy planning_entries_team_read on public.planning_entries
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (public.sigma_is_activity_manager(activity)
         or exists (
           select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role::text = 'agent'
              and p.activity = public.sigma_current_activity()
         ))
  );

-- Les calibrages et leurs réponses détaillées sont visibles par tous les agents
-- PGV, conformément à la décision demandée. Aucun droit d’écriture n’est ajouté.
drop policy if exists calibrations_team_read on public.calibrations;
create policy calibrations_team_read on public.calibrations
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (public.sigma_is_activity_manager(activity)
         or exists (
           select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role::text = 'agent'
              and p.activity = public.sigma_current_activity()
         ))
  );

drop policy if exists calibration_results_team_read on public.calibration_results;
create policy calibration_results_team_read on public.calibration_results
  for select to authenticated
  using (
    exists (
      select 1 from public.calibrations c
       where c.id = calibration_results.calibration_id
         and c.activity = public.sigma_current_activity()
         and (public.sigma_is_activity_manager(c.activity)
              or exists (
                select 1 from public.profiles p
                 where p.id = auth.uid()
                   and p.role::text = 'agent'
                   and p.activity = public.sigma_current_activity()
              ))
    )
  );

-- Les événements bruts de pointage restent visibles uniquement par le titulaire
-- et les responsables. Les agents voient un état courant agrégé ci-dessous.
drop policy if exists attendance_events_scoped_read on public.attendance_events;
drop policy if exists attendance_events_team_read on public.attendance_events;
create policy attendance_events_scoped_read on public.attendance_events
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (public.sigma_is_activity_manager(activity)
         or agent_id = public.sigma_current_agent())
  );

drop policy if exists attendance_alert_acks_scoped_read on public.attendance_alert_acks;
create policy attendance_alert_acks_scoped_read on public.attendance_alert_acks
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (public.sigma_is_activity_manager(activity)
         or agent_id = public.sigma_current_agent())
  );

create table if not exists public.attendance_team_presence (
  activity text not null,
  work_date date not null,
  agent_id uuid not null references public.agents(id) on delete cascade,
  status text not null default 'not_started',
  state_since timestamptz,
  updated_at timestamptz not null default now(),
  primary key (activity, work_date, agent_id)
);
alter table public.attendance_team_presence enable row level security;
revoke all on public.attendance_team_presence from anon;
grant select on public.attendance_team_presence to authenticated;
drop policy if exists attendance_team_presence_read on public.attendance_team_presence;
create policy attendance_team_presence_read on public.attendance_team_presence
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and work_date = (now() at time zone 'Africa/Casablanca')::date
    and (public.sigma_is_activity_manager(activity)
         or exists (
           select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role::text = 'agent'
              and p.activity = public.sigma_current_activity()
         ))
  );

create or replace function public.sigma_refresh_attendance_team_presence(
  p_activity text, p_work_date date, p_agent_id uuid
) returns void language plpgsql security definer set search_path = public
as $$
declare
  ev record;
  v_status text := 'not_started';
  v_since timestamptz := null;
begin
  for ev in
    select event_type::text as event_type, break_type::text as break_type, occurred_at
      from public.attendance_events
     where activity = p_activity and work_date = p_work_date and agent_id = p_agent_id
     order by occurred_at, id
  loop
    if ev.event_type = 'in' then
      v_status := 'online'; v_since := ev.occurred_at;
    elsif ev.event_type = 'break_start' then
      v_status := 'break_' || coalesce(ev.break_type, 'pause'); v_since := ev.occurred_at;
    elsif ev.event_type = 'break_end' then
      v_status := 'online'; v_since := ev.occurred_at;
    elsif ev.event_type = 'out' then
      v_status := 'out'; v_since := ev.occurred_at;
    end if;
  end loop;

  insert into public.attendance_team_presence(activity, work_date, agent_id, status, state_since, updated_at)
  values (p_activity, p_work_date, p_agent_id, v_status, v_since, now())
  on conflict (activity, work_date, agent_id) do update
    set status = excluded.status, state_since = excluded.state_since, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.sigma_refresh_attendance_team_presence(text, date, uuid) from public, anon, authenticated;

drop function if exists public.sigma_attendance_team_presence_trigger();
create function public.sigma_attendance_team_presence_trigger()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sigma_refresh_attendance_team_presence(old.activity, old.work_date, old.agent_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and (old.activity, old.work_date, old.agent_id) is distinct from (new.activity, new.work_date, new.agent_id) then
    perform public.sigma_refresh_attendance_team_presence(old.activity, old.work_date, old.agent_id);
  end if;
  perform public.sigma_refresh_attendance_team_presence(new.activity, new.work_date, new.agent_id);
  return new;
end;
$$;
revoke all on function public.sigma_attendance_team_presence_trigger() from public, anon, authenticated;
drop trigger if exists attendance_team_presence_refresh on public.attendance_events;
create trigger attendance_team_presence_refresh
after insert or update or delete on public.attendance_events
for each row execute function public.sigma_attendance_team_presence_trigger();

-- Remplit l’état du jour à partir des pointages déjà présents lors du déploiement.
do $$
declare a record; d date := (now() at time zone 'Africa/Casablanca')::date;
begin
  for a in select id from public.agents where activity = 'pgv' loop
    perform public.sigma_refresh_attendance_team_presence('pgv', d, a.id);
  end loop;
end $$;

-- Ajoute les tables à Supabase Realtime sans doublons. Les events restent soumis
-- aux mêmes politiques RLS que les lectures REST.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Publication supabase_realtime absente; aucune modification realtime appliquée.';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_events') then
    alter publication supabase_realtime add table public.attendance_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_team_presence') then
    alter publication supabase_realtime add table public.attendance_team_presence;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='planning_entries') then
    alter publication supabase_realtime add table public.planning_entries;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='calibrations') then
    alter publication supabase_realtime add table public.calibrations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='calibration_results') then
    alter publication supabase_realtime add table public.calibration_results;
  end if;
end $$;

commit;
