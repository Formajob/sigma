-- CORRECTIF D'URGENCE : cloisonnement Americana / PGV par profiles.activity
-- À exécuter UNE FOIS dans Supabase > SQL Editor après sauvegarde/audit.
-- Les comptes sans activity explicite seront bloqués par défaut (fail closed).
-- Le compte jawad@acx.ma est ici attribué à PGV, comme demandé.
-- N'exécute pas ce script depuis le navigateur; il requiert le rôle SQL admin.

begin;

-- 1) Les profils liés à une fiche héritent de l'activité de cette fiche.
update public.profiles p
   set activity = a.activity
  from public.agents a
 where a.id = p.agent_id
   and a.activity is not null
   and p.activity is distinct from a.activity;

-- 2) Affectation explicite du compte Jawad à PGV. Échec fermé si le profil manque.
do $$
declare n integer;
begin
  update public.profiles p
     set activity = 'pgv'
    from auth.users u
   where u.id = p.id
     and lower(u.email) = lower('jawad@acx.ma');
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Attendu un profil Jawad, trouvé %; arrêt sans valider la migration.', n;
  end if;
end $$;

-- Helpers SECURITY DEFINER évitent la récursion RLS lorsqu'une politique
-- doit lire le profil du demandeur. Ils ne donnent aucun accès par eux-mêmes.
create or replace function public.sigma_current_activity()
returns text language sql stable security definer set search_path = public
as $$ select p.activity from public.profiles p where p.id = auth.uid() limit 1 $$;

create or replace function public.sigma_current_agent()
returns uuid language sql stable security definer set search_path = public
as $$ select p.agent_id from public.profiles p where p.id = auth.uid() limit 1 $$;

create or replace function public.sigma_is_activity_manager(p_activity text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.activity = p_activity
       and p.role::text in ('superviseur','qualite','admin','super_admin')
  )
$$;

create or replace function public.sigma_is_activity_admin(p_activity text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.activity = p_activity
       and p.role::text in ('admin','super_admin')
  )
$$;

