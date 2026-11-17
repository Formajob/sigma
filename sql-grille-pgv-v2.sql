-- ============================================================
--  Sigma · Grille PGV v2 — 26 éléments
--  Version 4 (corrige l'erreur 23505 sur (activity, position))
--
--  Pourquoi l'ancienne version échouait :
--  elle faisait 26 UPDATE l'un après l'autre. En voulant mettre
--  CTB-04 en position 2, la ligne CTB-02 occupait ENCORE la
--  position 2 (elle ne devait bouger qu'à l'étape suivante).
--  L'index unique (activity, position) refusait donc l'update.
--
--  Cette version ne déplace jamais une ligne vers une position
--  occupée : elle supprime les éléments inutilisés, puis les
--  réinsère proprement en une seule fois.
--
--  Rejouable, sans risque. Aucun calibrage n'est supprimé.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Mise de côté des éléments PGV déjà utilisés par un calibrage
--    (cas rare) : désactivés et parqués très au-dessus des
--    positions 1..26 pour ne jamais gêner l'insertion.
-- ------------------------------------------------------------
update public.qa_elements
   set active = false,
       position = position + 10000
 where activity = 'pgv'
   and exists (select 1 from public.calibration_results r where r.element_id = public.qa_elements.id);

-- ------------------------------------------------------------
-- 2. Suppression des éléments PGV que personne n'utilise
--    (la grille de production actuelle : 32 lignes, 0 réponse)
-- ------------------------------------------------------------
do $$
declare n int := 0;
begin
  delete from public.qa_elements e
   where e.activity = 'pgv'
     and not exists (select 1 from public.calibration_results r where r.element_id = e.id);
  get diagnostics n = row_count;
  raise notice 'Éléments PGV libres supprimés : %', n;
end $$;

-- ------------------------------------------------------------
-- 3. Grille v2 : 26 éléments, insérés d'un seul bloc
-- ------------------------------------------------------------
insert into public.qa_elements
  (activity, code, category, label, position, weight, critical, na_allowed, active)
values
-- ---- CTB · Traitement & conformité (10 éléments, 24 points) ----
('pgv','CTB-01','CTB'::public.qa_category,'Identité vérifiée avant le dossier',                    1,3,true, false,true),
('pgv','CTB-04','CTB'::public.qa_category,'Information exacte et vérifiée',                       2,3,true, false,true),
('pgv','CTB-05','CTB'::public.qa_category,'Procédure appliquée jusqu’au bout',                    3,3,false,false,true),
('pgv','CTB-06','CTB'::public.qa_category,'Aucun engagement hors mandat',                         4,3,true, false,true),
('pgv','CTB-07','CTB'::public.qa_category,'Actions saisies dans Darwin en direct',                5,2,false,false,true),
('pgv','CTB-12','CTB'::public.qa_category,'Note ajoutée au dossier quand il n’en existe pas',     6,2,false,true, true),
('pgv','CTB-08','CTB'::public.qa_category,'Escalade déclenchée à bon escient',                    7,2,false,true, true),
('pgv','CTB-09','CTB'::public.qa_category,'Suite et délai communiqués',                           8,2,false,false,true),
('pgv','CTB-10','CTB'::public.qa_category,'Dossier clôturé et statut à jour',                     9,1,false,false,true),
('pgv','CTB-11','CTB'::public.qa_category,'Confidentialité respectée',                           10,3,true, false,true),
-- ---- CTC · Relation client (10 éléments, 18 points) ----
('pgv','CTC-01','CTC'::public.qa_category,'Décroché et formule d’accueil',                        11,1,false,false,true),
('pgv','CTC-02','CTC'::public.qa_category,'Client écouté jusqu’au bout',                          12,2,false,false,true),
('pgv','CTC-03','CTC'::public.qa_category,'Reformulation de la demande',                          13,2,false,false,true),
('pgv','CTC-04','CTC'::public.qa_category,'Réponse à la question posée',                          14,2,false,false,true),
('pgv','CTC-05','CTC'::public.qa_category,'Explication claire et sans jargon',                    15,2,false,false,true),
('pgv','CTC-06','CTC'::public.qa_category,'Gestion de la réclamation',                            16,3,false,true, true),
('pgv','CTC-07','CTC'::public.qa_category,'Mise en attente conforme',                             17,2,false,true, true),
('pgv','CTC-08','CTC'::public.qa_category,'Transfert annoncé et présenté',                        18,1,false,true, true),
('pgv','CTC-09','CTC'::public.qa_category,'Clôture complète',                                     19,2,false,false,true),
('pgv','CTC-10','CTC'::public.qa_category,'Nom du client utilisé',                                20,1,false,false,true),
-- ---- NC · Savoir être (6 éléments, 15 points) ----
('pgv','NC-01','NC'::public.qa_category,'V.A.T.R.E',                                              21,3,false,false,true),
('pgv','NC-06','NC'::public.qa_category,'Professionnalisme',                                      22,2,false,false,true),
('pgv','NC-07','NC'::public.qa_category,'Écoute active',                                          23,2,false,false,true),
('pgv','NC-08','NC'::public.qa_category,'Empathie',                                               24,2,false,false,true),
('pgv','NC-09','NC'::public.qa_category,'Contrôle émotionnel',                                    25,3,true, false,true),
('pgv','NC-10','NC'::public.qa_category,'Neutralité et respect',                                  26,3,true, false,true)
on conflict (activity, code) do update
  set category   = excluded.category,
      label      = excluded.label,
      position   = excluded.position,
      weight     = excluded.weight,
      critical   = excluded.critical,
      na_allowed = excluded.na_allowed,
      active     = true;

-- ------------------------------------------------------------
-- 4. Résultat
-- ------------------------------------------------------------
do $$
declare r record;
begin
  raise notice '--- Grille PGV après mise à jour ---';
  for r in
    select category, count(*) n, sum(weight) pts
      from public.qa_elements
     where activity = 'pgv' and active
     group by category order by category
  loop
    raise notice '  % : % élément(s), % point(s)', r.category, r.n, r.pts;
  end loop;

  for r in
    select count(*) n, sum(weight) pts, count(*) filter (where critical) crit
      from public.qa_elements where activity = 'pgv' and active
  loop
    raise notice '  TOTAL : % élément(s), % point(s), % critique(s) — attendu 26 / 57 / 6',
                 r.n, r.pts, r.crit;
  end loop;

  for r in select count(*) n from public.qa_elements
            where activity = 'pgv' and not active
  loop
    raise notice '  Historique conservé (inactifs) : % élément(s)', r.n;
  end loop;
end $$;

commit;

-- ============================================================
--  Contrôle final — à lancer après le commit :
-- ============================================================
-- select position, code, category, weight, critical, na_allowed, active, label
--   from public.qa_elements
--  where activity = 'pgv'
--  order by position;
