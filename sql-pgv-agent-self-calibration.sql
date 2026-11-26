-- Autoriser un agent PGV a creer uniquement son propre calibrage.
-- L'evaluateur est l'agent connecte; aucune modification/suppression des calibrages
-- existants n'est accordee. Les policies de lecture equipe restent inchangees.
begin;

drop policy if exists calibrations_agent_self_insert on public.calibrations;
create policy calibrations_agent_self_insert on public.calibrations
  for insert to authenticated
  with check (
    activity = 'pgv'
    and activity = public.sigma_current_activity()
    and agent_id = public.sigma_current_agent()
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.active = true
         and p.role::text = 'agent'
         and p.activity = 'pgv'
         and p.agent_id = public.sigma_current_agent()
    )
  );

drop policy if exists calibration_results_agent_self_insert on public.calibration_results;
create policy calibration_results_agent_self_insert on public.calibration_results
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.calibrations c
        join public.profiles p on p.id = auth.uid()
       where c.id = calibration_results.calibration_id
         and c.activity = 'pgv'
         and c.activity = public.sigma_current_activity()
         and c.agent_id = public.sigma_current_agent()
         and c.created_by = auth.uid()
         and p.active = true
         and p.role::text = 'agent'
         and p.activity = 'pgv'
         and p.agent_id = c.agent_id
    )
  );

commit;
