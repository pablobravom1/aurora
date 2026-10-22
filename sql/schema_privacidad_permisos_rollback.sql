-- RESPALDO REAL (restauración) · STC App · Supabase jmssppcahnxqgdaoredl
-- Generado el 2026-10-22 ~12:10 (Chile) leyendo la base EN VIVO, ANTES de aplicar
-- sql/schema_privacidad_permisos.sql (PR #1 de pablobravom1/aurora).
-- Restaura exactamente: políticas de storage.objects de medicion-fotos / sesion-fotos /
-- entrevistas, funciones puede_gestionar_alumno, puede_ver_alumno, buscar_companeros,
-- obtener_perfil_companero (con sus permisos EXECUTE), el DEFAULT de
-- profiles.compartir_historial (true) y su valor (antes: las 130 filas en true).
-- Quita lo que agrega la migración: políticas stc_priv_*, rutinas_alumno_no_altera_plan_*,
-- rutina_ej_alumno_no_altera_plan_* y las funciones es_admin_operativo / es_staff_archivos.
-- No contiene secretos ni datos personales. Correr completo (va en una transacción).
--
-- Abajo, como referencia, TODAS las políticas vivas de las tablas relacionadas (comentadas).

BEGIN;

-- 1. Quitar lo nuevo
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
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_ins ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_upd ON public.rutinas;
DROP POLICY IF EXISTS rutinas_alumno_no_altera_plan_del ON public.rutinas;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_ins ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_upd ON public.rutina_ejercicios;
DROP POLICY IF EXISTS rutina_ej_alumno_no_altera_plan_del ON public.rutina_ejercicios;

-- 2. Políticas originales de storage (medicion-fotos, sesion-fotos, entrevistas)

DROP POLICY IF EXISTS "alumno o coach eliminan foto de medicion" ON storage.objects;
DROP POLICY IF EXISTS "audios de entrevistas son publicos para lectura" ON storage.objects;
DROP POLICY IF EXISTS "cualquier usuario logueado sube foto de medicion" ON storage.objects;
DROP POLICY IF EXISTS "cualquier usuario logueado sube su foto" ON storage.objects;
DROP POLICY IF EXISTS "fotos de medicion-fotos son publicas para lectura" ON storage.objects;
DROP POLICY IF EXISTS "fotos de sesion-fotos son publicas para lectura" ON storage.objects;
DROP POLICY IF EXISTS "profesor o admin borran audio de entrevista" ON storage.objects;
DROP POLICY IF EXISTS "profesor o admin suben audio de entrevista" ON storage.objects;
CREATE POLICY "alumno o coach eliminan foto de medicion" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "audios de entrevistas son publicos para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'entrevistas'::text));
CREATE POLICY "cualquier usuario logueado sube foto de medicion" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "cualquier usuario logueado sube su foto" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'sesion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "fotos de medicion-fotos son publicas para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'medicion-fotos'::text));
CREATE POLICY "fotos de sesion-fotos son publicas para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'sesion-fotos'::text));
CREATE POLICY "profesor o admin borran audio de entrevista" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin())));
CREATE POLICY "profesor o admin suben audio de entrevista" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin())));

