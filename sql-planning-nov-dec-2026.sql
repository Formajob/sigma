-- Sigma · Planning PGV demandé : 16–22 novembre et rotation des samedis.
-- Prérequis : sql-planning-presence-pgv.sql exécuté (shifts M / SAT / OFF).
-- Ce script ne modifie que les dates explicitement listées et n'est PAS exécuté ici.
-- Réexécutable : upsert par agent et date.
begin;

do $$
begin
  if (select count(*) from public.agents
      where activity = 'pgv' and active
        and staff_id in ('204186', '209217', '203858')) <> 3 then
    raise exception 'Les trois fiches PGV attendues (204186, 209217, 203858) doivent être actives.';
  end if;
end $$;

-- Du lundi 16 au dimanche 22 : service M en semaine, Hind OFF le 16,
-- Hind au shift SAT le 21, dimanche OFF.
with agents as (
  select id, full_name, staff_id from public.agents
  where activity = 'pgv' and active
    and staff_id in ('204186', '209217', '203858')
), days as (
  select d::date as work_date
  from generate_series(date '2026-11-16', date '2026-11-22', interval '1 day') d
)
insert into public.planning_entries (activity, work_date, agent_id, shift_code, note)
select 'pgv', d.work_date, a.id,
       case
         when d.work_date = date '2026-11-22' then 'OFF'
         when d.work_date = date '2026-11-16' and a.staff_id = '204186' then 'OFF'
         when d.work_date = date '2026-11-21' and a.staff_id = '204186' then 'SAT'
         when d.work_date = date '2026-11-21' then 'OFF'
         else 'M'
       end,
       case
         when d.work_date = date '2026-11-16' and a.staff_id = '204186' then 'Repos demandé'
         when d.work_date = date '2026-11-21' and a.staff_id = '204186' then 'Samedi de service — rotation demandée'
         when d.work_date = date '2026-11-21' then 'Repos — rotation samedi'
         else null
       end
from days d cross join agents a
on conflict (activity, agent_id, work_date) do update
  set shift_code = excluded.shift_code, note = excluded.note, updated_at = now();

-- Samedis suivants : Amadou le 28 novembre, puis Zineb le 5 décembre.
with saturday(work_date, staff_id) as (
  values (date '2026-11-28', '209217'), (date '2026-12-05', '203858')
), agents as (
  select id, staff_id from public.agents
  where activity = 'pgv' and active
    and staff_id in ('204186', '209217', '203858')
)
insert into public.planning_entries (activity, work_date, agent_id, shift_code, note)
select 'pgv', s.work_date, a.id,
       case when a.staff_id = s.staff_id then 'SAT' else 'OFF' end,
       case when a.staff_id = s.staff_id then 'Samedi de service — rotation demandée'
            else 'Repos — rotation samedi' end
from saturday s cross join agents a
on conflict (activity, agent_id, work_date) do update
  set shift_code = excluded.shift_code, note = excluded.note, updated_at = now();

commit;

-- Contrôle après exécution :
-- select p.work_date, a.full_name, p.shift_code
-- from public.planning_entries p join public.agents a on a.id = p.agent_id
-- where p.activity = 'pgv' and p.work_date between date '2026-11-16' and date '2026-12-05'
--   and (p.work_date between date '2026-11-16' and date '2026-11-22'
--        or p.work_date in (date '2026-11-28', date '2026-12-05'))
-- order by p.work_date, a.full_name;
