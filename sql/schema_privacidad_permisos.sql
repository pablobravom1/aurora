-- STC App — privacidad de compañeros y permisos de archivos.
-- Idempotente. Corre completo dentro de una transacción.
-- NO se ejecutó contra la base en vivo al preparar este cambio.
--
-- Antes de aplicarlo en el proyecto jmssppcahnxqgdaoredl, comparar las
-- definiciones vivas (ver el encabezado de schema_privacidad_permisos_rollback.sql).
-- Este archivo parte de las políticas y funciones del clon UltraCarga
-- (proyecto cjaouwlsoeluajycgafy, leídas el 2026-10-22). En este repo no hay
-- SQL previo: sql/15_perfil_jso.sql y el resto se aplicaron a mano y no están
-- versionados. Si el vivo ya amplió puede_ver_alumno / puede_gestionar_alumno,
-- fusionar esas cláusulas aquí antes de correr, para no quitar un rol que
-- la app ya usa.
--
-- No crea usuarios, no inserta datos de prueba y no toca otros buckets
-- (profile-photos, chat-audios, chat-videos, feedback-voz, noticias).
-- Los buckets medicion-fotos, entrevistas y sesion-fotos siguen public = true:
-- la URL pública sigue abriendo el archivo. Lo que se cierra es escribir y listar.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Comprobaciones mínimas. Si algo de esto falta, no se cambia nada.
-- ---------------------------------------------------------------------------
DO $pre$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'compartir_historial'
  ) THEN
    RAISE EXCEPTION 'Falta profiles.compartir_historial. No se aplicó nada.';
  END IF;

  IF to_regprocedure('public.puede_ver_alumno(uuid)') IS NULL
     OR to_regprocedure('public.puede_gestionar_alumno(uuid)') IS NULL
     OR to_regprocedure('public.is_profesor()') IS NULL
     OR to_regprocedure('public.is_super_admin()') IS NULL
     OR to_regprocedure('public.puede_ver_historial_companero(uuid)') IS NULL
     OR to_regprocedure('public.son_companeros(uuid,uuid)') IS NULL
  THEN
    RAISE EXCEPTION 'Faltan helpers RLS esperados. No se aplicó nada.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id IN ('medicion-fotos', 'entrevistas', 'sesion-fotos')
      AND public IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'medicion-fotos, entrevistas o sesion-fotos no está público. No se cambia el bucket: la lectura por URL pública tiene que seguir igual.';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------------------
-- 1. Compartir historial: opt-in. Hoy el default es true.
--    Se apaga también en las filas que ya existen. En STC, amistades está
--    vacía, así que nadie está viendo el historial de un compañero por esto.
--    El alumno lo vuelve a encender desde su perfil.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN compartir_historial SET DEFAULT false;

UPDATE public.profiles
   SET compartir_historial = false
 WHERE compartir_historial IS DISTINCT FROM false;

COMMENT ON COLUMN public.profiles.compartir_historial IS
  'Opt-in. Solo si es true, un compañero aceptado puede ver entrenamientos y rutinas personales. Default false.';

-- ---------------------------------------------------------------------------
-- 2. Helpers. No se reescribe is_super_admin: el trigger prevent_role_escalation
--    sigue dejando el cambio de rol y de profesor solo al super_admin.
--    es_admin_operativo suma RS y JSO, que la app ya trata como gestores
--    (esGestor en roles.js y el parche de ceo.js).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin_operativo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'responsable_sede', 'jso')
  );
$fn$;

COMMENT ON FUNCTION public.es_admin_operativo() IS
  'super_admin, responsable de sede y JSO. No autoriza a cambiar roles: eso sigue en is_super_admin y prevent_role_escalation.';

CREATE OR REPLACE FUNCTION public.es_staff_archivos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT public.is_profesor()
      OR public.is_super_admin()
      OR public.es_admin_operativo()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'coach'
      );
$fn$;

COMMENT ON FUNCTION public.es_staff_archivos() IS
  'Quien puede subir, reemplazar o borrar archivos de un alumno: profesor, coach (rol legado), super_admin, RS y JSO.';

REVOKE ALL ON FUNCTION public.es_admin_operativo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_staff_archivos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_admin_operativo() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.es_staff_archivos() TO anon, authenticated, service_role;

-- Misma regla de siempre, más RS, JSO y el rol legado coach (la pantalla de
-- profesor ya lo trata como profe). El profe asignado sigue pudiendo gestionar
-- a su alumno aunque no entre en es_admin_operativo.
CREATE OR REPLACE FUNCTION public.puede_gestionar_alumno(target_alumno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT public.is_super_admin()
      OR public.es_admin_operativo()
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = target_alumno_id
          AND profesor_id = auth.uid()
      );
