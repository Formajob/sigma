-- Sigma PGV · rendre le trigger Auth compatible avec profiles_agent_required.
-- À exécuter après sql-admin-utilisateurs.sql et avant une nouvelle invitation.
-- Le rôle n'est jamais pris depuis les métadonnées Auth : toute invitation par
-- ce flux est un agent et doit porter un agent_id PGV valide.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_agent_name text;
  v_scope text;
  v_full_name text;
begin
  v_agent_id := nullif(new.raw_user_meta_data ->> 'agent_id', '')::uuid;

  -- Les créations non liées à une fiche sont laissées sans profil : elles ne
  -- peuvent pas contourner la contrainte ni obtenir un rôle par user_metadata.
  if v_agent_id is null then
    return new;
  end if;

  select a.full_name,
         coalesce(a.activity, case when a.team ilike '%pgv%' then 'pgv' end)
    into v_agent_name, v_scope
    from public.agents a
   where a.id = v_agent_id and coalesce(a.active, true);
  if not found or v_scope is distinct from 'pgv' then
    raise exception 'Invitation refusée : fiche agent PGV active requise';
  end if;

  v_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(v_agent_name), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Agent PGV'
  );

  insert into public.profiles (id, full_name, role, agent_id, activity)
  values (new.id, v_full_name, 'agent'::public.app_role, v_agent_id, 'pgv')
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'agent'::public.app_role,
        agent_id = excluded.agent_id,
        activity = 'pgv',
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
