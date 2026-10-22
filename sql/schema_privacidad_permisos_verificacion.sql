-- Verificación de sql/schema_privacidad_permisos.sql.
-- Corre entero en una transacción y termina en ROLLBACK: no deja filas,
-- no crea usuarios y no toca auth.users. Usa personas que ya existen.
-- Si falta un rol (admin, profe o dos alumnos), esa parte se omite y se avisa.
--
-- Ejecutar en el SQL Editor DESPUÉS de aplicar la migración, como postgres
-- (el editor lo es). Si algo no cumple, el bloque lanza una excepción y
-- la transacción queda abortada; igual hay que confirmar que no hubo COMMIT.
--
-- Los INSERT de prueba (rutina, sesión, medición, amistad, storage.objects)
-- viven solo dentro de esta transacción.

BEGIN;

DO $ver$
DECLARE
  admin_id uuid;
  profe_id uuid;
  alumno_a uuid;
  alumno_b uuid;
  rutina_profe uuid;
  rutina_propia uuid;
  sesion_b uuid;
  sesion_a uuid;
  medicion_b uuid;
  n int;
  bio_leida text;
  compartir_leido boolean;
  amigos_leidos bigint;
  foto_leida text;
  nombre_leido text;
  args text[];
  fallos int := 0;
  notas text := '';
  marker text := 'zz-verif-privacidad';
