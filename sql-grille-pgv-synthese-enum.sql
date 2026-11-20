-- ÉTAPE 1/2 — à exécuter séparément puis valider avant la migration.
-- Ajoute les 3 catégories logiques sans supprimer les anciennes valeurs enum,
-- qui restent nécessaires aux lignes historiques inactives.
ALTER TYPE public.qa_category ADD VALUE IF NOT EXISTS 'accueil';
ALTER TYPE public.qa_category ADD VALUE IF NOT EXISTS 'traitement';
ALTER TYPE public.qa_category ADD VALUE IF NOT EXISTS 'posture';
