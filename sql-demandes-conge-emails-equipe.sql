-- Sigma PGV : demandes de congé avec validation Admin + saisie email par agent
-- en mode équipe. À appliquer une fois sur le projet Supabase Sigma.
-- Approbation = RPC transactionnelle; les congés ne remplacent que les jours
-- travaillés. Les agents peuvent saisir les compteurs email de l’équipe toutes dates;
-- chaque écriture est auditée.

begin;

-- 1) Demandes de congé
create table if not exists public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  activity text not null default 'pgv',
  agent_id uuid not null references public.agents(id),
  requested_by uuid not null references auth.users(id),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacation_requests_dates_check check (end_date >= start_date),
  constraint vacation_requests_reason_len check (reason is null or char_length(reason) <= 500),
  constraint vacation_requests_decision_note_len check (decision_note is null or char_length(decision_note) <= 500)
);
create index if not exists vacation_requests_scope_date_idx
  on public.vacation_requests(activity, status, start_date, end_date);
create index if not exists vacation_requests_agent_idx
  on public.vacation_requests(agent_id, created_at desc);
alter table public.vacation_requests enable row level security;
revoke all on public.vacation_requests from anon, authenticated;
grant select on public.vacation_requests to authenticated;
drop policy if exists vacation_requests_scoped_read on public.vacation_requests;
create policy vacation_requests_scoped_read on public.vacation_requests
  for select to authenticated using (
    activity = public.sigma_current_activity()
    and exists (select 1 from public.profiles p where p.id=auth.uid() and p.active=true)
    and (agent_id = public.sigma_current_agent()
         or public.sigma_is_activity_manager(activity))
  );

