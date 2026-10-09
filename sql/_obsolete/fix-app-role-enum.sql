-- ============================================================
-- Sigma — FIX enum app_role (RUN 1/2 : exécuter SEUL, avant tout)
-- Dashboard Supabase → SQL Editor → New query → coller UNIQUEMENT
-- ce fichier → Run. Puis exécute install-americana.sql (RUN 2/2).
--
-- Pourquoi séparé ? Postgres interdit d'ajouter une valeur à un
-- enum ET de l'utiliser dans la même transaction.
-- ============================================================

-- Diagnostic (optionnel) : voir les valeurs actuelles
-- SELECT e.enumlabel
-- FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
-- WHERE t.typname = 'app_role' ORDER BY e.enumsortorder;

-- Ajout des 2 valeurs manquantes (idempotent, sans transaction) :
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
