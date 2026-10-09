-- ============================================================
-- Sigma — Création des 2 accès (à exécuter dans Supabase)
--
-- ÉTAPE 1 (Dashboard) : Authentication → Users → Add user × 2
--   1. Omar.idoulahian@gmail.com  (admin Americana) — Auto Confirm ✓
--   2. jawad@acx.ma               (super admin ACX) — Auto Confirm ✓
--   Note leurs UUID (colonne UID dans Authentication → Users).
--
-- ÉTAPE 2 : remplace les UUID ci-dessous et exécute ce script.
-- ============================================================

-- Rattrapage schéma si déjà créé sans les nouveaux rôles :
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('agent','qualite','superviseur','admin','super_admin'));
alter table profiles add column if not exists client text not null default 'americana';

create or replace function is_manager() returns boolean
language sql security definer as
$$ select exists (select 1 from profiles
    where user_id = auth.uid()
    and role in ('superviseur','admin','super_admin')) $$;

-- ---------- Profils ----------
-- Remplace OMAR_UUID et JAWAD_UUID par les vrais UUID :
insert into profiles (user_id, role, client) values
  ('d0ba7adc-cab9-4de5-a0ec-c4537e25a5db', 'admin', 'americana'),
  ('491b3b2c-17f8-40cf-935b-9a9e65226592', 'super_admin', 'americana')
on conflict (user_id) do update set role = excluded.role, client = excluded.client;
