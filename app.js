// Aurora · RS App — checklist diario del Responsable de Sede + dashboards.
(function () {
  'use strict';
  var CFG = window.RS_CONFIG || {};
  var sb = null;

  /* ---------- Checklist: las 47 actividades marcables ---------- */
  var CHK = [
    { id: 'apertura', t: '1 · Apertura', sub: 'Responsable: sub-jefatura, o el RS si abre · Al iniciar la jornada', items: [
      ['a1', 'Llegada con al menos 20 minutos de anticipación al primer cliente agendado'],
      ['a2', 'Pantallas de TV y neones encendidos'],
      ['a3', 'Sala sin basura y ordenada (piso, equipos, espejos, zonas de tránsito, colchonetas y bandas)'],
      ['a4', 'Sillas de la zona de descanso puestas'],
      ['a5', 'Baños limpios, con luz de espejos encendida e insumos repuestos'],
      ['a6', 'Recepción: notebook encendido con EVO e internet verificado'],
      ['a7', 'Recepción: máquina de pagos cargada'],
      ['a8', 'Mesón de recepción ordenado'],
      ['a9', 'Café: agua y elementos necesarios en los mesones de recepción'],
      ['a10', 'Ventanales y/o aire acondicionado según necesidad (temperatura y ventilación)'],
      ['a11', 'Agenda del día revisada en EVO (clientes nuevos, CP, condición médica, cumpleaños)'],
      ['a12', 'CP del día revisadas y confirmación (llamada o mensaje) ejecutada por el coach responsable'],
      ['a13', 'Agenda confirmada con cada coach del turno'],
      ['a14', 'Materiales de protocolo disponibles (balanza cargada y calibrada, formularios o tablet, Wizfit)'],
      ['a15', 'Hallazgos que requieren reparación, reposición o mantención registrados en la bitácora']
    ] },
    { id: 'auditoria', t: '2.3 · Auditoría a la sub-jefatura', items: [
      ['l1', 'Sala quedó en orden tras el turno de la mañana'],
      ['l2', 'Reporte de la sub-jefatura recibido'],
      ['l3', 'Pendientes que dejó la sub-jefatura revisados y asignados']
    ] },
    { id: 'cp', t: '2.5 · Clases de prueba (CP) del turno', items: [
      ['c1', 'CP del turno revisadas en EVO'],
      ['c2', 'Confirmación (llamada o mensaje) verificada o ejecutada para cada CP del turno']
    ] },
    { id: 'durante', t: '3 · Durante el día', sub: 'Funciones del turno del RS', items: [
      ['d1', 'Llamadas o mensajes de confirmación de CP ejecutados'],
      ['d2', 'Inspección de coaches: uniforme'],
      ['d3', 'Inspección de coaches: trabajo en sala'],
      ['d4', 'EVO y agenda de clientes revisados'],
      ['d5', 'Protocolos del día supervisados (entrevistas, evaluaciones y planificaciones Wizfit de clientes nuevos)'],
      ['d6', 'Sala, baños (a media jornada), materiales de protocolo y café revisados durante el día']
    ] },
    { id: 'opcional', t: 'Registro opcional — solo si ocurrió', items: [
      ['o1', 'Casos de clientes resueltos o derivados (si hubo)'],
      ['o2', 'Apoyo en cierres de venta de CP (si hubo)'],
      ['o3', 'Corte semanal de protocolos a las 12:00 (solo miércoles, según sede): anotar % y decisión']
    ] },
    { id: 'cierre', t: '4 · Cierre', sub: 'Responsable: el RS, en persona · Al terminar la jornada', items: [
      ['z1', 'Clientes del día atendidos o registrados como inasistencia (no-show) en EVO'],
      ['z2', 'Protocolos del día (entrevista, evaluación, Wizfit) completos y registrados'],
      ['z3', 'Implementos guardados (mancuernas, bandas, colchonetas, balones)'],
      ['z4', 'Superficies de contacto frecuente limpiadas'],
      ['z5', 'Objetos olvidados revisados (bitácora de objetos perdidos si hay)'],
      ['z6', 'Sala sin basura y ordenada'],
      ['z7', 'Basura del gimnasio sacada'],
      ['z8', 'Baños en condiciones, insumos repuestos y basureros vacíos'],
      ['z9', 'Sillas de la zona de descanso guardadas'],
      ['z10', 'Mesón de recepción ordenado'],
      ['z11', 'Pantallas de TV y neones apagados'],
      ['z12', 'Luz de espejos de baños apagada'],
      ['z13', 'Notebook de recepción apagado'],
      ['z14', 'Máquina de pagos guardada'],
      ['z15', 'Ventanales cerrados y aire acondicionado apagado si corresponde'],
      ['z16', 'Incidencias sin resolver registradas en bitácora, con responsable para mañana'],
      ['z17', 'Reporte diario breve enviado al LOC'],
      ['z18', 'Alarma de seguridad puesta (último paso)']
    ] }
  ];
  var ALL = [];
  CHK.forEach(function (s) { s.items.forEach(function (it) { ALL.push({ id: it[0], label: it[1], sec: s.t }); }); });
  var KPIS = [
    ['ret', 'Retención de sede (%)', 'Meta ≥ 85%'],
    ['casos', 'Casos pendientes (n°)', '—'],
    ['pagos', 'Pagos y cobros en los que debo apoyar (n°)', '—'],
    ['venta', 'Venta acumulada vs. meta (%)', 'Según la meta del mes'],
    ['noshow', 'No-show en CP (%)', 'Referencia < 20%']
  ];
  var TIPOS = ['Operativa', 'Servicio', 'Personal', 'Comercial'];

  /* ---------- Estado ---------- */
  var S = { user: null, day: null, data: null, version: 0, dirty: false, saving: false, rev: 0, timer: null, retry: null,
            status: 'loading', savedAt: null, conflict: null, view: 'checklist', loadSeq: 0, lastInfo: null };
  var D = { protocols: mkDash(), october: mkDash() };
  var dashTimer = null;
  var charts = [];

  function mkDash() { return { payload: null, readAt: null, source: null, cachedAt: null, error: null, loading: false, lastTry: 0, sig: '' }; }
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function dateOf(iso) { return new Date(iso + 'T12:00:00'); }
  function shiftDay(iso, n) { var d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); }
  function longDate(iso) { return dateOf(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function shortDate(iso) { return dateOf(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtTime(d) { return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function validISO(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(dateOf(s).getTime()); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }
  function blank() {
    var base = S.lastInfo || {};
    return { v: 1, info: { sede: base.sede || '', rs: base.rs || '', sub: '' }, st: {}, notes: {}, kpi: {}, caja: {}, corte: {}, inc: [], envio: '' };
  }
  function norm(d) {
    d = d && typeof d === 'object' ? d : {};
    var b = blank();
    ['info', 'st', 'notes', 'kpi', 'caja', 'corte'].forEach(function (k) { d[k] = Object.assign({}, b[k], d[k] || {}); });
    if (!Array.isArray(d.inc)) d.inc = [];
    if (typeof d.envio !== 'string') d.envio = '';
    d.v = 1;
    return d;
  }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? '' : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), l = ks.pop(); var t = ks.reduce(function (a, k) { return (a[k] = a[k] || {}); }, o); t[l] = v; }
  function counts(d) {
    var h = 0, n = 0;
    ALL.forEach(function (it) { var v = (d.st || {})[it.id]; if (v === 'h') h++; else if (v === 'n') n++; });
    return { h: h, n: n, p: ALL.length - h - n, total: ALL.length };
  }

  /* ---------- Arranque y sesión ---------- */
  function boot() {
    var root = $('#root');
    if (!window.supabase || !CFG.url || !CFG.key) {
      root.innerHTML = '<div class="login card"><h1>Aurora · RS App</h1><p>No se pudo cargar la librería de conexión. Revisa tu internet y recarga.</p></div>';
      return;
    }
    sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
    sb.auth.getSession().then(function (r) { setUser(r.data.session ? r.data.session.user : null); });
    sb.auth.onAuthStateChange(function (ev, session) {
      var u = session ? session.user : null;
      if ((u && u.id) !== (S.user && S.user.id)) setUser(u);
    });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', function () { if (S.dirty) save(); });
    window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('hashchange', route);
  }
  function setUser(u) {
    S.user = u;
    if (!u) { stopDash(); renderLogin(); return; }
    renderShell();
    route();
  }
  function renderLogin(msg) {
    $('#root').innerHTML =
      '<form class="login card" id="lf"><h1>Aurora</h1><p class="hint">RS App · Responsable de Sede</p>' +
      (msg ? '<div class="banner bad">' + esc(msg) + '</div>' : '') +
      '<label class="f" for="em">Correo</label><input id="em" type="email" autocomplete="username" required>' +
      '<label class="f" for="pw">Contraseña</label><input id="pw" type="password" autocomplete="current-password" required>' +
      '<p><button class="btn pri" style="width:100%" type="submit">Entrar</button></p></form>';
    $('#lf').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button', e.target); btn.disabled = true; btn.textContent = 'Entrando…';
      sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }).then(function (r) {
        if (r.error) renderLogin(r.error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : 'No se pudo entrar: ' + r.error.message);
      });
    });
  }
  function renderShell() {
    $('#root').innerHTML =
      '<header class="top"><h1>Aurora · RS App</h1><div class="sub" id="who"></div></header>' +
      '<main class="wrap" id="main"></main>' +
      '<nav class="nav" id="nav">' +
      '<button data-go="checklist"><b>✅</b>Checklist</button>' +
      '<button data-go="historial"><b>🗂️</b>Historial</button>' +
      '<button data-go="protocolos"><b>📊</b>Protocolos</button>' +
      '<button data-go="octubre"><b>📈</b>Octubre</button>' +
      '<button data-go="mas"><b>⚙️</b>Más</button></nav>';
    $('#who').textContent = S.user.email || '';
    $('#nav').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.getAttribute('data-go');
      location.hash = v === 'checklist' ? '#/checklist/' + (S.day || todayISO()) : '#/' + v;
    });
  }
  function route() {
    if (!S.user) return;
    var h = (location.hash || '').replace(/^#\/?/, '').split('/');
    var v = h[0] || 'checklist';
    if (['checklist', 'historial', 'protocolos', 'octubre', 'mas'].indexOf(v) < 0) v = 'checklist';
    var prev = S.view;
    S.view = v;
    document.querySelectorAll('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-go') === v); });
    stopDash();
    if (v === 'checklist') {
      var d = validISO(h[1]) ? h[1] : (S.day || todayISO());
      if (!validISO(h[1])) { history.replaceState(null, '', '#/checklist/' + d); }
      if (d !== S.day || prev !== 'checklist' || !S.data) openDay(d);
      else renderChecklist();
    } else if (v === 'historial') renderHistory();
    else if (v === 'protocolos') startDash('protocols');
    else if (v === 'octubre') startDash('october');
    else renderMore();
    window.scrollTo(0, 0);
  }
  function onVisible() {
    if (document.visibilityState !== 'visible' || !S.user) return;
    if (S.view === 'protocolos' || S.view === 'octubre') {
      var name = S.view === 'protocolos' ? 'protocols' : 'october';
      if (Date.now() - D[name].lastTry > 30000) loadDash(name);
    } else if (S.view === 'checklist' && !S.dirty && !S.saving && S.data) {
      checkRemote();
    }
  }

  /* ---------- Día: carga y guardado ---------- */
  function draftKey(day) { return 'rsapp.draft.' + (S.user ? S.user.id : '') + '.' + day; }
  function readDraft(day) { try { return JSON.parse(localStorage.getItem(draftKey(day)) || 'null'); } catch (e) { return null; } }
  function writeDraft() { try { localStorage.setItem(draftKey(S.day), JSON.stringify({ base: S.version, ts: Date.now(), data: S.data })); } catch (e) { /* sin almacenamiento local */ } }
  function clearDraft(day) { try { localStorage.removeItem(draftKey(day || S.day)); } catch (e) { /* ignorar */ } }

  async function flush() {
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    if (S.dirty && !S.conflict) await save();
    var guard = 0;
    while (S.saving && guard++ < 50) await new Promise(function (r) { setTimeout(r, 100); });
  }
  async function openDay(day) {
    var seq = ++S.loadSeq;
    if (S.data && S.day && S.day !== day) {
      await flush();
      if (S.dirty) {
        if (!confirm('Los cambios del ' + S.day + ' aún no se guardaron en el servidor. Si sales ahora quedan solo como borrador en este dispositivo. ¿Salir igual?')) {
          history.replaceState(null, '', '#/checklist/' + S.day); return;
        }
      }
    }
    S.day = day; S.data = null; S.version = 0; S.dirty = false; S.conflict = null; S.status = 'loading';
    $('#main').innerHTML = '<p class="boot">Cargando ' + esc(day) + '…</p>';
    var r = await sb.from('rs_days').select('data,version,updated_at').eq('day', day).maybeSingle();
    if (seq !== S.loadSeq) return;
    if (r.error) {
      $('#main').innerHTML = '<div class="banner bad">No se pudo leer el día: ' + esc(r.error.message) + '</div><button class="btn" id="retryLoad">Reintentar</button>';
      $('#retryLoad').onclick = function () { openDay(day); };
      return;
    }
    if (!S.lastInfo) { await loadLastInfo(); if (seq !== S.loadSeq) return; }
    var server = r.data;
    S.version = server ? server.version : 0;
    S.data = norm(server ? server.data : null);
    S.status = 'saved'; S.savedAt = server ? new Date(server.updated_at) : null;
    var dr = readDraft(day);
    if (dr && dr.data && JSON.stringify(norm(dr.data)) !== JSON.stringify(S.data)) {
      if (dr.base === S.version) {
        S.data = norm(dr.data); S.dirty = true; S.status = 'dirty';
        toast('Se recuperaron cambios que no alcanzaron a guardarse.');
        S.timer = setTimeout(save, 600);
      } else {
        S.conflict = { kind: 'draft', data: server ? norm(server.data) : blank(), version: S.version, draft: norm(dr.data) };
        S.status = 'conflict';
      }
    } else if (dr) clearDraft(day);
    renderChecklist();
  }
  async function loadLastInfo() {
    var r = await sb.from('rs_days').select('data').order('day', { ascending: false }).limit(1);
    var info = r.data && r.data[0] && r.data[0].data && r.data[0].data.info;
    S.lastInfo = info ? { sede: info.sede || '', rs: info.rs || '' } : {};
    if (S.data && !S.version && !S.data.info.sede && !S.data.info.rs) { S.data.info.sede = S.lastInfo.sede || ''; S.data.info.rs = S.lastInfo.rs || ''; }
  }
  async function checkRemote() {
    var day = S.day;
    var r = await sb.from('rs_days').select('data,version').eq('day', day).maybeSingle();
    if (r.error || day !== S.day || S.dirty || S.saving || !r.data) return;
    if (r.data.version > S.version) {
      S.version = r.data.version; S.data = norm(r.data.data); renderChecklist();
      toast('Este día se actualizó desde otro dispositivo; ya cargué la versión nueva.');
    }
  }
  function touch() {
    S.dirty = true; S.rev++; writeDraft();
    if (S.conflict) { setStatus('conflict'); return; }
    setStatus('dirty');
    if (S.timer) clearTimeout(S.timer);
    S.timer = setTimeout(save, 1200);
  }
  async function save() {
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    if (S.saving || !S.dirty || S.conflict || !S.data) return;
    var day = S.day, rev = S.rev, sent = S.data;
    S.saving = true; setStatus('saving');
    try {
      var r = await sb.rpc('rs_save_day', { p_day: day, p_data: sent, p_expected_version: S.version || null });
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!row) throw new Error('Respuesta vacía del servidor');
      if (day !== S.day) return;
      if (row.r_status === 'ok') {
        S.version = row.r_version; S.savedAt = new Date(row.r_updated_at || Date.now());
        if (S.rev === rev) { S.dirty = false; clearDraft(day); setStatus('saved'); }
        else { setStatus('dirty'); S.timer = setTimeout(save, 300); }
      } else {
        S.conflict = { kind: 'server', data: norm(row.r_data), version: row.r_version };
        setStatus('conflict'); renderBanner();
      }
    } catch (e) {
      S.lastErr = e && e.message ? e.message : String(e);
      setStatus('offline');
      if (S.retry) clearTimeout(S.retry);
      S.retry = setTimeout(function () { if (S.dirty) save(); }, 6000);
    } finally { S.saving = false; }
  }
  function setStatus(s) {
    S.status = s;
    var el = $('#sync'); if (!el) return;
    var txt = {
      saved: 'Guardado en el servidor' + (S.savedAt ? ' · ' + S.savedAt.toLocaleTimeString('es-CL') : ''),
      saving: 'Guardando…', dirty: 'Cambios sin guardar…', loading: 'Cargando…',
      offline: 'Sin conexión o error: reintentando (' + (S.lastErr || '') + ')', error: 'Error al guardar',
      conflict: 'Conflicto: elige qué versión conservar'
    }[s];
    el.className = 'chip ' + s; el.textContent = txt;
  }

  /* ---------- Checklist: pantalla ---------- */
  function renderChecklist() {
    var d = S.data, c = counts(d);
    var h = '';
    h += '<div class="card"><div class="date-nav"><button class="btn" id="dprev" aria-label="Día anterior">‹</button>' +
      '<input type="date" id="dpick" value="' + esc(S.day) + '"><button class="btn" id="dnext" aria-label="Día siguiente">›</button>' +
      '<button class="btn" id="dtoday">Hoy</button></div>' +
      '<p class="datetxt">' + esc(longDate(S.day)) + '</p>' +
      '<div class="row" style="margin-top:6px"><span id="sync" class="chip"></span></div>' +
      '<div class="bar"><i id="prog"></i></div><p class="hint" id="progtxt" style="margin:6px 0 0"></p></div>';
    h += '<div id="banner"></div>';
    h += '<div class="card"><h2>Datos del día</h2><div class="grid2">' +
      '<div><label class="f">Sede</label><input type="text" data-k="info.sede"></div>' +
      '<div><label class="f">RS</label><input type="text" data-k="info.rs"></div></div>' +
      '<label class="f">Sub-jefatura del día</label><input type="text" data-k="info.sub"></div>';
    CHK.forEach(function (s) {
      h += '<div class="card" id="sec-' + s.id + '"><h2>' + esc(s.t) + '</h2>' + (s.sub ? '<p class="hint">' + esc(s.sub) + '</p>' : '<p class="hint"></p>');
      h += s.items.map(itemRow).join('');
      if (s.id === 'apertura') h += '<label class="f">Hallazgos y notas de la apertura</label><textarea data-k="notes.apertura"></textarea>';
      if (s.id === 'opcional') h += '<div class="grid2"><div><label class="f">Corte semanal: %</label><input type="text" inputmode="decimal" data-k="corte.pct"></div>' +
        '<div><label class="f">Corte semanal: decisión</label><input type="text" data-k="corte.dec"></div></div>' +
        (dateOf(S.day).getDay() === 3 ? '<p class="hint">Hoy es miércoles: corresponde el corte semanal de protocolos a las 12:00.</p>' : '');
      if (s.id === 'cierre') h += '<label class="f">Caja — salida de turno: monto entregado o resguardado ($)</label><input type="text" inputmode="numeric" data-k="caja.salida">';
      h += '</div>';
      if (s.id === 'apertura') {
        h += '<div class="card"><h2>2 · Llegada del RS</h2><p class="hint">Al iniciar tu turno, siempre en este orden</p><h3>2.1 Revisión de KPIs — primera medida</h3>' +
          KPIS.map(function (k) { return '<div class="kpi"><div>' + esc(k[1]) + '<small>' + esc(k[2]) + '</small></div><input type="text" inputmode="decimal" data-k="kpi.' + k[0] + '"></div>'; }).join('') +
          '<h3>2.2 Pendientes del RS</h3><p class="hint">Compras, arreglos, tareas, proveedores</p><textarea data-k="notes.pendientes_rs"></textarea></div>';
      }
      if (s.id === 'auditoria') {
        h += '<div class="card"><h2>2.4 Caja — entrada de turno</h2><label class="f">Monto recibido al inicio del turno ($)</label><input type="text" inputmode="numeric" data-k="caja.entrada"></div>';
      }
      if (s.id === 'cp') h += '<div class="card"><h2>Notas de la llegada</h2><textarea data-k="notes.llegada"></textarea></div>';
      if (s.id === 'opcional') {
        h += '<div class="card"><h2>Incidencias del día</h2><p class="hint">Tipo: Operativa (infraestructura, orden) · Servicio (queja, malestar de cliente) · Personal (conflicto, ausencia, desempeño) · Comercial (venta, cobro, plan)</p>' +
          '<div id="incs"></div><button class="btn" id="addinc">+ Agregar incidencia</button>' +
          '<h3>Observaciones del día</h3><p class="hint">Casos de clientes, apoyo en ventas, notas generales</p><textarea data-k="notes.observaciones"></textarea></div>';
      }
    });
    h += '<div class="card"><h2>5 · Reporte diario breve al LOC</h2><p class="hint">Resumen corto para que el LOC esté al tanto — no reemplaza el reporte semanal</p>' +
      '<label class="f">Incidencias del día</label><textarea data-k="notes.rep_inc"></textarea>' +
      '<label class="f">Avances</label><textarea data-k="notes.rep_avances"></textarea>' +
      '<label class="f">Aspectos detectados para mejora o corrección</label><textarea data-k="notes.rep_mejora"></textarea>' +
      '<label class="f">Hora de envío al LOC</label><input type="time" data-k="envio">' +
      '<div class="row" style="margin-top:12px"><button class="btn wa" id="wa">Compartir por WhatsApp</button><button class="btn" id="cpy">Copiar resumen</button></div>' +
      '<p class="hint">Se abre WhatsApp con el resumen ya escrito; tú eliges a quién enviarlo.</p></div>';
    $('#main').innerHTML = h;
    // valores
    document.querySelectorAll('[data-k]').forEach(function (el) { el.value = getPath(d, el.getAttribute('data-k')) || ''; });
    renderIncs(); updateProgress(); setStatus(S.status); renderBanner();
    var main = $('#main');
    main.oninput = function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-k');
      if (k) { setPath(S.data, k, e.target.value); touch(); return; }
      var ii = e.target.getAttribute && e.target.getAttribute('data-inc');
      if (ii) { var p = ii.split('.'); S.data.inc[+p[0]][p[1]] = e.target.value; touch(); }
    };
    main.onchange = function (e) { if (e.target.matches && e.target.matches('select[data-inc]')) main.oninput(e); };
    main.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'dprev') go(shiftDay(S.day, -1));
      else if (b.id === 'dnext') go(shiftDay(S.day, 1));
      else if (b.id === 'dtoday') go(todayISO());
      else if (b.id === 'addinc') { S.data.inc.push({ h: '', q: '', t: 'Operativa', a: '' }); renderIncs(); touch(); }
      else if (b.getAttribute('data-delinc') != null) { S.data.inc.splice(+b.getAttribute('data-delinc'), 1); renderIncs(); touch(); }
      else if (b.classList.contains('st')) cycle(b);
      else if (b.id === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(summary()), '_blank', 'noopener');
      else if (b.id === 'cpy') copyText(summary());
      else if (b.id === 'useServer') { S.data = S.conflict.data; S.version = S.conflict.version; S.conflict = null; S.dirty = false; clearDraft(); S.status = 'saved'; renderChecklist(); }
      else if (b.id === 'keepMine') {
        var mine = S.conflict.kind === 'draft' ? S.conflict.draft : S.data;
        S.data = mine; S.version = S.conflict.version; S.conflict = null; S.dirty = true; S.rev++; renderChecklist(); save();
      }
    };
    $('#dpick').onchange = function (e) { if (validISO(e.target.value)) go(e.target.value); };
  }
  function go(day) { location.hash = '#/checklist/' + day; }
  function itemRow(it) {
    var v = (S.data.st || {})[it[0]] || '';
    return '<div class="item ' + (v ? 'is-' + v : '') + '" data-row="' + it[0] + '"><button class="st" type="button" data-id="' + it[0] + '" data-v="' + v + '" aria-label="Estado: ' + stLabel(v) + '">' + stLabel(v) + '</button><div class="lbl">' + esc(it[1]) + '</div></div>';
  }
  function stLabel(v) { return v === 'h' ? '✓ Hecho' : v === 'n' ? 'N/A' : '☐ Pendiente'; }
  function cycle(btn) {
    var id = btn.getAttribute('data-id'), cur = S.data.st[id] || '';
    var nxt = cur === '' ? 'h' : cur === 'h' ? 'n' : '';
    if (nxt) S.data.st[id] = nxt; else delete S.data.st[id];
    btn.setAttribute('data-v', nxt); btn.textContent = stLabel(nxt); btn.setAttribute('aria-label', 'Estado: ' + stLabel(nxt));
    btn.parentNode.className = 'item ' + (nxt ? 'is-' + nxt : '');
    updateProgress(); touch();
  }
  function updateProgress() {
    var c = counts(S.data), done = c.h + c.n;
    var p = $('#prog'); if (p) p.style.width = Math.round(done / c.total * 100) + '%';
    var t = $('#progtxt'); if (t) t.textContent = done + ' de ' + c.total + ' resueltas · ' + c.h + ' hechas · ' + c.n + ' N/A · ' + c.p + ' pendientes';
  }
  function renderIncs() {
    var box = $('#incs'); if (!box) return;
    box.innerHTML = S.data.inc.map(function (x, i) {
      return '<div class="inc"><div class="grid2"><div><label class="f">Hora</label><input type="time" data-inc="' + i + '.h" value="' + esc(x.h) + '"></div>' +
        '<div><label class="f">Tipo</label><select data-inc="' + i + '.t">' + TIPOS.map(function (t) { return '<option' + (t === x.t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div></div>' +
        '<label class="f">Qué ocurrió</label><textarea data-inc="' + i + '.q">' + esc(x.q) + '</textarea>' +
        '<label class="f">Acción tomada y estado</label><textarea data-inc="' + i + '.a">' + esc(x.a) + '</textarea>' +
        '<p style="margin:8px 0 0"><button class="btn sm" type="button" data-delinc="' + i + '">Quitar esta incidencia</button></p></div>';
    }).join('') || '<p class="hint">Sin incidencias registradas.</p>';
  }
  function renderBanner() {
    var b = $('#banner'); if (!b) return;
    if (!S.conflict) { b.innerHTML = ''; return; }
    b.innerHTML = '<div class="banner bad"><b>' + (S.conflict.kind === 'draft'
      ? 'Hay un borrador local que no coincide con lo guardado en el servidor.'
      : 'Este día se modificó en otro dispositivo o pestaña mientras editabas.') +
      '</b> No guardé nada encima. Elige qué versión conservar.<div class="row">' +
      '<button class="btn" id="useServer">Usar la del servidor</button><button class="btn pri" id="keepMine">Conservar la mía</button></div></div>';
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Resumen copiado'); }, function () { toast('No se pudo copiar'); });
    else toast('Este navegador no permite copiar automáticamente');
  }

  /* ---------- Resumen para WhatsApp ---------- */
  function summary() {
    var d = S.data, c = counts(d), L = [];
    L.push('*Reporte diario RS — ' + shortDate(S.day) + '*');
    L.push('Sede: ' + (d.info.sede || '—') + ' · RS: ' + (d.info.rs || '—') + (d.info.sub ? ' · Sub-jefatura: ' + d.info.sub : ''));
    L.push('Checklist: ' + (c.h + c.n) + '/' + c.total + ' resueltas (' + c.h + ' hechas, ' + c.n + ' N/A, ' + c.p + ' pendientes)');
    CHK.forEach(function (s) {
      var pend = s.items.filter(function (it) { return !d.st[it[0]]; });
      if (pend.length) {
        var names = pend.slice(0, 5).map(function (it) { return '• ' + it[1]; });
        if (pend.length > 5) names.push('• …y ' + (pend.length - 5) + ' más');
        L.push('_Pendiente en ' + s.t + ':_'); names.forEach(function (n) { L.push(n); });
      }
    });
    var k = KPIS.map(function (x) { return d.kpi[x[0]] ? x[1] + ': ' + d.kpi[x[0]] : ''; }).filter(Boolean);
    if (k.length) { L.push('*KPIs*'); k.forEach(function (x) { L.push(x); }); }
    if (d.caja.entrada || d.caja.salida) L.push('Caja: entrada $' + (d.caja.entrada || '—') + ' · salida $' + (d.caja.salida || '—'));
    if (d.corte.pct || d.corte.dec) L.push('Corte semanal: ' + (d.corte.pct || '—') + '% · ' + (d.corte.dec || '—'));
    if (d.inc.length) {
      L.push('*Incidencias (' + d.inc.length + ')*');
      d.inc.forEach(function (x) { L.push('• ' + (x.h ? x.h + ' · ' : '') + x.t + ': ' + (x.q || '—') + (x.a ? ' → ' + x.a : '')); });
    } else L.push('Incidencias: sin registro');
    var n = d.notes;
    if (n.rep_inc) L.push('*Incidencias del día:* ' + n.rep_inc);
    if (n.rep_avances) L.push('*Avances:* ' + n.rep_avances);
    if (n.rep_mejora) L.push('*Aspectos de mejora:* ' + n.rep_mejora);
    if (n.observaciones) L.push('*Observaciones:* ' + n.observaciones);
    if (d.envio) L.push('Hora de envío: ' + d.envio);
    return L.join('\n');
  }

  /* ---------- Historial ---------- */
  var histLimit = 60;
  async function renderHistory() {
    var m = $('#main');
    m.innerHTML = '<div class="card"><h2>Historial</h2><p class="hint">Cada día es un registro independiente. Toca uno para abrirlo.</p><div id="hl"><p class="boot">Cargando…</p></div></div>';
    var r = await sb.from('rs_days').select('day,data,version,updated_at').order('day', { ascending: false }).limit(histLimit);
    if (S.view !== 'historial') return;
    if (r.error) { $('#hl').innerHTML = '<div class="banner bad">No se pudo leer el historial: ' + esc(r.error.message) + '</div>'; return; }
    var rows = r.data || [];
    $('#hl').innerHTML = (rows.map(function (x) {
      var d = norm(x.data), c = counts(d), done = c.h + c.n;
      return '<div class="hist" data-day="' + x.day + '"><div class="d"><b>' + esc(shortDate(x.day)) + '</b><small>' + esc(d.info.sede || '') + (d.info.rs ? ' · ' + esc(d.info.rs) : '') +
        ' · ' + d.inc.length + ' incidencia(s)' + (d.envio ? ' · LOC ' + esc(d.envio) : '') + '</small></div><span class="pill ' + (done === c.total ? 'full' : '') + '">' + done + '/' + c.total + '</span></div>';
    }).join('') || '<p class="hint">Aún no hay días guardados.</p>') +
      (rows.length >= histLimit ? '<p><button class="btn" id="more">Cargar más</button></p>' : '');
    $('#hl').onclick = function (e) {
      var row = e.target.closest('.hist'); if (row) go(row.getAttribute('data-day'));
      if (e.target.id === 'more') { histLimit += 60; renderHistory(); }
    };
  }

  /* ---------- Más: respaldo y sesión ---------- */
  function renderMore() {
    $('#main').innerHTML =
      '<div class="card"><h2>Respaldo del historial</h2><p class="hint">Descarga todos tus días guardados. Conviene hacerlo de vez en cuando.</p>' +
      '<div class="row"><button class="btn pri" id="bj">Descargar JSON</button><button class="btn" id="bc">Descargar CSV</button></div><p class="hint" id="bmsg"></p></div>' +
      '<div class="card"><h2>Sesión</h2><p class="hint">' + esc(S.user.email || '') + '</p><button class="btn" id="out">Cerrar sesión</button></div>' +
      '<div class="card"><h2>Acerca de</h2><p class="hint">Aurora · RS App. Los datos del checklist están en tu cuenta privada; las planillas se leen solo en modo lectura.</p></div>';
    $('#bj').onclick = function () { backup('json'); };
    $('#bc').onclick = function () { backup('csv'); };
    $('#out').onclick = async function () { await flush(); await sb.auth.signOut(); };
  }
  async function backup(kind) {
    var msg = $('#bmsg'); msg.textContent = 'Leyendo todos los días…';
    var rows = [], from = 0, size = 500;
    for (;;) {
      var r = await sb.from('rs_days').select('day,data,version,updated_at').order('day', { ascending: true }).range(from, from + size - 1);
      if (r.error) { msg.textContent = 'No se pudo leer: ' + r.error.message; return; }
      rows = rows.concat(r.data); if (r.data.length < size) break; from += size;
    }
    var stamp = todayISO(), text, name, mime;
    if (kind === 'json') { text = JSON.stringify({ app: 'RS App', exportado: new Date().toISOString(), dias: rows }, null, 2); name = 'rs-app-respaldo-' + stamp + '.json'; mime = 'application/json'; }
    else {
      var head = ['fecha', 'sede', 'rs', 'sub_jefatura', 'hechas', 'na', 'pendientes', 'ret_sede', 'casos_pend', 'pagos_apoyo', 'venta_vs_meta', 'noshow_cp', 'caja_entrada', 'caja_salida', 'corte_pct', 'corte_decision', 'incidencias', 'detalle_incidencias', 'hora_envio_loc', 'observaciones', 'rep_incidencias', 'rep_avances', 'rep_mejora']
        .concat(ALL.map(function (a) { return a.id; }));
      var out = [head.join(',')];
      rows.forEach(function (x) {
        var d = norm(x.data), c = counts(d);
        var line = [x.day, d.info.sede, d.info.rs, d.info.sub, c.h, c.n, c.p, d.kpi.ret, d.kpi.casos, d.kpi.pagos, d.kpi.venta, d.kpi.noshow, d.caja.entrada, d.caja.salida, d.corte.pct, d.corte.dec, d.inc.length,
          d.inc.map(function (i) { return (i.h || '') + ' ' + i.t + ': ' + i.q + ' -> ' + i.a; }).join(' | '), d.envio, d.notes.observaciones, d.notes.rep_inc, d.notes.rep_avances, d.notes.rep_mejora]
          .concat(ALL.map(function (a) { return d.st[a.id] === 'h' ? 'hecho' : d.st[a.id] === 'n' ? 'N/A' : 'pendiente'; }));
        out.push(line.map(csvCell).join(','));
      });
      text = '﻿' + out.join('\n'); name = 'rs-app-respaldo-' + stamp + '.csv'; mime = 'text/csv;charset=utf-8';
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    msg.textContent = 'Listo: ' + rows.length + ' día(s) en ' + name;
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  /* ---------- Dashboards ---------- */
  var DTITLE = { protocols: 'Protocolos STC', october: 'Dashboard octubre 2026' };
  function stopDash() { if (dashTimer) { clearInterval(dashTimer); dashTimer = null; } destroyCharts(); }
  function destroyCharts() { charts.forEach(function (c) { try { c.destroy(); } catch (e) { /* ignorar */ } }); charts = []; }
  function startDash(name) {
    var st = D[name];
    $('#main').innerHTML = '<div class="card"><div class="row"><h2 style="flex:1;margin:0">' + esc(DTITLE[name]) + '</h2><button class="btn sm fit" id="dref">Actualizar</button></div>' +
      '<div id="dstat" style="margin-top:8px"></div></div><div id="dbody"></div>';
    $('#dref').onclick = function () { loadDash(name, true); };
    st.sig = ''; paintDash(name);
    loadDash(name);
    dashTimer = setInterval(function () { if (document.visibilityState === 'visible') loadDash(name); }, 60000);
  }
  async function loadDash(name) {
    var st = D[name]; if (st.loading) return;
    st.loading = true; st.lastTry = Date.now(); paintStatus(name);
    try {
      var sess = (await sb.auth.getSession()).data.session;
      if (!sess) throw new Error('Sesión vencida; vuelve a entrar');
      var res = await fetch('/api/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.access_token }, body: JSON.stringify({ dashboard: name }) });
      var j = await res.json().catch(function () { return {}; });
      if (!res.ok || j.status !== 'success') throw new Error(j.message || ('Error ' + res.status));
      st.payload = { spreadsheetId: j.spreadsheetId, range: j.range, values: j.values };
      st.readAt = j.readAt || new Date().toISOString(); st.source = 'fresh'; st.error = null;
      sb.from('rs_dashboard_cache').upsert({ owner: S.user.id, dashboard: name, payload: st.payload, read_at: st.readAt, saved_at: new Date().toISOString() }, { onConflict: 'owner,dashboard' })
        .then(function (r) { if (r.error) st.cacheErr = r.error.message; });
    } catch (e) {
      st.error = e && e.message ? e.message : String(e);
      if (!st.payload) {
        var r = await sb.from('rs_dashboard_cache').select('payload,read_at,saved_at').eq('dashboard', name).maybeSingle();
        if (r.data) { st.payload = r.data.payload; st.readAt = r.data.read_at; st.cachedAt = r.data.saved_at; st.source = 'cache'; }
      } else if (st.source === 'fresh') st.source = 'stale';
    } finally { st.loading = false; }
    if ((S.view === 'protocolos' && name === 'protocols') || (S.view === 'octubre' && name === 'october')) { paintStatus(name); paintDash(name); }
  }
  function paintStatus(name) {
    var st = D[name], el = $('#dstat'); if (!el) return;
    var when = st.readAt ? new Date(st.readAt).toLocaleString('es-CL') : '';
    var h = '';
    if (st.source === 'fresh' && !st.error) h = '<div class="banner ok" style="margin:0"><b>Datos reales leídos de Google</b> · última lectura: ' + esc(when) + ' · se actualiza solo cada 60 s' + (st.loading ? ' · leyendo…' : '') + '</div>';
    else if (st.payload) h = '<div class="banner warn" style="margin:0"><b>No se pudo leer Google ahora</b> (' + esc(st.error || '') + '). Muestro los <b>últimos datos guardados</b>, leídos el ' + esc(when) + (st.source === 'cache' ? ' (copia guardada en tu cuenta)' : ' (de una lectura anterior en esta sesión)') + '. No son datos frescos.' + (st.loading ? ' Reintentando…' : '') + '</div>';
    else if (st.error) h = '<div class="banner bad" style="margin:0"><b>No se pudo leer la planilla:</b> ' + esc(st.error) + '. No hay datos guardados para mostrar.' + (st.loading ? ' Reintentando…' : '') + '</div>';
    else h = '<div class="banner" style="margin:0;background:#eef2ff">Leyendo la planilla…</div>';
    el.innerHTML = h;
  }

  function cs(v) { return v == null ? '' : String(v).trim(); }
  function num(s) {
    s = cs(s); if (!s) return null;
    var m = s.replace(/\s/g, '').match(/^\$?(-?[\d.,]+)(%?)$/); if (!m) return null;
    var t = m[1];
    if (t.indexOf(',') > -1 && t.indexOf('.') > -1) t = t.replace(/\./g, '').replace(',', '.');
    else if (t.indexOf(',') > -1) t = t.replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
    var n = parseFloat(t); return isNaN(n) ? null : { n: n, pct: m[2] === '%' };
  }
  // Divide la hoja en bloques (separados por filas y columnas vacías).
  function blocksOf(values) {
    var rows = (values || []).map(function (r) { return (r || []).map(cs); });
    var groups = [], cur = null;
    rows.forEach(function (r) {
      if (r.some(function (c) { return c !== ''; })) { if (!cur) { cur = []; groups.push(cur); } cur.push(r); } else cur = null;
    });
    var out = [];
    groups.forEach(function (g) {
      var W = Math.max.apply(null, g.map(function (r) { return r.length; }));
      var used = []; for (var c = 0; c < W; c++) used.push(g.some(function (r) { return (r[c] || '') !== ''; }));
      var runs = [], s = -1;
      for (var c2 = 0; c2 <= W; c2++) {
        if (c2 < W && used[c2]) { if (s < 0) s = c2; } else if (s >= 0) { runs.push([s, c2]); s = -1; }
      }
      runs.forEach(function (run) {
        var sub = g.map(function (r) { var x = []; for (var i = run[0]; i < run[1]; i++) x.push(r[i] || ''); return x; })
          .filter(function (r) { return r.some(function (c) { return c !== ''; }); });
        if (sub.length) out.push(sub);
      });
    });
    return out;
  }
  function neCount(r) { return r.filter(function (c) { return c !== ''; }).length; }
  function paintDash(name) {
    var st = D[name], body = $('#dbody'); if (!body) return;
    if (!st.payload || !st.payload.values) { body.innerHTML = ''; return; }
    var sig = JSON.stringify(st.payload.values);
    if (sig === st.sig && body.innerHTML) return;
    st.sig = sig;
    destroyCharts();
    var blocks = blocksOf(st.payload.values), html = '', chartJobs = [], head = '';
    if (name === 'october') head = octoberHead(st.payload.values);
    blocks.forEach(function (b, bi) {
      var nCols = b[0].length;
      if (b.length === 1 && neCount(b[0]) === 1) { html += '<div class="dtitle">' + esc(b[0].filter(Boolean)[0]) + '</div>'; return; }
      var kv = b.every(function (r) { return r.length <= 2; });
      if ((b.length === 2 && nCols >= 2 && neCount(b[1]) >= 1 && b[1].some(function (c) { return num(c); })) ) {
        html += '<div class="cards">' + b[0].map(function (lab, i) { return b[1][i] === '' && !lab ? '' : '<div class="kcard"><small>' + esc(lab) + '</small><b>' + esc(b[1][i]) + '</b></div>'; }).join('') + '</div>'; return;
      }
      if (kv && nCols === 2 && b.length <= 8 && b.some(function (r) { return num(r[1]); })) {
        html += '<div class="cards">' + b.map(function (r) { return '<div class="kcard"><small>' + esc(r[0]) + '</small><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>'; return;
      }
      var title = '', rows = b;
      if (neCount(rows[0]) === 1 && rows.length > 2) { title = rows[0].filter(Boolean)[0]; rows = rows.slice(1); }
      if (title) html += '<div class="dtitle">' + esc(title) + '</div>';
      var header = rows[0], data = rows.slice(1);
      html += '<div class="tbl"><table><thead><tr>' + header.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        data.map(function (r) { return '<tr>' + header.map(function (_, i) { return '<td>' + esc(r[i] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      var numCols = [];
      for (var c = 1; c < header.length; c++) {
        var ok = data.filter(function (r) { return num(r[c]); }).length;
        if (data.length >= 2 && ok / data.length >= 0.6) numCols.push(c);
      }
      if (numCols.length && data.length >= 2 && data.length <= 40) {
        html += '<div class="chartbox"><canvas id="ch' + bi + '"></canvas></div>';
        chartJobs.push({ id: 'ch' + bi, header: header, data: data, cols: numCols.slice(0, 3), title: title });
      }
    });
    var raw = '<details><summary>Ver hoja completa tal como viene de Google (' + esc(st.payload.range || '') + ')</summary><div class="tbl"><table><tbody>' +
      st.payload.values.map(function (r) { return '<tr>' + (r || []).map(function (c) { return '<td>' + esc(cs(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
    body.innerHTML = head + html + raw;
    var pal = ['#4f46e5', '#16a34a', '#f59e0b'];
    chartJobs.forEach(function (j) {
      var cv = document.getElementById(j.id); if (!cv || !window.Chart) return;
      var labels = j.data.map(function (r) { return r[0]; });
      var horiz = labels.length > 6;
      charts.push(new window.Chart(cv, { type: 'bar',
        data: { labels: labels, datasets: j.cols.map(function (c, k) { return { label: j.header[c] || ('Col ' + (c + 1)), data: j.data.map(function (r) { var x = num(r[c]); return x ? x.n : null; }), backgroundColor: pal[k % 3] }; }) },
        options: { indexAxis: horiz ? 'y' : 'x', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: j.cols.length > 1 } }, scales: { x: { beginAtZero: true }, y: { beginAtZero: true } } } }));
    });
  }
  // Octubre: titulares tomados literalmente de la planilla (sin recalcular ni "corregir").
  function octoberHead(values) {
    var want = [['Clientes activos', /clientes?\s+activos?/i], ['Renovación', /renovaci/i], ['Riesgo de abandono', /riesgo.*abandono|abandono/i], ['Cumplidores en riesgo', /cumplidor/i]];
    var found = [], missing = [];
    want.forEach(function (w) {
      var hit = null;
      for (var r = 0; r < values.length && !hit; r++) {
        for (var c = 0; c < (values[r] || []).length; c++) {
          var cell = cs(values[r][c]);
          if (cell && w[1].test(cell)) {
            var val = '', k;
            for (k = c + 1; k < values[r].length; k++) { if (cs(values[r][k]) !== '') { val = cs(values[r][k]); break; } }
            if (val === '' && values[r + 1]) val = cs(values[r + 1][c]);
            if (val !== '' && /\d/.test(val)) { hit = { label: cell, value: val }; break; }
          }
        }
      }
      if (hit) found.push(hit); else missing.push(w[0]);
    });
    var h = '';
    if (found.length) h += '<div class="cards">' + found.map(function (f) { return '<div class="kcard"><small>' + esc(f.label) + '</small><b>' + esc(f.value) + '</b></div>'; }).join('') + '</div>';
    if (missing.length) h += '<p class="hint">No encontré en la hoja una etiqueta para: ' + esc(missing.join(', ')) + '. Los valores se muestran tal como están escritos en la planilla (renovación y retención son indicadores distintos).</p>';
    return h;
  }

  boot();
})();