-- Supprime toutes les anciennes politiques (les politiques permissives se
-- combinent par OR, donc un ancien USING(true) annulerait un nouveau filtre).
do $$
declare t text; pol record;
begin
  foreach t in array array[
    'profiles','agents','qa_elements','calibrations','calibration_results',
    'documents','call_volumes','planning_shifts','planning_entries',
    'attendance_events','attendance_settings','attendance_alert_acks',
    'email_rotation','email_settings','email_days','email_agent_daily',
    'email_activity_log','agent_daily_activity'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for pol in select policyname from pg_policies
                  where schemaname='public' and tablename=t loop
        execute format('drop policy %I on public.%I', pol.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

-- Profiles: users see their own row; activity managers see only their activity.
create policy profiles_scoped_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or
         (activity = public.sigma_current_activity()
          and public.sigma_is_activity_manager(activity)));
create policy profiles_scoped_update on public.profiles
  for update to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

-- Empêche l'utilisateur de changer lui-même son périmètre depuis l'API.
create or replace function public.sigma_prevent_activity_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and new.activity is distinct from old.activity then
    raise exception 'Le périmètre d’activité ne peut pas être modifié depuis le client';
  end if;
  return new;
end $$;
drop trigger if exists profiles_activity_immutable_client on public.profiles;
create trigger profiles_activity_immutable_client
before update of activity on public.profiles
for each row execute function public.sigma_prevent_activity_change();

-- Agents and quality grid.
create policy agents_scoped_read on public.agents
  for select to authenticated
  using (activity = public.sigma_current_activity()
         and (id = public.sigma_current_agent()
              or public.sigma_is_activity_manager(activity)));
create policy agents_scoped_write on public.agents
  for all to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

create policy qa_elements_scoped_read on public.qa_elements
  for select to authenticated using (activity = public.sigma_current_activity());
create policy qa_elements_scoped_write on public.qa_elements
  for all to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

-- Calibrations: activity plus role/agent scope.
create policy calibrations_scoped_read on public.calibrations
  for select to authenticated
  using (activity = public.sigma_current_activity()
         and (public.sigma_is_activity_manager(activity)
              or agent_id = public.sigma_current_agent()));
create policy calibrations_scoped_write on public.calibrations
  for all to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

create policy calibration_results_scoped_read on public.calibration_results
  for select to authenticated
  using (exists (
    select 1 from public.calibrations c
     where c.id = calibration_results.calibration_id
       and c.activity = public.sigma_current_activity()
       and (public.sigma_is_activity_manager(c.activity)
            or c.agent_id = public.sigma_current_agent())
  ));
create policy calibration_results_scoped_write on public.calibration_results
  for all to authenticated
  using (exists (
    select 1 from public.calibrations c
     where c.id = calibration_results.calibration_id
       and c.activity = public.sigma_current_activity()
       and public.sigma_is_activity_manager(c.activity)
  ))
  with check (exists (
    select 1 from public.calibrations c
     where c.id = calibration_results.calibration_id
       and c.activity = public.sigma_current_activity()
       and public.sigma_is_activity_manager(c.activity)
  ));

-- Documents: explicit role, activity, visibility, and disciplinary restrictions.
create policy documents_scoped_read on public.documents
  for select to authenticated using (
    activity = public.sigma_current_activity()
    and (
      public.sigma_is_activity_manager(activity)
      or (exists (select 1 from public.profiles p where p.id=auth.uid() and p.activity=activity and p.role::text='qualite')
          and doc_type is distinct from 'Disciplinaire')
      or (exists (select 1 from public.profiles p where p.id=auth.uid() and p.activity=activity and p.role::text='agent')
          and agent_id=public.sigma_current_agent()
          and visibility='agent'
          and doc_type is distinct from 'Disciplinaire')
    )
  );
create policy documents_scoped_write on public.documents
  for all to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

create policy call_volumes_scoped_read on public.call_volumes
  for select to authenticated
  using (activity = public.sigma_current_activity()
         and (public.sigma_is_activity_manager(activity)
              or agent_id = public.sigma_current_agent()));
create policy call_volumes_scoped_write on public.call_volumes
  for all to authenticated
  using (activity = public.sigma_current_activity()
         and public.sigma_is_activity_manager(activity))
  with check (activity = public.sigma_current_activity()
              and public.sigma_is_activity_manager(activity));

-- Tables opérationnelles : base activity scope, puis restrictions personnelles
-- pour les historiques individuels. Les managers restent limités à leur scope.
do $$
declare t text;
begin
  foreach t in array array[
    'planning_shifts','planning_entries','attendance_events','attendance_settings',
    'attendance_alert_acks','email_rotation','email_settings','email_days',
    'email_agent_daily','email_activity_log','agent_daily_activity'
  ] loop
    if to_regclass('public.' || t) is not null then
      if t in ('planning_entries','attendance_events','attendance_alert_acks',
               'email_agent_daily','agent_daily_activity') then
        execute format(
          'create policy %I on public.%I for select to authenticated using (activity = public.sigma_current_activity() and (public.sigma_is_activity_manager(activity) or agent_id = public.sigma_current_agent()))',
          t || '_scoped_read', t);
      elsif t = 'email_activity_log' then
        execute format(
          'create policy %I on public.%I for select to authenticated using (activity = public.sigma_current_activity() and public.sigma_is_activity_manager(activity))',
          t || '_scoped_read', t);
      else
        execute format(
          'create policy %I on public.%I for select to authenticated using (activity = public.sigma_current_activity())',
          t || '_scoped_read', t);
      end if;
      execute format(
        'create policy %I on public.%I for all to authenticated using (activity = public.sigma_current_activity() and public.sigma_is_activity_manager(activity)) with check (activity = public.sigma_current_activity() and public.sigma_is_activity_manager(activity))',
        t || '_scoped_manager', t);
    end if;
  end loop;
end $$;

-- Un agent peut ajouter ses propres pointages et sa propre saisie d'appels.
drop policy if exists attendance_events_self_insert on public.attendance_events;
create policy attendance_events_self_insert on public.attendance_events
  for insert to authenticated with check (
    activity = public.sigma_current_activity()
    and agent_id = public.sigma_current_agent()
    and source = 'agent'
  );
drop policy if exists agent_daily_activity_self_write on public.agent_daily_activity;
create policy agent_daily_activity_self_write on public.agent_daily_activity
  for insert to authenticated with check (
    activity = public.sigma_current_activity()
    and agent_id = public.sigma_current_agent()
  );
create policy agent_daily_activity_self_update on public.agent_daily_activity
  for update to authenticated
  using (activity = public.sigma_current_activity() and agent_id = public.sigma_current_agent())
  with check (activity = public.sigma_current_activity() and agent_id = public.sigma_current_agent());

-- Views must obey the underlying table RLS instead of running with the owner.
do $$
declare v text;
begin
  foreach v in array array[
    'v_calibration_scores','v_calibration_category_scores','v_agent_monthly_scores',
    'v_weekly_trend','v_attendance_day','v_agent_day'
  ] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                where n.nspname='public' and c.relname=v and c.relkind='v') then
      execute format('alter view public.%I set (security_invoker = true)', v);
    end if;
  end loop;
