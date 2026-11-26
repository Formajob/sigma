-- Stabilisation du pointage PGV, états équipe accessibles de façon sécurisée
-- et quota quotidien Pause de 30 min (au plus 3 prises). Lunch 60 min, sortie 5 min.

begin;

alter table public.attendance_settings
  add column if not exists daily_limit_minutes integer;

update public.attendance_settings
   set max_minutes=30, max_per_day=3, daily_limit_minutes=30
 where activity='pgv' and break_type='pause';

-- Les agents ne peuvent lire leur propre chronologie que pour leur agent_id.
create or replace function public.pgv_get_attendance_self_day(p_work_date date)
returns table(id uuid,agent_id uuid,event_type text,break_type text,occurred_at timestamptz,work_date date,source text)
language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_activity text; v_active boolean; v_agent_id uuid;
begin
 if v_uid is null then raise exception 'Session requise.'; end if;
 select role::text,activity,active,agent_id into v_role,v_activity,v_active,v_agent_id
   from public.profiles where id=v_uid;
 if not found or v_active is not true or v_role<>'agent' or v_activity<>'pgv' or v_agent_id is null then
   raise exception 'Lecture réservée au compte agent PGV actif.';
 end if;
 if p_work_date is null or p_work_date>(statement_timestamp() at time zone 'Africa/Casablanca')::date then
   raise exception 'Date de pointage invalide.';
 end if;
 return query select e.id,e.agent_id,e.event_type::text,e.break_type::text,e.occurred_at,e.work_date,e.source
   from public.attendance_events e
  where e.activity='pgv' and e.agent_id=v_agent_id and e.work_date=p_work_date
  order by e.occurred_at,e.id;
end;
$$;
revoke all on function public.pgv_get_attendance_self_day(date) from public,anon;
grant execute on function public.pgv_get_attendance_self_day(date) to authenticated;

-- Flux agrégé des statuts courants. Les agents autorisés reçoivent les états de
-- leurs collègues PGV, jamais les événements bruts des collègues. Les lignes
-- manquantes sont reconstruites depuis le journal; un agent sans pointage reçoit
-- le statut explicite not_started, pas un faux état de synchronisation manquante.
create or replace function public.pgv_get_team_presence_live()
returns table(agent_id uuid,status text,state_since timestamptz,updated_at timestamptz,elapsed_seconds integer)
language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_activity text; v_active boolean;
        v_today date:=(statement_timestamp() at time zone 'Africa/Casablanca')::date;
        v_missing record;
begin
 if v_uid is null then raise exception 'Session requise.'; end if;
 select role::text,activity,active into v_role,v_activity,v_active from public.profiles where id=v_uid;
 if v_active is not true or not (
   (v_role='agent' and v_activity='pgv') or
   (v_activity='pgv' and v_role in ('superviseur','qualite','admin')) or v_role='super_admin'
 ) then raise exception 'Accès réservé à l’équipe PGV active.'; end if;
 for v_missing in
   select a.id from public.agents a
   left join public.attendance_team_presence p
     on p.activity='pgv' and p.work_date=v_today and p.agent_id=a.id
   where a.activity='pgv' and a.active and p.agent_id is null
 loop
   perform public.sigma_refresh_attendance_team_presence('pgv',v_today,v_missing.id);
 end loop;
 return query
 select a.id,coalesce(p.status,'not_started'),p.state_since,coalesce(p.updated_at,statement_timestamp()),
        case when p.state_since is null then 0
             else greatest(0,floor(extract(epoch from (statement_timestamp()-p.state_since))))::integer end
 from public.agents a
 left join public.attendance_team_presence p
   on p.activity='pgv' and p.work_date=v_today and p.agent_id=a.id
 where a.activity='pgv' and a.active
 order by a.full_name,a.id;
end;
$$;
revoke all on function public.pgv_get_team_presence_live() from public,anon;
grant execute on function public.pgv_get_team_presence_live() to authenticated;

-- Défense serveur : une nouvelle pause est refusée si le quota cumulé ou le
-- nombre maximal de prises est déjà atteint. Le client clôt automatiquement
-- la pause courante quand les 30 minutes cumulées sont atteintes.
create or replace function public.pgv_guard_daily_pause_quota()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_limit integer; v_max_count integer; v_used_seconds numeric:=0; v_count integer:=0;
        v_open timestamptz:=null; ev record;
begin
 if new.activity<>'pgv' or new.event_type::text<>'break_start' or new.break_type::text<>'pause' then return new; end if;
 select coalesce(daily_limit_minutes,max_minutes,30),max_per_day into v_limit,v_max_count
   from public.attendance_settings where activity='pgv' and break_type='pause';
 v_limit:=coalesce(v_limit,30); v_max_count:=coalesce(v_max_count,3);
 for ev in select event_type::text as event_type,break_type::text as break_type,occurred_at
   from public.attendance_events where activity='pgv' and work_date=new.work_date and agent_id=new.agent_id
   order by occurred_at,id
 loop
   if ev.event_type='break_start' and ev.break_type='pause' then
     if v_open is not null then raise exception 'Une pause est déjà ouverte.'; end if;
     v_count:=v_count+1; v_open:=ev.occurred_at;
   elsif ev.event_type='break_end' and v_open is not null then
     v_used_seconds:=v_used_seconds+greatest(0,extract(epoch from (ev.occurred_at-v_open)));
     v_open:=null;
   end if;
 end loop;
 if v_open is not null then raise exception 'Termine la pause en cours avant d’en démarrer une autre.'; end if;
 if v_count>=v_max_count then raise exception 'Maximum de % prises de pause atteint pour la journée.',v_max_count; end if;
 if v_used_seconds>=v_limit*60 then raise exception 'Quota quotidien de pause de % minutes atteint.',v_limit; end if;
 return new;
end;
$$;
revoke all on function public.pgv_guard_daily_pause_quota() from public,anon,authenticated;
drop trigger if exists attendance_pause_quota_guard on public.attendance_events;
create trigger attendance_pause_quota_guard before insert on public.attendance_events
for each row execute function public.pgv_guard_daily_pause_quota();

commit;
