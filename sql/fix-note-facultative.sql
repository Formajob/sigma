-- ============================================================
-- SIGMA · Patch note facultative sur reponse "Non"
-- Contexte : le formulaire autorise un "Non" sans note, mais la base
-- refuse avec calibration_results_reason_required (code 23514).
-- A executer dans Supabase -> SQL Editor. Idempotent.
-- ============================================================

-- 1) Lever la contrainte qui exige une raison des qu'une reponse est Non.
ALTER TABLE calibration_results DROP CONSTRAINT IF EXISTS calibration_results_reason_required;

-- 2) Variante : si la regle est un NOT NULL / DEFAULT sur reason, la rendre nullable.
-- (Sans effet si la colonne est deja nullable.)
ALTER TABLE calibration_results ALTER COLUMN reason DROP NOT NULL;

-- 3) Verification (decommenter) :
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conrelid = 'calibration_results'::regclass;
