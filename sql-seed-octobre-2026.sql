-- ============================================================
--  Sigma · Seed PGV — octobre 2026
--  Données d'exploitation réalistes pour les trois agents PGV :
--  planification, pointages, pauses, appels, emails, calibrages
--  et suivi documentaire. Rejouable : tout le mois est remplacé.
--
--  Prérequis :
--    · ops-install.sql exécuté (agents, shifts, grille)
--    · sql-grille-pgv-v2.sql exécuté (26 éléments)
--    · sql-activite-agent.sql exécuté (agent_daily_activity)
--    · sql-docs-pgv.sql exécuté (documents PGV)
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. Agent technique d'écriture (created_by / updated_by / acked_by)
--    profiles.id référence auth.users : on n'en crée aucun.
-- ------------------------------------------------------------
create temp table _seed_ctx as
select '2026-10-01'::date as d_start,
       '2026-10-31'::date as d_end;

-- ------------------------------------------------------------
-- 0 bis. Contraintes nécessaires aux upserts (sans effet si présentes)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_daily_activity_activity_work_date_agent_id_key') then
    alter table public.agent_daily_activity
      add constraint agent_daily_activity_activity_work_date_agent_id_key
      unique (activity, work_date, agent_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'email_agent_daily_activity_work_date_agent_id_key') then
    alter table public.email_agent_daily
      add constraint email_agent_daily_activity_work_date_agent_id_key
      unique (activity, work_date, agent_id);
  end if;
end $$;

