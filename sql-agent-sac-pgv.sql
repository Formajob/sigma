-- Met à jour le job_role des fiches PGV déjà créées.
-- Sans effet sur les agents des autres activités.
update public.agents
   set job_role = 'Agent SAC'
 where activity = 'pgv'
   and staff_id in ('209217', '203858', '204186');

select full_name, staff_id, job_role
  from public.agents
 where activity = 'pgv'
   and staff_id in ('209217', '203858', '204186')
 order by full_name;
