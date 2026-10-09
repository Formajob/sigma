-- ============================================================
-- SIGMA · Fix Administration — à exécuter dans Supabase → SQL Editor
-- Corrige : "permission denied for table users"
--   1) colonne profiles.active (suspendre / réactiver)
--   2) fonction admin_users() SECURITY DEFINER (lecture auth.users)
--   3) vue v_admin_users en simple wrapper (repli)
-- Idempotent : relançable sans doublon.
-- ============================================================

-- 1) Colonne d'état du compte (suspendu / actif)
alter table public.profiles
  add column if not exists active boolean not null default true;

-- 2) Purge des objets existants AVANT recréation (évite les erreurs de signature)
drop view if exists public.v_admin_users;          -- vue dépendante éventuelle
drop function if exists public.admin_users();      -- signature différente éventuelle

-- 3) Fonction admin : SAFU admin/super_admin uniquement, droits owner
create or replace function public.admin_users()
returns table (
  id             uuid,
  full_name      text,
  email          text,
  email_confirme boolean,
  role           text,
  agent_id       uuid,
  last_sign_in_at timestamptz,
  active         boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Garde : connecté = admin/super_admin requis ; en SQL Editor (pas de JWT) on laisse passer.
  if auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('admin', 'super_admin')
     ) then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  return query
  select
    u.id::uuid                                                   as id,
    coalesce(nullif(p.full_name::text, ''), split_part(u.email::text, '@', 1))::text as full_name,
    u.email::text                                                as email,
    (u.email_confirmed_at is not null)::boolean                  as email_confirme,
    coalesce(p.role::text, 'agent')::text                        as role,
    p.agent_id::uuid                                             as agent_id,
    u.last_sign_in_at::timestamptz                               as last_sign_in_at,
    coalesce(p.active, true)::boolean                            as active
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by coalesce(nullif(p.full_name::text, ''), split_part(u.email::text, '@', 1));
end;
$$;

revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated, service_role;
-- (anon volontairement exclu)

-- 4) Vue de repli : wrapper sur la fonction (plus de lecture directe de auth.users)
create view public.v_admin_users as
  select * from public.admin_users();
grant select on public.v_admin_users to authenticated;

-- 5) Profil automatique à la création d'un compte (User Metadata → profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    case when new.raw_user_meta_data->>'role' in ('agent','qualite','superviseur','admin','super_admin')
         then (new.raw_user_meta_data->>'role')::app_role
         else 'agent'::app_role end
  )
  on conflict (id) do nothing;   -- déjà un profil : on n'écrase rien
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Politique dédiée : admin/super_admin peuvent mettre à jour les profils
--    (rôles, rattachement agent, suspension) — sans casser les politiques existantes.
drop policy if exists admin_write_profiles on public.profiles;
create policy admin_write_profiles on public.profiles
  for update to authenticated
  using (
    exists (select 1 from public.profiles x
            where x.id = auth.uid() and x.role in ('admin', 'super_admin'))
  )
  with check (true);

-- 6) Vérification (décommenter)
-- select * from public.admin_users();
