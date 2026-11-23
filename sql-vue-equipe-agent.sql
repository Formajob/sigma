-- Sigma PGV — lecture équipe pour les agents (planning et présence)
-- À exécuter une fois dans Supabase SQL Editor après sql-fix-isolation-pgv.sql.
-- Les écritures restent réservées aux managers; les agents ne gagnent que SELECT.

begin;

-- Planning hebdomadaire : tous les utilisateurs PGV authentifiés peuvent lire
-- les shifts de l'équipe. Les notes internes ne sont pas sélectionnées par l'UI.
drop policy if exists planning_entries_scoped_read on public.planning_entries;
create policy planning_entries_scoped_read on public.planning_entries
  for select to authenticated
  using (activity = public.sigma_current_activity());

-- Présence : managers gardent leur périmètre complet; chaque agent conserve
-- son propre historique et voit la présence de l'équipe pour aujourd'hui.
drop policy if exists attendance_events_scoped_read on public.attendance_events;
create policy attendance_events_scoped_read on public.attendance_events
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (
      public.sigma_is_activity_manager(activity)
      or agent_id = public.sigma_current_agent()
      or work_date = (now() at time zone 'Africa/Casablanca')::date
    )
  );

-- Les marqueurs d'alertes du jour sont aussi lisibles dans la vue équipe;
-- seul le policy manager existant autorise leur modification.
drop policy if exists attendance_alert_acks_scoped_read on public.attendance_alert_acks;
create policy attendance_alert_acks_scoped_read on public.attendance_alert_acks
  for select to authenticated
  using (
    activity = public.sigma_current_activity()
    and (
      public.sigma_is_activity_manager(activity)
      or agent_id = public.sigma_current_agent()
      or work_date = (now() at time zone 'Africa/Casablanca')::date
    )
  );

commit;
