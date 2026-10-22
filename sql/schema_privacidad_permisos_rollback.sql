-- Revierte sql/schema_privacidad_permisos.sql.
-- Restaura las políticas y funciones tal como estaban en el clon UltraCarga
-- (proyecto cjaouwlsoeluajycgafy) el 2026-10-22. Este repo no guarda el SQL
-- histórico: esas definiciones se leyeron de pg_policies y pg_get_functiondef.
--
-- ANTES DE CORRER ESTO (y antes de correr la migración) en STC
-- (jmssppcahnxqgdaoredl), confirmar que el vivo coincide. Si sql/15_perfil_jso.sql
-- u otro cambio manual dejó otra versión, este rollback la pisaría.
-- Guardar el resultado de estas consultas y, si difiere, editar este archivo
-- para que restaure ESO y no el clon:
--
--   select proname, pg_get_functiondef(oid)
--   from pg_proc
--   where pronamespace = 'public'::regnamespace
--     and proname in (
--       'puede_ver_alumno','puede_gestionar_alumno','buscar_companeros',
--       'obtener_perfil_companero','is_super_admin','is_profesor',
--       'puede_ver_historial_companero'
--     );
--
--   select policyname, cmd, roles::text, qual, with_check
--   from pg_policies
--   where (schemaname = 'storage' and tablename = 'objects'
--          and (coalesce(qual,'') || coalesce(with_check,'') ~ 'medicion-fotos|sesion-fotos|entrevistas'))
--      or (schemaname = 'public' and tablename in ('rutinas','rutina_ejercicios')
--          and policyname like '%no_altera_plan%');
--
--   select column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name = 'compartir_historial';
--
-- Efecto sobre datos: vuelve el default de compartir_historial a true y pone
-- true en todas las filas. Eso coincide con el default anterior (la columna
-- nacía en true). No recupera un false que alguien hubiera guardado a mano
-- antes de la migración, porque la migración misma dejó todas las filas en false.
-- No borra usuarios, rutinas, sesiones ni archivos.

BEGIN;

-- Quitar lo que agregó la migración.
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_ins ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_upd ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_del ON public.rutinas;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_ins ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_upd ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_del ON public.rutina_ejercicios;

DROP POLICY IF EXISTS stc_priv_medicion_sel ON storage.objects;
DROP POLICY IF EXISTS stc_priv_medicion_ins ON storage.objects;
DROP POLICY IF EXISTS stc_priv_medicion_upd ON storage.objects;
DROP POLICY IF EXISTS stc_priv_medicion_del ON storage.objects;
DROP POLICY IF EXISTS stc_priv_sesion_sel ON storage.objects;
DROP POLICY IF EXISTS stc_priv_sesion_ins ON storage.objects;
DROP POLICY IF EXISTS stc_priv_sesion_upd ON storage.objects;
DROP POLICY IF EXISTS stc_priv_sesion_del ON storage.objects;
DROP POLICY IF EXISTS stc_priv_entrevista_sel ON storage.objects;
DROP POLICY IF EXISTS stc_priv_entrevista_ins ON storage.objects;
DROP POLICY IF EXISTS stc_priv_entrevista_upd ON storage.objects;
DROP POLICY IF EXISTS stc_priv_entrevista_del ON storage.objects;

DROP FUNCTION IF EXISTS public.es_staff_archivos();
DROP FUNCTION IF EXISTS public.es_admin_operativo();

