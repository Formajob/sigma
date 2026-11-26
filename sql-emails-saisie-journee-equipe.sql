-- Saisie d'une journée d'emails par un agent : deux compteurs agrégés équipe,
-- sans sélection ni modification de l'agent de service ou des lignes individuelles.
-- Le RPC permet la correction d'une date antérieure et ne touche pas aux autres
-- colonnes de email_days (ventilation SAC, rotation, note).

begin;

alter table public.email_days
  add column if not exists treated_total integer not null default 0;

-- Reprise des anciennes journées : le compteur historique était le total SAC traité.
update public.email_days
   set treated_total=treated_sac
 where treated_total=0 and treated_sac>0;

create or replace function public.pgv_save_email_day_totals(
  p_work_date date,
  p_received_total integer,
  p_treated_total integer
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_activity text;
  v_active boolean;
  v_agent_id uuid;
  v_agent_active boolean;
  v_agent_activity text;
  v_saved public.email_days%rowtype;
begin
  if v_uid is null then raise exception 'Session requise.'; end if;
  select role::text,activity,active,agent_id
    into v_role,v_activity,v_active,v_agent_id
    from public.profiles where id=v_uid;
  if not found or v_active is not true or v_role<>'agent'
     or v_activity<>'pgv' or v_agent_id is null then
    raise exception 'La saisie est réservée aux agents PGV actifs.';
  end if;
  select active,activity into v_agent_active,v_agent_activity
    from public.agents where id=v_agent_id;
  if not found or v_agent_active is not true or v_agent_activity<>'pgv' then
    raise exception 'Le profil agent PGV est inactif.';
  end if;
  if p_work_date is null then raise exception 'La date est obligatoire.'; end if;
  if p_received_total is null or p_treated_total is null
     or p_received_total<0 or p_treated_total<0
     or p_received_total>1000000 or p_treated_total>1000000 then
    raise exception 'Les compteurs doivent être des nombres entiers entre 0 et 1000000.';
  end if;

  insert into public.email_days(activity,work_date,received_total,treated_total,updated_by,updated_at)
  values('pgv',p_work_date,p_received_total,p_treated_total,v_uid,now())
  on conflict(activity,work_date) do update
    set received_total=excluded.received_total,
        treated_total=excluded.treated_total,
        updated_by=excluded.updated_by,
        updated_at=excluded.updated_at
  returning * into v_saved;

  return jsonb_build_object(
    'ok',true,
    'work_date',v_saved.work_date,
    'received_total',v_saved.received_total,
    'treated_total',v_saved.treated_total
  );
end;
$$;

revoke all on function public.pgv_save_email_day_totals(date,integer,integer) from public,anon;
grant execute on function public.pgv_save_email_day_totals(date,integer,integer) to authenticated;

commit;
