-- OBSOLÈTE — NE PAS EXÉCUTER.
-- Cette grille 26 critères / CTB-CTC-NC est remplacée par la grille PGV synthétisée.
-- Pour la migration et le mappage des résultats historiques, exécuter dans l'ordre:
--   1) sql-grille-pgv-synthese-enum.sql puis valider la transaction;
--   2) sql-grille-pgv-synthese.sql.
DO $$
BEGIN
  RAISE EXCEPTION 'Ce script de grille v2 est obsolète. Utiliser sql-grille-pgv-synthese-enum.sql puis sql-grille-pgv-synthese.sql.';
END $$;