-- Helpers como estaban en el clon (sin RS ni JSO dentro de estas funciones).
CREATE OR REPLACE FUNCTION public.puede_gestionar_alumno(target_alumno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select
    is_super_admin()
    or exists (
      select 1 from profiles
      where id = target_alumno_id and profesor_id = auth.uid()
    );
$function$;

CREATE OR REPLACE FUNCTION public.puede_ver_alumno(target_alumno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select is_super_admin() or is_profesor() or puede_gestionar_alumno(target_alumno_id);
$function$;

DROP FUNCTION IF EXISTS public.buscar_companeros(text);

CREATE FUNCTION public.buscar_companeros(search_text text DEFAULT ''::text)
RETURNS TABLE(id uuid, nombre text, username text, avatar_key text, estado text, yo_solicite boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select p.id, p.nombre, p.username, p.avatar_key,
    a.estado,
    (a.solicitante_id = auth.uid()) as yo_solicite
  from public.profiles p
  left join public.amistades a
    on least(a.solicitante_id, a.receptor_id) = least(auth.uid(), p.id)
   and greatest(a.solicitante_id, a.receptor_id) = greatest(auth.uid(), p.id)
  where p.role = 'alumno' and p.id <> auth.uid()
    and a.estado is distinct from 'bloqueada'
    and (
      coalesce(btrim(search_text), '') = ''
      or p.nombre ilike '%' || btrim(search_text) || '%'
      or p.username ilike '%' || replace(btrim(search_text), '@', '') || '%'
    )
  order by p.nombre
  limit 30;
$function$;

REVOKE ALL ON FUNCTION public.buscar_companeros(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_companeros(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.obtener_perfil_companero(target_id uuid)
RETURNS TABLE(id uuid, nombre text, username text, avatar_key text, foto_perfil_url text, bio text, amigos bigint, compartir_historial boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select p.id, p.nombre, p.username, p.avatar_key, p.foto_perfil_url, p.bio,
    (select count(*) from public.amistades c
      where c.estado = 'aceptada' and (c.solicitante_id = p.id or c.receptor_id = p.id)) as amigos,
    p.compartir_historial
  from public.profiles p
  where p.id = target_id and (p.id = auth.uid() or public.son_companeros(auth.uid(), p.id));
$function$;

-- Default anterior: true. Las filas vuelven a true (ver advertencia del encabezado).
ALTER TABLE public.profiles
  ALTER COLUMN compartir_historial SET DEFAULT true;

UPDATE public.profiles
   SET compartir_historial = true
 WHERE compartir_historial IS DISTINCT FROM true;

COMMENT ON COLUMN public.profiles.compartir_historial IS
  'Si es true, un compañero aceptado puede ver el historial. Default histórico: true.';

-- Políticas de storage anteriores, texto exacto del clon.
-- medicion-fotos: cualquier autenticado insertaba y borraba, sin política de UPDATE.
-- sesion-fotos: cualquier autenticado insertaba, sin DELETE ni UPDATE.
-- entrevistas: profesor o super_admin insertaba y borraba, sin UPDATE.
-- SELECT de los tres buckets: cualquiera (incluso anónimo) podía listar nombres.
DROP POLICY IF EXISTS "alumno o coach eliminan foto de medicion" ON storage.objects;
DROP POLICY IF EXISTS "cualquier usuario logueado sube foto de medicion" ON storage.objects;
DROP POLICY IF EXISTS "fotos de medicion-fotos son publicas para lectura" ON storage.objects;
DROP POLICY IF EXISTS "cualquier usuario logueado sube su foto" ON storage.objects;
DROP POLICY IF EXISTS "fotos de sesion-fotos son publicas para lectura" ON storage.objects;
DROP POLICY IF EXISTS "audios de entrevistas son publicos para lectura" ON storage.objects;
DROP POLICY IF EXISTS "profesor o admin borran audio de entrevista" ON storage.objects;
DROP POLICY IF EXISTS "profesor o admin suben audio de entrevista" ON storage.objects;

CREATE POLICY "cualquier usuario logueado sube foto de medicion"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK ((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text));

CREATE POLICY "alumno o coach eliminan foto de medicion"
  ON storage.objects
  FOR DELETE
  TO public
  USING ((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text));

CREATE POLICY "fotos de medicion-fotos son publicas para lectura"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'medicion-fotos'::text);

CREATE POLICY "cualquier usuario logueado sube su foto"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK ((bucket_id = 'sesion-fotos'::text) AND (auth.role() = 'authenticated'::text));

CREATE POLICY "fotos de sesion-fotos son publicas para lectura"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'sesion-fotos'::text);

CREATE POLICY "audios de entrevistas son publicos para lectura"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'entrevistas'::text);

CREATE POLICY "profesor o admin suben audio de entrevista"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK ((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin()));

CREATE POLICY "profesor o admin borran audio de entrevista"
  ON storage.objects
  FOR DELETE
  TO public
  USING ((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin()));

COMMIT;