create or replace function public.agent_submit_vacation_request(
  p_start_date date, p_end_date date, p_reason text default null
) returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_id uuid;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  if v_uid is null then raise exception 'Session requise.'; end if;
  select role::text as role, activity, active, agent_id into v_profile
    from public.profiles where id = v_uid for update;
  if not found or v_profile.active is not true or v_profile.role <> 'agent'
     or v_profile.activity <> 'pgv' or v_profile.agent_id is null then
    raise exception 'Seuls les agents PGV actifs peuvent demander un congé.';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Période de congé invalide.';
  end if;
  if p_start_date < v_today then raise exception 'La date de début doit être aujourd’hui ou dans le futur.'; end if;
  if p_reason is not null and char_length(trim(p_reason)) > 500 then raise exception 'Le commentaire dépasse 500 caractères.'; end if;
  if exists (
    select 1 from public.vacation_requests r
     where r.activity='pgv' and r.agent_id=v_profile.agent_id
       and r.status in ('pending','approved')
       and daterange(r.start_date,r.end_date,'[]') && daterange(p_start_date,p_end_date,'[]')
  ) then raise exception 'Cette période chevauche une demande en attente ou déjà approuvée.'; end if;

  insert into public.vacation_requests(activity,agent_id,requested_by,start_date,end_date,reason)
  values ('pgv',v_profile.agent_id,v_uid,p_start_date,p_end_date,nullif(trim(p_reason),''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.agent_submit_vacation_request(date,date,text) from public, anon;
grant execute on function public.agent_submit_vacation_request(date,date,text) to authenticated;

create or replace function public.admin_decide_vacation_request(
  p_request_id uuid, p_approve boolean, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_activity text;
  v_active boolean;
  v_req public.vacation_requests%rowtype;
  v_day date;
  v_code text;
  v_applied integer := 0;
  v_roster_count integer;
  v_anchor_id uuid;
  v_anchor_ord integer;
  v_target_ord integer;
  v_rotation_week integer;
  v_owner_ord integer;
begin
  if v_uid is null then raise exception 'Session requise.'; end if;
  select role::text, activity, active into v_role, v_activity, v_active
    from public.profiles where id=v_uid;
  if v_active is not true or not (
       v_role='super_admin' or (v_role='admin' and v_activity='pgv')
     ) then raise exception 'Décision réservée aux administrateurs PGV actifs.'; end if;
  if p_note is not null and char_length(trim(p_note)) > 500 then raise exception 'La note de décision dépasse 500 caractères.'; end if;

  select * into v_req from public.vacation_requests where id=p_request_id and activity='pgv' for update;
  if not found then raise exception 'Demande de congé introuvable.'; end if;
  if v_req.status <> 'pending' then raise exception 'Cette demande a déjà été traitée.'; end if;

  if p_approve then
    select count(*) into v_roster_count from public.agents where activity='pgv' and active;
    if v_roster_count = 0 then raise exception 'Aucun agent PGV actif.'; end if;
    select p.agent_id into v_anchor_id from public.planning_entries p
     where p.activity='pgv' and p.work_date=date '2026-10-17' and p.shift_code='SAT'
     order by p.updated_at desc limit 1;

    for v_day in select generate_series(v_req.start_date,v_req.end_date,interval '1 day')::date loop
      select p.shift_code into v_code from public.planning_entries p
       where p.activity='pgv' and p.agent_id=v_req.agent_id and p.work_date=v_day
       for update;
      if found then
        if v_code in ('M','SAT') then
          update public.planning_entries
             set shift_code='VAC', start_time=null, end_time=null,
                 note='Congé approuvé', updated_at=now()
           where activity='pgv' and agent_id=v_req.agent_id and work_date=v_day;
          v_applied := v_applied + 1;
        end if;
      elsif extract(isodow from v_day)::integer between 1 and 5 then
        insert into public.planning_entries(activity,agent_id,work_date,shift_code,note,updated_at)
        values ('pgv',v_req.agent_id,v_day,'VAC','Congé approuvé',now());
        v_applied := v_applied + 1;
      elsif extract(isodow from v_day)::integer = 6 and v_anchor_id is not null then
        select roster.rn, roster.total into v_target_ord, v_roster_count
          from (select id, row_number() over(order by full_name,id)::integer as rn,
                       count(*) over()::integer as total
                  from public.agents where activity='pgv' and active) roster
         where roster.id=v_req.agent_id;
        select roster.rn into v_anchor_ord
          from (select id, row_number() over(order by full_name,id)::integer as rn
                  from public.agents where activity='pgv' and active) roster
         where roster.id=v_anchor_id;
        if v_target_ord is not null and v_anchor_ord is not null and v_roster_count > 0 then
          v_rotation_week := (v_day - date '2026-10-17') / 7;
          v_owner_ord := mod(v_anchor_ord - 1 + v_rotation_week, v_roster_count) + 1;
          if v_target_ord = v_owner_ord then
            insert into public.planning_entries(activity,agent_id,work_date,shift_code,note,updated_at)
            values ('pgv',v_req.agent_id,v_day,'VAC','Congé approuvé',now());
            v_applied := v_applied + 1;
          end if;
        end if;
      end if;
    end loop;
  end if;

  update public.vacation_requests
     set status=case when p_approve then 'approved' else 'rejected' end,
         decided_by=v_uid, decided_at=now(), decision_note=nullif(trim(p_note),''), updated_at=now()
   where id=v_req.id;
  return jsonb_build_object(
    'ok',true,
    'status',case when p_approve then 'approved' else 'rejected' end,
    'vac_days_applied',v_applied
  );
end;
$$;
revoke all on function public.admin_decide_vacation_request(uuid,boolean,text) from public, anon;
grant execute on function public.admin_decide_vacation_request(uuid,boolean,text) to authenticated;

-- 2) Saisie des emails traités à l’échelle de l’équipe; toutes les dates
-- autorisées par demande explicite. Les écritures des agents passent par RPC.
alter table public.email_agent_daily
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

revoke select on public.email_agent_daily from anon, authenticated;
grant select (id,activity,work_date,agent_id,treated_sac,treated_other) on public.email_agent_daily to authenticated;
drop policy if exists email_agent_daily_scoped_read on public.email_agent_daily;
create policy email_agent_daily_scoped_read on public.email_agent_daily
  for select to authenticated using (
    activity = public.sigma_current_activity()
    and exists (
      select 1 from public.profiles p where p.id=auth.uid() and p.active=true
        and p.activity=public.sigma_current_activity()
        and (p.role::text='agent' or p.role::text in ('superviseur','qualite','admin','super_admin'))
    )
  );

create table if not exists public.email_agent_daily_audit (
  id bigint generated always as identity primary key,
  activity text not null,
  work_date date not null,
  agent_id uuid not null,
  actor_id uuid,
  operation text not null,
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz not null default now()
);
alter table public.email_agent_daily_audit enable row level security;
revoke all on public.email_agent_daily_audit from anon, authenticated;
grant select on public.email_agent_daily_audit to authenticated;
drop policy if exists email_agent_daily_audit_manager_read on public.email_agent_daily_audit;
create policy email_agent_daily_audit_manager_read on public.email_agent_daily_audit
  for select to authenticated using (
    activity=public.sigma_current_activity()
    and public.sigma_is_activity_manager(activity)
  );

create or replace function public.sigma_audit_email_agent_daily()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.email_agent_daily_audit(activity,work_date,agent_id,actor_id,operation,old_row,new_row)
    values(new.activity,new.work_date,new.agent_id,auth.uid(),'INSERT',null,to_jsonb(new));
    return new;
  elsif tg_op='UPDATE' then
    insert into public.email_agent_daily_audit(activity,work_date,agent_id,actor_id,operation,old_row,new_row)
    values(new.activity,new.work_date,new.agent_id,auth.uid(),'UPDATE',to_jsonb(old),to_jsonb(new));
    return new;
  else
    insert into public.email_agent_daily_audit(activity,work_date,agent_id,actor_id,operation,old_row,new_row)
    values(old.activity,old.work_date,old.agent_id,auth.uid(),'DELETE',to_jsonb(old),null);
    return old;
  end if;
end;
$$;
revoke all on function public.sigma_audit_email_agent_daily() from public,anon,authenticated;
drop trigger if exists email_agent_daily_audit_log on public.email_agent_daily;
create trigger email_agent_daily_audit_log
after insert or update or delete on public.email_agent_daily
for each row execute function public.sigma_audit_email_agent_daily();

create or replace function public.pgv_save_team_email_agent_daily(
  p_work_date date, p_agent_id uuid, p_treated_sac integer, p_treated_other integer
) returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_activity text;
  v_active boolean;
  v_target_active boolean;
  v_target_activity text;
  v_result public.email_agent_daily%rowtype;
begin
  if v_uid is null then raise exception 'Session requise.'; end if;
  select role::text,activity,active into v_role,v_activity,v_active from public.profiles where id=v_uid;
  if v_active is not true or not (
    (v_role='agent' and v_activity='pgv') or v_role='super_admin'
    or (v_role in ('admin','superviseur','qualite') and v_activity='pgv')
  ) then raise exception 'Saisie réservée à l’équipe PGV active.'; end if;
  if p_work_date is null or p_agent_id is null then raise exception 'Date ou agent invalide.'; end if;
  if p_treated_sac is null or p_treated_other is null or p_treated_sac < 0 or p_treated_other < 0
     or p_treated_sac > 100000 or p_treated_other > 100000 then
    raise exception 'Les compteurs doivent être des entiers entre 0 et 100000.';
  end if;
  select active,activity into v_target_active,v_target_activity from public.agents where id=p_agent_id;
  if not found or v_target_active is not true or v_target_activity <> 'pgv' then raise exception 'Agent cible PGV actif introuvable.'; end if;

  insert into public.email_agent_daily(activity,work_date,agent_id,treated_sac,treated_other,updated_at,updated_by)
  values('pgv',p_work_date,p_agent_id,p_treated_sac,p_treated_other,now(),v_uid)
  on conflict(activity,work_date,agent_id) do update
    set treated_sac=excluded.treated_sac,
        treated_other=excluded.treated_other,
        updated_at=excluded.updated_at,
        updated_by=excluded.updated_by
  returning * into v_result;
  return jsonb_build_object('ok',true,'work_date',v_result.work_date,'agent_id',v_result.agent_id,
                            'treated_sac',v_result.treated_sac,'treated_other',v_result.treated_other);
end;
$$;
revoke all on function public.pgv_save_team_email_agent_daily(date,uuid,integer,integer) from public,anon;
grant execute on function public.pgv_save_team_email_agent_daily(date,uuid,integer,integer) to authenticated;

commit;