$fn$;

CREATE OR REPLACE FUNCTION public.puede_ver_alumno(target_alumno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT public.is_super_admin()
      OR public.is_profesor()
      OR public.es_admin_operativo()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'coach'
      )
      OR public.puede_gestionar_alumno(target_alumno_id);
$fn$;

-- ---------------------------------------------------------------------------
-- 3. Rutinas. El alumno ve el plan del profe y registra sesiones contra él,
--    pero no puede insertar, modificar ni borrar ese plan ni sus ejercicios.
--    Solo escribe rutinas con origen alumno creadas por él.
--    Las políticas RESTRICTIVE se suman (AND) a las que ya permiten al profe
--    y al admin. No cambian el SELECT: el alumno sigue viendo su plan.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_ins ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_upd ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_del ON public.rutinas;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_ins ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_upd ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_del ON public.rutina_ejercicios;

CREATE POLICY rutinas_alumno_no_altera_plan_ins
  ON public.rutinas
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.puede_gestionar_alumno(alumno_id)
    OR (
      alumno_id = auth.uid()
      AND origen = 'alumno'
      AND creada_por = auth.uid()
    )
  );

CREATE POLICY rutinas_alumno_no_altera_plan_upd
  ON public.rutinas
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.puede_gestionar_alumno(alumno_id)
    OR (
      alumno_id = auth.uid()
      AND origen = 'alumno'
      AND creada_por = auth.uid()
    )
  )
  WITH CHECK (
    public.puede_gestionar_alumno(alumno_id)
    OR (
      alumno_id = auth.uid()
      AND origen = 'alumno'
      AND creada_por = auth.uid()
    )
  );

CREATE POLICY rutinas_alumno_no_altera_plan_del
  ON public.rutinas
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    public.puede_gestionar_alumno(alumno_id)
    OR (
      alumno_id = auth.uid()
      AND origen = 'alumno'
      AND creada_por = auth.uid()
    )
  );

CREATE POLICY rutina_ej_alumno_no_altera_plan_ins
  ON public.rutina_ejercicios
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rutinas r
      WHERE r.id = rutina_ejercicios.rutina_id
        AND (
          public.puede_gestionar_alumno(r.alumno_id)
          OR (
            r.alumno_id = auth.uid()
            AND r.origen = 'alumno'
            AND r.creada_por = auth.uid()
          )
        )
    )
  );

CREATE POLICY rutina_ej_alumno_no_altera_plan_upd
  ON public.rutina_ejercicios
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rutinas r
      WHERE r.id = rutina_ejercicios.rutina_id
        AND (
          public.puede_gestionar_alumno(r.alumno_id)
          OR (
            r.alumno_id = auth.uid()
            AND r.origen = 'alumno'
            AND r.creada_por = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rutinas r
      WHERE r.id = rutina_ejercicios.rutina_id
        AND (
          public.puede_gestionar_alumno(r.alumno_id)
          OR (
            r.alumno_id = auth.uid()
            AND r.origen = 'alumno'
            AND r.creada_por = auth.uid()
          )
        )
    )
  );

