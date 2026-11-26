-- Historique des statuts d'équipe, corrections du résumé journalier auditables.
-- Les agents voient les événements horodatés utiles au suivi d'équipe, sans source
-- ni notes; le journal brut reste en lecture titulaire/responsables.

begin;

create or replace function public.pgv_get_team_attendance_events(p_from date,p_to date)
returns table(agent_id uuid,work_date date,event_type text,break_type text,occurred_at timestamptz)
language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_activity text; v_active boolean;
        v_today date:=(statement_timestamp() at time zone 'Africa/Casablanca')::date;
begin
 if v_uid is null then raise exception 'Session requise.'; end if;
 select role::text,activity,active into v_role,v_activity,v_active from public.profiles where id=v_uid;
 if v_active is not true or not (
   (v_role='agent' and v_activity='pgv') or
   (v_activity='pgv' and v_role in ('superviseur','qualite','admin')) or v_role='super_admin'
 ) then raise exception 'Historique réservé à l’équipe PGV active.'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to>v_today or p_to-p_from>365 then
   raise exception 'Période historique invalide (maximum 366 jours, aucune date future).';
 end if;
 return query select e.agent_id,e.work_date,e.event_type::text,e.break_type::text,e.occurred_at
   from public.attendance_events e join public.agents a on a.id=e.agent_id
  where e.activity='pgv' and a.activity='pgv' and e.work_date between p_from and p_to
  order by e.work_date,a.full_name,e.occurred_at,e.id;
end;
$$;
revoke all on function public.pgv_get_team_attendance_events(date,date) from public,anon;
grant execute on function public.pgv_get_team_attendance_events(date,date) to authenticated;

create table if not exists public.attendance_daily_overrides (
 activity text not null default 'pgv',
 work_date date not null,
 agent_id uuid not null references public.agents(id),
 status_override text not null check (status_override in ('PRESENT','ABSENT','VAC','OFF')),
 presence_minutes integer,
 late_minutes integer,
 pause_minutes integer,
 lunch_minutes integer,
 sortie_minutes integer,
 reason text not null,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(activity,work_date,agent_id),
 constraint attendance_override_minutes_check check (
  (presence_minutes is null or presence_minutes between 0 and 1440) and
  (late_minutes is null or late_minutes between 0 and 1440) and
  (pause_minutes is null or pause_minutes between 0 and 1440) and
  (lunch_minutes is null or lunch_minutes between 0 and 1440) and
  (sortie_minutes is null or sortie_minutes between 0 and 1440)
 ),
 constraint attendance_override_reason_check check (char_length(trim(reason)) between 3 and 500)
);
alter table public.attendance_daily_overrides enable row level security;
revoke all on public.attendance_daily_overrides from anon,authenticated;
grant select on public.attendance_daily_overrides to authenticated;
drop policy if exists attendance_daily_overrides_team_read on public.attendance_daily_overrides;
create policy attendance_daily_overrides_team_read on public.attendance_daily_overrides
 for select to authenticated using (
  activity=public.sigma_current_activity() and exists(
   select 1 from public.profiles p where p.id=auth.uid() and p.active=true
    and p.activity=public.sigma_current_activity()
    and (p.role::text='agent' or p.role::text in ('superviseur','qualite','admin','super_admin'))
  )
);

create or replace function public.pgv_get_attendance_overrides(p_from date,p_to date)
returns table(work_date date,agent_id uuid,status_override text,presence_minutes integer,late_minutes integer,pause_minutes integer,lunch_minutes integer,sortie_minutes integer,reason text,updated_at timestamptz)
language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_activity text; v_active boolean; v_today date:=(statement_timestamp() at time zone 'Africa/Casablanca')::date;
begin
 if v_uid is null then raise exception 'Session requise.'; end if;
 select role::text,activity,active into v_role,v_activity,v_active from public.profiles where id=v_uid;
 if v_active is not true or not ((v_role='agent' and v_activity='pgv') or (v_activity='pgv' and v_role in ('superviseur','qualite','admin')) or v_role='super_admin') then raise exception 'Accès aux corrections réservé à l’équipe PGV active.'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to>v_today or p_to-p_from>365 then raise exception 'Période de corrections invalide.'; end if;
 return query select o.work_date,o.agent_id,o.status_override,o.presence_minutes,o.late_minutes,o.pause_minutes,o.lunch_minutes,o.sortie_minutes,o.reason,o.updated_at
  from public.attendance_daily_overrides o where o.activity='pgv' and o.work_date between p_from and p_to order by o.work_date,o.agent_id;
end;
$$;
revoke all on function public.pgv_get_attendance_overrides(date,date) from public,anon;
grant execute on function public.pgv_get_attendance_overrides(date,date) to authenticated;

