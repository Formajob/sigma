-- ============================================================
-- Sigma · Administration des comptes
--   · lecture des comptes (auth.users + profiles)
--   · changement de rôle, rattachement agent, activation
--   · e-mail d'un compte (pour la réinitialisation du mot de passe)
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Lecture des comptes
--    `active` est lu via to_jsonb : aucune erreur si la colonne
--    n'existe pas encore sur profiles.
-- ------------------------------------------------------------
create or replace function public.admin_users()
returns table (
  id              uuid,
  full_name       text,
  email           text,
  email_confirme  boolean,
  role            text,
  agent_id        uuid,
  last_sign_in_at timestamptz,
  active          boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('admin', 'super_admin')
     ) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  return query
  select
    u.id::uuid                                        as id,
    coalesce(nullif(p.full_name::text, ''), split_part(u.email::text, '@', 1))::text as full_name,
    u.email::text                                     as email,
    (u.email_confirmed_at is not null)::boolean       as email_confirme,
    coalesce(p.role::text, 'agent')::text             as role,
    p.agent_id::uuid                                  as agent_id,
    u.last_sign_in_at::timestamptz                    as last_sign_in_at,
    coalesce((to_jsonb(p) ->> 'active')::boolean, true) as active
  from auth.users u
  left join public.profiles p on p.id = u.id
  where
    -- Les admins globaux restent visibles dans Sigma.
    p.role in ('admin', 'super_admin')
    -- Les autres comptes ne sont affichés que s'ils sont liés à une fiche PGV.
    -- Cela exclut les agents et superviseurs Americana, y compris s'ils sont
    -- présents dans le même projet Supabase.
    or exists (
      select 1 from public.agents a
       where a.id = p.agent_id
         and (a.activity = 'pgv' or (a.activity is null and a.team ilike '%pgv%'))
    )
  order by coalesce(nullif(p.full_name::text, ''), split_part(u.email::text, '@', 1));
end;
$$;

revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Changement de rôle
--    Un agent doit rester rattaché à une fiche agent
--    (contrainte profiles_agent_required).
-- ------------------------------------------------------------
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role   text := lower(btrim(coalesce(p_role, '')));
  v_agent  uuid;
begin
  if auth.uid() is not null
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role in ('admin', 'super_admin')) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  if v_role not in ('agent', 'qualite', 'superviseur', 'admin', 'super_admin') then
    raise exception 'Rôle inconnu : %', p_role;
  end if;

  select agent_id into v_agent from public.profiles where id = p_user;
  if not found then
    raise exception 'Profil introuvable pour %', p_user;
  end if;

  if v_role = 'agent' and v_agent is null then
    raise exception 'Rattache d’abord une fiche agent avant de passer ce compte en agent.';
  end if;

  update public.profiles set role = v_role::public.app_role, updated_at = now()
  where id = p_user;
end;
$$;

-- ------------------------------------------------------------
-- 3. Rattachement à une fiche agent (agents.id)
-- ------------------------------------------------------------
create or replace function public.admin_set_agent(p_user uuid, p_agent uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_exists boolean;
begin
  if auth.uid() is not null
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role in ('admin', 'super_admin')) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  if p_agent is not null and not exists (select 1 from public.agents a where a.id = p_agent) then
    raise exception 'Fiche agent inconnue';
  end if;

  select role::text into v_role from public.profiles where id = p_user;
  v_exists := found;

  -- Après une invitation Supabase Auth, un profil peut ne pas encore exister.
  -- Le premier rattachement de fiche crée alors un profil Agent complet.
  if not v_exists then
    if p_agent is null then
      raise exception 'Pour activer un nouvel accès, choisis d’abord une fiche agent.';
    end if;
    select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), a.full_name,
                    split_part(coalesce(u.email, ''), '@', 1))
      into v_name
      from auth.users u
      join public.agents a on a.id = p_agent
     where u.id = p_user;
    if not found then raise exception 'Utilisateur Supabase introuvable'; end if;

    insert into public.profiles (id, full_name, role, agent_id)
    values (p_user, v_name, 'agent'::public.app_role, p_agent);
    return;
  end if;

  if v_role = 'agent' and p_agent is null then
    raise exception 'Un agent doit être rattaché à une fiche agent.';
  end if;
  update public.profiles set agent_id = p_agent, updated_at = now() where id = p_user;
end;
$$;

-- ------------------------------------------------------------
-- 4. Activation / désactivation
--    Ajoute la colonne si elle manque, puis met à jour.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'active'
  ) then
    alter table public.profiles add column active boolean not null default true;
  end if;
end $$;

create or replace function public.admin_set_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role in ('admin', 'super_admin')) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  update public.profiles set active = coalesce(p_active, true), updated_at = now() where id = p_user;
  if not found then raise exception 'Profil introuvable'; end if;
end;
$$;

-- ------------------------------------------------------------
-- 5. E-mail du compte (réinitialisation du mot de passe)
-- ------------------------------------------------------------
create or replace function public.admin_login_email(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_email text;
begin
  if auth.uid() is not null
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role in ('admin', 'super_admin')) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  select u.email::text into v_email from auth.users u where u.id = p_user;
  return v_email;
end;
$$;

-- ------------------------------------------------------------
-- 6. Droits
-- ------------------------------------------------------------
revoke all on function public.admin_set_role(uuid, text)      from public;
revoke all on function public.admin_set_agent(uuid, uuid)     from public;
revoke all on function public.admin_set_active(uuid, boolean) from public;
revoke all on function public.admin_login_email(uuid)         from public;

grant execute on function public.admin_set_role(uuid, text)      to authenticated, service_role;
grant execute on function public.admin_set_agent(uuid, uuid)     to authenticated, service_role;
grant execute on function public.admin_set_active(uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_login_email(uuid)         to authenticated, service_role;

-- Vérification rapide :
-- select * from public.admin_users();
