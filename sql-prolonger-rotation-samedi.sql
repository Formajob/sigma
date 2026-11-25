-- Prolonge la rotation PGV sur 4 semaines complètes après le 12/12/2026.
-- Le cycle est ancré sur le planning existant du 17/10/2026 (Amadou AliBa en SAT).
-- Dates ajoutées : 14/12/2026–10/01/2027; samedis : 19/12, 26/12, 02/01, 09/01.
-- Les semaines sont insérées sans écraser une entrée déjà existante.

begin;

update public.planning_shifts
   set label='Normal', start_time='14:00', end_time='23:00', is_work=true, break_minutes=60
 where activity='pgv' and code='M';
update public.planning_shifts
   set label='Samedi', start_time='14:00', end_time='18:00', is_work=true, break_minutes=0
 where activity='pgv' and code='SAT';

-- Suppression des anciennes définitions uniquement si aucune entrée PGV ne les
-- référence; elles n’ont actuellement aucune affectation. Les codes historiques
-- des statuts OFF/VAC/MAL/FORM restent disponibles.
delete from public.planning_shifts s
 where s.activity='pgv' and s.code in ('AM','N','REU')
   and not exists (select 1 from public.planning_entries p
                    where p.activity=s.activity and p.shift_code=s.code);

do $$
declare n_anchor integer;
begin
  select count(*) into n_anchor from public.planning_entries
   where activity='pgv' and work_date=date '2026-10-17' and shift_code='SAT';
  if n_anchor <> 1 then
    raise exception 'Rotation non prolongée : attendu 1 agent ancre SAT le 17/10/2026, trouvé %.', n_anchor;
  end if;
  if exists (select 1 from public.planning_entries where activity='pgv'
             and work_date between date '2026-12-14' and date '2027-01-10') then
    raise exception 'Rotation non prolongée : des entrées existent déjà entre le 14/12/2026 et le 10/01/2027.';
  end if;
end $$;

with roster as (
  select a.id, row_number() over(order by a.full_name,a.id)::integer as rn,
         count(*) over()::integer as total
    from public.agents a where a.activity='pgv' and a.active
), anchor as (
  select r.rn, r.total
    from public.planning_entries p join roster r on r.id=p.agent_id
   where p.activity='pgv' and p.work_date=date '2026-10-17' and p.shift_code='SAT'
), days as (
  select g::date as work_date, extract(isodow from g)::integer as dow
    from generate_series(date '2026-12-14',date '2027-01-10',interval '1 day') g
), assignments as (
  select 'pgv'::text as activity, r.id as agent_id, d.work_date,
         case when d.dow between 1 and 5 then 'M'
              when d.dow=6 and r.rn=mod(a.rn-1+((d.work_date-date '2026-10-17')/7),a.total)+1 then 'SAT'
              else 'OFF' end as shift_code
    from days d cross join roster r cross join anchor a
)
insert into public.planning_entries(activity,agent_id,work_date,shift_code,note,updated_at)
select activity,agent_id,work_date,shift_code,
       case when shift_code='SAT' then 'Rotation samedi' else null end,now()
  from assignments;

commit;