end $$;

-- Corrige aussi l'ancien helper global et la vue SECURITY DEFINER de repli.
create or replace function public.is_full_access()
returns boolean language sql stable security definer set search_path = public
as $$ select public.sigma_is_activity_admin(public.sigma_current_activity()) $$;

drop view if exists public.v_admin_users;
create view public.v_admin_users as
select p.id, p.full_name, p.role, p.active, p.agent_id,
       a.full_name as agent_name, a.staff_id, u.email,
       (u.email_confirmed_at is not null) as email_confirme,
       u.last_sign_in_at, u.created_at
  from public.profiles p
  join auth.users u on u.id=p.id
  left join public.agents a on a.id=p.agent_id
 where public.sigma_is_activity_admin(p.activity);
revoke all on public.v_admin_users from anon;
grant select on public.v_admin_users to authenticated;

-- Les RPC SECURITY DEFINER d'administration doivent aussi être scellées
-- par activité; RLS ne s'applique pas à l'intérieur de ces fonctions.
create or replace function public.admin_users()
returns table (
  id uuid, full_name text, email text, email_confirme boolean, role text,
  agent_id uuid, last_sign_in_at timestamptz, active boolean
)
language plpgsql security definer set search_path = public, auth
as $$
declare v_activity text := public.sigma_current_activity();
begin
  if auth.uid() is not null and not exists (
    select 1 from public.profiles p where p.id=auth.uid()
      and p.activity=v_activity and p.role::text in ('admin','super_admin')
  ) then raise exception 'Accès refusé : administrateur du même secteur requis'; end if;
  return query
  select u.id::uuid,
         coalesce(nullif(p.full_name::text,''), split_part(u.email::text,'@',1))::text,
         u.email::text, (u.email_confirmed_at is not null)::boolean,
         coalesce(p.role::text,'agent')::text, p.agent_id::uuid,
         u.last_sign_in_at::timestamptz,
         coalesce((to_jsonb(p)->>'active')::boolean,true)
    from auth.users u left join public.profiles p on p.id=u.id
   where (p.id=auth.uid() and p.activity=v_activity)
      or p.activity=v_activity
      or exists (select 1 from public.agents a where a.id=p.agent_id and a.activity=v_activity)
   order by coalesce(nullif(p.full_name::text,''), split_part(u.email::text,'@',1));
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_activity text := public.sigma_current_activity(); v_target_activity text;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid()
      and p.activity=v_activity and p.role::text in ('admin','super_admin')) then
    raise exception 'Accès refusé : administrateur du même secteur requis';
  end if;
  if lower(btrim(coalesce(p_role,''))) not in ('agent','qualite','superviseur','admin','super_admin') then
    raise exception 'Rôle inconnu';
  end if;
  select p.activity into v_target_activity from public.profiles p where p.id=p_user;
  if not found or v_target_activity is distinct from v_activity then
    raise exception 'La cible n’appartient pas à votre activité';
  end if;
  if lower(btrim(p_role))='agent' and not exists(select 1 from public.profiles where id=p_user and agent_id is not null) then
    raise exception 'Un agent doit être lié à une fiche agent';
  end if;
  update public.profiles set role=lower(btrim(p_role))::public.app_role, updated_at=now()
   where id=p_user and activity=v_activity;
