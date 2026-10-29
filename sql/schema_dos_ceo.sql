-- STC App: hasta dos perfiles CEO, sin asignar ni modificar roles existentes.
-- Slot + UNIQUE mantienen el límite incluso ante escrituras concurrentes.
begin;
lock table public.profiles in share row exclusive mode;
alter table public.profiles add column if not exists ceo_plaza smallint;
do $$ begin
  if (select count(*) from public.profiles where role = 'ceo') > 2 then
    raise exception 'Ya existen más de dos CEO; no se modifica la configuración.';
  end if;
end $$;
with plazas as (
  select id, row_number() over (order by id)::smallint as plaza
  from public.profiles where role = 'ceo'
)
update public.profiles p set ceo_plaza = plazas.plaza from plazas where p.id = plazas.id;
create unique index if not exists profiles_ceo_plaza_unique
  on public.profiles (ceo_plaza) where role = 'ceo';
alter table public.profiles add constraint profiles_ceo_plaza_valida
  check ((role = 'ceo' and ceo_plaza is not null and ceo_plaza between 1 and 2)
    or (role <> 'ceo' and ceo_plaza is null));
create or replace function public.stc_asignar_plaza_ceo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'ceo' then
    perform pg_advisory_xact_lock(20261029, 2);
    if TG_OP = 'UPDATE' and old.role = 'ceo' then
      new.ceo_plaza := old.ceo_plaza;
    else
      select plaza into new.ceo_plaza
      from generate_series(1,2) as plaza
      where not exists (
        select 1 from public.profiles p where p.role = 'ceo' and p.ceo_plaza = plaza
      ) order by plaza limit 1;
      if new.ceo_plaza is null then
        raise exception 'STC App permite un máximo de dos perfiles CEO.';
      end if;
    end if;
  else
    new.ceo_plaza := null;
  end if;
  return new;
end $$;
create trigger stc_asignar_plaza_ceo_trigger
  before insert or update on public.profiles
  for each row execute function public.stc_asignar_plaza_ceo();
-- Sustituye exclusivamente el índice de CEO único; no elimina datos.
drop index if exists public.profiles_un_solo_ceo;
commit;