-- 3. Funciones originales
CREATE OR REPLACE FUNCTION public.puede_gestionar_alumno(target_alumno_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select is_super_admin() or es_jso() or exists (
    select 1 from profiles where id = target_alumno_id and profesor_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.puede_ver_alumno(target_alumno_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select is_super_admin() or is_profesor() or puede_gestionar_alumno(target_alumno_id);
$function$;

CREATE OR REPLACE FUNCTION public.obtener_perfil_companero(target_id uuid)
 RETURNS TABLE(id uuid, nombre text, username text, avatar_key text, foto_perfil_url text, bio text, amigos bigint, compartir_historial boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.nombre, p.username, p.avatar_key, p.foto_perfil_url, p.bio,
    (select count(*) from public.amistades c
      where c.estado = 'aceptada' and (c.solicitante_id = p.id or c.receptor_id = p.id)) as amigos,
    p.compartir_historial
  from public.profiles p
  where p.id = target_id and (p.id = auth.uid() or public.son_companeros(auth.uid(), p.id));
$function$;

DROP FUNCTION IF EXISTS public.buscar_companeros(text);
CREATE FUNCTION public.buscar_companeros(search_text text DEFAULT ''::text)
 RETURNS TABLE(id uuid, nombre text, username text, avatar_key text, estado text, yo_solicite boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
GRANT EXECUTE ON FUNCTION public.buscar_companeros(text) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obtener_perfil_companero(uuid) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.puede_gestionar_alumno(uuid) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.puede_ver_alumno(uuid) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.es_staff_archivos();
DROP FUNCTION IF EXISTS public.es_admin_operativo();

-- 4. compartir_historial como estaba (DEFAULT true; las 130 filas existentes estaban en true)
ALTER TABLE public.profiles ALTER COLUMN compartir_historial SET DEFAULT true;
UPDATE public.profiles SET compartir_historial = true WHERE compartir_historial IS DISTINCT FROM true;
COMMENT ON COLUMN public.profiles.compartir_historial IS NULL;

COMMIT;

-- ===== Referencia: políticas vivas antes del cambio (no se ejecutan) =====
-- CREATE POLICY "alumno o coach eliminan foto de medicion" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
-- CREATE POLICY "audios de entrevistas son publicos para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'entrevistas'::text));
-- CREATE POLICY "chat audios: borrar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'chat-audios'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "chat audios: escuchar" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'chat-audios'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "chat audios: subir" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'chat-audios'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND es_relacion_profesor_alumno(auth.uid(), ((storage.foldername(name))[2])::uuid)));
-- CREATE POLICY "chat videos: borrar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'chat-videos'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "chat videos: subir" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'chat-videos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (EXISTS ( SELECT 1
--    FROM profiles a
--   WHERE ((a.id = auth.uid()) AND (a.role = 'alumno'::text) AND ((a.profesor_id)::text = (storage.foldername(objects.name))[2]))))));
-- CREATE POLICY "chat videos: ver" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'chat-videos'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "cualquier usuario logueado sube foto de medicion" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'medicion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
-- CREATE POLICY "cualquier usuario logueado sube su foto" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'sesion-fotos'::text) AND (auth.role() = 'authenticated'::text)));
-- CREATE POLICY "feedback voz: borrar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'feedback-voz'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "feedback voz: subir" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'feedback-voz'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (EXISTS ( SELECT 1
--    FROM profiles a
--   WHERE (((a.id)::text = (storage.foldername(objects.name))[2]) AND (a.profesor_id = auth.uid()))))));
-- CREATE POLICY "feedback voz: ver" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'feedback-voz'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR ((storage.foldername(name))[2] = (auth.uid())::text))));
-- CREATE POLICY "fotos de medicion-fotos son publicas para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'medicion-fotos'::text));
-- CREATE POLICY "fotos de perfil visibles" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'profile-photos'::text));
-- CREATE POLICY "fotos de sesion-fotos son publicas para lectura" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'sesion-fotos'::text));
-- CREATE POLICY noticias_img_borrar ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'noticias'::text) AND puede_publicar_noticias()));
-- CREATE POLICY noticias_img_subir ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'noticias'::text) AND puede_publicar_noticias()));
-- CREATE POLICY "profesor o admin borran audio de entrevista" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin())));
-- CREATE POLICY "profesor o admin suben audio de entrevista" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'entrevistas'::text) AND (is_profesor() OR is_super_admin())));
-- CREATE POLICY stc_onboarding_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "usuario actualiza su foto de perfil" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
-- CREATE POLICY "usuario borra su foto de perfil" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
-- CREATE POLICY "usuario sube su foto de perfil" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
-- CREATE POLICY "alumno o profesor/admin crean mediciones" ON public.mediciones AS PERMISSIVE FOR INSERT TO public WITH CHECK (((alumno_id = auth.uid()) OR puede_gestionar_alumno(alumno_id)));
-- CREATE POLICY "alumno o profesor/admin eliminan mediciones" ON public.mediciones AS PERMISSIVE FOR DELETE TO public USING (((alumno_id = auth.uid()) OR puede_gestionar_alumno(alumno_id)));
-- CREATE POLICY "alumno ve sus mediciones, profesores ven todas (observador)" ON public.mediciones AS PERMISSIVE FOR SELECT TO public USING (((alumno_id = auth.uid()) OR puede_ver_alumno(alumno_id)));
-- CREATE POLICY stc_onboarding_delete ON public.mediciones AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.mediciones AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.mediciones AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.mediciones AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "alumno coach o companero ve rutinas" ON public.rutinas AS PERMISSIVE FOR SELECT TO public USING (((alumno_id = auth.uid()) OR puede_ver_alumno(alumno_id) OR ((origen = 'alumno'::text) AND (creada_por = alumno_id) AND puede_ver_historial_companero(alumno_id))));
-- CREATE POLICY "profesor/admin crean rutinas de sus alumnos" ON public.rutinas AS PERMISSIVE FOR INSERT TO public WITH CHECK (puede_gestionar_alumno(alumno_id));
-- CREATE POLICY "profesor/admin editan rutinas de sus alumnos" ON public.rutinas AS PERMISSIVE FOR UPDATE TO public USING (puede_gestionar_alumno(alumno_id));
-- CREATE POLICY "profesor/admin eliminan rutinas de sus alumnos" ON public.rutinas AS PERMISSIVE FOR DELETE TO public USING (puede_gestionar_alumno(alumno_id));
-- CREATE POLICY stc_onboarding_delete ON public.rutinas AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.rutinas AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.rutinas AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.rutinas AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "profesor/admin editan ejercicios de rutinas de sus alumnos" ON public.rutina_ejercicios AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
--    FROM rutinas r
--   WHERE ((r.id = rutina_ejercicios.rutina_id) AND puede_gestionar_alumno(r.alumno_id))))) WITH CHECK ((EXISTS ( SELECT 1
--    FROM rutinas r
--   WHERE ((r.id = rutina_ejercicios.rutina_id) AND puede_gestionar_alumno(r.alumno_id)))));
-- CREATE POLICY stc_onboarding_delete ON public.rutina_ejercicios AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.rutina_ejercicios AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.rutina_ejercicios AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.rutina_ejercicios AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "ver ejercicios de rutinas visibles" ON public.rutina_ejercicios AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
--    FROM rutinas r
--   WHERE ((r.id = rutina_ejercicios.rutina_id) AND ((r.alumno_id = auth.uid()) OR puede_ver_alumno(r.alumno_id) OR ((r.origen = 'alumno'::text) AND (r.creada_por = r.alumno_id) AND puede_ver_historial_companero(r.alumno_id)))))));
-- CREATE POLICY "alumno agrega series a su propia sesion" ON public.sesion_series AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
--    FROM sesiones s
--   WHERE ((s.id = sesion_series.sesion_id) AND (s.alumno_id = auth.uid())))));
-- CREATE POLICY "alumno o profesor/admin editan series" ON public.sesion_series AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
--    FROM sesiones s
--   WHERE ((s.id = sesion_series.sesion_id) AND ((s.alumno_id = auth.uid()) OR puede_gestionar_alumno(s.alumno_id)))))) WITH CHECK ((EXISTS ( SELECT 1
--    FROM sesiones s
--   WHERE ((s.id = sesion_series.sesion_id) AND ((s.alumno_id = auth.uid()) OR puede_gestionar_alumno(s.alumno_id))))));
-- CREATE POLICY "alumno o profesor/admin eliminan series" ON public.sesion_series AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
--    FROM sesiones s
--   WHERE ((s.id = sesion_series.sesion_id) AND ((s.alumno_id = auth.uid()) OR puede_gestionar_alumno(s.alumno_id))))));
-- CREATE POLICY stc_onboarding_delete ON public.sesion_series AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.sesion_series AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.sesion_series AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.sesion_series AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "ver series de sesiones visibles" ON public.sesion_series AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
--    FROM sesiones s
--   WHERE ((s.id = sesion_series.sesion_id) AND ((s.alumno_id = auth.uid()) OR puede_ver_alumno(s.alumno_id) OR puede_ver_historial_companero(s.alumno_id))))));
-- CREATE POLICY "alumno coach o companero ve sesiones" ON public.sesiones AS PERMISSIVE FOR SELECT TO public USING (((alumno_id = auth.uid()) OR puede_ver_alumno(alumno_id) OR puede_ver_historial_companero(alumno_id)));
-- CREATE POLICY "alumno crea sus propias sesiones" ON public.sesiones AS PERMISSIVE FOR INSERT TO public WITH CHECK ((alumno_id = auth.uid()));
-- CREATE POLICY "alumno o coach eliminan sesion" ON public.sesiones AS PERMISSIVE FOR DELETE TO public USING (((alumno_id = auth.uid()) OR is_coach()));
-- CREATE POLICY "alumno o profesor/admin actualizan sesion" ON public.sesiones AS PERMISSIVE FOR UPDATE TO public USING (((alumno_id = auth.uid()) OR puede_gestionar_alumno(alumno_id)));
-- CREATE POLICY stc_onboarding_delete ON public.sesiones AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.sesiones AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.sesiones AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.sesiones AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "participantes ven sus conexiones" ON public.amistades AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = solicitante_id) OR (auth.uid() = receptor_id)));
-- CREATE POLICY stc_onboarding_delete ON public.amistades AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.amistades AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.amistades AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_update ON public.amistades AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_delete ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_insert ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY stc_onboarding_select ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING (((id = auth.uid()) OR (NOT stc_onboarding_pending())));
-- CREATE POLICY stc_onboarding_update ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT stc_onboarding_pending())) WITH CHECK ((NOT stc_onboarding_pending()));
-- CREATE POLICY "super admin o profesor actualizan perfiles de sus alumnos" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING (((id = auth.uid()) OR puede_gestionar_alumno(id)));
-- CREATE POLICY "super admin puede crear perfiles" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_super_admin() OR (id = auth.uid())));
-- CREATE POLICY "ver propio perfil, super admin y profesores ven alumnos (observ" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((id = auth.uid()) OR puede_ver_alumno(id)));