CREATE POLICY rutina_ej_alumno_no_altera_plan_del
  ON public.rutina_ejercicios
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rutinas r
      WHERE r.id = rutina_ejercicios.rutina_id
        AND (
          public.puede_gestionar_alumno(r.alumno_id)
          OR (
            r.alumno_id = auth.uid()
            AND r.origen = 'alumno'
            AND r.creada_por = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Búsqueda y ficha de compañero.
--    Quien no es amigo solo recibe la tarjeta pública: nombre, usuario y foto
--    (más avatar_key, que es el dibujo si no hay foto, y el estado de la
--    solicitud, que la pantalla de búsqueda necesita).
--    El amigo además ve la frase (bio), el conteo de compañeros y si esa
--    persona encendió compartir_historial. Nada de entrevista, mediciones,
--    correo ni rutina del profe.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.buscar_companeros(text);

CREATE FUNCTION public.buscar_companeros(search_text text DEFAULT ''::text)
RETURNS TABLE(
  id uuid,
  nombre text,
  username text,
  avatar_key text,
  foto_perfil_url text,
  estado text,
  yo_solicite boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT p.id,
         p.nombre,
         p.username,
         p.avatar_key,
         p.foto_perfil_url,
         a.estado,
         (a.solicitante_id = auth.uid()) AS yo_solicite
  FROM public.profiles p
  LEFT JOIN public.amistades a
    ON least(a.solicitante_id, a.receptor_id) = least(auth.uid(), p.id)
   AND greatest(a.solicitante_id, a.receptor_id) = greatest(auth.uid(), p.id)
  WHERE p.role = 'alumno'
    AND p.id <> auth.uid()
    AND a.estado IS DISTINCT FROM 'bloqueada'
    AND (
      coalesce(btrim(search_text), '') = ''
      OR p.nombre ILIKE '%' || btrim(search_text) || '%'
      OR p.username ILIKE '%' || replace(btrim(search_text), '@', '') || '%'
    )
  ORDER BY p.nombre
  LIMIT 30;
$fn$;

REVOKE ALL ON FUNCTION public.buscar_companeros(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_companeros(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.obtener_perfil_companero(target_id uuid)
RETURNS TABLE(
  id uuid,
  nombre text,
  username text,
  avatar_key text,
  foto_perfil_url text,
  bio text,
  amigos bigint,
  compartir_historial boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT p.id,
         p.nombre,
         p.username,
         p.avatar_key,
         p.foto_perfil_url,
         CASE
           WHEN p.id = auth.uid() OR public.son_companeros(auth.uid(), p.id) THEN p.bio
           ELSE NULL
         END AS bio,
         CASE
           WHEN p.id = auth.uid() OR public.son_companeros(auth.uid(), p.id) THEN (
             SELECT count(*)
             FROM public.amistades c
             WHERE c.estado = 'aceptada'
               AND (c.solicitante_id = p.id OR c.receptor_id = p.id)
           )
           ELSE NULL
         END AS amigos,
         CASE
           WHEN p.id = auth.uid() OR public.son_companeros(auth.uid(), p.id) THEN p.compartir_historial
           ELSE false
         END AS compartir_historial
  FROM public.profiles p
  WHERE p.id = target_id
    AND p.role = 'alumno'
    AND NOT EXISTS (
      SELECT 1
      FROM public.amistades bloqueo
      WHERE bloqueo.estado = 'bloqueada'
        AND (
          (bloqueo.solicitante_id = auth.uid() AND bloqueo.receptor_id = p.id)
          OR (bloqueo.receptor_id = auth.uid() AND bloqueo.solicitante_id = p.id)
        )
    );
$fn$;

-- ---------------------------------------------------------------------------
-- 5. Storage. Rutas que usa la app (no se renombra ningún archivo):
--    medicion-fotos:  {alumnoId}/{timestamp}.{ext}     alumno, profe y admin
--    entrevistas:     {alumnoId}/{timestamp}.{ext}     solo profe y admin
--                     (el alumno solo escucha la URL pública, no sube)
--    sesion-fotos:    {alumnoId}/{sesionId}.{ext}      alumno, profe y admin
--    upsert:true necesita INSERT + SELECT + UPDATE sobre esa misma ruta.
--    La app no llama a storage.list() en estos buckets, así que el SELECT
--    ancho (cualquiera lista todos los nombres) se reemplaza por uno acotado.
--    La URL pública no usa esa política.
-- ---------------------------------------------------------------------------
DO $drop_storage$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname NOT LIKE 'stc_priv_%'
      AND (
        coalesce(qual, '') || ' ' || coalesce(with_check, '') ILIKE '%medicion-fotos%'
        OR coalesce(qual, '') || ' ' || coalesce(with_check, '') ILIKE '%sesion-fotos%'
        OR coalesce(qual, '') || ' ' || coalesce(with_check, '') ILIKE '%entrevistas%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END
$drop_storage$;

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

-- Dueño = primera carpeta del path, que es el id del alumno.
-- Staff (profe, coach, super_admin, RS, JSO) puede cualquier carpeta de ese bucket.
CREATE POLICY stc_priv_medicion_sel ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medicion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_medicion_ins ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medicion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_medicion_upd ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medicion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    bucket_id = 'medicion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_medicion_del ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medicion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_sesion_sel ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sesion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_sesion_ins ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sesion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_sesion_upd ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'sesion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    bucket_id = 'sesion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

CREATE POLICY stc_priv_sesion_del ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sesion-fotos'
    AND (
      public.es_staff_archivos()
      OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
  );

-- Entrevistas: el alumno no sube (la pantalla le llega en solo lectura).
-- Profes y admins sí, en cualquier carpeta, que es {alumnoId}/archivo.
CREATE POLICY stc_priv_entrevista_sel ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'entrevistas'
    AND public.es_staff_archivos()
  );

CREATE POLICY stc_priv_entrevista_ins ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'entrevistas'
    AND public.es_staff_archivos()
  );

CREATE POLICY stc_priv_entrevista_upd ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'entrevistas' AND public.es_staff_archivos())
  WITH CHECK (bucket_id = 'entrevistas' AND public.es_staff_archivos());

CREATE POLICY stc_priv_entrevista_del ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'entrevistas' AND public.es_staff_archivos());

COMMIT;
