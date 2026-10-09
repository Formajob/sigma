-- ============================================================
-- SIGMA · Seed de données TEST — espace Americana
-- Idempotent : relançable sans doublons (nettoyage en tête).
-- À exécuter dans Supabase → SQL Editor (bypass RLS).
--
-- Contenu injecté (uniquement agents actifs) :
--   1) 1 calibrage « Terminé » + 1 « Planifié » par agent, dans le mois courant
--   2) 19 calibration_results par calibrage Terminé (join qa_elements,
--      score ~89 % : Non aux positions %7=0, N/A en %13=0, sinon Oui)
--   3) 2 documents de suivi par agent (Rencontre Terminé + Observation Planifié)
--
-- VOLUMES (appels pris) : via l'import CSV du dashboard.
-- Générer le CSV réel depuis la base (colonne « ligne » à copier
-- dans samples/volumes-exemple.csv) :
--
--   select staff_id || ';' || (360 + mod(abs(hashtext(staff_id)),160)) as ligne
--   from agents where active order by staff_id;
--
-- Purge des données de test avant ré-implantation :
--   delete from calibration_results
--    where calibration_id in (select id from calibrations where call_id like 'SEED-%');
--   delete from calibrations where call_id like 'SEED-%';
--   delete from documents where object like 'SEED - %';
-- ============================================================

-- 0) Nettoyage (idempotent)
delete from calibration_results
 where calibration_id in (select id from calibrations where call_id like 'SEED-%');
delete from calibrations where call_id like 'SEED-%';
delete from documents where object like 'SEED - %';

-- 1) Calibrages + résultats + documents, en un seul statement (CTEs)
with seed_done as (
  insert into calibrations
    (call_id, call_date, calibration_date, agent_id, evaluator, evaluator_name, language, status, notes)
  select
    'SEED-' || a.id::text || '-T',
    (date_trunc('month', current_date) + interval '2 day')::date,
    (date_trunc('month', current_date) + interval '4 day')::date,
    a.id,
    'Qualiticien',
    'Qualiticien',
    (array['Arabe classique','Arabe local','Français','Anglais'])[1 + mod(abs(hashtext(a.id::text)),4)]::call_language,
    'Terminé',
    'Données de test générées par le seed Sigma.'
  from agents a
  where a.active
  returning id
),
seed_planned as (
  insert into calibrations
    (call_id, call_date, calibration_date, agent_id, evaluator, evaluator_name, language, status, notes)
  select
    'SEED-' || a.id::text || '-P',
    (date_trunc('month', current_date) + interval '13 day')::date,
    (date_trunc('month', current_date) + interval '14 day')::date,
    a.id,
    'Omar idoulahian (superviseur)',
    'Omar idoulahian (superviseur)',
    (array['Arabe classique','Arabe local','Français','Anglais'])[1 + mod(abs(hashtext(a.id::text || 'p')),4)]::call_language,
    'Planifié',
    'Données de test générées par le seed Sigma.'
  from agents a
  where a.active
  returning id
),
seed_results as (
  insert into calibration_results (calibration_id, element_id, result, reason)
  select
    st.id,
    e.id,
    case
      when mod(e.position, 13) = 0 then 'N/A'::qa_result
      when mod(e.position, 7)  = 0 then 'Non'::qa_result
      else 'Oui'::qa_result
    end,
    case when mod(e.position, 7) = 0 then
      case e.category
        when 'CTB' then 'Contrôle non documenté dans le CRM.'
        when 'CTC' then 'Réponse incomplète à la demande du client.'
        else 'Procédure non appliquée sur cet échange.'
      end
    end
  from seed_done st
  join qa_elements e on e.active
  returning 1
)
select (select count(*) from seed_done)      as calibrages_termines,
       (select count(*) from seed_planned)   as calibrages_planifies,
       (select count(*) from seed_results)   as resultats_insere;

-- 2) Documents de suivi : Rencontre (Terminé) par agent actif
insert into documents
  (doc_type, object, meeting_date, follow_up_date, agent_id, visibility, status,
   facts, impacts, solutions, followup)
select
  'Rencontre',
  'SEED - Point qualité hebdomadaire',
  (date_trunc('month', current_date) + interval '6 day')::date,
  (date_trunc('month', current_date) + interval '13 day')::date,
  a.id, 'agent', 'Terminé',
  'Points forts : accueil, clarté des réponses et résolution des demandes standard.',
  'Impact : satisfaction client stable sur la période observée.',
  'Actions : renforcer l''empathie sur les réclamations et vérifier les relances.',
  'Prochain point de suivi planifié avec le superviseur.'
from agents a
where a.active;

-- 3) Documents de suivi : Observation (Planifié) par agent actif
insert into documents
  (doc_type, object, meeting_date, follow_up_date, agent_id, visibility, status,
   facts, impacts, solutions, followup)
select
  'Observation',
  'SEED - Observation qualité mensuelle',
  (date_trunc('month', current_date) + interval '17 day')::date,
  (date_trunc('month', current_date) + interval '24 day')::date,
  a.id, 'supervisor', 'Planifié',
  'Appel observé : gestion de la demande et respect de la procédure de transfert.',
  'Impact potentiel : allongement du temps de traitement si non corrigé.',
  'Actions : rappeler la matrice d''escalade TL/superviseur en réunion d''équipe.',
  'Re-observation prévue après mise en pratique.'
from agents a
where a.active;

-- 4) Vérifications
select (select count(*) from calibrations where call_id like 'SEED-%')   as seed_calibrages,
       (select count(*) from documents where object like 'SEED - %')     as seed_documents,
       (select count(*) from agents where active)                        as agents_actifs;
