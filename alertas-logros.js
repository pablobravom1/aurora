// STC App — Logros del gimnasio (tiempo en STC, mediciones, entrevista, mes perfecto) para el alumno,
// y "Alertas y logros de alumnos" en el panel del profesor (felicitar, sin entrenar, protocolos).
// Se carga DESPUÉS de app.js y mesociclo.js y se engancha a sus funciones sin modificarlas.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const avatar = (p, cls) => (typeof renderProfileAvatar === 'function' ? renderProfileAvatar(p, cls) : '');
  const IC = (n) => (typeof ICONS !== 'undefined' && ICONS[n]) ? ICONS[n] : '';
  const $id = (id) => document.getElementById(id);
  const DIA = 864e5;

  // Reglas (mismas que usa la app para los protocolos)
  const VIGENCIA_RUTINA = 30, VIGENCIA_MEDICION = 60, AVISO_ANTES = 5;
  const SIN_ENTRENAR_DESDE = 10, SIN_ENTRENAR_HASTA = 60; // más de 60 días: se asume que dejó de venir
  const HITOS_MESES = [1, 2, 3, 6, 9, 12, 18, 24, 36];
  const VENTANA_ANTES = 3, VENTANA_DESPUES = 7; // aniversarios: desde hace 3 días hasta dentro de 7
  const MAX_FILAS = 5;

  // ---------------------------------------------------------------- estilos
  const css = document.createElement('style');
  css.textContent = `
  .section-alertas{--section-accent:#FFD166; background:linear-gradient(125deg,rgba(255,209,102,.16),#242424 64%);}
  .al-panel{margin:-4px 0 16px}
  .al-grupo{margin:0 0 14px}
  .al-grupo-t{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#A8A8A8;text-transform:uppercase}
  .al-grupo-t b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:99px;font:700 10px 'IBM Plex Mono',monospace;letter-spacing:0;color:#111;background:#FFD166}
  .al-grupo.alerta .al-grupo-t b{background:#FF8A8E}
  .al-fila{display:flex;align-items:center;gap:11px;width:100%;box-sizing:border-box;padding:9px 10px;margin:0 0 6px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .al-fila:hover{border-color:rgba(255,255,102,.35)}
  .al-fila .profile-avatar{width:40px;height:40px;flex:none}
  .al-txt{flex:1;min-width:0}
  .al-txt b{display:block;font-size:14px;font-weight:600;color:#F5F5F5}
  .al-txt small{display:block;margin-top:2px;font-size:12px;color:#A8A8A8}
  .al-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
  .al-chips em{font-style:normal;font:600 10.5px 'IBM Plex Mono',monospace;border-radius:99px;padding:2px 8px;color:#FF8A8E;background:rgba(229,72,77,.14)}
  .al-chips em.pronto{color:#FFD166;background:rgba(255,209,102,.13)}
  .al-chips em.logro{color:#111;background:#FFD166}
  .al-ir{flex:none;display:flex;align-items:center;gap:4px;font:600 12px 'Inter',sans-serif;color:#FFFF66;white-space:nowrap}
  .al-mas{display:block;width:100%;padding:9px;border:1px dashed rgba(255,255,255,.14);border-radius:12px;background:transparent;color:#A8A8A8;font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.06em;cursor:pointer}
  .al-pie{margin:4px 2px 0;font-size:11.5px;color:#8A8A8A;line-height:1.5}
  .al-todo{margin:0 0 10px;padding:12px;border-radius:12px;background:rgba(94,227,182,.08);color:#5EE3B6;font-size:13px;font-weight:600;text-align:center}
  `;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- fechas
  const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const aFecha = (v) => { if(!v) return null; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? v + 'T12:00:00' : v); if(isNaN(d)) return null; d.setHours(0, 0, 0, 0); return d; };
  const diasDesde = (v) => { const d = aFecha(v); return d ? Math.round((hoy0() - d) / DIA) : null; };
  const sumarMeses = (d, m) => { const x = new Date(d); const dia = x.getDate(); x.setMonth(x.getMonth() + m); if(x.getDate() !== dia) x.setDate(0); return x; };
  const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fechaCorta = (d) => d.getDate() + ' ' + MESES[d.getMonth()];
  function cuandoTxt(d){
    const n = Math.round((d - hoy0()) / DIA);
    if(n === 0) return 'hoy';
    if(n === 1) return 'mañana';
    if(n === -1) return 'ayer';
    if(n > 1) return DIAS_SEM[d.getDay()] + ' ' + d.getDate();
    return 'el ' + DIAS_SEM[d.getDay()] + ' ' + d.getDate();
  }
  const hitoTxt = (m) => m % 12 === 0 ? (m === 12 ? '1 año' : (m / 12) + ' años') : m + (m === 1 ? ' mes' : ' meses');
  const hitoIcono = (m) => m >= 12 ? '🎂' : m >= 6 ? '🥇' : m >= 3 ? '🗓️' : '🌱';
  // Fecha en que el alumno empezó en STC: creación de su cuenta (o su primer entrenamiento, si no está)
  const inicioDe = (p, primeraSesion) => (p && (p.created_at || p.fecha_ingreso)) || primeraSesion || null;
  const entrevistaHecha = (a) => !!(a && (a.entrevista_fecha || a.entrevista_audio_url || a.entrevista_excepcion));

  // ---------------------------------------------------------------- 1) logros nuevos del alumno
  const NUEVOS_TIEMPO = ['stc-1m', 'stc-3m', 'stc-6m', 'stc-12m'];
  let nMediciones = null; // se carga antes de pintar el inicio del alumno

  function logrosNuevos(conSeries){
    const sesiones = conSeries || [];
    const primera = sesiones.length ? sesiones.map(s => s.fecha).filter(Boolean).sort()[0] : null;
    const dias = Math.max(0, diasDesde(inicioDe(profile, primera)) || 0);
    const porMes = {};
    sesiones.forEach(s => { const k = String(s.fecha || '').slice(0, 7); if(k) porMes[k] = (porMes[k] || 0) + 1; });
    const mejorMes = Object.values(porMes).reduce((a, n) => Math.max(a, n), 0);
    const med = nMediciones || 0;
    return [
      { id:'stc-1m', icono:'🌱', nombre:'Primer mes en STC', desc:'Cumple 30 días entrenando con nosotros', celebra:'Tu primer mes con nosotros. Lo más difícil es empezar, y ya lo hiciste.', valor:dias, meta:30 },
      { id:'stc-3m', icono:'🗓️', nombre:'3 meses en STC', desc:'90 días: eso es constancia', celebra:'90 días entrenando con nosotros. Eso es constancia: la mayoría abandona antes del tercer mes, y tú sigues aquí.', valor:dias, meta:90 },
      { id:'stc-6m', icono:'🥇', nombre:'6 meses en STC', desc:'Medio año entrenando con nosotros', celebra:'Medio año en STC. Entrenar ya es parte de tu vida.', valor:dias, meta:180 },
      { id:'stc-12m', icono:'🎂', nombre:'Aniversario STC', desc:'Tu primer año en STC', celebra:'¡Un año entrenando con nosotros! Gracias por ser parte de STC.', valor:dias, meta:365 },
      { id:'medicion-1', icono:'📏', nombre:'Primera medición', desc:'Haz tu primera medición corporal', valor:med, meta:1 },
      { id:'medicion-3', icono:'📈', nombre:'Midiendo tu progreso', desc:'Completa 3 mediciones', valor:med, meta:3 },
      { id:'entrevista', icono:'📝', nombre:'Entrevista lista', desc:'Completa tu entrevista inicial', valor:entrevistaHecha(profile) ? 1 : 0, meta:1 },
      { id:'mes-perfecto', icono:'⭐', nombre:'Mes perfecto', desc:'Entrena 12 veces en un mismo mes', valor:mejorMes, meta:12 }
    ].map(l => ({ ...l, ok: l.valor >= l.meta }));
  }

  // La primera vez en cada celular, los logros nuevos que ya cumplía se marcan como vistos,
  // menos el de más tiempo en STC: así cada alumno celebra una sola vez su antigüedad actual.
  function primeraVezSinAvalancha(lista){
    if(!profile) return;
    const kMig = `uc_logros_stc_v1_${profile.id}`, kVis = `uc_logros_vistos_${profile.id}`;
    try{
      if(localStorage.getItem(kMig)) return;
      const vistos = JSON.parse(localStorage.getItem(kVis) || 'null');
      if(Array.isArray(vistos)){
        const ok = lista.filter(l => l.ok).map(l => l.id);
        const tiempo = NUEVOS_TIEMPO.filter(id => ok.includes(id));
        const celebrar = tiempo.length ? tiempo[tiempo.length - 1] : null;
        const silenciar = ok.filter(id => id !== celebrar && !vistos.includes(id));
        if(silenciar.length) localStorage.setItem(kVis, JSON.stringify(vistos.concat(silenciar)));
      }
      localStorage.setItem(kMig, '1');
    }catch(_e){}
  }

  const origCalcular = window.calcularLogros;
  if(typeof origCalcular === 'function' && !origCalcular.__al){
    const nueva = function(conSeries, streak){
      const base = origCalcular.apply(this, arguments);
      try{
        if(!profile || profile.role !== 'alumno') return base;
        const extra = logrosNuevos(conSeries);
        primeraVezSinAvalancha(extra);
        return base.concat(extra);
      }catch(_e){ return base; }
    };
    nueva.__al = true; window.calcularLogros = nueva;
  }

  // La celebración usa un texto más largo cuando el logro lo trae
  const origMostrar = window.mostrarLogroNuevo;
  if(typeof origMostrar === 'function' && !origMostrar.__al){
    const nueva = function(logro, otros){
      return origMostrar.call(this, logro && logro.celebra ? { ...logro, desc: logro.celebra } : logro, otros);
    };
    nueva.__al = true; window.mostrarLogroNuevo = nueva;
  }

  // Antes de pintar el inicio del alumno se cuenta cuántas mediciones tiene
  const origAlumno = window.renderAlumnoHome;
  if(typeof origAlumno === 'function' && !origAlumno.__al){
    const nueva = async function(){
      try{
        if(profile && profile.role === 'alumno'){
          const { count, error } = await sb.from('mediciones').select('id', { count:'exact', head:true }).eq('alumno_id', profile.id);
          if(!error && count != null) nMediciones = count;
        }
      }catch(_e){}
      return origAlumno.apply(this, arguments);
    };
    nueva.__al = true; window.renderAlumnoHome = nueva;
  }

  // ---------------------------------------------------------------- 2) panel del profesor
  async function cargarDatos(){
    const { data: al } = await sb.from('profiles').select('*').eq('role', 'alumno').eq('profesor_id', profile.id).order('nombre');
    const alumnos = al || [];
    if(!alumnos.length) return [];
    const ids = alumnos.map(a => a.id);
    const desde = new Date(Date.now() - (SIN_ENTRENAR_HASTA + 5) * DIA).toISOString().slice(0, 10);
    // Solo se miran los entrenamientos recientes: quien no entrena hace más de 60 días no aparece en "Sin entrenar"
    const [rr, mm, ss] = await Promise.all([
      sb.from('rutinas').select('alumno_id,fecha').eq('activa', true).in('alumno_id', ids),
      sb.from('mediciones').select('alumno_id,fecha').in('alumno_id', ids).order('fecha', { ascending:false }),
      sb.from('sesiones').select('alumno_id,fecha').in('alumno_id', ids).gte('fecha', desde).order('fecha', { ascending:false })
    ]);
    const rut = {}, med = {}, ult = {};
    (rr.data || []).forEach(x => { rut[x.alumno_id] = x.fecha; });
    (mm.data || []).forEach(x => { if(!med[x.alumno_id]) med[x.alumno_id] = x.fecha; });
    (ss.data || []).forEach(x => { if(!ult[x.alumno_id]) ult[x.alumno_id] = x.fecha; });
    return alumnos.map(a => ({ ...a, rutinaFecha: rut[a.id] || null, medicionFecha: med[a.id] || null, ultima: ult[a.id] || null }));
  }

  function calcular(alumnos){
    const felicitar = [], sinEntrenar = [], protocolos = [];
    const h = hoy0();
    alumnos.forEach(a => {
      // aniversarios
      const ini = aFecha(inicioDe(a, null));
      if(ini){
        for(const m of HITOS_MESES){
          const f = sumarMeses(ini, m); f.setHours(0, 0, 0, 0);
          const n = Math.round((f - h) / DIA);
          if(n >= -VENTANA_ANTES && n <= VENTANA_DESPUES){ felicitar.push({ a, m, f, n }); break; }
        }
      }
      // sin entrenar
      const d = diasDesde(a.ultima);
      if(d != null && d > SIN_ENTRENAR_DESDE && d <= SIN_ENTRENAR_HASTA) sinEntrenar.push({ a, d });
      // protocolos
      const chips = [];
      const dr = diasDesde(a.rutinaFecha), dm = diasDesde(a.medicionFecha);
      if(dr == null) chips.push({ t:'Sin rutina' });
      else if(dr > VIGENCIA_RUTINA) chips.push({ t:'Rutina vencida' });
      else if(dr > VIGENCIA_RUTINA - AVISO_ANTES) chips.push({ t:`Rutina vence en ${VIGENCIA_RUTINA - dr} día${VIGENCIA_RUTINA - dr === 1 ? '' : 's'}`, pronto:true });
      if(dm == null) chips.push({ t:'Sin medición' });
      else if(dm > VIGENCIA_MEDICION) chips.push({ t:'Medición vencida' });
      else if(dm > VIGENCIA_MEDICION - AVISO_ANTES) chips.push({ t:`Medición vence en ${VIGENCIA_MEDICION - dm} día${VIGENCIA_MEDICION - dm === 1 ? '' : 's'}`, pronto:true });
      if(!entrevistaHecha(a)) chips.push({ t:'Sin entrevista' });
      if(chips.length) protocolos.push({ a, chips, urg: chips.some(c => !c.pronto) ? 0 : 1 });
    });
    felicitar.sort((x, y) => x.n - y.n);
    sinEntrenar.sort((x, y) => x.d - y.d);
    protocolos.sort((x, y) => x.urg - y.urg || String(x.a.nombre).localeCompare(String(y.a.nombre)));
    return { felicitar, sinEntrenar, protocolos };
  }

  const fila = (a, detalle, chipsHtml, accion, tipo) => `<button type="button" class="al-fila" data-al="${esc(a.id)}" data-tipo="${tipo}">${avatar(a, 'avatar-chat')}<span class="al-txt"><b>${esc(a.nombre)}</b>${detalle ? `<small>${detalle}</small>` : ''}${chipsHtml ? `<span class="al-chips">${chipsHtml}</span>` : ''}</span><span class="al-ir">${accion}</span></button>`;

  function grupo(id, titulo, alerta, filas){
    if(!filas.length) return '';
    const vis = filas.slice(0, MAX_FILAS).join(''), resto = filas.slice(MAX_FILAS).join('');
    return `<div class="al-grupo ${alerta ? 'alerta' : ''}"><div class="al-grupo-t"><span>${titulo}</span><b>${filas.length}</b></div>${vis}${resto ? `<div hidden id="al-resto-${id}">${resto}</div><button type="button" class="al-mas" data-mas="${id}">Ver todos (${filas.length})</button>` : ''}</div>`;
  }

  function panelHtml(R){
    const ver = `Ver ${IC('chevronRight')}`;
    const fel = R.felicitar.map(x => fila(x.a, `${x.n < 0 ? 'Cumplió' : 'Cumple'} ${hitoTxt(x.m)} en STC · ${cuandoTxt(x.f)}`, `<em class="logro">${hitoIcono(x.m)} ${esc(hitoTxt(x.m).toUpperCase())}</em>`, `${IC('message')} Felicitar`, 'chat'));
    const sin = R.sinEntrenar.map(x => fila(x.a, `Último entrenamiento: ${fechaCorta(aFecha(x.a.ultima))}`, `<em>${x.d} días sin entrenar</em>`, ver, 'ficha'));
    const pro = R.protocolos.map(x => fila(x.a, '', x.chips.map(c => `<em class="${c.pronto ? 'pronto' : ''}">${esc(c.t)}</em>`).join(''), ver, 'ficha'));
    const nada = !fel.length && !sin.length && !pro.length;
    return `${nada ? '<p class="al-todo">✓ Todo al día</p>' : ''}
      ${grupo('fel', '🎉 Para felicitar', false, fel)}
      ${grupo('sin', '⚠️ Sin entrenar', true, sin)}
      ${grupo('pro', '📋 Protocolos', true, pro)}
      <p class="al-pie">Rutina vigente ${VIGENCIA_RUTINA} días · Medición ${VIGENCIA_MEDICION} días · Alerta si pasan más de ${SIN_ENTRENAR_DESDE} días sin entrenar.</p>`;
  }

  const conteoTxt = (R) => {
    const l = R.felicitar.length, a = R.sinEntrenar.length + R.protocolos.length;
    if(!l && !a) return 'todo al día';
    return [l ? `${l} logro${l === 1 ? '' : 's'}` : '', a ? `${a} alerta${a === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
  };

  async function inyectarProfesor(){
    if(!profile || profile.role !== 'profesor' || $id('btn-toggle-alertas-alumnos')) return;
    if(typeof esGestor === 'function' && esGestor()) return;
    if(typeof esLoc === 'function' && esLoc()) return;
    const ancla = $id('btn-mis-plantillas');
    if(!ancla) return;
    const alumnos = await cargarDatos();
    const ancla2 = $id('btn-mis-plantillas');
    if(!ancla2 || $id('btn-toggle-alertas-alumnos') || !alumnos.length) return;
    const R = calcular(alumnos);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn-toggle-rutina section-alertas'; btn.id = 'btn-toggle-alertas-alumnos';
    btn.innerHTML = `<span class="toggle-label">🔔 Alertas y logros de alumnos <span class="logros-conteo">${esc(conteoTxt(R))}</span></span>${typeof toggleStateHtml === 'function' ? toggleStateHtml() : ''}`;
    const holder = document.createElement('div');
    holder.className = 'al-panel hidden'; holder.id = 'alertas-alumnos-holder';
    holder.innerHTML = panelHtml(R);
    ancla2.insertAdjacentElement('afterend', btn);
    btn.insertAdjacentElement('afterend', holder);
    if(typeof wireToggle === 'function') wireToggle('btn-toggle-alertas-alumnos', 'alertas-alumnos-holder');
    holder.querySelectorAll('[data-mas]').forEach(b => b.onclick = () => { const r = $id('al-resto-' + b.dataset.mas); if(r) r.hidden = false; b.remove(); });
    holder.querySelectorAll('.al-fila').forEach(b => b.onclick = () => {
      const id = b.dataset.al;
      if(b.dataset.tipo === 'chat' && typeof renderChat === 'function') renderChat(id, renderCoachHome);
      else if(typeof renderCoachAlumnoDetail === 'function') renderCoachAlumnoDetail(id);
    });
  }

  const origCoach = window.renderCoachHome;
  if(typeof origCoach === 'function' && !origCoach.__al){
    const nueva = async function(){
      const r = await origCoach.apply(this, arguments);
      try{ await inyectarProfesor(); }catch(e){ console.warn('alertas-logros', e); }
      return r;
    };
    nueva.__al = true; window.renderCoachHome = nueva;
  }

  window.UCAlertasLogros = { calcular, logrosNuevos };
})();