BEGIN
  IF to_regprocedure('public.es_admin_operativo()') IS NULL
     OR to_regprocedure('public.es_staff_archivos()') IS NULL
  THEN
    RAISE EXCEPTION 'Falta aplicar sql/schema_privacidad_permisos.sql (no está es_admin_operativo).';
  END IF;

  SELECT id INTO admin_id
  FROM public.profiles
  WHERE role IN ('super_admin', 'responsable_sede', 'jso')
  ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'responsable_sede' THEN 1 ELSE 2 END, id
  LIMIT 1;

  SELECT id INTO profe_id
  FROM public.profiles
  WHERE role = 'profesor'
  ORDER BY id
  LIMIT 1;

  SELECT id INTO alumno_a
  FROM public.profiles
  WHERE role = 'alumno'
  ORDER BY id
  LIMIT 1;

  SELECT id INTO alumno_b
  FROM public.profiles
  WHERE role = 'alumno' AND id IS DISTINCT FROM alumno_a
  ORDER BY id
  LIMIT 1;

  IF admin_id IS NULL THEN notas := notas || ' Sin admin (super_admin/RS/JSO): se omite ese rol.'; END IF;
  IF profe_id IS NULL THEN notas := notas || ' Sin profesor: se omite ese rol.'; END IF;
  IF alumno_a IS NULL THEN notas := notas || ' Sin alumnos: se omite la parte de alumnos.'; END IF;
  IF alumno_a IS NOT NULL AND alumno_b IS NULL THEN notas := notas || ' Hay un solo alumno: se omite la parte de compañeros.'; END IF;

  -- Firma de la búsqueda: tarjeta pública, sin bio ni datos de ficha.
  SELECT p.proargnames INTO args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'buscar_companeros';
  IF args IS NULL OR NOT ('foto_perfil_url' = ANY (args)) OR NOT ('nombre' = ANY (args)) OR NOT ('username' = ANY (args)) OR ('bio' = ANY (args)) THEN
    fallos := fallos + 1;
    notas := notas || ' | buscar_companeros no quedó limitado a la tarjeta pública.';
  END IF;

  -- Datos de prueba. Se deshacen al final con ROLLBACK.
  -- La frase marcador sirve para comprobar que la tarjeta pública no la copia.
  IF alumno_b IS NOT NULL THEN
    UPDATE public.profiles
       SET compartir_historial = false,
           bio = marker || '-bio'
     WHERE id = alumno_b;
  END IF;

  IF alumno_b IS NOT NULL AND profe_id IS NOT NULL THEN
    INSERT INTO public.rutinas (alumno_id, nombre, origen, creada_por, activa)
    VALUES (alumno_b, marker || '-profesor', 'profesor', profe_id, false)
    RETURNING id INTO rutina_profe;

    INSERT INTO public.rutina_ejercicios (rutina_id, nombre)
    VALUES (rutina_profe, marker || '-ej-profesor');

    INSERT INTO public.rutinas (alumno_id, nombre, origen, creada_por, activa)
    VALUES (alumno_b, marker || '-propia', 'alumno', alumno_b, false)
    RETURNING id INTO rutina_propia;

    INSERT INTO public.sesiones (alumno_id, rutina_id, foto_url)
    VALUES (alumno_b, rutina_profe, marker || '-sesion')
    RETURNING id INTO sesion_b;

    INSERT INTO public.mediciones (alumno_id, foto_url)
    VALUES (alumno_b, marker || '-medicion')
    RETURNING id INTO medicion_b;
  END IF;

  -- ---------- impersonación ----------
  -- SET LOCAL ROLE authenticated + jwt. RESET ROLE vuelve al usuario de la sesión.
  IF alumno_a IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_a, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    -- Ve su propio perfil.
    SELECT count(*) INTO n FROM public.profiles WHERE id = alumno_a;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | A no ve su perfil.'; END IF;

    IF alumno_b IS NOT NULL THEN
      SELECT count(*) INTO n FROM public.profiles WHERE id = alumno_b;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A lee el perfil completo de B por la tabla.'; END IF;

      SELECT count(*) INTO n FROM public.sesiones WHERE alumno_id = alumno_b;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A ve sesiones de B sin ser amigo.'; END IF;

      SELECT count(*) INTO n FROM public.mediciones WHERE alumno_id = alumno_b;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A ve mediciones de B.'; END IF;

      SELECT count(*) INTO n FROM public.rutinas WHERE alumno_id = alumno_b;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A ve rutinas de B sin permiso.'; END IF;

      -- Tarjeta pública, sin la frase ni el interruptor de historial.
      SELECT f.bio, f.compartir_historial, f.amigos, f.foto_perfil_url, f.nombre
        INTO bio_leida, compartir_leido, amigos_leidos, foto_leida, nombre_leido
      FROM public.obtener_perfil_companero(alumno_b) f;
      IF nombre_leido IS NULL THEN
        fallos := fallos + 1; notas := notas || ' | obtener_perfil_companero no devuelve la tarjeta pública.';
      ELSIF bio_leida IS NOT NULL OR compartir_leido IS TRUE OR amigos_leidos IS NOT NULL THEN
        fallos := fallos + 1; notas := notas || ' | la tarjeta pública dejó ver la frase, el historial o el conteo de amigos.';
      END IF;

      IF rutina_profe IS NOT NULL THEN
        UPDATE public.rutinas SET nombre = marker || '-hack' WHERE id = rutina_profe;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A modificó la rutina del profe de B.'; END IF;
        UPDATE public.rutina_ejercicios SET nombre = marker || '-hack' WHERE rutina_id = rutina_profe;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A modificó los ejercicios del plan del profe.'; END IF;
      END IF;

      IF rutina_propia IS NOT NULL THEN
        UPDATE public.rutinas SET nombre = marker || '-hack' WHERE id = rutina_propia;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A modificó la rutina personal de B.'; END IF;
      END IF;

      UPDATE public.profiles SET nombre = marker WHERE id = alumno_b;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A modificó el perfil de B.'; END IF;
    END IF;

    BEGIN
      INSERT INTO public.rutinas (alumno_id, nombre, origen, creada_por, activa)
      VALUES (alumno_a, marker || '-plan-ajeno', 'profesor', coalesce(profe_id, alumno_a), false);
      fallos := fallos + 1; notas := notas || ' | A pudo insertar una rutina con origen profesor.';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    -- STC: el alumno NO tiene política para crear rutinas propias (ni antes ni
    -- después de esta migración; en UltraCarga sí). Se informa, no es fallo.
    BEGIN
      INSERT INTO public.rutinas (alumno_id, nombre, origen, creada_por, activa)
      VALUES (alumno_a, marker || '-mia', 'alumno', alumno_a, false);
      notas := notas || ' | (info) A puede crear rutina personal.';
    EXCEPTION WHEN insufficient_privilege THEN
      notas := notas || ' | (info) STC: el alumno no crea rutinas propias, igual que antes.';
    END;

    -- Registra su entrenamiento: sesión propia + serie.

    BEGIN
      INSERT INTO public.sesiones (alumno_id, foto_url) VALUES (alumno_a, marker || '-sesion-a') RETURNING id INTO sesion_a;
      INSERT INTO public.sesion_series (sesion_id, ejercicio_nombre, peso, reps, orden) VALUES (sesion_a, marker || '-serie', 10, 10, 1);
      INSERT INTO public.mediciones (alumno_id, foto_url) VALUES (alumno_a, marker || '-medicion-a');
    EXCEPTION WHEN insufficient_privilege THEN
      fallos := fallos + 1; notas := notas || ' | A no pudo registrar sesión o medición propia.';
    END;

    EXECUTE 'RESET ROLE';
  END IF;

  -- Amistad con compartir apagado, y después encendido.
  IF alumno_a IS NOT NULL AND alumno_b IS NOT NULL THEN
    INSERT INTO public.amistades (solicitante_id, receptor_id, estado)
    VALUES (alumno_a, alumno_b, 'aceptada');

    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_a, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_a::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    IF sesion_b IS NOT NULL THEN
      SELECT count(*) INTO n FROM public.sesiones WHERE foto_url = marker || '-sesion';
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | siendo amigos, A ve el entrenamiento con compartir apagado.'; END IF;
      SELECT count(*) INTO n FROM public.rutinas WHERE nombre = marker || '-propia';
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | siendo amigos, A ve la rutina personal con compartir apagado.'; END IF;
      SELECT count(*) INTO n FROM public.mediciones WHERE foto_url = marker || '-medicion';
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | la amistad dejó ver una medición.'; END IF;
    END IF;

    SELECT f.bio, f.compartir_historial INTO bio_leida, compartir_leido
    FROM public.obtener_perfil_companero(alumno_b) f;
    IF bio_leida IS DISTINCT FROM marker || '-bio' OR compartir_leido IS DISTINCT FROM false THEN
      fallos := fallos + 1; notas := notas || ' | la ficha de amigo no muestra la frase o el interruptor apagado.';
    END IF;

    EXECUTE 'RESET ROLE';

    UPDATE public.profiles SET compartir_historial = true WHERE id = alumno_b;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_a, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_a::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    IF sesion_b IS NOT NULL THEN
      SELECT count(*) INTO n FROM public.sesiones WHERE foto_url = marker || '-sesion';
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | con compartir encendido, A no ve el entrenamiento.'; END IF;
      SELECT count(*) INTO n FROM public.rutinas WHERE nombre = marker || '-propia';
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | con compartir encendido, A no ve la rutina personal.'; END IF;
      SELECT count(*) INTO n FROM public.rutinas WHERE nombre = marker || '-profesor';
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | con compartir encendido, A ve el plan del profe.'; END IF;
      SELECT count(*) INTO n FROM public.mediciones WHERE foto_url = marker || '-medicion';
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | con compartir encendido, A ve mediciones.'; END IF;

      UPDATE public.sesiones SET foto_url = marker || '-touch' WHERE id = sesion_b;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A editó la sesión compartida.'; END IF;
      UPDATE public.rutinas SET nombre = marker || '-touch' WHERE id = rutina_propia;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A editó la rutina compartida.'; END IF;
    END IF;

    EXECUTE 'RESET ROLE';
  END IF;

  -- Profesor y admin ven y pueden escribir el expediente del alumno.
  IF profe_id IS NOT NULL AND alumno_b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', profe_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', profe_id::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    SELECT count(*) INTO n FROM public.profiles WHERE id = alumno_b;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el profesor no ve el perfil del alumno.'; END IF;
    IF sesion_b IS NOT NULL THEN
      SELECT count(*) INTO n FROM public.sesiones WHERE id = sesion_b;
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el profesor no ve la sesión.'; END IF;
      SELECT count(*) INTO n FROM public.mediciones WHERE id = medicion_b;
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el profesor no ve la medición.'; END IF;
      SELECT count(*) INTO n FROM public.rutinas WHERE id IN (rutina_profe, rutina_propia);
      IF n <> 2 THEN fallos := fallos + 1; notas := notas || ' | el profesor no ve las dos rutinas.'; END IF;
      IF public.puede_gestionar_alumno(alumno_b) THEN
        UPDATE public.rutinas SET nombre = marker || '-profesor-edit' WHERE id = rutina_profe;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el profesor que puede gestionar no pudo editar el plan.'; END IF;
      END IF;
    END IF;

    EXECUTE 'RESET ROLE';
  END IF;

  IF admin_id IS NOT NULL AND alumno_b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    SELECT count(*) INTO n FROM public.profiles WHERE id = alumno_b;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no ve el perfil del alumno.'; END IF;
    IF sesion_b IS NOT NULL THEN
      SELECT count(*) INTO n FROM public.sesiones WHERE id = sesion_b;
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no ve la sesión.'; END IF;
      SELECT count(*) INTO n FROM public.mediciones WHERE id = medicion_b;
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no ve la medición.'; END IF;
      UPDATE public.rutinas SET nombre = marker || '-admin-edit' WHERE id = rutina_profe;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no pudo editar el plan.'; END IF;
    END IF;

    EXECUTE 'RESET ROLE';
  END IF;

  -- Storage. El trigger protect_delete bloquea DELETE directo salvo este ajuste local.
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  IF alumno_a IS NOT NULL AND alumno_b IS NOT NULL THEN
    -- Archivos de B, creados como dueño de la tabla, para probar listar y borrar.
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('medicion-fotos', alumno_b::text || '/' || marker || '-med-b.txt');
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('sesion-fotos', alumno_b::text || '/' || marker || '-ses-b.jpg');
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('entrevistas', alumno_b::text || '/' || marker || '-audio-b.webm');

    -- Alumno A sube a su carpeta y no a la de B. medicion-fotos y sesion-fotos.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_a, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_a::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('medicion-fotos', alumno_a::text || '/' || marker || '-med.txt');
    EXCEPTION WHEN insufficient_privilege THEN
      fallos := fallos + 1; notas := notas || ' | A no pudo subir su foto de medición.';
    END;
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('sesion-fotos', alumno_a::text || '/' || marker || '-ses.jpg');
    EXCEPTION WHEN insufficient_privilege THEN
      fallos := fallos + 1; notas := notas || ' | A no pudo subir su foto de sesión.';
    END;
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('medicion-fotos', alumno_b::text || '/' || marker || '-ajena.txt');
      fallos := fallos + 1; notas := notas || ' | A subió una medición en la carpeta de B.';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('sesion-fotos', alumno_b::text || '/' || marker || '-ajena.jpg');
      fallos := fallos + 1; notas := notas || ' | A subió una foto de sesión en la carpeta de B.';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('entrevistas', alumno_a::text || '/' || marker || '-audio.webm');
      fallos := fallos + 1; notas := notas || ' | A subió un audio de entrevista.';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    -- No lista los archivos de B. El suyo sí queda visible, porque el upsert lo necesita.
    SELECT count(*) INTO n FROM storage.objects
     WHERE bucket_id = 'medicion-fotos' AND name = alumno_b::text || '/' || marker || '-med-b.txt';
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A lista una medición de B.'; END IF;
    SELECT count(*) INTO n FROM storage.objects
     WHERE bucket_id = 'sesion-fotos' AND name = alumno_b::text || '/' || marker || '-ses-b.jpg';
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A lista una foto de sesión de B.'; END IF;
    SELECT count(*) INTO n FROM storage.objects
     WHERE bucket_id = 'entrevistas' AND name = alumno_b::text || '/' || marker || '-audio-b.webm';
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A lista el audio de B.'; END IF;
    SELECT count(*) INTO n FROM storage.objects
     WHERE bucket_id = 'medicion-fotos' AND name = alumno_a::text || '/' || marker || '-med.txt';
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | A no ve su propia foto de medición (el upsert la necesita).'; END IF;

    EXECUTE 'RESET ROLE';

    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_a, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_a::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    DELETE FROM storage.objects WHERE bucket_id = 'medicion-fotos' AND name = alumno_b::text || '/' || marker || '-med-b.txt';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A borró la medición de B.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'sesion-fotos' AND name = alumno_b::text || '/' || marker || '-ses-b.jpg';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A borró la foto de sesión de B.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'entrevistas' AND name = alumno_b::text || '/' || marker || '-audio-b.webm';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | A borró el audio de B.'; END IF;

    EXECUTE 'RESET ROLE';

    -- El dueño borra su medición y su foto de sesión. El audio no es suyo de borrar.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', alumno_b, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', alumno_b::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    DELETE FROM storage.objects WHERE bucket_id = 'medicion-fotos' AND name = alumno_b::text || '/' || marker || '-med-b.txt';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | B no pudo borrar su foto de medición.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'sesion-fotos' AND name = alumno_b::text || '/' || marker || '-ses-b.jpg';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | B no pudo borrar su foto de sesión.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'entrevistas' AND name = alumno_b::text || '/' || marker || '-audio-b.webm';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN fallos := fallos + 1; notas := notas || ' | B borró el audio de la entrevista.'; END IF;

    EXECUTE 'RESET ROLE';
  END IF;

  IF profe_id IS NOT NULL AND alumno_b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', profe_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', profe_id::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('medicion-fotos', alumno_b::text || '/' || marker || '-profe.txt');
      INSERT INTO storage.objects (bucket_id, name) VALUES ('sesion-fotos', alumno_b::text || '/' || marker || '-profe.jpg');
      INSERT INTO storage.objects (bucket_id, name) VALUES ('entrevistas', alumno_b::text || '/' || marker || '-profe.webm');
    EXCEPTION WHEN insufficient_privilege THEN
      fallos := fallos + 1; notas := notas || ' | el profesor no pudo subir archivos del alumno.';
    END;
    DELETE FROM storage.objects WHERE bucket_id = 'entrevistas' AND name = alumno_b::text || '/' || marker || '-profe.webm';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el profesor no pudo borrar el audio.'; END IF;
    EXECUTE 'RESET ROLE';
  END IF;

  IF admin_id IS NOT NULL AND alumno_b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('medicion-fotos', alumno_b::text || '/' || marker || '-admin.txt');
      INSERT INTO storage.objects (bucket_id, name) VALUES ('sesion-fotos', alumno_b::text || '/' || marker || '-admin.jpg');
      INSERT INTO storage.objects (bucket_id, name) VALUES ('entrevistas', alumno_b::text || '/' || marker || '-admin.webm');
    EXCEPTION WHEN insufficient_privilege THEN
      fallos := fallos + 1; notas := notas || ' | el admin no pudo subir archivos del alumno.';
    END;
    DELETE FROM storage.objects WHERE bucket_id = 'medicion-fotos' AND name = alumno_b::text || '/' || marker || '-admin.txt';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no pudo borrar la medición.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'sesion-fotos' AND name = alumno_b::text || '/' || marker || '-admin.jpg';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no pudo borrar la foto de sesión.'; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'entrevistas' AND name = alumno_b::text || '/' || marker || '-admin.webm';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN fallos := fallos + 1; notas := notas || ' | el admin no pudo borrar el audio.'; END IF;
    EXECUTE 'RESET ROLE';
  END IF;

  IF fallos > 0 THEN
    RAISE EXCEPTION 'Verificación de privacidad: % fallo(s).%', fallos, notas;
  END IF;

  RAISE NOTICE 'Verificación de privacidad OK.%', notas;
END
$ver$;

ROLLBACK;
