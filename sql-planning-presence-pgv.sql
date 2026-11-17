-- Horaires et limites PGV : shift 14h-23h, samedi 14h-18h, pauses.
-- À exécuter une fois dans Supabase SQL Editor. Réexécutable.
begin;

update public.planning_shifts
   set label = 'Après-midi', start_time = '14:00', end_time = '23:00',
       is_work = true, break_minutes = 60, color = '#C0622D'
 where activity = 'pgv' and code = 'M';

insert into public.planning_shifts
  (activity, code, label, start_time, end_time, is_work, break_minutes, color)
values ('pgv', 'SAT', 'Samedi', '14:00', '18:00', true, 0, '#376A64')
on conflict (activity, code) do update
  set label = excluded.label, start_time = excluded.start_time,
      end_time = excluded.end_time, is_work = excluded.is_work,
      break_minutes = excluded.break_minutes, color = excluded.color;

insert into public.attendance_settings (activity, break_type, max_minutes, max_per_day)
values ('pgv','pause',15,2), ('pgv','lunch',60,1), ('pgv','sortie',5,2),
       ('pgv','rencontre',30,1), ('pgv','reunion',30,1)
on conflict (activity, break_type) do update
  set max_minutes = excluded.max_minutes, max_per_day = excluded.max_per_day;

-- Autoriser Rencontre et Réunion comme types de pause enregistrés.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.attendance_events'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%break_type%'
       and pg_get_constraintdef(oid) not ilike '%break_start%'
  loop
    execute format('alter table public.attendance_events drop constraint %I', c.conname);
  end loop;
  alter table public.attendance_events
    add constraint attendance_events_break_type_check
    check (break_type is null or break_type in
      ('pause','lunch','sortie','coaching','formation','technique','rencontre','reunion'));
end $$;

-- Planning de démonstration demandé : semaine du 5/10/2026 et rotation des samedis.
-- Hind est en repos lundi 5 ; elle travaille samedi 10, Amadou le 17, Zineb le 24.
with a as (
  select id, full_name from public.agents
   where activity = 'pgv' and active
), days as (
  select d::date as d, extract(dow from d)::int as dow
  from generate_series('2026-10-05'::date, '2026-10-31'::date, interval '1 day') d
), saturday as (
  select date '2026-10-10' as d, 'Miri Hind'::text as who union all
  select date '2026-10-17', 'Amadou AliBa' union all
  select date '2026-10-24', 'Elagbi Zineb' union all
  select date '2026-10-31', 'Miri Hind'
)
insert into public.planning_entries (activity, work_date, agent_id, shift_code, note)
select 'pgv', d.d, a.id,
       case when d.dow = 0 then 'OFF'
            when d.d = date '2026-10-05' and a.full_name ilike '%Miri Hind%' then 'OFF'
            when d.dow = 6 and a.full_name = s.who then 'SAT'
            when d.dow = 6 then 'OFF'
            else 'M' end,
       case when d.d = date '2026-10-05' and a.full_name ilike '%Miri Hind%' then 'Repos planifié'
            when d.dow = 6 and a.full_name = s.who then 'Rotation samedi'
            else null end
from days d cross join a left join saturday s on s.d = d.d
on conflict (activity, agent_id, work_date) do update
  set shift_code = excluded.shift_code, note = excluded.note, updated_at = now();

commit;
