(() => {
  const patron = /^STC-(?:[0-9A-F]{8}-){2}[0-9A-F]{8}$/i;
  const estados = {
    creada: 'Cuenta creada', pendiente: 'Pendiente de activación', vencida: 'Clave vencida'
  };
  const errores = {
    datos: 'Revisa el nombre y el correo.',
    existe: 'Ya hay una cuenta con este correo. Puedes buscarla en Alumnos.',
    procesando: 'Ya se está creando una cuenta con este correo. Actualiza la lista en un momento.',
    no_reemite: 'Solo puedes renovar cuentas pendientes. Si acabas de emitir una clave, espera un minuto.',
    alta_incierta: 'No se pudo confirmar el alta. Busca el correo en Alumnos antes de volver a intentar.',
    denegado: 'Tu perfil no tiene acceso a esta acción.',
    credencial: 'La clave temporal venció o ya fue usada. Pide una nueva al equipo de STC.',
    password: 'Usa una contraseña propia de al menos 8 caracteres.',
    cambio: 'No se pudo confirmar el cambio. Prueba ingresar con tu nueva clave o vuelve a intentar.',
    servicio: 'La conexión con STC no respondió. Intenta otra vez.'
  };

  async function alta(datos, conSesion = false) {
    try {
      const headers = {'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY};
      if (conSesion) {
        const {data} = await sb.auth.getSession();
        if (!data.session?.access_token) return {estado: 'denegado'};
        headers.Authorization = 'Bearer ' + data.session.access_token;
      }
      const res = await fetch(SUPABASE_URL + '/functions/v1/stc-asistente-online', {
        method: 'POST', headers, body: JSON.stringify(datos), cache: 'no-store'
      });
      return await res.json();
    } catch { return {estado: 'servicio'}; }
  }

  async function iniciarClaveTemporal(email, clave) {
    const temporal = clave.trim();
    if (!patron.test(temporal)) return false;
    const comprobacion = await alta({accion: 'verificar', email, clave: temporal});
    if (comprobacion.estado === 'valida') {
      mostrarNuevaClave(email, temporal);
      return true;
    }
    // Una contraseña normal con un formato similar conserva el acceso habitual.
    return false;
  }

  function mostrarNuevaClave(email, temporal) {
    root().innerHTML = `
      <h1>Activa tu cuenta STC</h1>
      <p class="sub">Elige tu propia contraseña para entrar a STC App.</p>
      <form class="card" id="stc-activar-form">
        <label for="stc-activar-nueva">Nueva contraseña</label>
        <input id="stc-activar-nueva" type="password" autocomplete="new-password" minlength="8" required>
        <label for="stc-activar-repite">Repite la contraseña</label>
        <input id="stc-activar-repite" type="password" autocomplete="new-password" minlength="8" required>
        <button class="btn" type="submit">Guardar contraseña y entrar</button>
        <p aria-live="polite" data-estado></p>
      </form>
      <button type="button" class="switch-user" id="stc-activar-volver">Volver a Entrar</button>`;
    document.getElementById('stc-activar-volver').onclick = () => renderAuth('login');
    const form = document.getElementById('stc-activar-form');
    const btn = form.querySelector('button');
    const estado = form.querySelector('[data-estado]');
    form.onsubmit = async (event) => {
      event.preventDefault();
      const password = form.querySelector('#stc-activar-nueva').value;
      if (password !== form.querySelector('#stc-activar-repite').value) {
        estado.textContent = 'Las contraseñas tienen que coincidir.';
        return;
      }
      btn.disabled = true;
      estado.textContent = 'Activando tu cuenta…';
      const resultado = await alta({accion: 'activar', email, clave: temporal, password});
      if (!form.isConnected) return;
      if (resultado.estado !== 'activada') {
        estado.textContent = errores[resultado.estado] || errores.servicio;
        btn.disabled = false;
        return;
      }
      form.reset();
      const {data, error} = await sb.auth.signInWithPassword({email, password});
      if (!form.isConnected) return;
      if (error || !data.session) {
        renderAuth('login');
        document.getElementById('auth-email').value = email;
        showToast('Tu clave está guardada. Entra con tu nueva contraseña.');
        return;
      }
      await boot();
    };
  }

  function normalizarWhatsApp(valor) {
    const original = valor.trim();
    if (!/^\+?[\d ().-]+$/.test(original)) return '';
    const digitos = original.replace(/\D/g, '');
    if (!original.startsWith('+') && /^[2-9]\d{8}$/.test(digitos)) return '56' + digitos;
    if (/^56/.test(digitos)) return /^56[2-9]\d{8}$/.test(digitos) ? digitos : '';
    return original.startsWith('+') && /^[1-9]\d{7,14}$/.test(digitos) ? digitos : '';
  }

  function prepararEntrega(holder, email, mensaje, numero) {
    const link = document.createElement('a');
    link.className = 'btn-sm';
    link.textContent = 'Abrir correo para el alumno';
    link.href = 'mailto:' + encodeURIComponent(email).replace('%40', '@') +
      '?subject=' + encodeURIComponent('Tu cuenta de STC App') + '&body=' + encodeURIComponent(mensaje);
    const copiar = document.createElement('button');
    copiar.type = 'button';
    copiar.className = 'btn-sm';
    copiar.textContent = 'Copiar instrucciones y clave';
    copiar.onclick = async () => {
      try {
        await navigator.clipboard.writeText(mensaje);
        showToast('Mensaje copiado. Pégalo en el chat del alumno.');
      } catch {
        const vista = whatsapp.querySelector('textarea') || document.createElement('textarea');
        vista.readOnly = true;
        vista.setAttribute('aria-label', 'Instrucciones y clave temporal para copiar');
        vista.value = mensaje;
        whatsapp.open = true;
        if (!vista.isConnected) whatsapp.append(vista);
        vista.focus();
        vista.select();
      }
    };

    const whatsapp = document.createElement('details');
    whatsapp.style.marginTop = '12px';
    whatsapp.open = Boolean(numero);
    const titulo = document.createElement('summary');
    titulo.textContent = 'Enviar por WhatsApp';
    const etiqueta = document.createElement('label');
    etiqueta.textContent = 'Número del alumno';
    const telefono = document.createElement('input');
    telefono.type = 'tel';
    telefono.autocomplete = 'off';
    telefono.maxLength = 28;
    telefono.placeholder = '+56 9 0000 0000';
    telefono.value = numero ? '+' + numero : '';
    etiqueta.append(telefono);
    const ayuda = document.createElement('p');
    ayuda.className = 'sub';
    ayuda.textContent = 'Copia las instrucciones y la clave. Abre WhatsApp, verifica el contacto y pega el mensaje.';
    const abrir = document.createElement('a');
    abrir.className = 'btn-sm';
    abrir.textContent = 'Abrir WhatsApp';
    abrir.target = '_blank';
    abrir.rel = 'noopener noreferrer';
    const validarTelefono = () => {
      const valido = normalizarWhatsApp(telefono.value);
      if (valido) {
        // La clave se copia aparte. El enlace transmite solo el número elegido.
        abrir.href = 'https://wa.me/' + valido;
        abrir.removeAttribute('aria-disabled');
      } else {
        abrir.removeAttribute('href');
        abrir.setAttribute('aria-disabled', 'true');
      }
      telefono.setCustomValidity(telefono.value.trim() && !valido ? 'Revisa el número y el código de país.' : '');
    };
    telefono.oninput = validarTelefono;
    validarTelefono();
    whatsapp.append(titulo, etiqueta, ayuda, abrir);
    holder.append(link, ' ', copiar, whatsapp);
  }

  async function gestionarAlta(holder, body, numero) {
    holder.textContent = 'Procesando…';
    const resultado = await alta({...body, enviar: !numero}, true);
    if (!holder.isConnected) return false;
    if (resultado.estado === 'correo_enviado') {
      holder.textContent = 'Cuenta lista. La invitación se envió al correo indicado.';
      return true;
    }
    if (resultado.estado === 'borrador' && typeof resultado.mensaje === 'string') {
      holder.textContent = 'Cuenta lista. Elige cómo enviar el acceso al alumno. ';
      prepararEntrega(holder, body.email, resultado.mensaje, numero);
      return true;
    }
    holder.textContent = errores[resultado.estado] || errores.servicio;
    return false;
  }

  function montarAlta(form, alCrear) {
    const btn = form.querySelector('button');
    const estado = form.querySelector('[data-alta-estado]');
    const telefono = form.querySelector('[name=whatsapp]');
    form.onsubmit = async (event) => {
      event.preventDefault();
      const nombre = form.querySelector('[name=nombre]').value.trim();
      const email = form.querySelector('[name=email]').value.trim().toLowerCase();
      const confirma = form.querySelector('[name=confirmacion]').value.trim().toLowerCase();
      if (email !== confirma) {
        estado.textContent = 'Los correos no coinciden. Revísalos antes de crear la cuenta.';
        return;
      }
      const numero = normalizarWhatsApp(telefono.value);
      if (telefono.value.trim() && !numero) {
        estado.textContent = 'Revisa el número de WhatsApp. Usa 9 dígitos en Chile o incluye el código de país.';
        telefono.focus();
        return;
      }
      btn.disabled = true;
      if (await gestionarAlta(estado, {accion: 'crear', email, nombre}, numero)) {
        for (const campo of [form.elements.nombre, form.elements.email, form.elements.confirmacion, telefono]) campo.value = '';
        await alCrear();
      }
      btn.disabled = false;
    };
  }

  function fecha(valor) { return valor ? escapeHtml(formatDateShort(valor)) : 'Sin registro'; }

  function filaAlumno(a, profesores) {
    const profe = profesores.find(p => p.id === a.profesor_id);
    return `<details class="card" data-alumno="${escapeHtml(a.id)}">
      <summary><strong>${escapeHtml(a.nombre || 'Alumno')}</strong> · ${estados[a.cuenta] || 'Cuenta creada'}</summary>
      <p class="sub">${escapeHtml(a.email || 'Correo sin registrar')}</p>
      <p>${escapeHtml(profe?.nombre || 'Sin profesor asignado')}</p>
      <div>${renderEstadoVencimiento('Rutina', a.rutina_fecha, 30, 'sin rutina activa')}</div>
      <div>${renderEstadoVencimiento('Medición', a.medicion_fecha, 60, 'sin mediciones')}</div>
      <div>Entrevista: ${fecha(a.entrevista_fecha)}</div>
      <div>Último entrenamiento: ${fecha(a.ultima_sesion)}</div>
      <form data-asignar style="margin-top:12px">
        <label>Profesor asignado
          <select name="profesor">
            <option value="">Sin profesor</option>
            ${profesores.map(p => `<option value="${escapeHtml(p.id)}"${a.profesor_id === p.id ? ' selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('')}
          </select>
        </label>
        <button type="submit" class="btn-sm">Guardar asignación</button>
        <span aria-live="polite" data-asignacion-estado></span>
      </form>
      ${a.email && ['vencida', 'pendiente'].includes(a.cuenta) ? '<label>WhatsApp para otra clave (opcional)<input type="tel" data-whatsapp-renovar maxlength="28" autocomplete="off" placeholder="+56 9 0000 0000"></label><button type="button" class="btn-sm" data-renovar>Emitir y enviar otra clave</button><div aria-live="polite" data-renovacion></div>' : ''}
      <div data-actividad aria-live="polite"></div>
    </details>`;
  }

  async function montarActividad(row, alumno) {
    const holder = row.querySelector('[data-actividad]');
    holder.textContent = 'Cargando actividad…';
    const {data, error} = await sb.rpc('stc_online_actividad', {p_alumno: alumno.id});
    if (!holder.isConnected) return;
    if (error || !data) {
      holder.textContent = 'No se pudo cargar la actividad. Cierra la ficha y vuelve a abrirla.';
      return;
    }
    holder.dataset.cargada = '1';
    const grupo = (titulo, items, item) => `<h3>${titulo}</h3>${items?.length
      ? `<ul>${items.map(x => '<li>' + item(x) + '</li>').join('')}</ul>` : '<p class="sub">Sin registros.</p>'}`;
    holder.innerHTML =
      grupo('Rutinas recientes', data.rutinas, r => `${escapeHtml(r.nombre)} · ${fecha(r.fecha)}${r.activa ? ' · Activa' : ''}`) +
      grupo('Entrenamientos recientes', data.sesiones, s => `${fecha(s.fecha)} · ${Number(s.series)} series`) +
      grupo('Mediciones recientes', data.mediciones, m => `${fecha(m.fecha)}${m.tipo ? ' · ' + escapeHtml(m.tipo) : ''}`);
  }

  async function home({volver = null} = {}) {
    cleanupSocialRealtime();
    root().innerHTML = `
      <div class="header-actions">
        <h1>Asistente online</h1>
        <button type="button" class="switch-user" id="online-salir">${volver ? 'Volver' : 'Salir'}</button>
      </div>
      <form class="card" id="online-alta">
        <h2>Crear cuenta de alumno</h2>
        <label for="online-nombre">Nombre y apellido</label>
        <input name="nombre" id="online-nombre" maxlength="120" autocomplete="off" required>
        <label for="online-email">Correo del alumno</label>
        <input name="email" id="online-email" type="email" maxlength="254" autocomplete="off" required>
        <label for="online-confirmacion">Confirma el correo</label>
        <input name="confirmacion" id="online-confirmacion" type="email" maxlength="254" autocomplete="off" required>
        <label for="online-whatsapp">WhatsApp (opcional)</label>
        <input name="whatsapp" id="online-whatsapp" type="tel" maxlength="28" autocomplete="off" placeholder="+56 9 0000 0000">
        <button type="submit" class="btn">Crear cuenta y enviar credenciales</button>
        <div aria-live="polite" data-alta-estado></div>
      </form>
      <details class="card" id="online-profesores"><summary><strong>Gestión de profesores</strong></summary>
        <div data-profesores aria-live="polite"></div>
      </details>
      <section class="card">
        <h2>Alumnos</h2>
        <label for="online-busqueda">Buscar por nombre o correo</label>
        <input type="search" id="online-busqueda" autocomplete="off">
        <p id="online-estado" aria-live="polite"></p>
        <div id="online-lista"></div>
        <div class="row-flex">
          <button class="btn-sm" type="button" id="online-atras" hidden>Anterior</button>
          <button class="btn-sm" type="button" id="online-siguiente" hidden>Siguiente</button>
        </div>
      </section>`;
    document.getElementById('online-salir').onclick = volver || handleLogout;
    const form = document.getElementById('online-alta');
    const lista = document.getElementById('online-lista');
    const directorio = document.querySelector('[data-profesores]');
    const estado = document.getElementById('online-estado');
    const buscar = document.getElementById('online-busqueda');
    const anterior = document.getElementById('online-atras');
    const siguiente = document.getElementById('online-siguiente');
    let offset = 0, orden = 0, pendiente;

    async function refrescar() {
      const vigente = ++orden;
      estado.textContent = 'Cargando alumnos…';
      const {data, error} = await sb.rpc('stc_online_listar', {p_busqueda: buscar.value, p_offset: offset});
      if (!lista.isConnected || vigente !== orden) return;
      if (error || !data) {
        estado.textContent = 'No se pudo cargar la lista de alumnos.';
        lista.replaceChildren();
        return;
      }
      const profesores = data.profesores ?? [];
      const alumnos = (data.alumnos ?? []).slice(0, 50);
      if (!alumnos.length && offset > 0) { offset = Math.max(0, offset - 50); return refrescar(); }
      estado.textContent = alumnos.length ? `Página ${offset / 50 + 1} · ${alumnos.length} alumnos` : 'No hay alumnos que coincidan.';
      anterior.hidden = offset === 0;
      siguiente.hidden = data.alumnos.length <= 50;
      directorio.innerHTML = profesores.length ? '<ul>' + profesores.map(p => `<li><strong>${escapeHtml(p.nombre)}</strong> · ${Number(p.alumnos)} alumnos asignados</li>`).join('') + '</ul>' : '<p>Sin profesores registrados.</p>';
      lista.innerHTML = alumnos.map(a => filaAlumno(a, profesores)).join('');
      lista.querySelectorAll('[data-alumno]').forEach((row, index) => {
        const alumno = alumnos[index];
        row.ontoggle = () => {
          if (row.open && !row.querySelector('[data-actividad]').dataset.cargada) montarActividad(row, alumno);
        };
        const asignar = row.querySelector('[data-asignar]');
        asignar.onsubmit = async (event) => {
          event.preventDefault();
          const btn = asignar.querySelector('button');
          btn.disabled = true;
          const {data: ok, error: fallo} = await sb.rpc('stc_online_asignar', {p_alumno: alumno.id, p_profesor: asignar.elements.profesor.value || null});
          btn.disabled = false;
          if (!fallo && ok) { showToast('Asignación guardada'); await refrescar(); }
          else asignar.querySelector('[data-asignacion-estado]').textContent = 'No se pudo guardar la asignación.';
        };
        const renovar = row.querySelector('[data-renovar]');
        if (renovar) renovar.onclick = async () => {
          const estado = row.querySelector('[data-renovacion]');
          const telefono = row.querySelector('[data-whatsapp-renovar]');
          const numero = normalizarWhatsApp(telefono.value);
          if (telefono.value.trim() && !numero) {
            estado.textContent = 'Revisa el número de WhatsApp o deja el campo vacío.';
            telefono.focus();
            return;
          }
          if (!window.confirm('¿Emitir una nueva clave para ' + alumno.email + '? La anterior dejará de funcionar.')) return;
          renovar.disabled = true;
          await gestionarAlta(estado, {accion: 'reemitir', email: alumno.email}, numero);
          renovar.disabled = false;
        };
      });
    }
    montarAlta(form, refrescar);
    buscar.oninput = () => {
      offset = 0;
      clearTimeout(pendiente);
      pendiente = setTimeout(refrescar, 250);
    };
    anterior.onclick = () => { offset = Math.max(0, offset - 50); refrescar(); };
    siguiente.onclick = () => { offset += 50; refrescar(); };
    await refrescar();
  }

  window.STCAsistenteOnline = {home, iniciarClaveTemporal, tieneFormatoTemporal: clave => patron.test(clave.trim())};
})();