create table if not exists public.attendance_daily_override_audit (
 id bigint generated always as identity primary key,
 activity text not null,
 work_date date not null,
 agent_id uuid not null,
 actor_id uuid not null,
 operation text not null check (operation in ('UPSERT','CLEAR')),
 before_row jsonb,
 after_row jsonb,
 reason text not null,
 changed_at timestamptz not null default now()
);
alter table public.attendance_daily_override_audit enable row level security;
revoke all on public.attendance_daily_override_audit from anon,authenticated;
grant select on public.attendance_daily_override_audit to authenticated;
drop policy if exists attendance_daily_override_audit_manager_read on public.attendance_daily_override_audit;
create policy attendance_daily_override_audit_manager_read on public.attendance_daily_override_audit
 for select to authenticated using (
  activity=public.sigma_current_activity() and public.sigma_is_activity_manager(activity)
);

create or replace function public.pgv_admin_save_attendance_override(
 p_work_date date,p_agent_id uuid,p_status_override text,
 p_presence_minutes integer,p_late_minutes integer,p_pause_minutes integer,
 p_lunch_minutes integer,p_sortie_minutes integer,p_reason text
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_activity text; v_active boolean; v_target_activity text;
        v_before public.attendance_daily_overrides%rowtype; v_after public.attendance_daily_overrides%rowtype;
        v_had_before boolean:=false;
begin
 if v_uid is null then raise exception 'Session requise.'; end if;
 select role::text,activity,active into v_role,v_activity,v_active from public.profiles where id=v_uid;
 if v_active is not true or not (v_role='super_admin' or (v_role='admin' and v_activity='pgv')) then
  raise exception 'Correction réservée à un administrateur PGV actif.';
 end if;
 if p_work_date is null or p_work_date>(statement_timestamp() at time zone 'Africa/Casablanca')::date then raise exception 'Date invalide.'; end if;
 if p_agent_id is null then raise exception 'Agent obligatoire.'; end if;
 select activity into v_target_activity from public.agents where id=p_agent_id;
 if not found or v_target_activity<>'pgv' then raise exception 'Agent PGV introuvable.'; end if;
 if p_reason is null or char_length(trim(p_reason))<3 or char_length(trim(p_reason))>500 then raise exception 'Un motif de correction (3 à 500 caractères) est obligatoire.'; end if;
 if p_status_override is not null and p_status_override not in ('PRESENT','ABSENT','VAC','OFF') then raise exception 'Statut de correction invalide.'; end if;
 if (p_presence_minutes is not null and p_presence_minutes not between 0 and 1440)
    or (p_late_minutes is not null and p_late_minutes not between 0 and 1440)
    or (p_pause_minutes is not null and p_pause_minutes not between 0 and 1440)
    or (p_lunch_minutes is not null and p_lunch_minutes not between 0 and 1440)
    or (p_sortie_minutes is not null and p_sortie_minutes not between 0 and 1440) then raise exception 'Durée invalide.'; end if;
 select * into v_before from public.attendance_daily_overrides where activity='pgv' and work_date=p_work_date and agent_id=p_agent_id for update;
 v_had_before:=found;
 if p_status_override is null then
  delete from public.attendance_daily_overrides where activity='pgv' and work_date=p_work_date and agent_id=p_agent_id;
  insert into public.attendance_daily_override_audit(activity,work_date,agent_id,actor_id,operation,before_row,after_row,reason)
  values('pgv',p_work_date,p_agent_id,v_uid,'CLEAR',case when v_had_before then to_jsonb(v_before) else null end,null,trim(p_reason));
  return jsonb_build_object('ok',true,'cleared',true);
 end if;
 insert into public.attendance_daily_overrides(activity,work_date,agent_id,status_override,presence_minutes,late_minutes,pause_minutes,lunch_minutes,sortie_minutes,reason,created_by,updated_by)
 values('pgv',p_work_date,p_agent_id,p_status_override,p_presence_minutes,p_late_minutes,p_pause_minutes,p_lunch_minutes,p_sortie_minutes,trim(p_reason),v_uid,v_uid)
 on conflict(activity,work_date,agent_id) do update set status_override=excluded.status_override,presence_minutes=excluded.presence_minutes,
  late_minutes=excluded.late_minutes,pause_minutes=excluded.pause_minutes,lunch_minutes=excluded.lunch_minutes,
  sortie_minutes=excluded.sortie_minutes,reason=excluded.reason,updated_by=v_uid,updated_at=now()
 returning * into v_after;
 insert into public.attendance_daily_override_audit(activity,work_date,agent_id,actor_id,operation,before_row,after_row,reason)
 values('pgv',p_work_date,p_agent_id,v_uid,'UPSERT',case when v_had_before then to_jsonb(v_before) else null end,to_jsonb(v_after),trim(p_reason));
 return jsonb_build_object('ok',true,'status_override',v_after.status_override,'updated_at',v_after.updated_at);
end;
$$;
revoke all on function public.pgv_admin_save_attendance_override(date,uuid,text,integer,integer,integer,integer,integer,text) from public,anon;
grant execute on function public.pgv_admin_save_attendance_override(date,uuid,text,integer,integer,integer,integer,integer,text) to authenticated;

commit;