end $$;

create or replace function public.admin_set_agent(p_user uuid, p_agent uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_activity text := public.sigma_current_activity(); v_role text; v_target_activity text;
        v_name text; v_agent_activity text;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid()
      and p.activity=v_activity and p.role::text in ('admin','super_admin')) then
    raise exception 'Accès refusé : administrateur du même secteur requis';
  end if;
  if p_agent is not null then
    select a.activity into v_agent_activity from public.agents a where a.id=p_agent;
    if not found or v_agent_activity is distinct from v_activity then
      raise exception 'La fiche agent appartient à une autre activité';
    end if;
  end if;
  select p.role::text,p.activity into v_role,v_target_activity from public.profiles p where p.id=p_user;
  if found then
    if v_target_activity is distinct from v_activity then
      raise exception 'Le compte cible appartient à une autre activité';
    end if;
    if v_role='agent' and p_agent is null then raise exception 'Un agent doit rester lié à une fiche'; end if;
    update public.profiles set agent_id=p_agent, updated_at=now()
     where id=p_user and activity=v_activity;
  else
    if p_agent is null then raise exception 'Choisis une fiche agent pour créer le profil'; end if;
    select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),a.full_name,split_part(coalesce(u.email,''),'@',1))
      into v_name from auth.users u join public.agents a on a.id=p_agent
     where u.id=p_user and a.activity=v_activity;
    if not found then raise exception 'Compte ou fiche agent introuvable dans cette activité'; end if;
    insert into public.profiles(id,full_name,role,agent_id,activity)
    values(p_user,v_name,'agent'::public.app_role,p_agent,v_activity);
  end if;
end $$;

create or replace function public.admin_set_active(p_user uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v_activity text := public.sigma_current_activity();
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid()
      and p.activity=v_activity and p.role::text in ('admin','super_admin')) then
    raise exception 'Accès refusé : administrateur du même secteur requis';
  end if;
  update public.profiles set active=coalesce(p_active,true),updated_at=now()
   where id=p_user and activity=v_activity;
  if not found then raise exception 'Profil cible absent de votre activité'; end if;
end $$;

create or replace function public.admin_login_email(p_user uuid)
returns text language plpgsql security definer set search_path = public, auth
as $$
declare v_activity text := public.sigma_current_activity(); v_email text;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid()
      and p.activity=v_activity and p.role::text in ('admin','super_admin')) then
    raise exception 'Accès refusé : administrateur du même secteur requis';
  end if;
  select u.email::text into v_email from auth.users u join public.profiles p on p.id=u.id
   where u.id=p_user and p.activity=v_activity;
  if not found then raise exception 'Compte cible absent de votre activité'; end if;
  return v_email;
end $$;

revoke all on function public.sigma_current_activity() from public;
revoke all on function public.sigma_current_agent() from public;
revoke all on function public.sigma_is_activity_manager(text) from public;
revoke all on function public.sigma_is_activity_admin(text) from public;
grant execute on function public.sigma_current_activity() to authenticated, service_role;
grant execute on function public.sigma_current_agent() to authenticated, service_role;
grant execute on function public.sigma_is_activity_manager(text) to authenticated, service_role;
grant execute on function public.sigma_is_activity_admin(text) to authenticated, service_role;

commit;

-- Vérification : après exécution, Jawad doit être pgv; null ne donne aucun accès.
select p.role, p.activity, p.agent_id
  from public.profiles p join auth.users u on u.id=p.id
 where lower(u.email)=lower('jawad@acx.ma');
