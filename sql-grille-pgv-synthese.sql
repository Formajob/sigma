-- ÉTAPE 2/2 — exécuter après sql-grille-pgv-synthese-enum.sql.
-- Grille synthétisée PGV: 11 critères, trois typologies, 57 points pondérés.
-- Les anciennes qa_elements et réponses sont conservées inactives; chaque résultat
-- historique complet est copié vers son critère fusionné. La migration est rejouable.
BEGIN;

-- Mettre tous les anciens items hors de la grille active, sans supprimer leurs réponses.
-- Les positions de parking sont réattribuées dans une plage haute distincte; cela
-- évite les collisions avec des anciennes lignes déjà parquées (ex. position 10002).
-- Le classement par id rend l'opération stable et rejouable.
WITH parked AS (
  SELECT id, 100000 + row_number() OVER (ORDER BY code, id)::integer AS parked_position
    FROM public.qa_elements
   WHERE activity = 'pgv'
)
UPDATE public.qa_elements AS e
   SET active = false,
       position = parked.parked_position
  FROM parked
 WHERE e.id = parked.id;

INSERT INTO public.qa_elements
  (activity, code, category, label, position, weight, critical, na_allowed, active)
VALUES
  ('pgv','PGV-01','accueil'::public.qa_category,'Accueil personnalisé',1,2,false,false,true),
  ('pgv','PGV-02','accueil'::public.qa_category,'Écoute active et reformulation',2,6,false,false,true),
  ('pgv','PGV-03','accueil'::public.qa_category,'Identification et confidentialité',3,6,true,false,true),
  ('pgv','PGV-04','traitement'::public.qa_category,'Réponse exacte, pertinente et claire',4,7,true,false,true),
  ('pgv','PGV-05','traitement'::public.qa_category,'Procédure respectée et engagement autorisé',5,6,true,false,true),
  ('pgv','PGV-06','traitement'::public.qa_category,'Dossier tracé et mis à jour',6,5,false,true,true),
  ('pgv','PGV-07','traitement'::public.qa_category,'Réclamation traitée avec empathie',7,5,false,false,true),
  ('pgv','PGV-08','traitement'::public.qa_category,'Attente, transfert et escalade maîtrisés',8,5,false,true,true),
  ('pgv','PGV-09','traitement'::public.qa_category,'Suite annoncée et clôture complète',9,4,false,false,true),
  ('pgv','PGV-10','posture'::public.qa_category,'Communication orale professionnelle',10,5,false,false,true),
  ('pgv','PGV-11','posture'::public.qa_category,'Maîtrise de soi, neutralité et respect',11,6,true,false,true)
ON CONFLICT (activity, code) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  position = EXCLUDED.position,
  weight = EXCLUDED.weight,
  critical = EXCLUDED.critical,
  na_allowed = EXCLUDED.na_allowed,
  active = true;

-- Règle d'agrégation historique:
--   au moins un ancien Non => Non (motifs concaténés);
--   tous les anciens N/A => N/A;
--   sinon (Oui et/ou N/A, sans Non) => Oui.
-- Les calibrages partiels restent partiels: aucun résultat n'est inventé si une
-- des anciennes réponses nécessaires à la fusion manque.
WITH mapping(new_code, old_code) AS (
  VALUES
    ('PGV-01','CTC-01'),('PGV-01','CTC-10'),
    ('PGV-02','CTC-02'),('PGV-02','CTC-03'),('PGV-02','NC-07'),
    ('PGV-03','CTB-01'),('PGV-03','CTB-11'),
    ('PGV-04','CTB-04'),('PGV-04','CTC-04'),('PGV-04','CTC-05'),
    ('PGV-05','CTB-05'),('PGV-05','CTB-06'),
    ('PGV-06','CTB-07'),('PGV-06','CTB-12'),('PGV-06','CTB-10'),
    ('PGV-07','CTC-06'),('PGV-07','NC-08'),
    ('PGV-08','CTB-08'),('PGV-08','CTC-07'),('PGV-08','CTC-08'),
    ('PGV-09','CTB-09'),('PGV-09','CTC-09'),
    ('PGV-10','NC-01'),('PGV-10','NC-06'),
    ('PGV-11','NC-09'),('PGV-11','NC-10')
), aggregated AS (
  SELECT c.id AS calibration_id,
         m.new_code,
         count(*) AS expected_count,
         count(old_result.element_id) AS result_count,
         bool_or(old_result.result::text = 'Non') AS has_non,
         bool_and(old_result.result::text = 'N/A') AS all_na,
         string_agg(
           old_element.label || ': ' || coalesce(nullif(old_result.reason, ''), 'motif non renseigné'),
           E'\n' ORDER BY old_element.label
         ) FILTER (WHERE old_result.result::text = 'Non') AS combined_reason
    FROM public.calibrations c
    CROSS JOIN mapping m
    LEFT JOIN public.qa_elements old_element
      ON old_element.activity = 'pgv' AND old_element.code = m.old_code
    LEFT JOIN public.calibration_results old_result
      ON old_result.calibration_id = c.id AND old_result.element_id = old_element.id
    WHERE c.activity = 'pgv'
    GROUP BY c.id, m.new_code
)
INSERT INTO public.calibration_results (calibration_id, element_id, result, reason)
SELECT a.calibration_id,
       new_element.id,
       (CASE WHEN a.has_non THEN 'Non'
             WHEN a.all_na THEN 'N/A'
             ELSE 'Oui' END)::public.qa_result,
       CASE WHEN a.has_non THEN a.combined_reason ELSE NULL END
  FROM aggregated a
  JOIN public.qa_elements new_element
    ON new_element.activity = 'pgv' AND new_element.code = a.new_code AND new_element.active
 WHERE a.result_count = a.expected_count
ON CONFLICT (calibration_id, element_id) DO UPDATE SET
  result = EXCLUDED.result,
  reason = EXCLUDED.reason;

DO $$
DECLARE active_count integer; active_weight integer; active_critical integer;
BEGIN
  SELECT count(*), coalesce(sum(weight),0), count(*) FILTER (WHERE critical)
    INTO active_count, active_weight, active_critical
    FROM public.qa_elements WHERE activity='pgv' AND active;
  IF active_count <> 11 OR active_weight <> 57 OR active_critical <> 4 THEN
    RAISE EXCEPTION 'Grille synthétisée invalide: critères %, poids %, critiques % (attendu 11/57/4)',
      active_count, active_weight, active_critical;
  END IF;
END $$;

COMMIT;

-- Contrôle après migration:
-- SELECT position, code, category, weight, critical, na_allowed, active, label
-- FROM public.qa_elements WHERE activity='pgv' ORDER BY position;
-- SELECT category, count(*), sum(weight) FROM public.qa_elements
-- WHERE activity='pgv' AND active GROUP BY category ORDER BY category;
