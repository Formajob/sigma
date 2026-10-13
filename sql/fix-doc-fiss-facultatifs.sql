-- Documents de suivi FISS : champs facultatifs (vides autorises).
-- Les formulaires envoient NULL quand un champ est vide.
ALTER TABLE documents ALTER COLUMN facts DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN impacts DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN solutions DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN followup DROP NOT NULL;
