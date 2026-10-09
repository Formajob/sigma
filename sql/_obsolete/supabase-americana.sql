-- ============================================================
-- Sigma · Americana — Schéma PostgreSQL (Supabase)
-- Fichier de référence : si ton schéma déjà exécuté diffère,
-- remplace ce fichier par ton export réel (pg_dump).
-- Ordre : 1) ce fichier  2) supabase-americana-seed.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Agents ----------
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  client text not null default 'americana',
  name text not null,
  initials text,
  staff_id text unique,
  role text not null default 'Agent support',
  team text,
  service text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Profils applicatifs (liés à auth.users) ----------
-- Rôles : agent < qualite < superviseur < admin (client) < super_admin (ACX)
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('agent','qualite','superviseur','admin','super_admin')),
  client text not null default 'americana',
  agent_id uuid references agents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Grille qualité (19 éléments : 4 CTB + 9 CTC + 6 NC) ----------
create table if not exists qa_elements (
  id serial primary key,
  code text not null check (code in ('CTB','CTC','NC')),
  label text not null,
  position int not null unique
);

-- ---------- Calibrages (évaluation d'un appel écouté) ----------
create table if not exists calibrations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete restrict,
  call_id text,
  evaluator text,
  language text,
  call_date date,
  date date not null,
  status text not null default 'Planifié'
    check (status in ('Planifié','Terminé','Annulé')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Résultats : 1 ligne par question (grille évolutive) ----------
create table if not exists calibration_results (
  id uuid primary key default gen_random_uuid(),
  calibration_id uuid not null references calibrations(id) on delete cascade,
  element_id int not null references qa_elements(id) on delete restrict,
  value text not null check (value in ('Oui','Non','N/A')),
  reason text,
  unique (calibration_id, element_id)
);

-- ---------- Documents de suivi (format FISS) ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  object text,
  meeting_date date,
  followup_date date,
  agent_id uuid references agents(id) on delete set null,
  call_id text,
  visibility text not null default 'agent'
    check (visibility in ('agent','supervisor')),
  status text not null default 'Planifié'
    check (status in ('Planifié','Terminé','Annulé')),
  facts text,
  impacts text,
  solutions text,
  followup text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Volumes d'appels par agent et période ----------
create table if not exists call_volumes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  count int not null default 0 check (count >= 0)
);

-- ---------- Objectifs affichés sur le tableau de bord ----------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  client text not null default 'americana',
  calls_per_agent int not null default 450,
  calibrations_per_agent int not null default 8,
  compliance_pct int not null default 85,
  created_at timestamptz not null default now()
);