-- ------------------------------------------------------------
-- 1. Nettoyage du mois (uniquement l'activité PGV)
-- ------------------------------------------------------------
delete from public.attendance_events e
 where e.activity = 'pgv' and e.work_date between '2026-10-01' and '2026-10-31';

delete from public.attendance_alert_acks a
 where a.activity = 'pgv' and a.work_date between '2026-10-01' and '2026-10-31';

delete from public.planning_entries p
 where p.activity = 'pgv' and p.work_date between '2026-10-01' and '2026-10-31';

delete from public.agent_daily_activity a
 where a.activity = 'pgv' and a.work_date between '2026-10-01' and '2026-10-31';

delete from public.email_agent_daily x
 where x.activity = 'pgv' and x.work_date between '2026-10-01' and '2026-10-31';

delete from public.email_days x
 where x.activity = 'pgv' and x.work_date between '2026-10-01' and '2026-10-31';

delete from public.calibrations c
 where c.activity = 'pgv' and c.calibration_date between '2026-10-01' and '2026-10-31';

delete from public.documents d
 where d.activity = 'pgv' and d.meeting_date between '2026-10-01' and '2026-10-31';

-- ------------------------------------------------------------
-- 2. Calendrier du mois : jours, ouverture, agent de service
--    · dimanche non ouvré
--    · samedi : un seul agent, par tour de rôle
--    · jour de semaine : les trois en poste
-- ------------------------------------------------------------
create temp table _seed_days as
with base as (
  select g::date as d
  from generate_series('2026-10-01'::date, '2026-10-31'::date, interval '1 day') g
), flags as (
  select d,
         extract(dow from d)::int as dow,
         (extract(dow from d)::int <> 0) as open,
         (extract(dow from d)::int = 6) as is_sat,
         row_number() over (partition by (extract(dow from d)::int = 6) order by d) as sat_rank
  from base
), sats as (
  select d, sat_rank, ((sat_rank - 1) % 3) as sat_slot from flags where is_sat
)
select f.d, f.dow, f.open, f.is_sat, s.sat_slot
from flags f left join sats s on s.d = f.d;

-- ------------------------------------------------------------
-- 3. Agents PGV (déjà semés par ops-install, on lit leurs ids)
-- ------------------------------------------------------------
create temp table _seed_agents as
select a.id, a.full_name, a.staff_id,
       row_number() over (order by a.staff_id) as ord
from public.agents a
where a.activity = 'pgv' and a.active;

-- ------------------------------------------------------------
-- 4. Planning : semaine = tous en M, samedi = un seul en M puis OFF
--    Les deux autres sont OFF le samedi. Dimanche : OFF pour tous.
-- ------------------------------------------------------------
insert into public.planning_entries (activity, work_date, agent_id, shift_code, note)
select 'pgv', x.d, x.agent_id,
       case
         when not x.open then 'OFF'
         when x.is_sat then case when x.sat_slot = x.ord - 1 then 'M' else 'OFF' end
         else 'M'
       end,
       case when x.is_sat and x.sat_slot = x.ord - 1 then 'Samedi — service' else null end
from (
  select d.d, d.open, d.is_sat, d.sat_slot, a.id as agent_id, a.ord
  from _seed_days d cross join _seed_agents a
) x;

-- ------------------------------------------------------------
-- 5. Pointages : arrivées 08:52–09:06, pauses déterministes,
--    départs 17:55–18:10. Aucun pointage le dimanche ni les OFF.
-- ------------------------------------------------------------
insert into public.attendance_events
  (activity, agent_id, event_type, break_type, occurred_at, work_date, source, note)
select 'pgv', p.agent_id, v.event_type, v.break_type, v.ts, p.work_date, 'import', 'reprise historique'
from public.planning_entries p
join _seed_agents a on a.id = p.agent_id
cross join lateral (
  select
    p.work_date::timestamp
      + interval '9 hour'
      + make_interval(mins => (52 + (a.ord * 3) + (extract(day from p.work_date)::int % 7))::int) as t_in
) t
cross join lateral (
  values
    ('in',        null,          t.t_in),
    ('break_start', 'pause',     t.t_in + interval '2 hour 40 min'),
    ('break_end',  null,         t.t_in + interval '2 hour 55 min'),
    ('break_start', 'lunch',     t.t_in + interval '4 hour 20 min'),
    ('break_end',  null,         t.t_in + interval '5 hour 18 min'),
    ('break_start', 'sortie',    t.t_in + interval '7 hour 5 min'),
    ('break_end',  null,         t.t_in + interval '7 hour 14 min'),
    ('out',        null,         t.t_in + interval '8 hour 6 min')
) v(event_type, break_type, ts)
where p.activity = 'pgv'
  and p.shift_code <> 'OFF'
  and p.work_date between '2026-10-01' and '2026-10-31';

-- ------------------------------------------------------------
-- 6. Journées emails : un seul service par jour ouvré
--    (rotation : la fiche en service du planning du jour, par tour)
-- ------------------------------------------------------------
insert into public.email_days
  (activity, work_date, planned_agent_id, duty_agent_id,
   received_total, received_sac, non_sac_spam, non_sac_pub,
   non_sac_autre_departement, non_sac_autre, treated_sac, note)
select 'pgv', d.d,
       duty.agent_id, duty.agent_id,
       118 + (extract(day from d.d)::int * 7) % 46,
        64 + (extract(day from d.d)::int * 5) % 28,
        18 + (extract(day from d.d)::int * 3) % 12,
        11 + (extract(day from d.d)::int * 2) % 9,
         7 + (extract(day from d.d)::int) % 6,
         4 + (extract(day from d.d)::int * 3) % 5,
        61 + (extract(day from d.d)::int * 5) % 27,
       null
from _seed_days d
join lateral (
  select p.agent_id
  from public.planning_entries p
  where p.activity = 'pgv' and p.work_date = d.d and p.shift_code <> 'OFF'
  order by p.agent_id
  limit 1
) duty on true
where d.open;

-- Les traités SAC ne peuvent pas dépasser les reçus SAC
update public.email_days
   set treated_sac = received_sac
 where activity = 'pgv'
   and work_date between '2026-10-01' and '2026-10-31'
   and treated_sac > received_sac;

-- ------------------------------------------------------------
-- 7. Répartition par agent : appels et emails traités
--    Chaque agent déclare ses volumes du jour.
-- ------------------------------------------------------------
insert into public.agent_daily_activity
  (activity, work_date, agent_id, calls_treated, note, updated_at)
select 'pgv', e.work_date, a.id,
       38 + ((extract(day from e.work_date)::int * (a.ord + 2)) % 23),
       null, now()
from public.email_days e
cross join _seed_agents a
where e.activity = 'pgv'
  and e.work_date between '2026-10-01' and '2026-10-31'
  and exists (
    select 1 from public.planning_entries p
    where p.activity = 'pgv' and p.work_date = e.work_date
      and p.agent_id = a.id and p.shift_code <> 'OFF'
  )
on conflict (activity, work_date, agent_id) do update
  set calls_treated = excluded.calls_treated, updated_at = now();

insert into public.email_agent_daily
  (activity, work_date, agent_id, treated_sac, treated_other, note)
select 'pgv', e.work_date, a.id,
       case when e.duty_agent_id = a.id
            then round(e.treated_sac * 0.62)::int
            else round(e.treated_sac * 0.19)::int end,
       case when e.duty_agent_id = a.id
            then round((e.non_sac_spam + e.non_sac_pub + e.non_sac_autre) * 0.60)::int
            else round((e.non_sac_spam + e.non_sac_pub + e.non_sac_autre) * 0.20)::int end,
       null
from public.email_days e
cross join _seed_agents a
where e.activity = 'pgv'
  and e.work_date between '2026-10-01' and '2026-10-31'
  and exists (
    select 1 from public.planning_entries p
    where p.activity = 'pgv' and p.work_date = e.work_date
      and p.agent_id = a.id and p.shift_code <> 'OFF'
  )
on conflict (activity, work_date, agent_id) do update
  set treated_sac = excluded.treated_sac,
      treated_other = excluded.treated_other;

-- ------------------------------------------------------------
-- 8. Calibrages : 4 par agent (12 sur le mois), répartis semaines
--    1 et 3 ; résultats par élément avec des profils crédibles.
-- ------------------------------------------------------------
create temp table _seed_cal as
select
  a.id   as agent_id,
  a.ord,
  w.wk,
  w.cal_date,
  (array['CTB-01','CTB-04','CTB-11','NC-09','NC-10','CTB-06'])[((a.ord + w.wk) % 6) + 1] as weak_code,
  (array['CTB-12','CTC-06','CTC-08'])[((a.ord + w.wk) % 3) + 1] as na_code,
  w.score_base
from _seed_agents a
cross join (
  values
    (1, '2026-10-07'::date, 78),
    (2, '2026-10-09'::date, 84),
    (3, '2026-10-15'::date, 87),
    (4, '2026-10-20'::date, 91)
) w(wk, cal_date, score_base)
order by a.ord, w.wk;

insert into public.calibrations
  (activity, agent_id, call_id, call_date, calibration_date, evaluator, evaluator_name,
   language, status, notes)
select 'pgv', c.agent_id,
       'SIG-' || to_char(c.cal_date, 'MMDD') || '-' || lpad(c.ord::text, 2, '0'),
       c.cal_date - interval '1 day',
       c.cal_date,
       'Autre'::public.evaluator_kind,
       'Jawad',
       'Français'::public.call_language,
       'Terminé'::public.entry_status,
       case
         when c.wk = 1 then 'Écoute de suivi — semaine 1.'
         when c.wk = 2 then 'Écoute de suivi — semaine 2.'
         when c.wk = 3 then 'Écoute de suivi — semaine 3, accompagnement.'
         else 'Écoute de suivi — semaine 4, contrôle de la progression.'
       end
from _seed_cal c;

-- Résultats : faibles = codes identifiés, NA = éléments autorisés, le reste Oui
insert into public.calibration_results (calibration_id, element_id, result, reason)
select cal.id, e.id,
       (case
         when e.code = c.weak_code then 'Non'
         when e.code = c.na_code   then 'N/A'
         else 'Oui'
       end)::public.qa_result,
       case when e.code = c.weak_code then 'Écart constaté à l’écoute et repris en coaching.' else null end
from _seed_cal c
join public.calibrations cal
  on cal.activity = 'pgv'
 and cal.agent_id = c.agent_id
 and cal.calibration_date = c.cal_date
join public.qa_elements e
  on e.activity = 'pgv' and e.active
where not (e.code = c.na_code and not coalesce(e.na_allowed, false));

-- ------------------------------------------------------------
-- 9. Suivi documentaire du mois
--    Corps FISS complet : faits, impacts, solutions, suivi.
--    `agent_id` est obligatoire : les rencontres d'équipe sont
--    rattachées au responsable de séance.
-- ------------------------------------------------------------
insert into public.documents
  (activity, meeting_date, doc_type, object, agent_id, visibility, status,
   facts, impacts, solutions, followup, created_by)
select 'pgv',
       v.meeting_date,
       v.doc_type::public.doc_type,
       v.object,
       a.id,
       v.visibility::public.doc_visibility,
       v.status::public.entry_status,
       v.facts, v.impacts, v.solutions, v.followup,
       null
from (values
  ('2026-10-02'::date, 'Feedback', 'Suivi de calibrage', '209217', 'agent', 'Planifié',
   'Écoute du 1er octobre : la vérification d''identité et la clôture sont acquises. La demande du client n''est pas reformulée avant la recherche de solution.',
   'Le client répète deux fois sa demande ; l''appel dépasse de 40 secondes la cible.',
   'Reformulation en ouverture de chaque appel, entraînement sur deux appels témoins en binôme avec la superviseuse.',
   'Point rapide le 9 octobre, écoute de contrôle au prochain calibrage.'),
  ('2026-10-06'::date, 'Observation', 'Écoute', '203858', 'agent', 'Terminé',
   'Observation d''un pic d''appels de 10 h à 12 h : priorisation correcte, mise en attente systématiquement annoncée.',
   'Aucune attente muette relevée ; le registre des dossiers en attente n''est pas complété pour deux appels.',
   'Note au dossier rendue obligatoire avant chaque mise en attente, rappel affiché sur le poste.',
   'Vérifié en écoute croisée le 30 octobre, écart résorbé.'),
  ('2026-10-12'::date, 'Rencontre', 'Alignement', '209217', 'supervisor', 'Terminé',
   'Rencontre d''équipe du 12 octobre : objectifs du mois rappelés — 4 calibrages par agent, score cible 85 %, contrôle des points critiques.',
   'La répartition des samedis et la rotation des emails étaient perçues différemment selon les agents.',
   'Calendrier de service affiché, tour de rôle explicité, un seul agent de service par jour et par tour.',
   'Suivi à la rencontre du mois suivant.'),
  ('2026-10-19'::date, 'Feedback', 'Constructif', '204186', 'agent', 'Planifié',
   'Suivi des dossiers en attente : écoute active et maîtrise des délais acquises, la note au dossier manque sur trois dossiers.',
   'Le suivi client repose sur la mémoire de l''agent plutôt que sur le dossier, avec un risque de rappel manqué.',
   'Note au dossier à chaque contact, contrôle en fin de journée sur la liste des dossiers ouverts.',
   'Contrôle aléatoire sur cinq dossiers le 30 octobre.'),
  ('2026-10-23'::date, 'Rapport de fait', 'Non-respect de procédure', '209217', 'supervisor', 'Terminé',
   'Coupure de l''outil de suivi le 22 octobre de 14 h 05 à 14 h 40 : aucun dossier n''était renseigné pendant l''incident.',
   'Traitement assuré sur registre manuel ; aucune promesse client non tenue, mais deux appels sortants ont été différés.',
   'Double saisie paper-vers-outil à la reprise, procédure d''incident rappelée à l''équipe.',
   'Retour à la normale à 15 h 10, registre contrôlé et complet.'),
  ('2026-10-27'::date, 'Plan d''action', 'Performance', '203858', 'supervisor', 'Planifié',
   'Plan d''action pour réduire les écarts critiques : reformulation en ouverture, annonce systématique du délai, contrôle de la note au dossier.',
   'Trois écarts critiques relevés sur deux agents au deuxième calibrage de la semaine 2.',
   'Entraînement ciblé de 20 minutes par semaine, écoute croisée mensuelle, suivi des points faibles dans la grille.',
   'Bilan au prochain calibrage de la semaine 4.'),
  ('2026-10-30'::date, 'Observation', 'Savoir-être', '203858', 'agent', 'Terminé',
   'Écoute croisée de deux appels en fin de journée : empathie et clôture maîtrisées, énergie et articulation faiblissent après 17 h.',
   'Le client reformule sa demande plus souvent sur le second appel de la série.',
   'Pause courte avant le dernier bloc d''appels, variation d''intonation travaillée en coaching.',
   'À réévaluer sur le calibrage de novembre.')
) as v(meeting_date, doc_type, object, staff_id, visibility, status, facts, impacts, solutions, followup)
join public.agents a on a.activity = 'pgv' and a.staff_id = v.staff_id;

commit;
