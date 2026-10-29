begin;
create temporary table stc_ceo_test (id uuid primary key, role text not null);
insert into stc_ceo_test values ('00000000-0000-0000-0000-000000000001','ceo');
-- STC App: hasta dos perfiles CEO, sin asignar ni modificar roles existentes.
-- Slot + UNIQUE mantienen el límite incluso ante escrituras concurrentes.
lock table pg_temp.stc_ceo_test in share row exclusive mode;
alter table pg_temp.stc_ceo_test add column if not exists ceo_plaza smallint;
do $$ begin
  if (select count(*) from pg_temp.stc_ceo_test where role = 'ceo') > 2 then
    raise exception 'Ya existen más de dos CEO; no se modifica la configuración.';
  end if;
end $$;
with plazas as (
  select id, row_number() over (order by id)::smallint as plaza
  from pg_temp.stc_ceo_test where role = 'ceo'
)
update pg_temp.stc_ceo_test p set ceo_plaza = plazas.plaza from plazas where p.id = plazas.id;
create unique index if not exists profiles_ceo_plaza_unique
  on pg_temp.stc_ceo_test (ceo_plaza) where role = 'ceo';
alter table pg_temp.stc_ceo_test add constraint profiles_ceo_plaza_valida
  check ((role = 'ceo' and ceo_plaza is not null and ceo_plaza between 1 and 2)
    or (role <> 'ceo' and ceo_plaza is null));
create or replace function pg_temp.stc_asignar_plaza_ceo_test()
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
        select 1 from pg_temp.stc_ceo_test p where p.role = 'ceo' and p.ceo_plaza = plaza
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
  before insert or update on pg_temp.stc_ceo_test
  for each row execute function pg_temp.stc_asignar_plaza_ceo_test();
-- Sustituye exclusivamente el índice de CEO único; no elimina datos.


insert into stc_ceo_test values ('00000000-0000-0000-0000-000000000002','ceo',null);
do $$ begin
  begin
    insert into stc_ceo_test values ('00000000-0000-0000-0000-000000000003','ceo',null);
    raise exception 'FALLO: se permitió un tercer CEO';
  exception when raise_exception then
    if SQLERRM <> 'STC App permite un máximo de dos perfiles CEO.' then raise; end if;
  end;
  if (select count(*) from stc_ceo_test where role='ceo') <> 2 then raise exception 'FALLO: conteo CEO'; end if;
end $$;
update stc_ceo_test set ceo_plaza=2 where id='00000000-0000-0000-0000-000000000001';
update stc_ceo_test set role='profesor' where id='00000000-0000-0000-0000-000000000002';
insert into stc_ceo_test values ('00000000-0000-0000-0000-000000000004','ceo',null);
select count(*) filter(where role='ceo') as ceos, count(distinct ceo_plaza) as plazas_unicas, bool_and(ceo_plaza is null) filter(where role <> 'ceo') as otros_sin_plaza from stc_ceo_test;
rollback;