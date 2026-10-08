// STC App — perfiles ampliados: Responsable de Sede (RS), LOC, Profesor supervisor.
// Incluye los checklists diarios (RS y supervisor), enlaces externos (Excel/EVO) y
// la gestión de perfiles del administrador. Se carga después de app.js y usa sus globales
// (sb, profile, root, showToast, escapeHtml, ICONS, wireToggle, toggleStateHtml...).
(function(){
'use strict';

/* ---------- Quién es quién ---------- */
window.esAdminEstricto = () => !!profile && profile.role === 'super_admin';
window.esGestor = () => !!profile && ['super_admin', 'responsable_sede'].includes(profile.role);
window.esLoc = () => !!profile && profile.role === 'loc';
window.esSupervisor = () => !!profile && profile.role === 'profesor' && profile.es_supervisor === true;
window.rolEtiqueta = (p) => {
  if(!p) return '';
  if(p.role === 'super_admin') return p.es_super ? 'Super administrador' : 'Administrador';
  if(p.role === 'responsable_sede') return 'Responsable de Sede';
  if(p.role === 'loc') return 'Líder de Operación Comercial';
  if(p.role === 'profesor' && p.es_supervisor) return 'Profesor supervisor';
  if(p.role === 'profesor' || p.role === 'coach') return 'Profesor';
  return 'Alumno';
};

const esc = (s) => escapeHtml(s == null ? '' : String(s));
const $ = (s, r) => (r || document).querySelector(s);

/* ---------- Estilos propios (usan los colores de la app) ---------- */
(function(){
  const st = document.createElement('style');
  st.id = 'roles-css';
  st.textContent = `
  .rl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
  .rl-head h1{margin:0;font-size:20px}
  .rl-nav{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:10px;color:var(--chalk);cursor:pointer;font-family:inherit}
  .rl-nav:hover{border-color:var(--blue)}
  .rl-nav .rl-ico{width:38px;height:38px;border-radius:10px;background:rgba(255,255,0,.14);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
  .rl-nav .rl-t{flex:1;min-width:0}
  .rl-nav small{display:block;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.14em;color:var(--blue);text-transform:uppercase}
  .rl-nav b{display:block;font-family:Oswald,sans-serif;font-size:15.5px;font-weight:600;letter-spacing:.02em}
  .rl-nav em{display:block;font-style:normal;font-size:11.5px;color:var(--chalk-dim);margin-top:1px}
  .rl-nav .rl-go{color:var(--chalk-dim);display:flex}
  .rl-group-title{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;color:var(--chalk-dim);text-transform:uppercase;margin:18px 0 8px}
  .ck-bar{height:8px;border-radius:99px;background:var(--surface-2);overflow:hidden;margin:10px 0}
  .ck-bar i{display:block;height:100%;width:0;background:var(--blue);transition:width .25s}
  .ck-chip{display:inline-block;font-size:11px;padding:3px 9px;border-radius:99px;background:var(--surface-2);color:var(--chalk-dim)}
  .ck-chip.saved{color:var(--green)} .ck-chip.dirty,.ck-chip.saving{color:var(--blue)} .ck-chip.offline,.ck-chip.conflict,.ck-chip.error{color:var(--red)}
  .ck-date{display:flex;gap:8px;align-items:center;margin-top:10px}
  .ck-date input{margin:0;flex:1}
  .ck-date .btn-sm{flex-shrink:0}
  .ck-sec-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .ck-sec-h h2{margin:0;flex:1}
  .ck-sec-h .ck-cnt{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--chalk-dim)}
  .ck-sec-h .ck-cnt.full{color:var(--green)}
  .ck-item{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line)}
  .ck-item:first-of-type{border-top:0}
  .ck-item .lbl{flex:1;font-size:13.5px;line-height:1.4}
  .ck-item.is-h .lbl{color:var(--chalk-dim)}
  .ck-item.is-n .lbl{color:var(--chalk-dim);text-decoration:line-through}
  .ck-st{flex-shrink:0;min-width:98px;border:1px solid var(--line);background:var(--ink);color:var(--chalk-dim);border-radius:8px;padding:8px 6px;font-size:12px;cursor:pointer;font-family:inherit}
  .ck-item.is-h .ck-st{background:var(--blue);color:var(--ink);border-color:var(--blue);font-weight:600}
  .ck-item.is-n .ck-st{background:var(--surface-2);color:var(--chalk)}
  .ck-st:disabled{cursor:default;opacity:.85}
  .ck-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .ck-kpi{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
  .ck-kpi input{width:110px;margin:0}
  .ck-kpi small{display:block;color:var(--chalk-dim);font-size:11px}
  .ck-inc{border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px}
  .ck-banner{border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px}
  .ck-banner.bad{background:rgba(255,107,99,.12);border:1px solid var(--red)}
  .ck-banner.ok{background:rgba(101,214,110,.12);border:1px solid var(--green)}
  .ck-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .ck-hint{font-size:12px;color:var(--chalk-dim);margin:0 0 10px}
  .ck-table{width:100%;border-collapse:collapse;font-size:12.5px}
  .ck-table td,.ck-table th{padding:7px 6px;border-top:1px solid var(--line);text-align:left}
  .ck-table th{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.1em;color:var(--chalk-dim);font-weight:500;border-top:0}
  .ck-pill{display:inline-block;min-width:44px;text-align:center;border-radius:99px;padding:2px 8px;font-size:11.5px;background:var(--surface-2)}
  .ck-pill.full{background:rgba(101,214,110,.2);color:var(--green)}
  .ck-pill.mid{background:rgba(255,255,0,.18);color:var(--blue)}
  .ck-pill.low{background:rgba(255,107,99,.18);color:var(--red)}
  .rl-perfil{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line);padding:10px 0}
  .rl-perfil .n{flex:1;min-width:140px;font-size:13.5px}
  .rl-perfil .n small{display:block;color:var(--chalk-dim);font-size:11px}
  .rl-perfil select{width:auto;margin:0;font-size:12px;padding:7px 8px}
  .rl-perfil label.sup{display:flex;align-items:center;gap:6px;margin:0;text-transform:none;font-family:inherit;font-size:12px;letter-spacing:0;color:var(--chalk)}
  .rl-perfil label.sup input{width:auto;margin:0}
  `;
  document.head.appendChild(st);
})();

/* ---------- Utilidades de fecha ---------- */
const pad = (n) => (n < 10 ? '0' : '') + n;
const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoyISO = () => isoOf(new Date());
const dateOf = (iso) => new Date(iso + 'T12:00:00');
const shiftDay = (iso, n) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const longDate = (iso) => dateOf(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (iso) => dateOf(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
const validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(dateOf(s).getTime());

function cabecera(titulo, volverId){
  return `<div class="header-actions"><button class="switch-user" id="${volverId}">${ICONS.arrowLeft} Volver</button></div>
  <div class="rl-head"><h1>${esc(titulo)}</h1></div>`;
}
function iconoNav(emoji, pequeno, titulo, detalle, id){
  return `<button type="button" class="rl-nav" id="${id}"><span class="rl-ico">${emoji}</span>
    <span class="rl-t"><small>${esc(pequeno)}</small><b>${esc(titulo)}</b>${detalle ? `<em>${esc(detalle)}</em>` : ''}</span>
    <span class="rl-go">${ICONS.chevronRight}</span></button>`;
}

/* =====================================================================
   CHECKLIST DIARIO (RS y Profesor supervisor)
   ===================================================================== */
const K = { tipo: null, pl: null, day: null, data: null, version: 0, dirty: false, saving: false, rev: 0, timer: null,
            retry: null, status: 'loading', savedAt: null, conflict: null, ro: false, ownerName: '', volver: null,
            seq: 0, titulo: '', extraBtn: null };
const KPIS = [
  ['ret', 'Retención de sede (%)', 'Meta ≥ 85%'], ['casos', 'Casos pendientes (n°)', '—'],
  ['pagos', 'Pagos y cobros en los que debo apoyar (n°)', '—'], ['venta', 'Venta acumulada vs. meta (%)', 'Según la meta del mes'],
  ['noshow', 'No-show en CP (%)', 'Referencia < 20%']
];
const TIPOS_INC = ['Operativa', 'Servicio', 'Personal', 'Comercial'];

const ckBlank = () => ({ v: 1, info: { sede: '', rs: '', sub: '' }, st: {}, notes: {}, kpi: {}, caja: {}, corte: {}, inc: [], envio: '' });
function ckNorm(d){
  d = d && typeof d === 'object' ? d : {};
  const b = ckBlank();
  ['info', 'st', 'notes', 'kpi', 'caja', 'corte'].forEach(k => { d[k] = Object.assign({}, b[k], d[k] || {}); });
  if(!Array.isArray(d.inc)) d.inc = [];
  if(typeof d.envio !== 'string') d.envio = '';
  d.v = 1;
  return d;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? '' : a[k]), o);
function setPath(o, p, v){ const ks = p.split('.'), l = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[l] = v; }
const ckItems = (pl) => (pl && pl.secciones ? pl.secciones : []).reduce((a, s) => a.concat(s.items.map(it => ({ id: it[0], label: it[1], sec: s.t }))), []);
function ckCounts(pl, d){
  const all = ckItems(pl); let h = 0, n = 0;
  all.forEach(it => { const v = (d.st || {})[it.id]; if(v === 'h') h++; else if(v === 'n') n++; });
  return { h, n, p: all.length - h - n, total: all.length };
}
function ckStLabel(v){ return v === 'h' ? '✓ Hecho' : v === 'n' ? 'N/A' : '☐ Pendiente'; }

async function ckPlantilla(tipo){
  const { data, error } = await sb.from('checklist_plantillas').select('contenido').eq('tipo', tipo).maybeSingle();
  if(error || !data) return null;
  return data.contenido;
}

const draftKey = (tipo, day) => 'stc.ck.' + (profile ? profile.id : '') + '.' + tipo + '.' + day;
function readDraft(){ try { return JSON.parse(localStorage.getItem(draftKey(K.tipo, K.day)) || 'null'); } catch(e){ return null; } }
function writeDraft(){ try { localStorage.setItem(draftKey(K.tipo, K.day), JSON.stringify({ base: K.version, ts: Date.now(), data: K.data })); } catch(e){} }
function clearDraft(day){ try { localStorage.removeItem(draftKey(K.tipo, day || K.day)); } catch(e){} }

async function ckFlush(){
  if(K.timer){ clearTimeout(K.timer); K.timer = null; }
  if(K.dirty && !K.conflict) await ckSave();
  let g = 0;
  while(K.saving && g++ < 50) await new Promise(r => setTimeout(r, 100));
}

// Abre el checklist PROPIO (editable) de un tipo: 'rs' o 'supervisor'.
window.abrirChecklist = async function(tipo, opts){
  opts = opts || {};
  K.tipo = tipo; K.ro = false; K.ownerName = ''; K.volver = opts.volver || renderCoachHome;
  K.titulo = opts.titulo || (tipo === 'rs' ? 'Gestión gimnasio – checklist' : 'Mi checklist de supervisión');
  K.extraBtn = opts.extraBtn || null;
  root().innerHTML = `<div class="loading">Cargando checklist...</div>`;
  K.pl = await ckPlantilla(tipo);
  if(!K.pl){ root().innerHTML = `<div class="error-banner">No se pudo cargar el checklist. Revisa tu conexión e inténtalo de nuevo.</div><button class="btn-ghost" id="ck-err-volver">Volver</button>`; $('#ck-err-volver').onclick = () => K.volver(); return; }
  await ckAbrirDia(opts.dia || hoyISO(), true);
};

async function ckAbrirDia(day, primera){
  const seq = ++K.seq;
  if(!primera && K.data && K.day && K.day !== day){
    await ckFlush();
    if(K.dirty && !confirm('Los cambios del ' + K.day + ' aún no se guardaron en el servidor. Si cambias de día quedan solo como borrador en este celular. ¿Cambiar igual?')) return;
  }
  K.day = day; K.data = null; K.version = 0; K.dirty = false; K.conflict = null; K.status = 'loading';
  const r = await sb.from('checklist_dias').select('data,version,updated_at').eq('tipo', K.tipo).eq('owner_id', profile.id).eq('dia', day).maybeSingle();
  if(seq !== K.seq) return;
  if(r.error){ showToast('No se pudo leer el día: ' + r.error.message); K.data = ckNorm(null); K.status = 'offline'; ckRender(); return; }
  const srv = r.data;
  K.version = srv ? srv.version : 0;
  K.data = ckNorm(srv ? srv.data : null);
  if(!srv){ K.data.info.rs = profile.nombre || ''; }
  K.status = 'saved'; K.savedAt = srv ? new Date(srv.updated_at) : null;
  const dr = readDraft();
  if(dr && dr.data && JSON.stringify(ckNorm(dr.data)) !== JSON.stringify(K.data)){
    if(dr.base === K.version){
      K.data = ckNorm(dr.data); K.dirty = true; K.status = 'dirty';
      showToast('Se recuperaron cambios que no alcanzaron a guardarse.');
      K.timer = setTimeout(ckSave, 600);
    } else {
      K.conflict = { kind: 'draft', data: srv ? ckNorm(srv.data) : ckBlank(), version: K.version, draft: ckNorm(dr.data) };
      K.status = 'conflict';
    }
  } else if(dr) clearDraft();
  ckRender();
}

function ckTouch(){
  K.dirty = true; K.rev++; writeDraft();
  if(K.conflict){ ckSetStatus('conflict'); return; }
  ckSetStatus('dirty');
  if(K.timer) clearTimeout(K.timer);
  K.timer = setTimeout(ckSave, 1200);
}
async function ckSave(){
  if(K.timer){ clearTimeout(K.timer); K.timer = null; }
  if(K.ro || K.saving || !K.dirty || K.conflict || !K.data) return;
  const day = K.day, rev = K.rev, sent = K.data, tipo = K.tipo;
  K.saving = true; ckSetStatus('saving');
  try {
    const r = await sb.rpc('checklist_guardar', { p_tipo: tipo, p_dia: day, p_data: sent, p_expected_version: K.version || null });
    if(r.error) throw r.error;
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if(!row) throw new Error('Respuesta vacía del servidor');
    if(day !== K.day || tipo !== K.tipo) return;
    if(row.r_status === 'ok'){
      K.version = row.r_version; K.savedAt = new Date(row.r_updated_at || Date.now());
      if(K.rev === rev){ K.dirty = false; clearDraft(day); ckSetStatus('saved'); }
      else { ckSetStatus('dirty'); K.timer = setTimeout(ckSave, 300); }
    } else {
      K.conflict = { kind: 'server', data: ckNorm(row.r_data), version: row.r_version };
      ckSetStatus('conflict'); ckBanner();
    }
  } catch(e){
    K.lastErr = e && e.message ? e.message : String(e);
    ckSetStatus('offline');
    if(K.retry) clearTimeout(K.retry);
    K.retry = setTimeout(() => { if(K.dirty) ckSave(); }, 6000);
  } finally { K.saving = false; }
}
function ckSetStatus(s){
  K.status = s;
  const el = $('#ck-sync'); if(!el) return;
  const txt = {
    saved: 'Guardado' + (K.savedAt ? ' · ' + K.savedAt.toLocaleTimeString('es-CL') : ''),
    saving: 'Guardando…', dirty: 'Cambios sin guardar…', loading: 'Cargando…',
    offline: 'Sin conexión o error: reintentando (' + (K.lastErr || '') + ')', error: 'Error al guardar',
    conflict: 'Conflicto: elige qué versión conservar'
  }[s];
  el.className = 'ck-chip ' + s; el.textContent = txt;
}

function ckDis(){ return K.ro ? ' disabled' : ''; }
function ckItemRow(it){
  const v = (K.data.st || {})[it[0]] || '';
  return `<div class="ck-item ${v ? 'is-' + v : ''}" data-row="${it[0]}"><button class="ck-st" type="button" data-id="${it[0]}"${ckDis()}>${ckStLabel(v)}</button><div class="lbl">${esc(it[1])}</div></div>`;
}

function ckRender(){
  const d = K.data, c = ckCounts(K.pl, d), rs = K.tipo === 'rs';
  const secs = K.pl.secciones || [];
  let h = `<div class="header-actions"><button class="switch-user" id="ck-volver">${ICONS.arrowLeft} Volver</button></div>`;
  h += `<div class="card"><div class="rl-head" style="margin-bottom:6px"><h1>${esc(K.titulo)}</h1></div>
    ${K.ro ? `<p class="ck-hint">Solo lectura · ${esc(K.ownerName || '')}</p>` : ''}
    <span id="ck-sync" class="ck-chip"></span>
    <p style="margin:8px 0 0;font-family:Oswald,sans-serif;font-size:16px;text-transform:capitalize">${esc(longDate(K.day))}</p>
    <p class="ck-hint" id="ck-progtxt" style="margin:4px 0 0"></p>
    <div class="ck-bar"><i id="ck-prog"></i></div>
    ${K.ro ? '' : `<div class="ck-date"><button class="btn-sm" id="ck-prev" aria-label="Día anterior">‹</button>
      <input type="date" id="ck-pick" value="${esc(K.day)}"><button class="btn-sm" id="ck-next" aria-label="Día siguiente">›</button>
      <button class="btn-sm" id="ck-today">Hoy</button></div>`}
    ${K.extraBtn && !K.ro ? `<div class="ck-row"><button class="btn-sm" id="ck-extra">${esc(K.extraBtn.texto)}</button></div>` : ''}
    </div><div id="ck-banner"></div><div id="ck-alldone"></div>`;
  h += `<div class="card"><div class="ck-sec-h"><span style="font-size:20px">📝</span><h2>Datos del día</h2></div>
    <div class="ck-grid2"><div><label>Sede</label><input type="text" data-k="info.sede"></div>
    <div><label>${rs ? 'RS' : 'Supervisor'}</label><input type="text" data-k="info.rs"></div></div>
    ${rs ? '<label>Sub-jefatura del día</label><input type="text" data-k="info.sub">' : ''}</div>`;
  secs.forEach(s => {
    h += `<div class="card" id="ck-sec-${esc(s.id)}"><div class="ck-sec-h"><span style="font-size:20px">${esc(s.ico || '✨')}</span><div style="flex:1"><h2 style="margin:0">${esc(s.t)}</h2>${s.sub ? `<p class="ck-hint" style="margin:2px 0 0">${esc(s.sub)}</p>` : ''}</div><span class="ck-cnt" id="ck-cnt-${esc(s.id)}"></span></div>`;
    h += s.items.map(ckItemRow).join('');
    if(rs && s.id === 'apertura') h += '<label style="margin-top:12px">Hallazgos y notas de la apertura</label><textarea data-k="notes.apertura"></textarea>';
    if(rs && s.id === 'opcional') h += `<div class="ck-grid2" style="margin-top:12px"><div><label>Corte semanal: %</label><input type="text" inputmode="decimal" data-k="corte.pct"></div>
      <div><label>Corte semanal: decisión</label><input type="text" data-k="corte.dec"></div></div>${dateOf(K.day).getDay() === 3 ? '<p class="ck-hint">Hoy es miércoles: corresponde el corte semanal de protocolos a las 12:00.</p>' : ''}`;
    if(rs && s.id === 'cierre') h += '<label style="margin-top:12px">Caja — salida de turno: monto entregado o resguardado ($)</label><input type="text" inputmode="numeric" data-k="caja.salida">';
    h += '</div>';
    if(rs && s.id === 'apertura'){
      h += `<div class="card"><h2>2 · Llegada del RS</h2><p class="ck-hint">Al iniciar tu turno, siempre en este orden</p><label>2.1 Revisión de KPIs — primera medida</label><p class="ck-hint">Los KPIs ya no se anotan aquí: se leen desde las planillas en «Métricas de la empresa».</p>` +
        `<label style="margin-top:12px">2.2 Pendientes del RS (compras, arreglos, tareas, proveedores)</label><textarea data-k="notes.pendientes_rs"></textarea></div>`;
    }
    if(rs && s.id === 'auditoria') h += '<div class="card"><h2>2.4 Caja — entrada de turno</h2><label>Monto recibido al inicio del turno ($)</label><input type="text" inputmode="numeric" data-k="caja.entrada"></div>';
    if(rs && s.id === 'cp') h += '<div class="card"><h2>Notas de la llegada</h2><textarea data-k="notes.llegada"></textarea></div>';
  });
  h += `<div class="card"><h2>Incidencias del día</h2><p class="ck-hint">Tipo: Operativa (infraestructura, orden) · Servicio (queja, malestar de cliente) · Personal (conflicto, ausencia, desempeño) · Comercial (venta, cobro, plan)</p>
    <div id="ck-incs"></div>${K.ro ? '' : '<button class="btn-sm" id="ck-addinc">+ Agregar incidencia</button>'}
    <label style="margin-top:14px">Observaciones del día</label><textarea data-k="notes.observaciones"></textarea></div>`;
  const dest = rs ? 'al LOC' : 'al Responsable de Sede';
  h += `<div class="card"><div class="ck-sec-h"><span style="font-size:20px">📣</span><div><h2 style="margin:0">Reporte diario breve ${dest}</h2><p class="ck-hint" style="margin:2px 0 0">Resumen corto, no reemplaza el reporte semanal</p></div></div>
    <label>Incidencias del día</label><textarea data-k="notes.rep_inc"></textarea>
    <label>Avances</label><textarea data-k="notes.rep_avances"></textarea>
    <label>Aspectos detectados para mejora o corrección</label><textarea data-k="notes.rep_mejora"></textarea>
    <label>Hora de envío</label><input type="time" data-k="envio">
    <div class="ck-row"><button class="btn-sm" id="ck-wa">Compartir por WhatsApp</button><button class="btn-sm" id="ck-cpy">Copiar resumen</button></div>
    <p class="ck-hint" style="margin-top:8px">Se abre WhatsApp con el resumen ya escrito; tú eliges a quién enviarlo.</p></div>`;
  root().innerHTML = h;
  document.querySelectorAll('[data-k]').forEach(el => { el.value = getPath(d, el.getAttribute('data-k')) || ''; if(K.ro) el.disabled = true; });
  ckRenderIncs(); ckProgress(); ckSetStatus(K.status); ckBanner();
  const main = root();
  main.oninput = (e) => {
    const k = e.target.getAttribute && e.target.getAttribute('data-k');
    if(k){ setPath(K.data, k, e.target.value); ckTouch(); return; }
    const ii = e.target.getAttribute && e.target.getAttribute('data-inc');
    if(ii){ const p = ii.split('.'); K.data.inc[+p[0]][p[1]] = e.target.value; ckTouch(); }
  };
  main.onchange = (e) => { if(e.target.matches && e.target.matches('select[data-inc]')) main.oninput(e); };
  main.onclick = (e) => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.id === 'ck-volver'){ ckSalir(); }
    else if(b.id === 'ck-prev') ckAbrirDia(shiftDay(K.day, -1));
    else if(b.id === 'ck-next') ckAbrirDia(shiftDay(K.day, 1));
    else if(b.id === 'ck-today') ckAbrirDia(hoyISO());
    else if(b.id === 'ck-extra' && K.extraBtn){ ckFlush().then(() => K.extraBtn.accion()); }
    else if(b.id === 'ck-addinc'){ K.data.inc.push({ h: '', q: '', t: 'Operativa', a: '' }); ckRenderIncs(); ckTouch(); }
    else if(b.getAttribute('data-delinc') != null){ K.data.inc.splice(+b.getAttribute('data-delinc'), 1); ckRenderIncs(); ckTouch(); }
    else if(b.classList.contains('ck-st')) ckCycle(b);
    else if(b.id === 'ck-wa') window.open('https://wa.me/?text=' + encodeURIComponent(ckResumen()), '_blank', 'noopener');
    else if(b.id === 'ck-cpy'){ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ckResumen()).then(() => showToast('Resumen copiado'), () => showToast('No se pudo copiar')); else showToast('Este navegador no permite copiar automáticamente'); }
    else if(b.id === 'ck-useserver'){ K.data = K.conflict.data; K.version = K.conflict.version; K.conflict = null; K.dirty = false; clearDraft(); K.status = 'saved'; ckRender(); }
    else if(b.id === 'ck-keepmine'){ const mine = K.conflict.kind === 'draft' ? K.conflict.draft : K.data; K.data = mine; K.version = K.conflict.version; K.conflict = null; K.dirty = true; K.rev++; ckRender(); ckSave(); }
  };
  const pick = $('#ck-pick'); if(pick) pick.onchange = (e) => { if(validISO(e.target.value)) ckAbrirDia(e.target.value); };
}
async function ckSalir(){
  if(!K.ro){
    await ckFlush();
    if(K.dirty && !confirm('Hay cambios que aún no se guardaron en el servidor. Quedan como borrador en este celular. ¿Salir igual?')) return;
  }
  K.volver();
}
function ckCycle(btn){
  const id = btn.getAttribute('data-id'), cur = K.data.st[id] || '';
  const nxt = cur === '' ? 'h' : cur === 'h' ? 'n' : '';
  if(nxt) K.data.st[id] = nxt; else delete K.data.st[id];
  btn.textContent = ckStLabel(nxt);
  btn.parentNode.className = 'ck-item ' + (nxt ? 'is-' + nxt : '');
  ckProgress(); ckTouch();
}
function ckProgress(){
  const c = ckCounts(K.pl, K.data), done = c.h + c.n, pct = c.total ? Math.round(done / c.total * 100) : 0;
  const p = $('#ck-prog'); if(p) p.style.width = pct + '%';
  const t = $('#ck-progtxt'); if(t) t.textContent = pct + '% · ' + done + ' de ' + c.total + ' resueltas · ' + c.h + ' hechas · ' + c.n + ' N/A · ' + c.p + ' pendientes';
  (K.pl.secciones || []).forEach(s => {
    const el = document.getElementById('ck-cnt-' + s.id); if(!el) return;
    const dn = s.items.filter(it => K.data.st[it[0]]).length;
    el.textContent = dn + '/' + s.items.length; el.className = 'ck-cnt' + (dn === s.items.length ? ' full' : '');
  });
  const ad = $('#ck-alldone');
  if(ad && ad.getAttribute('data-all') !== String(c.p === 0)){
    ad.setAttribute('data-all', String(c.p === 0));
    ad.innerHTML = c.p === 0 ? '<div class="ck-banner ok">🎉 ¡Día completo! Todas las actividades están resueltas.</div>' : '';
  }
}
function ckRenderIncs(){
  const box = $('#ck-incs'); if(!box) return;
  const dis = K.ro ? ' disabled' : '';
  box.innerHTML = K.data.inc.map((x, i) => `<div class="ck-inc"><div class="ck-grid2"><div><label>Hora</label><input type="time" data-inc="${i}.h" value="${esc(x.h)}"${dis}></div>
    <div><label>Tipo</label><select data-inc="${i}.t"${dis}>${TIPOS_INC.map(t => `<option${t === x.t ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <label>Qué ocurrió</label><textarea data-inc="${i}.q"${dis}>${esc(x.q)}</textarea>
    <label>Acción tomada y estado</label><textarea data-inc="${i}.a"${dis}>${esc(x.a)}</textarea>
    ${K.ro ? '' : `<button class="btn-sm" type="button" data-delinc="${i}">Quitar esta incidencia</button>`}</div>`).join('') || '<p class="ck-hint">Sin incidencias registradas.</p>';
}
function ckBanner(){
  const b = $('#ck-banner'); if(!b) return;
  if(!K.conflict){ b.innerHTML = ''; return; }
  b.innerHTML = `<div class="ck-banner bad"><b>${K.conflict.kind === 'draft' ? 'Hay un borrador en este celular que no coincide con lo guardado en el servidor.' : 'Este día se modificó en otro dispositivo o pestaña mientras editabas.'}</b> No guardé nada encima. Elige qué versión conservar.
    <div class="ck-row"><button class="btn-sm" id="ck-useserver">Usar la del servidor</button><button class="btn-sm" id="ck-keepmine">Conservar la mía</button></div></div>`;
}
function ckResumen(){
  const d = K.data, c = ckCounts(K.pl, d), rs = K.tipo === 'rs', L = [];
  L.push('*Reporte diario ' + (rs ? 'RS' : 'supervisor') + ' — ' + shortDate(K.day) + '*');
  L.push('Sede: ' + (d.info.sede || '—') + ' · ' + (rs ? 'RS' : 'Supervisor') + ': ' + (d.info.rs || '—') + (rs && d.info.sub ? ' · Sub-jefatura: ' + d.info.sub : ''));
  L.push('Checklist: ' + (c.h + c.n) + '/' + c.total + ' resueltas (' + c.h + ' hechas, ' + c.n + ' N/A, ' + c.p + ' pendientes)');
  (K.pl.secciones || []).forEach(s => {
    const pend = s.items.filter(it => !d.st[it[0]]);
    if(pend.length){
      const names = pend.slice(0, 5).map(it => '• ' + it[1]);
      if(pend.length > 5) names.push('• …y ' + (pend.length - 5) + ' más');
      L.push('_Pendiente en ' + s.t + ':_'); names.forEach(n => L.push(n));
    }
  });
  if(d.inc.length){ L.push('*Incidencias:*'); d.inc.forEach(x => L.push('• ' + (x.h ? x.h + ' ' : '') + '[' + x.t + '] ' + (x.q || '') + (x.a ? ' → ' + x.a : ''))); }
  ['rep_inc:Incidencias', 'rep_avances:Avances', 'rep_mejora:Para mejorar'].forEach(p => { const [k, t] = p.split(':'); if(d.notes[k]) L.push('*' + t + ':* ' + d.notes[k]); });
  return L.join('\n');
}

/* ---------- Supervisión: ver los checklists de otros (solo lectura) ---------- */
// tipo 'supervisor' → lo usa el RS/admin; tipo 'rs' → lo usa el LOC/admin.
window.renderSupervisarChecklist = async function(tipo, opts){
  opts = opts || {};
  const volver = opts.volver || renderCoachHome;
  const titulo = tipo === 'rs' ? 'Checklist del Responsable de Sede' : 'Supervisar checklist diario';
  const day = opts.dia && validISO(opts.dia) ? opts.dia : hoyISO();
  root().innerHTML = `<div class="loading">Cargando...</div>`;
  const desde = shiftDay(day, -6);
  const [pl, r] = await Promise.all([
    ckPlantilla(tipo),
    sb.from('checklist_dias').select('owner_id,dia,data,version,updated_at,profiles:owner_id(nombre)').eq('tipo', tipo).gte('dia', desde).lte('dia', day).order('dia', { ascending: false })
  ]);
  if(!pl || r.error){ root().innerHTML = `<div class="error-banner">No se pudo cargar. ${esc(r.error ? r.error.message : '')}</div><button class="btn-ghost" id="sv-err">Volver</button>`; $('#sv-err').onclick = volver; return; }
  const rows = r.data || [];
  const nombre = (x) => (x.profiles && x.profiles.nombre) || (tipo === 'rs' ? 'Responsable de Sede' : 'Supervisor');
  const pctDe = (x) => { const c = ckCounts(pl, ckNorm(x.data)); return { pct: c.total ? Math.round((c.h + c.n) / c.total * 100) : 0, c }; };
  const delDia = rows.filter(x => x.dia === day);
  root().innerHTML = `${cabecera(titulo, 'sv-volver')}
    <div class="card"><div class="ck-date" style="margin-top:0"><button class="btn-sm" id="sv-prev">‹</button><input type="date" id="sv-pick" value="${esc(day)}"><button class="btn-sm" id="sv-next">›</button><button class="btn-sm" id="sv-today">Hoy</button></div>
      <p style="margin:10px 0 0;font-family:Oswald,sans-serif;font-size:16px;text-transform:capitalize">${esc(longDate(day))}</p></div>
    ${delDia.length ? delDia.map((x, i) => { const p = pctDe(x); return `<div class="card"><div class="ck-sec-h"><div style="flex:1"><h2 style="margin:0">${esc(nombre(x))}</h2><p class="ck-hint" style="margin:2px 0 0">Última actualización ${new Date(x.updated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · ${p.c.h} hechas · ${p.c.n} N/A · ${p.c.p} pendientes</p></div><span class="ck-pill ${p.pct === 100 ? 'full' : p.pct >= 50 ? 'mid' : 'low'}">${p.pct}%</span></div>
      <div class="ck-bar"><i style="width:${p.pct}%"></i></div><button class="btn-sm" data-ver="${i}">Ver el detalle (solo lectura)</button></div>`; }).join('') : `<div class="card"><div class="empty" style="padding:8px 0">Nadie ha abierto este checklist en este día.</div></div>`}
    <div class="card"><h2>Últimos 7 días</h2><table class="ck-table"><tr><th>DÍA</th><th>QUIÉN</th><th>AVANCE</th></tr>
      ${rows.length ? rows.map(x => { const p = pctDe(x); return `<tr><td style="text-transform:capitalize">${esc(shortDate(x.dia))}</td><td>${esc(nombre(x))}</td><td><span class="ck-pill ${p.pct === 100 ? 'full' : p.pct >= 50 ? 'mid' : 'low'}">${p.pct}%</span></td></tr>`; }).join('') : '<tr><td colspan="3" style="color:var(--chalk-dim)">Sin registros en estos 7 días.</td></tr>'}
    </table></div>`;
  const go = (d) => { if(validISO(d)) renderSupervisarChecklist(tipo, { volver, dia: d }); };
  $('#sv-volver').onclick = volver;
  $('#sv-prev').onclick = () => go(shiftDay(day, -1));
  $('#sv-next').onclick = () => go(shiftDay(day, 1));
  $('#sv-today').onclick = () => go(hoyISO());
  $('#sv-pick').onchange = (e) => go(e.target.value);
  document.querySelectorAll('[data-ver]').forEach(b => {
    b.onclick = () => {
      const x = delDia[+b.getAttribute('data-ver')];
      K.tipo = tipo; K.pl = pl; K.day = x.dia; K.data = ckNorm(x.data); K.version = x.version; K.dirty = false; K.conflict = null;
      K.ro = true; K.ownerName = nombre(x); K.status = 'saved'; K.savedAt = new Date(x.updated_at); K.titulo = titulo;
      K.extraBtn = null; K.volver = () => renderSupervisarChecklist(tipo, { volver, dia: day });
      ckRender();
    };
  });
};

/* =====================================================================
   ENLACES EXTERNOS (Excel de KPIs, ventas, protocolos, leads, EVO)
   ===================================================================== */
async function cargarConexiones(){
  const { data, error } = await sb.from('conexiones_externas').select('*');
  if(error) return null;
  const m = {}; (data || []).forEach(x => { m[x.clave] = x; });
  return m;
}
const urlSegura = (u) => { try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : ''; } catch(e){ return ''; } };

window.renderConexiones = async function(titulo, claves, volver){
  root().innerHTML = `<div class="loading">Cargando...</div>`;
  const m = await cargarConexiones();
  if(!m){ root().innerHTML = `<div class="error-banner">No se pudieron cargar los enlaces.</div><button class="btn-ghost" id="cx-err">Volver</button>`; $('#cx-err').onclick = volver; return; }
  const edit = esGestor();
  root().innerHTML = `${cabecera(titulo, 'cx-volver')}
    <p class="sub">${edit ? 'Pega aquí el enlace de cada planilla. Más adelante se conecta por API para ver los números dentro de la app.' : 'Accesos directos a las planillas. Si falta un enlace, pídeselo al Responsable de Sede.'}</p>
    ${claves.map(k => { const x = m[k] || { clave: k, titulo: k, url: '', nota: '' }; const ok = urlSegura(x.url);
      return `<div class="card"><h2>${esc(x.titulo)}</h2>
        ${ok ? `<a class="btn" href="${esc(ok)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Abrir ${esc(x.titulo)}</a>` : '<p class="ck-hint">Aún sin enlace.</p>'}
        ${edit ? `<label style="margin-top:12px">Enlace</label><input type="url" id="cx-url-${k}" value="${esc(x.url)}" placeholder="https://...">
          <label>Nota</label><input type="text" id="cx-nota-${k}" value="${esc(x.nota)}">
          <button class="btn-sm" data-guardar="${k}">Guardar</button>` : (x.nota ? `<p class="ck-hint" style="margin-top:10px">${esc(x.nota)}</p>` : '')}
      </div>`; }).join('')}`;
  $('#cx-volver').onclick = volver;
  document.querySelectorAll('[data-guardar]').forEach(b => {
    b.onclick = async () => {
      const k = b.getAttribute('data-guardar');
      const url = $('#cx-url-' + k).value.trim();
      if(url && !urlSegura(url)){ showToast('El enlace no es válido (debe empezar con https://)'); return; }
      b.disabled = true;
      const { error } = await sb.from('conexiones_externas').update({ url, nota: $('#cx-nota-' + k).value.trim(), updated_at: new Date().toISOString() }).eq('clave', k);
      b.disabled = false;
      if(error){ showToast('No se pudo guardar: ' + error.message); return; }
      showToast('Guardado');
      renderConexiones(titulo, claves, volver);
    };
  });
};

/* =====================================================================
   GESTIÓN DE PERFILES (solo administrador)
   ===================================================================== */
window.montarGestionPerfiles = async function(holderId){
  const holder = document.getElementById(holderId);
  holder.innerHTML = `<div class="loading">Cargando personas...</div>`;
  const { data, error } = await sb.from('profiles').select('id,nombre,role,es_supervisor,username,perfil_pro').order('nombre');
  if(error){ holder.innerHTML = `<div class="error-banner">No se pudo cargar la lista.</div>`; return; }
  const todos = (data || []).filter(p => p.id !== profile.id && (profile.es_super || p.role !== 'super_admin'));
  holder.innerHTML = `<div class="card"><p class="ck-hint">Aquí le das un perfil a una cuenta que ya existe (la persona crea su cuenta con su correo y tú le asignas el perfil). Solo un administrador puede hacer estos cambios.${profile.es_super ? ' Como super administrador, solo tú puedes crear otros administradores: tendrán todo lo que tienes tú, pero no podrán crear ni quitar administradores.' : ''}</p>
    <input type="text" id="gp-buscar" placeholder="Buscar persona por nombre..." autocomplete="off"><div id="gp-lista"></div></div>`;
  const lista = $('#gp-lista');
  const pintar = () => {
    const q = (typeof normalizarTexto === 'function' ? normalizarTexto($('#gp-buscar').value.trim()) : $('#gp-buscar').value.trim().toLowerCase());
    const nm = (p) => (typeof normalizarTexto === 'function' ? normalizarTexto(p.nombre || '') : (p.nombre || '').toLowerCase());
    let vis = todos.filter(p => !q || nm(p).includes(q));
    const staff = vis.filter(p => p.role !== 'alumno');
    const alumnos = vis.filter(p => p.role === 'alumno');
    const mostrarAlumnos = q ? alumnos.slice(0, 30) : [];
    const fila = (p) => `<div class="rl-perfil" data-id="${p.id}"><div class="n">${esc(p.nombre || '(sin nombre)')}<small>${esc(rolEtiqueta(p))}</small></div>
      <select data-rol><option value="alumno"${p.role === 'alumno' ? ' selected' : ''}>Alumno</option><option value="profesor"${p.role === 'profesor' ? ' selected' : ''}>Profesor</option><option value="responsable_sede"${p.role === 'responsable_sede' ? ' selected' : ''}>Responsable de Sede</option><option value="loc"${p.role === 'loc' ? ' selected' : ''}>LOC</option>${profile.es_super ? `<option value="super_admin"${p.role === 'super_admin' ? ' selected' : ''}>Administrador</option>` : ''}</select>
      <label class="sup"><input type="checkbox" data-sup${p.es_supervisor ? ' checked' : ''}${p.role === 'profesor' ? '' : ' disabled'}> Supervisor</label>
      <button class="btn-sm" data-guardar>Guardar</button>
      <div class="rl-extra" data-extra${p.role === 'profesor' ? '' : ' hidden'}>
        <select data-trat title="Cómo se le nombra al compartir"><option value="">Tratamiento: automático</option><option value="profesor"${(p.perfil_pro || {}).tratamiento === 'profesor' ? ' selected' : ''}>«mi profesor»</option><option value="profesora"${(p.perfil_pro || {}).tratamiento === 'profesora' ? ' selected' : ''}>«mi profesora»</option></select>
        <input type="text" data-nc maxlength="40" placeholder="Nombre al compartir (ej. José Manuel)" value="${esc((p.perfil_pro || {}).nombre_compartir || '')}">
      </div></div>`;
    lista.innerHTML = (staff.length ? `<div class="rl-group-title">Equipo (${staff.length})</div>${staff.map(fila).join('')}` : '') +
      (mostrarAlumnos.length ? `<div class="rl-group-title">Alumnos que coinciden</div>${mostrarAlumnos.map(fila).join('')}` : (q ? '' : `<p class="ck-hint" style="margin-top:12px">Para dar un perfil a un alumno, búscalo por su nombre.</p>`));
    lista.querySelectorAll('.rl-perfil').forEach(row => {
      const id = row.getAttribute('data-id');
      const selRol = row.querySelector('[data-rol]'), chk = row.querySelector('[data-sup]'), btn = row.querySelector('[data-guardar]');
      const extra = row.querySelector('[data-extra]'), selTrat = row.querySelector('[data-trat]'), inNc = row.querySelector('[data-nc]');
      selRol.onchange = () => { chk.disabled = selRol.value !== 'profesor'; if(selRol.value !== 'profesor') chk.checked = false; extra.hidden = selRol.value !== 'profesor'; };
      btn.onclick = async () => {
        if(btn.dataset.ok !== '1'){ btn.dataset.ok = '1'; btn.textContent = (selRol.value === 'super_admin' || (todos.find(x => x.id === id) || {}).role === 'super_admin') ? '¿Seguro? (administrador)' : '¿Confirmar?'; setTimeout(() => { btn.dataset.ok = ''; btn.textContent = 'Guardar'; }, 4000); return; }
        const rol = selRol.value, sup = rol === 'profesor' && chk.checked;
        const upd = { role: rol, es_supervisor: sup };
        if(rol !== 'alumno') upd.profesor_id = null;
        const pPrev = todos.find(x => x.id === id);
        if(rol === 'profesor'){
          const pp = Object.assign({}, (pPrev && pPrev.perfil_pro && typeof pPrev.perfil_pro === 'object') ? pPrev.perfil_pro : {});
          if(selTrat.value) pp.tratamiento = selTrat.value; else delete pp.tratamiento;
          const nc = inNc.value.trim(); if(nc) pp.nombre_compartir = nc; else delete pp.nombre_compartir;
          upd.perfil_pro = pp;
        }
        btn.disabled = true;
        const { error: e2 } = await sb.from('profiles').update(upd).eq('id', id);
        btn.disabled = false; btn.dataset.ok = ''; btn.textContent = 'Guardar';
        if(e2){ showToast('No se pudo guardar: ' + e2.message); return; }
        const p = todos.find(x => x.id === id); if(p){ p.role = rol; p.es_supervisor = sup; if(upd.perfil_pro) p.perfil_pro = upd.perfil_pro; }
        window.__profeCompartir = null;
        showToast('Perfil actualizado');
        pintar();
      };
    });
  };
  $('#gp-buscar').oninput = pintar;
  pintar();
};

/* =====================================================================
   HOME: ítems extra para RS / admin / profesor supervisor, y home del LOC
   ===================================================================== */
window.rolesMontarHome = function(){
  if(!profile) return;
  const ancla = document.getElementById('btn-toggle-profesores') || document.getElementById('btn-mis-plantillas');
  if(!ancla) return;
  const bloque = document.createElement('div');
  bloque.id = 'roles-extra';
  const volver = renderCoachHome;
  let h = '';
  if(esGestor()){
    h += `<div class="rl-group-title">Gestión del gimnasio</div>`;
    h += iconoNav('✅', 'Responsable de sede', 'Gestión gimnasio – checklist', 'Tu checklist diario de apertura, turno y cierre', 'rl-btn-ck-rs');
    h += iconoNav('👀', 'Supervisión', 'Supervisar checklist diario', 'Lo que marcó hoy el Profesor supervisor', 'rl-btn-ck-sup');
    h += iconoNav('🗒️', 'Equipo', 'Tareas', 'Tareas para ti y las que asignaste', 'rl-btn-tareas');
    h += iconoNav('📊', 'Empresa', 'Métricas de la empresa', 'Retención, ventas, protocolos, leads y más (maqueta)', 'rl-btn-metricas');
    if(esAdminEstricto()){
      h += iconoNav('🧭', 'Solo administrador', 'Checklist del Responsable de Sede', 'Ver lo que marcó el RS (vista del LOC)', 'rl-btn-ver-rs');
      h += `<button class="btn-toggle-rutina" id="rl-btn-perfiles"><span class="toggle-label">${ICONS.users} Perfiles y roles</span>${toggleStateHtml()}</button><div class="hidden" id="rl-perfiles-holder"></div>`;
    }
    h += `<div class="rl-group-title">Alumnos y profesores</div>`;
  } else if(esSupervisor()){
    h += `<div class="rl-group-title">Supervisión</div>`;
    h += iconoNav('✅', 'Profesor supervisor', 'Mi checklist de supervisión', 'Tu checklist diario de turno', 'rl-btn-ck-sup-mio');
    h += iconoNav('🗒️', 'Equipo', 'Tareas', 'Tareas para ti y las que asignaste', 'rl-btn-tareas');
    h += iconoNav('🎯', 'Comercial', 'Clases de prueba', 'Leads y profesor asignado a cada clase', 'rl-btn-leads');
  } else return;
  bloque.innerHTML = h;
  ancla.insertAdjacentElement('beforebegin', bloque);
  if(document.getElementById('rl-btn-tareas')) badgeTareas('rl-btn-tareas');
  const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
  on('rl-btn-ck-rs', () => abrirChecklist('rs', { volver, titulo: 'Gestión gimnasio – checklist', extraBtn: { texto: '👀 Supervisar checklist diario', accion: () => renderSupervisarChecklist('supervisor', { volver: () => abrirChecklist('rs', { volver, titulo: 'Gestión gimnasio – checklist', extraBtn: null }) }) } }));
  on('rl-btn-ck-sup', () => renderSupervisarChecklist('supervisor', { volver }));
  on('rl-btn-ver-rs', () => renderSupervisarChecklist('rs', { volver }));
  on('rl-btn-tareas', () => renderTareas(volver));
  on('rl-btn-metricas', () => renderMetricas(volver));
  on('rl-btn-leads', () => renderMetricas(volver, ['leads'], 'Clases de prueba'));
  on('rl-btn-ck-sup-mio', () => abrirChecklist('supervisor', { volver, titulo: 'Mi checklist de supervisión' }));
  if(document.getElementById('rl-btn-perfiles')) wireToggle('rl-btn-perfiles', 'rl-perfiles-holder', () => montarGestionPerfiles('rl-perfiles-holder'));
};

window.renderLocHome = async function(){
  cleanupSocialRealtime();
  root().innerHTML = `
    <div class="header-actions">
      <div class="coach-home-titulo"><small>LÍDER DE OPERACIÓN COMERCIAL</small><b>Hola, ${esc(String(profile.nombre || '').split(' ')[0])}</b></div>
      <div class="student-header-actions"><button class="switch-user" id="loc-logout">${ICONS.logout} Salir</button></div>
    </div>
    <div class="rl-group-title">Comercial</div>
    ${iconoNav('📊', 'Empresa', 'Métricas y Excel', 'Retención, ventas, protocolos, leads y más (maqueta)', 'loc-metricas')}
    <div class="rl-group-title">Operación</div>
    ${iconoNav('🗒️', 'Equipo', 'Tareas', 'Tareas para ti y las que asignaste', 'loc-tareas')}
    ${iconoNav('✅', 'Responsable de sede', 'Checklist del Responsable de Sede', 'Ver cómo va su gestión diaria', 'loc-ck')}
    ${iconoNav('👤', 'Mi cuenta', 'Mi perfil', '', 'loc-perfil')}`;
  document.getElementById('loc-logout').onclick = handleLogout;
  document.getElementById('loc-metricas').onclick = () => renderMetricas(renderLocHome);
  document.getElementById('loc-tareas').onclick = () => renderTareas(renderLocHome);
  badgeTareas('loc-tareas');
  document.getElementById('loc-ck').onclick = () => renderSupervisarChecklist('rs', { volver: renderLocHome });
  document.getElementById('loc-perfil').onclick = () => renderMiPerfil(false);
};

/* =====================================================================
   TAREAS (LOC → RS, RS → Profesor supervisor)
   ===================================================================== */
(function(){
  const st = document.createElement('style');
  st.id = 'roles-css2';
  st.textContent = `
  .mt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
  .mt-tile{background:var(--ink);border:1px solid var(--line);border-radius:8px;padding:10px}
  .mt-tile b{display:block;font-family:Oswald,sans-serif;font-size:22px;color:var(--blue)}
  .mt-tile small{display:block;font-size:11.5px;color:var(--chalk)}
  .mt-tile em{display:block;font-style:normal;font-size:10.5px;color:var(--chalk-dim)}
  .rl-extra{display:flex;gap:8px;flex-wrap:wrap;flex-basis:100%}
  .rl-extra[hidden]{display:none}
  .rl-extra select,.rl-extra input{margin:0;font-size:12px;padding:7px 8px;width:auto;flex:1;min-width:130px}
  `;
  document.head.appendChild(st);
})();
const fmtLimite = (f) => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '';
window.renderTareas = async function(volver){
  root().innerHTML = `<div class="loading">Cargando tareas...</div>`;
  const [rt, ra] = await Promise.all([sb.rpc('tareas_listar'), sb.rpc('asignables_tarea')]);
  if(rt.error){ root().innerHTML = `<div class="error-banner">No se pudieron cargar las tareas: ${esc(rt.error.message)}</div><button class="btn-ghost" id="tr-err">Volver</button>`; $('#tr-err').onclick = volver; return; }
  const todas = rt.data || [], asignables = ra.data || [], hoy = hoyISO();
  const mias = todas.filter(t => t.asignada_a === profile.id);
  const dadas = todas.filter(t => t.creada_por === profile.id);
  const otras = esAdminEstricto() ? todas.filter(t => t.asignada_a !== profile.id && t.creada_por !== profile.id) : [];
  const pendMias = mias.filter(t => t.estado !== 'hecha').length;
  const venc = (t) => t.estado !== 'hecha' && t.fecha_limite && t.fecha_limite < hoy;
  const limite = (t) => (t.fecha_limite ? ' · límite ' + esc(fmtLimite(t.fecha_limite)) : '') + (venc(t) ? ' · <b style="color:var(--red)">vencida</b>' : '');
  const filaMia = (t) => `<div class="ck-item ${t.estado === 'hecha' ? 'is-h' : ''}"><button class="ck-st" type="button" data-hecha="${t.id}" data-est="${t.estado}">${t.estado === 'hecha' ? '✓ Hecha' : '☐ Pendiente'}</button><div class="lbl"><b>${esc(t.titulo)}</b>${t.detalle ? `<div>${esc(t.detalle)}</div>` : ''}<div class="ck-hint" style="margin:3px 0 0">De ${esc(t.creada_por_nombre)}${limite(t)}</div></div></div>`;
  const hechaTxt = (t) => t.hecha_at ? ' · hecha ' + esc(new Date(t.hecha_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '';
  const pill = (t) => `<span class="ck-pill ${t.estado === 'hecha' ? 'full' : venc(t) ? 'low' : 'mid'}" style="flex-shrink:0;min-width:98px">${t.estado === 'hecha' ? '✓ Hecha' : venc(t) ? 'Vencida' : 'Pendiente'}</span>`;
  const filaDada = (t) => `<div class="ck-item ${t.estado === 'hecha' ? 'is-h' : ''}">${pill(t)}<div class="lbl"><b>${esc(t.titulo)}</b>${t.detalle ? `<div>${esc(t.detalle)}</div>` : ''}<div class="ck-hint" style="margin:3px 0 0">Para ${esc(t.asignada_a_nombre)}${limite(t)}${hechaTxt(t)}</div></div><button class="btn-sm" type="button" data-borrar="${t.id}">Quitar</button></div>`;
  const filaOtra = (t) => `<div class="ck-item ${t.estado === 'hecha' ? 'is-h' : ''}">${pill(t)}<div class="lbl"><b>${esc(t.titulo)}</b><div class="ck-hint" style="margin:3px 0 0">De ${esc(t.creada_por_nombre)} para ${esc(t.asignada_a_nombre)}${limite(t)}${hechaTxt(t)}</div></div></div>`;
  root().innerHTML = `${cabecera('Tareas', 'tr-volver')}
    ${asignables.length ? `<div class="card"><h2>Asignar una tarea</h2>
      <label>Para</label><select id="tr-para">${asignables.map(a => `<option value="${a.id}">${esc(a.nombre)} · ${esc(a.etiqueta)}</option>`).join('')}</select>
      <label>Tarea</label><input type="text" id="tr-titulo" maxlength="200" placeholder="Qué hay que hacer">
      <label>Detalle (opcional)</label><textarea id="tr-detalle" maxlength="2000"></textarea>
      <label>Fecha límite (opcional)</label><input type="date" id="tr-limite">
      <button class="btn" id="tr-crear">Asignar tarea</button></div>` : ''}
    ${mias.length || !esAdminEstricto() ? `<div class="card"><h2>Mis tareas${pendMias ? ' · ' + pendMias + ' pendiente' + (pendMias === 1 ? '' : 's') : ''}</h2>${mias.length ? mias.map(filaMia).join('') : '<p class="ck-hint">No tienes tareas asignadas.</p>'}</div>` : ''}
    ${asignables.length || dadas.length ? `<div class="card"><h2>Tareas que asigné</h2>${dadas.length ? dadas.map(filaDada).join('') : '<p class="ck-hint">Aún no has asignado tareas.</p>'}</div>` : ''}
    ${otras.length ? `<div class="card"><h2>Otras tareas del equipo</h2>${otras.map(filaOtra).join('')}</div>` : ''}`;
  $('#tr-volver').onclick = volver;
  const recargar = () => renderTareas(volver);
  const crear = $('#tr-crear');
  if(crear) crear.onclick = async () => {
    const titulo = $('#tr-titulo').value.trim();
    if(!titulo){ showToast('Escribe qué hay que hacer'); return; }
    crear.disabled = true;
    const { error } = await sb.from('tareas').insert({ titulo, detalle: $('#tr-detalle').value.trim(), asignada_a: $('#tr-para').value, fecha_limite: $('#tr-limite').value || null, creada_por: profile.id });
    if(error){ crear.disabled = false; showToast('No se pudo asignar: ' + error.message); return; }
    showToast('Tarea asignada');
    recargar();
  };
  document.querySelectorAll('[data-hecha]').forEach(b => {
    b.onclick = async () => {
      b.disabled = true;
      const nuevo = b.getAttribute('data-est') === 'hecha' ? 'pendiente' : 'hecha';
      const { error } = await sb.from('tareas').update({ estado: nuevo }).eq('id', b.getAttribute('data-hecha'));
      if(error){ b.disabled = false; showToast('No se pudo actualizar: ' + error.message); return; }
      recargar();
    };
  });
  document.querySelectorAll('[data-borrar]').forEach(b => {
    b.onclick = async () => {
      if(b.dataset.ok !== '1'){ b.dataset.ok = '1'; b.textContent = '¿Seguro?'; setTimeout(() => { if(b.isConnected){ b.dataset.ok = ''; b.textContent = 'Quitar'; } }, 3000); return; }
      b.disabled = true;
      const { error } = await sb.from('tareas').delete().eq('id', b.getAttribute('data-borrar'));
      if(error){ b.disabled = false; showToast('No se pudo quitar: ' + error.message); return; }
      recargar();
    };
  });
};
async function badgeTareas(idBoton){
  try {
    const { data } = await sb.rpc('tareas_listar');
    const n = (data || []).filter(t => t.asignada_a === profile.id && t.estado !== 'hecha').length;
    const el = document.querySelector('#' + idBoton + ' em');
    if(el) el.textContent = n ? n + ' pendiente' + (n === 1 ? '' : 's') + ' para ti' : 'Sin tareas pendientes para ti';
  } catch(e){}
}

/* =====================================================================
   MÉTRICAS DE LA EMPRESA (maqueta: se conectan los Excel después)
   ===================================================================== */
const FUENTES = [
  { k: 'kpi', ico: '📊', t: 'KPIs de la empresa', sub: 'Planilla general de KPIs', tiles: [['Retención de sede', 'Meta ≥ 85%'], ['Casos pendientes', ''], ['Venta vs. meta', '']] },
  { k: 'retencion', ico: '🔁', t: 'Retención', sub: 'Dashboard de retención', tiles: [['Retención de sede', 'Meta ≥ 85%'], ['Bajas del mes', ''], ['Alumnos en riesgo', '']] },
  { k: 'protocolos', ico: '📋', t: 'Protocolos', sub: 'Excel de protocolos', tiles: [['Protocolos al día', 'Meta ≥ 90%'], ['Entrevistas', ''], ['Evaluaciones', ''], ['Planificaciones Wizfit', '']] },
  { k: 'ventas', ico: '💰', t: 'Ventas', sub: 'Excel de ventas: cuánto llevamos vendido', tiles: [['Venta acumulada', ''], ['Meta del mes', ''], ['Avance vs. meta', '']] },
  { k: 'leads', ico: '🎯', t: 'Leads y clases de prueba', sub: 'Excel de leads: clases de prueba del día y profesor asignado', tiles: [['Clases de prueba hoy', ''], ['Confirmadas', ''], ['No-show', 'Referencia < 20%']], tabla: true },
  { k: 'leads_presenciales', ico: '🚶', t: 'Leads presenciales', sub: 'Excel de leads presenciales', tiles: [['Leads del mes', ''], ['Convertidos', '']] },
  { k: 'liquidos', ico: '🥤', t: 'Venta de líquidos', sub: 'Excel de venta de líquidos', tiles: [['Venta del mes', ''], ['Unidades', '']] },
  { k: 'map', ico: '🗺️', t: 'App Map', sub: 'Aplicación administrativa de leads presenciales · se evaluará una conexión por API', tiles: [] },
  { k: 'evo', ico: '🔌', t: 'EVO', sub: 'Conexión directa por API (más adelante)', tiles: [] }
];
const tablaEjemplo = () => `<p class="ck-hint" style="margin-top:12px"><b>Clases de prueba de hoy</b> · datos de muestra, no son reales</p>
  <table class="ck-table"><tr><th>HORA</th><th>LEAD</th><th>PROFESOR ASIGNADO</th><th>ESTADO</th></tr>
  <tr><td>10:00</td><td>Lead de ejemplo 1</td><td>Profesor de ejemplo</td><td>Confirmada</td></tr>
  <tr><td>18:30</td><td>Lead de ejemplo 2</td><td>Profesora de ejemplo</td><td>Por confirmar</td></tr></table>`;
window.renderMetricas = async function(volver, claves, titulo){
  claves = claves || FUENTES.map(f => f.k);
  titulo = titulo || 'Métricas de la empresa';
  root().innerHTML = `<div class="loading">Cargando...</div>`;
  const m = await cargarConexiones();
  if(!m){ root().innerHTML = `<div class="error-banner">No se pudieron cargar los paneles.</div><button class="btn-ghost" id="mt-err">Volver</button>`; $('#mt-err').onclick = volver; return; }
  const edit = esGestor();
  const fuentes = FUENTES.filter(f => claves.includes(f.k));
  root().innerHTML = `${cabecera(titulo, 'mt-volver')}
    <div class="ck-banner" style="background:rgba(255,255,0,.1);border:1px solid var(--blue)"><b>MAQUETA.</b> Así se verá cada panel. Los números aparecen como «—» hasta conectar el Excel; mientras tanto puedes dejar el enlace para abrirlo directo.</div>
    ${fuentes.map(f => { const x = m[f.k] || { url: '', nota: '' }; const ok = urlSegura(x.url);
      return `<div class="card"><div class="ck-sec-h"><span style="font-size:22px">${f.ico}</span><div style="flex:1"><h2 style="margin:0">${esc(f.t)}</h2><p class="ck-hint" style="margin:2px 0 0">${esc(f.sub)}</p></div><span class="ck-chip">Sin conectar</span></div>
        ${f.tiles.length ? `<div class="mt-grid">${f.tiles.map(t => `<div class="mt-tile"><b>—</b><small>${esc(t[0])}</small><em>${esc(t[1])}</em></div>`).join('')}</div>` : ''}
        ${f.tabla ? tablaEjemplo() : ''}
        ${ok ? `<a class="btn" href="${esc(ok)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;margin-top:10px">Abrir enlace</a>` : '<p class="ck-hint" style="margin-top:10px">Aún sin enlace.</p>'}
        ${edit ? `<label style="margin-top:12px">Enlace</label><input type="url" id="cx-url-${f.k}" value="${esc(x.url)}" placeholder="https://..."><label>Nota</label><input type="text" id="cx-nota-${f.k}" value="${esc(x.nota)}"><button class="btn-sm" data-guardar="${f.k}">Guardar</button>` : ''}
      </div>`; }).join('')}`;
  $('#mt-volver').onclick = volver;
  document.querySelectorAll('[data-guardar]').forEach(b => {
    b.onclick = async () => {
      const k = b.getAttribute('data-guardar');
      const url = $('#cx-url-' + k).value.trim();
      if(url && !urlSegura(url)){ showToast('El enlace no es válido (debe empezar con https://)'); return; }
      b.disabled = true;
      const { error } = await sb.from('conexiones_externas').update({ url, nota: $('#cx-nota-' + k).value.trim(), updated_at: new Date().toISOString() }).eq('clave', k);
      b.disabled = false;
      if(error){ showToast('No se pudo guardar: ' + error.message); return; }
      showToast('Guardado');
      renderMetricas(volver, claves, titulo);
    };
  });
};

// Frase para la imagen que el alumno comparte en redes: "junto a mi profesor/a ..."
window.textoJuntoProfesor = async function(){
  try {
    if(!profile || profile.role !== 'alumno' || !profile.profesor_id) return '';
    let c = window.__profeCompartir;
    if(!c || c.id !== profile.profesor_id){
      const { data } = await sb.rpc('perfil_profesor', { p_id: profile.profesor_id });
      const p = Array.isArray(data) ? data[0] : data;
      if(!p || !p.nombre) return '';
      const pp = (p.perfil_pro && typeof p.perfil_pro === 'object') ? p.perfil_pro : {};
      const nombre = String(pp.nombre_compartir || String(p.nombre).trim().split(/\s+/)[0]).trim();
      let trat = pp.tratamiento;
      if(trat !== 'profesor' && trat !== 'profesora') trat = /a$/i.test(nombre.split(/\s+/)[0]) ? 'profesora' : 'profesor';
      c = window.__profeCompartir = { id: p.id, nombre, trat };
    }
    return ('JUNTO A MI ' + c.trat + ' ' + c.nombre).toUpperCase();
  } catch(e){ return ''; }
};


window.addEventListener('beforeunload', (e) => { if(K.dirty && !K.ro){ e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && K.dirty && !K.ro) ckFlush(); });
})();
