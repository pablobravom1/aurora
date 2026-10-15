// STC App — PANEL CEO (solo lectura): el pulso de la sede en una pantalla.
// Los números vienen de los Excel de STC (se cargan en la tabla ceo_datos: PAGOS MES, NOTAS - GASTOS,
// DASHBOARD MES, EXCEL DE BAJAS, PROTOCOLOS STC y SEGUIMIENTO LEADS ONLINE) y, cuando las vendedoras
// registren en la app, el embudo comercial sale en vivo del módulo de ventas.
// Lo ve el perfil CEO al entrar; RS y administradores lo abren desde su inicio. Se carga después de ventas.js.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const IC = (n) => (typeof ICONS !== 'undefined' && ICONS[n]) ? ICONS[n] : '';
  const $id = (id) => document.getElementById(id);
  const esRol = (...r) => !!profile && r.includes(profile.role);

  // ---------------------------------------------------------------- utilidades
  const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MESC = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hoyISO = () => iso(new Date());
  const mesLargo = (ym) => MESL[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4);
  const mesCorto = (ym) => MESC[+ym.slice(5) - 1];
  const mesAnterior = (ym) => { let y = +ym.slice(0, 4), m = +ym.slice(5) - 1; if(!m){ m = 12; y--; } return y + '-' + String(m).padStart(2, '0'); };
  const diasDelMes = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate();
  const mesRango = (ym) => [ym + '-01', ym + '-' + String(diasDelMes(ym)).padStart(2, '0')];
  const fCorta = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.getDate() + ' ' + MESC[d.getMonth()].toLowerCase(); };
  const num = (v) => (v == null || v === '' || isNaN(v)) ? null : Number(v);
  const plata = (v) => v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CL');
  const millones = (v) => '$' + (v / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
  const pctDe = (a, b) => (a == null || !b) ? null : Math.round(a / b * 1000) / 10;
  const pctTxt = (v) => v == null ? '—' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';
  const entero = (v) => v == null ? '—' : Math.round(v).toLocaleString('es-CL');
  const clave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/)[0];
  // Semáforos de STC (guías del RS)
  const semRet = (v) => v == null ? '' : v >= 90 ? 'v' : v >= 85 ? 'a' : 'r';
  const semProt = (v) => v == null ? '' : v >= 95 ? 'v' : v >= 90 ? 'a' : v >= 85 ? 'r' : 'c';
  const semConv = (v) => v == null ? '' : v >= 80 ? 'v' : v >= 70 ? 'a' : 'r';
  const semNoShow = (v) => v == null ? '' : v < 20 ? 'v' : v < 25 ? 'a' : 'r';
  const COL = { v:'var(--cx-ok)', a:'var(--cx-am)', r:'var(--cx-ro)', c:'var(--cx-cr)', '':'#555' };
  const Y = '#FFFF66', G = '#FFD166', OK = '#5EE3B6', RO = '#FF6B72', CR = '#8E1F24', AZ = '#7cc4ff', DIM = '#A8A8A8', GRID = 'rgba(255,255,255,.06)';
  const HEX = { v:OK, a:G, r:RO, c:CR, '':DIM };

  // ---------------------------------------------------------------- estilos (prefijo cx- para no chocar con la app)
  const css = document.createElement('style');
  css.textContent = `
  .cx{--cx-ok:#5EE3B6;--cx-am:#FFD166;--cx-ro:#FF6B72;--cx-cr:#C0392B;--cx-ye:#FFFF66;--cx-dim:#A8A8A8;padding-bottom:50px}
  .cx-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px}
  .cx-top small{display:block;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.16em;color:var(--cx-dim)}
  .cx-top b{display:block;font:600 28px/1.1 Oswald,sans-serif;color:#FBFBFB;margin-top:2px}
  .cx-ctr{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .cx-ctr select{margin:0;width:auto;min-width:150px;padding:8px 10px;border-radius:10px}
  .cx-ctr .switch-user{white-space:nowrap}
  .cx-vivo{display:inline-flex;align-items:center;gap:7px;font:600 11px 'IBM Plex Mono',monospace;color:var(--cx-ok);background:rgba(94,227,182,.1);border:1px solid rgba(94,227,182,.3);border-radius:99px;padding:5px 11px;white-space:nowrap}
  .cx-vivo i{width:7px;height:7px;border-radius:50%;background:var(--cx-ok);animation:cxPulso 1.8s infinite}
  @keyframes cxPulso{70%{box-shadow:0 0 0 7px rgba(94,227,182,0)}100%{box-shadow:0 0 0 0 rgba(94,227,182,0)}}
  .cx-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
  .cx-kp{position:relative;padding:13px 13px 11px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(40,40,40,.95),rgba(24,24,24,.98));overflow:hidden;min-width:0}
  .cx-kp::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:0 4px 4px 0;background:var(--c)}
  .cx-kp small{display:block;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:var(--cx-dim);text-transform:uppercase}
  .cx-kp b{display:block;font:600 27px/1.1 Oswald,sans-serif;color:#FBFBFB;margin:6px 0 3px;font-variant-numeric:tabular-nums}
  .cx-kp span{display:flex;justify-content:space-between;gap:6px;font-size:11.5px;color:var(--cx-dim)}
  .cx-kp em{font-style:normal;font-weight:700;color:var(--c);white-space:nowrap}
  .cx-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;margin-bottom:12px}
  .cx-pn{grid-column:span 12;padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(36,36,36,.96),rgba(22,22,22,.98));min-width:0}
  .cx-pi{grid-column:span 12;min-width:0}
  .cx-pn h3{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;margin:0 0 4px;font:600 16px Oswald,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#FBFBFB}
  .cx-pn h3 small{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--cx-dim);text-transform:none}
  .cx-pn p.cx-sb{margin:0 0 12px;font-size:12.5px;color:var(--cx-dim);line-height:1.45}
  .cx-cv{position:relative;height:230px}
  .cx-cv.alto{height:280px}
  .cx-al{display:flex;gap:10px;align-items:flex-start;padding:10px 11px;margin:0 0 7px;border-radius:12px;background:rgba(255,107,114,.07);border:1px solid rgba(255,107,114,.25);font-size:13px;line-height:1.45}
  .cx-al.am{background:rgba(255,209,102,.07);border-color:rgba(255,209,102,.28)}
  .cx-al.ok{background:rgba(94,227,182,.07);border-color:rgba(94,227,182,.28)}
  .cx-al b{display:block;color:#FBFBFB;font-weight:600}
  .cx-al span{color:#BDBDBD;font-size:12px}
  .cx-al i{flex:none;font-style:normal;font-size:15px;margin-top:1px}
  .cx-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cx-tb{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
  .cx-tb th{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--cx-dim);text-align:right;padding:6px;border-bottom:1px solid #2c2c2c;white-space:nowrap}
  .cx-tb th:first-child,.cx-tb td:first-child{text-align:left}
  .cx-tb td{padding:8px 6px;border-bottom:1px solid #222;text-align:right;color:#E8E8E8;white-space:nowrap}
  .cx-pt{display:inline-block;min-width:50px;text-align:center;padding:2px 7px;border-radius:99px;font:700 11px 'IBM Plex Mono',monospace;color:#DDD;background:#2b2b2b}
  .cx-pt.v{color:#0d3326;background:var(--cx-ok)}.cx-pt.a{color:#3a2a00;background:var(--cx-am)}.cx-pt.r{color:#fff;background:#D9434B}.cx-pt.c{color:#fff;background:#8E1F24}
  .cx-pp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
  .cx-pp div{padding:10px 6px;border-radius:12px;background:#151515;border:1px solid #262626;text-align:center;min-width:0}
  .cx-pp small{display:block;font:600 9px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--cx-dim)}
  .cx-pp b{display:block;font:600 21px Oswald,sans-serif;margin-top:3px}
  .cx-mv{margin:8px 0 6px}
  .cx-mv-t{display:flex;justify-content:space-between;align-items:baseline;gap:6px 10px;flex-wrap:wrap;margin-bottom:8px}
  .cx-mv-t span{font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:var(--cx-dim);text-transform:uppercase}
  .cx-mv-t b{font:600 24px Oswald,sans-serif;color:#FBFBFB;font-variant-numeric:tabular-nums}
  .cx-mv-t b small{font:500 13px Inter,sans-serif;color:var(--cx-dim)}
  .cx-mv-bar{position:relative;height:12px;border-radius:99px;background:#262626}
  .cx-mv-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#FFFF00,#FFFB8A)}
  .cx-mv-bar em{position:absolute;top:-4px;height:20px;border-left:2px dashed #FBFBFB}
  .cx-mv-nota{margin:7px 0 0;font:600 10.5px 'IBM Plex Mono',monospace;color:#CFCFCF}
  .cx-sd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}
  .cx-sd.uno{grid-template-columns:1fr;margin-top:8px}
  .cx-sd div{padding:10px 12px;border-radius:12px;background:#151515;border:1px solid #262626;min-width:0}
  .cx-sd small{display:block;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:var(--cx-dim);text-transform:uppercase}
  .cx-sd b{display:block;font:600 21px Oswald,sans-serif;color:#FBFBFB;margin:3px 0 2px;font-variant-numeric:tabular-nums}
  .cx-sd b.v{color:var(--cx-ok)}.cx-sd b.a{color:var(--cx-am)}.cx-sd b.r,.cx-sd b.c{color:var(--cx-ro)}
  .cx-sd span{display:block;font-size:11.5px;color:var(--cx-dim);line-height:1.4}
  .cx-sd.uno div{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:10px}
  .cx-sd.uno b{grid-row:span 2;grid-column:2;margin:0}
  .cx-ta{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #222;font-size:13px}
  .cx-ta:last-child{border-bottom:0}
  .cx-ta .f{flex:none;width:58px;font:600 11px 'IBM Plex Mono',monospace;color:var(--cx-dim);text-transform:uppercase}
  .cx-ta .t{flex:1;min-width:0;color:#E6E6E6}
  .cx-st{flex:none;font:700 10.5px 'IBM Plex Mono',monospace;padding:3px 8px;border-radius:99px;color:#DDD;background:#2b2b2b}
  .cx-st.h{color:#0d3326;background:var(--cx-ok)}.cx-st.x{color:#fff;background:#D9434B}
  .cx-vacio{padding:18px 14px;border:1px dashed rgba(255,255,255,.18);border-radius:14px;text-align:center;color:#A8A8A8;font-size:12.5px;line-height:1.5}
  .cx-fu{margin:6px 2px 0;font-size:11.5px;color:#8A8A8A;line-height:1.7}
  .cx-fu b{color:#CFCFCF;font-weight:600}
  .cx button:focus-visible,.cx select:focus-visible{outline:2px solid var(--cx-ye);outline-offset:2px}

  /* ---------- Computador: el panel usa todo el ancho y las secciones se ordenan en columnas ---------- */
  @media (min-width:700px){
    .cx-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
    .cx-sd{grid-template-columns:repeat(3,minmax(0,1fr))}
  }
  @media (min-width:900px){
    .wrap:has(.cx){max-width:1220px}
    .cx-s4{grid-column:span 4}.cx-s6{grid-column:span 6}.cx-s8{grid-column:span 8}
    .cx-cv{height:250px}.cx-cv.alto{height:300px}
  }
  @media (min-width:1100px){
    .cx-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}
  }
  @media (prefers-reduced-motion: reduce){.cx-vivo i{animation:none}}
  `;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- datos
  const S = { mes: hoyISO().slice(0, 7), datos:{}, meses:[], charts:[], equipo:[] };
  const fila = (mes, sec) => (S.datos[mes] && S.datos[mes][sec]) || null;
  const D = (mes, sec) => { const f = fila(mes, sec); return f ? (f.datos || {}) : null; };

  async function cargarDatos(){
    const [{ data, error }, eq] = await Promise.all([
      sb.from('ceo_datos').select('mes,seccion,datos,fuente,corte,actualizado_at').order('mes'),
      sb.rpc('ventas_equipo')
    ]);
    if(error) throw error;
    const por = {};
    (data || []).forEach(r => { (por[r.mes] = por[r.mes] || {})[r.seccion] = r; });
    S.datos = por;
    S.meses = Object.keys(por).sort();
    S.equipo = (eq && !eq.error && eq.data) || [];
  }

  // Embudo comercial en vivo desde el módulo de ventas de la app (si ya hay registros ese mes)
  async function comercialApp(mes){
    const [desde, hasta] = mesRango(mes);
    const hoy = hoyISO(), corte = hasta < hoy ? hasta : hoy;
    const [l, p] = await Promise.all([
      sb.from('ventas_leads_diarios').select('canal,cantidad').gte('fecha', desde).lte('fecha', hasta),
      sb.from('ventas_prospectos').select('estado,confirmacion,fecha_visita,coach_id').gte('fecha_visita', desde).lte('fecha_visita', hasta)
    ]);
    const L = (l && l.data) || [], P = (p && p.data) || [];
    if(!L.length && !P.length) return null;
    const canales = {}; L.forEach(x => { canales[x.canal] = (canales[x.canal] || 0) + (num(x.cantidad) || 0); });
    const leads = L.length ? Object.values(canales).reduce((a, b) => a + b, 0) : null;
    if(!P.length) return { leads, canales };
    const debian = P.filter(x => x.fecha_visita <= corte && !['reagendado','descartado'].includes(x.estado));
    const asistio = (x) => ['asistio','compro','compromiso','no_compro'].includes(x.estado);
    const nombre = (id) => { const e = S.equipo.find(q => q.id === id); return e ? String(e.nombre).split(/\s+/)[0] : 'Sin coach'; };
    const pc = {};
    debian.forEach(x => { const k = nombre(x.coach_id); const c = pc[k] = pc[k] || { coach:k, asignadas:0, asistidas:0, vendidas:0, no_show:0 }; c.asignadas++; if(asistio(x)) c.asistidas++; if(x.estado === 'compro') c.vendidas++; if(x.estado === 'no_asistio') c.no_show++; });
    return { leads, canales, agendadas:P.length, confirmadas:P.filter(x => x.confirmacion === 'confirmada').length, debian:debian.length, asistidas:debian.filter(asistio).length, vendidas:debian.filter(x => x.estado === 'compro').length, no_show:debian.filter(x => x.estado === 'no_asistio').length, por_coach:Object.values(pc), envivo:true };
  }

  // ---------------------------------------------------------------- piezas de interfaz
  const vacio = (txt) => `<div class="cx-vacio">${txt}</div>`;
  const delta = (v, prev) => { if(v == null || prev == null) return ''; const d = Math.round((v - prev) * 10) / 10; if(!d) return '➡ igual'; return (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('es-CL'); };
  const kp = (t, val, sub, sem, dl) => `<div class="cx-kp" style="--c:${COL[sem || '']}"><small>${t}</small><b>${val}</b><span>${sub}${dl ? ` <em title="vs. mes anterior">${dl}</em>` : ''}</span></div>`;
  const sd = (t, val, sub, cls) => `<div><small>${t}</small><b class="${cls || ''}">${val}</b><span>${sub}</span></div>`;
  const pill = (v, sem) => `<span class="cx-pt ${sem(v)}">${pctTxt(v)}</span>`;

  function lineaMeta(v, txt){
    return { id:'meta' + v, afterDatasetsDraw(c){
      const { ctx, chartArea:a } = c, horiz = c.options.indexAxis === 'y', s = horiz ? c.scales.x : c.scales.y;
      if(!s) return; const p = s.getPixelForValue(v);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,102,.75)'; ctx.lineWidth = 1.2; ctx.beginPath();
      if(horiz){ ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
      ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = Y; ctx.font = '600 10px IBM Plex Mono'; ctx.textAlign = horiz ? 'left' : 'right';
      if(horiz) ctx.fillText(txt, p + 4, a.top + 10); else ctx.fillText(txt, a.right - 4, p - 5);
      ctx.restore();
    } };
  }
  function grafico(id, cfg){
    const el = $id(id); if(!el || !window.Chart) return;
    Chart.defaults.color = DIM; Chart.defaults.font.family = 'Inter, sans-serif'; Chart.defaults.font.size = 11; Chart.defaults.borderColor = GRID;
    S.charts.push(new Chart(el, cfg));
  }

  // ---------------------------------------------------------------- pantalla
  async function renderPanelCeo(){
    try{ if(typeof cleanupSocialRealtime === 'function') cleanupSocialRealtime(); }catch(_e){}
    const esCeo = esRol('ceo');
    root().innerHTML = `<div class="cx">
      <div class="cx-top">
        <div><small>PANEL CEO · SOLO LECTURA</small><b>Pulso de la sede</b></div>
        <div class="cx-ctr">
          <span class="cx-vivo" id="cx-corte" hidden></span>
          <select id="cx-mes" aria-label="Mes"></select>
          ${window.UCVentas ? '<button type="button" class="switch-user" id="cx-ventas">📈 Ventas</button>' : ''}
          <button type="button" class="switch-user" id="cx-act">↻ Actualizar</button>
          ${esCeo ? `<button type="button" class="switch-user" id="btn-logout">${IC('logout')} Salir</button>` : `<button type="button" class="switch-user" id="cx-volver">${IC('arrowLeft')} Volver</button>`}
        </div>
      </div>
      <div id="cx-cuerpo"><div class="loading">Cargando el panel...</div></div>
    </div>`;
    const lo = $id('btn-logout'); if(lo && typeof handleLogout === 'function') lo.onclick = handleLogout;
    const vo = $id('cx-volver'); if(vo) vo.onclick = () => renderCoachHome();
    const ve = $id('cx-ventas'); if(ve) ve.onclick = () => window.UCVentas.abrir('dashboard');
    $id('cx-act').onclick = () => renderPanelCeo();
    try{ await cargarDatos(); }
    catch(err){ $id('cx-cuerpo').innerHTML = vacio('No se pudo cargar el panel.<br><small>' + esc(err && err.message || '') + '</small>'); return; }
    const meses = [...new Set([...S.meses, hoyISO().slice(0, 7)])].sort().reverse();
    if(!meses.includes(S.mes)) S.mes = meses[0];
    const sel = $id('cx-mes');
    sel.innerHTML = meses.map(m => `<option value="${m}" ${m === S.mes ? 'selected' : ''}>${mesLargo(m)}</option>`).join('');
    sel.onchange = () => { S.mes = sel.value; pintar(); };
    pintar();
  }

  async function pintar(){
    const cont = $id('cx-cuerpo'); if(!cont) return;
    S.charts.forEach(c => { try{ c.destroy(); }catch(_e){} }); S.charts = [];
    const m = S.mes, ant = mesAnterior(m), dm = diasDelMes(m);
    const ven = D(m, 'ventas'), inv = D(m, 'inversion'), ret = D(m, 'retencion'), baj = D(m, 'bajas'), pro = D(m, 'protocolos'), sco = D(m, 'scorecard'), plan = D(m, 'plan_rs');
    let com = D(m, 'comercial'), comFuente = fila(m, 'comercial') ? fila(m, 'comercial').fuente : null;
    let app = null; try{ app = await comercialApp(m); }catch(_e){}
    if(app && app.agendadas){ com = app; comFuente = 'Módulo de ventas de la app (en vivo)'; }
    else if(app && app.leads != null){ com = Object.assign({}, com || {}, { leads: app.leads, canales: app.canales }); }

    // --- indicadores principales
    const retPct = (r) => r ? (num(r.pct) != null ? num(r.pct) : pctDe(num(r.renovados), num(r.por_renovar))) : null;
    const comPct = (c, a, b) => c ? pctDe(num(c[a]), num(c[b])) : null;
    const rP = retPct(ret), rA = retPct(D(ant, 'retencion'));
    const pP = pro ? num(pro.total) : null, pA = D(ant, 'protocolos') ? num(D(ant, 'protocolos').total) : null;
    const corteDia = ven && num(ven.corte_dia) ? num(ven.corte_dia) : (m === hoyISO().slice(0, 7) ? new Date().getDate() : dm);
    const vP = ven && num(ven.meta) ? pctDe(num(ven.monto), num(ven.meta)) : null;
    const esperado = Math.round(corteDia / dm * 100);
    const cvP = comPct(com, 'vendidas', 'asistidas'), cvA = comPct(D(ant, 'comercial'), 'vendidas', 'asistidas');
    const nsP = comPct(com, 'no_show', 'debian'), nsA = comPct(D(ant, 'comercial'), 'no_show', 'debian');
    const patP = ven && ven.pat ? pctDe(num(ven.pat.n), num(ven.pat.de)) : null, patA = D(ant, 'ventas') && D(ant, 'ventas').pat ? pctDe(num(D(ant, 'ventas').pat.n), num(D(ant, 'ventas').pat.de)) : null;
    const semVentas = vP == null ? '' : vP >= esperado ? 'v' : vP >= esperado - 10 ? 'a' : 'r';

    // --- corte de los datos
    const cortes = ['ventas','retencion','protocolos','comercial','inversion','bajas'].map(s => fila(m, s) && (fila(m, s).corte || String(fila(m, s).actualizado_at).slice(0, 10))).filter(Boolean).sort();
    const bc = $id('cx-corte');
    if(bc){ bc.hidden = !cortes.length && !(com && com.envivo); bc.innerHTML = `<i></i> ${com && com.envivo ? 'Comercial en vivo · ' : ''}${cortes.length ? 'datos al ' + fCorta(cortes[cortes.length - 1]) : ''}`; }

    // --- alertas (solo lo que está bajo el estándar de STC)
    const al = [];
    if(rP != null && rP < 90) al.push([rP < 85 ? 'r' : 'am', 'Retención de la sede: ' + pctTxt(rP), 'Meta 90%' + (ret && ret.no_renovados != null ? ' · ' + ret.no_renovados + ' no renovaron' : '')]);
    if(ret && Array.isArray(ret.por_coach)){ const bajos = ret.por_coach.filter(c => num(c.por_renovar) >= 5 && pctDe(num(c.renovados), num(c.por_renovar)) < 82); if(bajos.length) al.push(['r', bajos.length + ' coach' + (bajos.length === 1 ? '' : 'es') + ' con renovación bajo 82%', bajos.map(c => c.coach + ' ' + pctTxt(pctDe(num(c.renovados), num(c.por_renovar)))).join(' · ')]); }
    if(pP != null && pP < 95){ const peor = [['Entrevistas', num(pro.entrevistas)], ['Mediciones', num(pro.mediciones)], ['Macrociclos', num(pro.macrociclos)]].filter(x => x[1] != null).sort((a, b) => a[1] - b[1])[0]; al.push([pP < 90 ? 'r' : 'am', 'Protocolos: ' + pctTxt(pP), 'Meta 95%' + (peor ? ' · el más bajo: ' + peor[0].toLowerCase() + ' ' + pctTxt(peor[1]) : '')]); }
    if(pro && Array.isArray(pro.por_coach)){ const cr = pro.por_coach.filter(c => num(c.total) < 85); if(cr.length) al.push(['r', cr.length + ' coach' + (cr.length === 1 ? '' : 'es') + ' en protocolos críticos (bajo 85%)', cr.map(c => c.coach + ' ' + pctTxt(num(c.total))).join(' · ')]); }
    if(vP != null && vP < esperado - 5) al.push(['am', 'Ventas bajo el ritmo: ' + pctTxt(vP) + ' de la meta', 'Al día ' + corteDia + ' debería ir en ' + esperado + '%']);
    if(cvP != null && cvP < 80) al.push([cvP < 70 ? 'r' : 'am', 'Conversión de CP asistidas: ' + pctTxt(cvP), 'Meta 80% · ' + com.vendidas + ' de ' + com.asistidas]);
    if(nsP != null && nsP >= 20) al.push([nsP >= 25 ? 'r' : 'am', 'No-show de clases de prueba: ' + pctTxt(nsP), 'Referencia bajo 20% · ' + com.no_show + ' de ' + com.debian + ' no llegaron']);
    if(com && !com.envivo && com.agendadas && com.confirmadas == null) al.push(['am', 'Confirmaciones de CP sin registrar', 'La meta es 100% confirmadas; en el Excel la columna está vacía']);

    // --- textos de apoyo
    const canalesTxt = (c) => c ? Object.entries(c).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1) + ' ' + entero(v)).join(' · ') : '';
    const cn = ven && ven.clientes_nuevos ? ven.clientes_nuevos : null;
    const cac = inv && cn && num(cn.n) ? num(inv.total) / num(cn.n) : null;
    const etapas = com && com.agendadas ? [['Leads', num(com.leads)], ['CP agendadas', num(com.agendadas)], ['CP confirmadas', num(com.confirmadas)], ['CP asistidas', num(com.asistidas)], ['Vendidas', num(com.vendidas)]].filter(x => x[1] != null) : [];
    let quiebre = '';
    if(etapas.length > 2){ let peor = null; for(let i = 1; i < etapas.length; i++){ const p = etapas[i - 1][1] ? etapas[i][1] / etapas[i - 1][1] : 1; if(etapas[i - 1][0] !== 'Leads' && (!peor || p < peor.p)) peor = { p, de: etapas[i - 1][0], a: etapas[i][0] }; } if(peor) quiebre = `El mayor quiebre está entre ${peor.de} y ${peor.a.replace('Vendidas', 'vendidas')} (pasa el ${pctTxt(Math.round(peor.p * 1000) / 10)}).`; }
    const cartera = (nombre) => { const k = clave(nombre); const r = ret && Array.isArray(ret.por_coach) ? ret.por_coach.find(c => clave(c.coach) === k) : null; if(r && num(r.activos) != null) return num(r.activos); const e = S.equipo.find(q => clave(q.nombre) === k); return e ? num(e.alumnos) : null; };

    // --- series históricas
    const serie = (sec, f) => S.meses.filter(x => x <= m && D(x, sec)).map(x => [x, f(D(x, sec), x)]).filter(x => x[1] != null).slice(-12);
    const sRet = serie('retencion', d => retPct(d));
    const sVen = serie('ventas', d => num(d.monto));
    const sInv = serie('inversion', d => num(d.total));
    const sCac = S.meses.filter(x => x <= m && D(x, 'inversion') && D(x, 'ventas') && D(x, 'ventas').clientes_nuevos && num(D(x, 'ventas').clientes_nuevos.n)).map(x => [x, Math.round(num(D(x, 'inversion').total) / num(D(x, 'ventas').clientes_nuevos.n))]).slice(-12);
    const metaDe = (x) => D(x, 'ventas') && num(D(x, 'ventas').meta);
    const parcial = (x) => D(x, 'ventas') && num(D(x, 'ventas').corte_dia) && num(D(x, 'ventas').corte_dia) < diasDelMes(x);

    const mesTxt = mesLargo(m).split(' ')[0].toLowerCase() + (ven && ven.corte_dia && num(ven.corte_dia) < dm ? ' al día ' + ven.corte_dia : '');

    cont.innerHTML = `
      <section class="cx-kpis" aria-label="Indicadores principales">
        ${kp('Retención', pctTxt(rP), 'meta 90%', semRet(rP), delta(rP, rA))}
        ${kp('Protocolos', pctTxt(pP), 'meta 95%', semProt(pP), delta(pP, pA))}
        ${kp('Ventas vs meta', pctTxt(vP), vP == null ? 'sin meta cargada' : 'esperado ' + esperado + '%', semVentas, vP != null ? (vP >= esperado ? '▲ ' : '▼ ') + Math.abs(Math.round((vP - esperado) * 10) / 10).toLocaleString('es-CL') : '')}
        ${kp('Conversión CP', pctTxt(cvP), 'meta 80%', semConv(cvP), delta(cvP, cvA))}
        ${kp('No-show CP', pctTxt(nsP), 'ref. bajo 20%', semNoShow(nsP), delta(nsP, nsA))}
        ${kp('Ventas con PAT', pctTxt(patP), 'ref. 75%', patP == null ? '' : patP >= 75 ? 'v' : 'a', delta(patP, patA))}
      </section>

      <div class="cx-grid">
        <section class="cx-pn cx-s8" aria-label="Ventas del mes">
          <h3>Ventas del mes <small>${esc(mesTxt)}</small></h3>
          ${ven ? `<div class="cx-mv"><div class="cx-mv-t"><span>Meta de ventas (LOC)</span><b>${plata(num(ven.monto))} <small>${num(ven.meta) ? 'de ' + plata(num(ven.meta)) + ' · ' + pctTxt(vP) : 'meta no cargada'}</small></b></div>
            ${num(ven.meta) ? `<div class="cx-mv-bar"><i style="width:${Math.min(100, vP || 0)}%"></i><em style="left:${Math.min(100, esperado)}%"></em></div><p class="cx-mv-nota">┆ al día ${corteDia} debería ir en ${esperado}% · ${vP >= esperado ? 'va sobre el ritmo' : 'va bajo el ritmo'}</p>` : ''}</div>` : vacio('Aún no se cargan las ventas de este mes (PAGOS MES).')}
          <div class="cx-sd">
            ${sd('Cantidad de leads', entero(com && num(com.leads)), com && num(com.leads) != null ? (canalesTxt(com.canales) || 'registrados en Mi turno') : 'se registran en «Mi turno» del módulo de ventas')}
            ${sd('CP agendadas', entero(com && num(com.agendadas)), com && num(com.leads) ? pctTxt(pctDe(num(com.agendadas), num(com.leads))) + ' de los leads' : (com ? 'clases de prueba del mes' : 'sin datos'))}
            ${sd('CP asistidas', entero(com && num(com.asistidas)), com && num(com.debian) != null ? 'de ' + com.debian + ' que debían venir' : 'sin datos')}
            ${sd('Conversión agendadas', pctTxt(comPct(com, 'vendidas', 'debian')), com && num(com.vendidas) != null ? com.vendidas + ' de ' + com.debian + ' compraron' : 'sin datos')}
            ${sd('Conversión asistidas', pctTxt(cvP), com && num(com.vendidas) != null ? com.vendidas + ' de ' + com.asistidas + ' · meta 80%' : 'sin datos', semConv(cvP))}
            ${sd('Inversión del mes', plata(inv && num(inv.total)), inv && inv.canales ? Object.entries(inv.canales).map(([k, v]) => esc(k) + ' ' + plata(v)).join(' · ') : 'publicidad (NOTAS - GASTOS)')}
            ${sd('Costo por adquisición', plata(cac), cac != null ? plata(num(inv.total)) + ' ÷ ' + cn.n + ' clientes nuevos' : 'inversión ÷ clientes nuevos')}
            ${sd('Clientes nuevos (N°)', entero(cn && num(cn.n)), 'marcados como nuevos en PAGOS', 'v')}
            ${sd('Clientes nuevos ($)', plata(cn && num(cn.monto)), cn && num(cn.n) ? 'ticket medio ' + plata(num(cn.monto) / num(cn.n)) : 'plan + inscripción', 'v')}
          </div>
        </section>
        <section class="cx-pn cx-s4" aria-label="Retención del mes">
          <h3>Retención <small>${esc(mesLargo(m).split(' ')[0].toLowerCase())}</small></h3>
          ${ret ? `<div class="cx-sd uno">
            ${sd('Por renovar', entero(num(ret.por_renovar)), 'planes que vencen a la fecha')}
            ${sd('Renovados', entero(num(ret.renovados)), 'pagaron su renovación', 'v')}
            ${sd('Bajas del mes', entero(num(ret.no_renovados)), 'no renovaron', 'r')}
            ${sd('Bajas solicitadas', entero(baj && num(baj.solicitadas)), 'pidieron la baja formal', 'a')}
            ${sd('% Retención', pctTxt(rP), 'meta 90%' + (num(ret.renovados) != null ? ' · ' + ret.renovados + ' de ' + ret.por_renovar : ''), semRet(rP))}
            ${num(ret.riesgo) != null ? sd('Riesgo de abandono', entero(num(ret.riesgo)), 'alumnos activos con señales de riesgo' + (num(ret.activos) ? ' · ' + pctTxt(pctDe(num(ret.riesgo), num(ret.activos))) + ' de ' + ret.activos : ''), 'a') : ''}
          </div>` : vacio('Aún no se carga la retención de este mes (DASHBOARD MES).')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn cx-s4" aria-label="Alertas">
          <h3>Alertas <small>requieren decisión</small></h3>
          <p class="cx-sb">Solo lo que está bajo el estándar de STC.</p>
          ${al.length ? al.map(([t, b, s]) => `<div class="cx-al ${t === 'am' ? 'am' : ''}"><i>${t === 'am' ? '🟡' : '🔴'}</i><div><b>${esc(b)}</b><span>${esc(s)}</span></div></div>`).join('') : '<div class="cx-al ok"><i>🟢</i><div><b>Todo dentro del estándar</b><span>No hay indicadores bajo la meta este mes.</span></div></div>'}
        </section>
        <section class="cx-pn cx-s8" aria-label="Embudo comercial">
          <h3>Embudo comercial <small>leads → venta · ${esc(comFuente ? (com.envivo ? 'en vivo' : 'Excel') : 'sin datos')}</small></h3>
          <p class="cx-sb">${etapas.length ? 'Dónde se pierden los prospectos. ' + esc(quiebre) : 'Dónde se pierden los prospectos.'}</p>
          ${etapas.length ? '<div class="cx-cv"><canvas id="cx-g-embudo" role="img" aria-label="Embudo comercial"></canvas></div>' : vacio('Sin clases de prueba registradas este mes.')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn cx-s6" aria-label="Retención por mes">
          <h3>Retención <small>últimos meses</small></h3>
          <p class="cx-sb">Renovados ÷ por renovar. La línea punteada es la meta (90%).</p>
          ${sRet.length > 1 ? '<div class="cx-cv"><canvas id="cx-g-ret" role="img" aria-label="Retención por mes"></canvas></div>' : vacio('Se necesitan al menos 2 meses cargados.')}
        </section>
        <section class="cx-pn cx-s6" aria-label="Motivos de baja">
          <h3>Motivos de baja <small>${esc(mesLargo(m).split(' ')[0].toLowerCase())} · ${baj ? entero(num(baj.solicitadas)) + ' solicitudes' : 'sin datos'}</small></h3>
          <p class="cx-sb">Separa lo que es servicio de lo que es externo.</p>
          ${baj && baj.motivos && Object.keys(baj.motivos).length ? '<div class="cx-cv"><canvas id="cx-g-motivos" role="img" aria-label="Motivos de baja"></canvas></div>' : vacio('Aún no se cargan las bajas de este mes (EXCEL DE BAJAS).')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn" aria-label="Informe de protocolos">
          <h3>Informe de protocolos <small>${pro && fila(m, 'protocolos').corte ? 'corte ' + esc(fCorta(fila(m, 'protocolos').corte)) + ' · ' : ''}mes acumulado</small></h3>
          <p class="cx-sb">Meta 95% por coach y para la sede. Verde ≥95 · amarillo 90–94,9 · rojo 85–89,9 · crítico &lt;85.</p>
          ${pro ? `<div class="cx-pp"><div><small>ENTREVISTAS</small><b style="color:${HEX[semProt(num(pro.entrevistas))]}">${pctTxt(num(pro.entrevistas))}</b></div><div><small>MEDICIONES</small><b style="color:${HEX[semProt(num(pro.mediciones))]}">${pctTxt(num(pro.mediciones))}</b></div><div><small>MACROCICLOS</small><b style="color:${HEX[semProt(num(pro.macrociclos))]}">${pctTxt(num(pro.macrociclos))}</b></div></div>
            ${Array.isArray(pro.por_coach) && pro.por_coach.length ? `<div class="cx-grid" style="margin:0">
              <div class="cx-pi ${(pro.cortes || []).length > 1 ? 'cx-s8' : ''}"><div class="cx-cv alto"><canvas id="cx-g-prot" role="img" aria-label="Protocolos por coach con línea de meta 95%"></canvas></div></div>
              ${(pro.cortes || []).length > 1 ? '<div class="cx-pi cx-s4"><div class="cx-cv alto"><canvas id="cx-g-cortes" role="img" aria-label="Evolución de protocolos por corte"></canvas></div></div>' : ''}
            </div>
            <div class="cx-tw" style="margin-top:12px"><table class="cx-tb">
              <thead><tr><th>Coach</th><th>Entrev.</th><th>Medic.</th><th>Macro.</th><th>Total</th><th>Pendientes</th><th>Excepciones</th></tr></thead>
              <tbody>${pro.por_coach.slice().sort((a, b) => num(a.total) - num(b.total)).map(c => `<tr><td>${esc(c.coach)}</td><td>${pill(num(c.entrevista), semProt)}</td><td>${pill(num(c.medicion), semProt)}</td><td>${pill(num(c.macro), semProt)}</td><td>${pill(num(c.total), semProt)}</td><td>${num(c.pendientes) || '—'}</td><td>${num(c.excepciones) || '—'}</td></tr>`).join('')}</tbody>
            </table></div>
            <p class="cx-fu" style="margin-top:8px">Excepciones = no quiso, menor de edad o no aplica (cuentan como cumplidos).</p>` : ''}` : vacio('Aún no se cargan los protocolos de este mes (PROTOCOLOS STC).')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn cx-s8" aria-label="Clases de prueba por coach">
          <h3>Clases de prueba por coach <small>${esc(mesLargo(m).split(' ')[0].toLowerCase())}</small></h3>
          <p class="cx-sb">Asignadas, asistidas y vendidas. La cartera muestra si el coach necesita más CP (bajo 45) o debe enfocarse en retener.</p>
          ${com && Array.isArray(com.por_coach) && com.por_coach.length ? `<div class="cx-tw"><table class="cx-tb">
            <thead><tr><th>Coach</th><th>Asign.</th><th>Asist.</th><th>Vend.</th><th>Asistencia</th><th>Conversión</th><th>Cartera</th></tr></thead>
            <tbody>${com.por_coach.slice().sort((a, b) => b.asignadas - a.asignadas).map(c => { const as = pctDe(c.asistidas, c.asignadas), cv = pctDe(c.vendidas, c.asistidas), ca = cartera(c.coach); return `<tr><td>${esc(c.coach)}</td><td>${c.asignadas}</td><td>${c.asistidas}</td><td>${c.vendidas}</td><td>${pill(as, semConv)}</td><td>${pill(cv, semConv)}</td><td>${ca == null ? '—' : `<span class="cx-pt ${ca >= 45 && ca <= 55 ? 'v' : 'a'}">${ca}</span>`}</td></tr>`; }).join('')}</tbody>
          </table></div>` : vacio('Sin clases de prueba registradas este mes.')}
        </section>
        <section class="cx-pn cx-s4" aria-label="Programas vendidos">
          <h3>Programas vendidos <small>${esc(mesLargo(m).split(' ')[0].toLowerCase())}</small></h3>
          <p class="cx-sb">La estrategia es vender 3, 6 y 12 meses.</p>
          ${ven && ven.programas ? '<div class="cx-cv"><canvas id="cx-g-prog" role="img" aria-label="Ventas por tipo de plan"></canvas></div>' : vacio('Sin detalle de planes este mes.')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn cx-s6" aria-label="Ventas por mes">
          <h3>Ventas por mes <small>${new Date().getFullYear()}</small></h3>
          <p class="cx-sb">Pagos con fecha del mes en PAGOS MES. La línea punteada es la meta del LOC.</p>
          ${sVen.length > 1 ? '<div class="cx-cv"><canvas id="cx-g-ventas" role="img" aria-label="Ventas por mes"></canvas></div>' : vacio('Se necesitan al menos 2 meses cargados.')}
        </section>
        <section class="cx-pn cx-s6" aria-label="Inversión y costo por cliente">
          <h3>Inversión y costo por cliente <small>publicidad</small></h3>
          <p class="cx-sb">Barras: inversión en publicidad. Línea: costo por cada cliente nuevo.</p>
          ${sInv.length > 1 ? '<div class="cx-cv"><canvas id="cx-g-cac" role="img" aria-label="Inversión y costo por cliente nuevo"></canvas></div>' : vacio('Se necesitan al menos 2 meses cargados.')}
        </section>
      </div>

      <div class="cx-grid">
        <section class="cx-pn cx-s6" aria-label="Scorecard de coaches">
          <h3>Scorecard de coaches <small>${sco && sco.mes_cierre ? 'cierre de ' + esc(sco.mes_cierre) : 'cierre mensual'}</small></h3>
          <p class="cx-sb">Retención 30 · Ventas 30 · Protocolos 15 · Conversión 15 · Experiencia 10.</p>
          ${sco && Array.isArray(sco.coaches) && sco.coaches.length ? '<div class="cx-cv alto"><canvas id="cx-g-score" role="img" aria-label="Ranking de score por coach"></canvas></div>' : vacio('Se llena con el Cierre Mensual Global. Ese Excel no tiene datos desde mayo.')}
        </section>
        <section class="cx-pn cx-s6" aria-label="Plan de trabajo del RS">
          <h3>Plan de trabajo del RS <small>${esc(mesLargo(m).split(' ')[0].toLowerCase())}</small></h3>
          <p class="cx-sb">Lo que el RS se comprometió a hacer y si lo cumplió a tiempo.</p>
          ${plan && Array.isArray(plan.tareas) && plan.tareas.length ? plan.tareas.map(t => { const vencida = t.estado !== 'hecho' && t.fecha && t.fecha < hoyISO(); return `<div class="cx-ta"><span class="f">${esc(t.fecha ? fCorta(t.fecha) : '')}</span><span class="t">${esc(t.tarea)}</span><span class="cx-st ${t.estado === 'hecho' ? 'h' : vencida ? 'x' : ''}">${t.estado === 'hecho' ? 'HECHO' : vencida ? 'VENCIDA' : 'PENDIENTE'}</span></div>`; }).join('') : vacio('El RS aún no carga su plan de trabajo de este mes.')}
        </section>
      </div>

      <p class="cx-fu"><b>De dónde sale cada dato:</b> ${[['ventas','Ventas, clientes nuevos y planes'], ['inversion','Inversión'], ['retencion','Retención'], ['bajas','Bajas solicitadas'], ['protocolos','Protocolos'], ['comercial','Clases de prueba']].map(([s, t]) => { const f = fila(m, s); if(s === 'comercial' && com && com.envivo) return '<b>' + t + '</b> → módulo de ventas de la app (en vivo)'; return f ? '<b>' + t + '</b> → ' + esc(f.fuente || 'Excel') + (f.corte ? ' (al ' + esc(fCorta(f.corte)) + ')' : '') : null; }).filter(Boolean).join(' · ') || 'Aún no hay datos cargados para este mes.'}</p>`;

    // --- gráficos
    if(etapas.length){
      const vals = etapas.map(x => x[1]);
      grafico('cx-g-embudo', { type:'bar', data:{ labels:etapas.map(x => x[0]), datasets:[{ data:vals, backgroundColor:etapas.map(x => x[0] === 'Leads' ? DIM : x[0] === 'Vendidas' ? OK : x[0] === 'CP asistidas' ? Y : G), borderRadius:6, barThickness:24 }] }, options:{ indexAxis:'y', maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ afterLabel:(i) => i.dataIndex ? 'pasa el ' + pctTxt(pctDe(i.raw, vals[i.dataIndex - 1])) : '' } } }, scales:{ x:{ grid:{ color:GRID }, beginAtZero:true }, y:{ grid:{ display:false }, ticks:{ color:'#E6E6E6', font:{ weight:600 } } } } } });
    }
    if(sRet.length > 1){
      const vals = sRet.map(x => x[1]), min = Math.min(80, Math.floor(Math.min(...vals))), max = Math.max(92, Math.ceil(Math.max(...vals)));
      grafico('cx-g-ret', { type:'line', data:{ labels:sRet.map(x => mesCorto(x[0])), datasets:[{ data:vals, borderColor:Y, backgroundColor:'rgba(255,255,102,.12)', fill:true, tension:.35, pointRadius:sRet.map(x => x[0] === m ? 5 : 3), pointBackgroundColor:sRet.map(x => HEX[semRet(x[1])]) }] }, options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:i => pctTxt(i.raw) } } }, scales:{ y:{ min, max, ticks:{ callback:v => v + '%' }, grid:{ color:GRID } }, x:{ grid:{ display:false } } } }, plugins:[lineaMeta(90, 'meta 90%')] });
    }
    if(baj && baj.motivos && Object.keys(baj.motivos).length){
      const mot = Object.entries(baj.motivos).sort((a, b) => b[1] - a[1]);
      grafico('cx-g-motivos', { type:'doughnut', data:{ labels:mot.map(x => x[0]), datasets:[{ data:mot.map(x => x[1]), backgroundColor:[RO, G, AZ, DIM, OK, Y, CR, '#B48CFF', '#6E6E6E'], borderColor:'#1b1b1b', borderWidth:2 }] }, options:{ maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ position:window.innerWidth < 600 ? 'bottom' : 'right', labels:{ color:'#DDD', boxWidth:10 } } } } });
    }
    if(pro && Array.isArray(pro.por_coach) && pro.por_coach.length){
      const pc = pro.por_coach.slice().sort((a, b) => num(b.total) - num(a.total)), tot = pc.map(c => num(c.total));
      grafico('cx-g-prot', { type:'bar', data:{ labels:pc.map(c => c.coach), datasets:[{ label:'Total protocolos', data:tot, backgroundColor:tot.map(v => HEX[semProt(v)]), borderRadius:5 }] }, options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:i => pctTxt(i.raw) } } }, scales:{ y:{ min:Math.min(75, Math.floor(Math.min(...tot) - 2)), max:100, ticks:{ callback:v => v + '%' }, grid:{ color:GRID } }, x:{ grid:{ display:false }, ticks:{ maxRotation:45, minRotation:0 } } } }, plugins:[lineaMeta(95, 'meta 95%')] });
      if((pro.cortes || []).length > 1){
        const ct = pro.cortes;
        grafico('cx-g-cortes', { type:'line', data:{ labels:ct.map(c => fCorta(c.fecha)), datasets:[{ label:'Entrevistas', data:ct.map(c => num(c.entrevistas)), borderColor:OK, tension:.3 }, { label:'Mediciones', data:ct.map(c => num(c.mediciones)), borderColor:G, tension:.3 }, { label:'Macrociclos', data:ct.map(c => num(c.macrociclos)), borderColor:Y, tension:.3 }] }, options:{ maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#DDD', boxWidth:10 } } }, scales:{ y:{ ticks:{ callback:v => v + '%' }, grid:{ color:GRID } }, x:{ grid:{ display:false } } } }, plugins:[lineaMeta(95, 'meta 95%')] });
      }
    }
    if(ven && ven.programas){
      const pr = ven.programas, et = [['Mensual', pr.mensual], ['3 meses', pr.m3], ['6 meses', pr.m6], ['12 meses', pr.m12]].filter(x => num(x[1]));
      grafico('cx-g-prog', { type:'doughnut', data:{ labels:et.map(x => x[0]), datasets:[{ data:et.map(x => x[1]), backgroundColor:et.map(x => ({ 'Mensual':DIM, '3 meses':G, '6 meses':Y, '12 meses':OK })[x[0]]), borderColor:'#1b1b1b', borderWidth:2 }] }, options:{ maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ color:'#DDD', boxWidth:10 } } } } });
    }
    if(sVen.length > 1){
      const metas = sVen.map(x => metaDe(x[0])), metaRef = metas.filter(Boolean).slice(-1)[0];
      grafico('cx-g-ventas', { type:'bar', data:{ labels:sVen.map(x => mesCorto(x[0]) + (parcial(x[0]) ? ' (al ' + D(x[0], 'ventas').corte_dia + ')' : '')), datasets:[{ data:sVen.map(x => x[1]), backgroundColor:sVen.map(x => parcial(x[0]) ? 'rgba(255,255,102,.45)' : metaDe(x[0]) && x[1] >= metaDe(x[0]) ? OK : x[0] === m ? Y : DIM), borderRadius:6 }] }, options:{ maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:i => plata(i.raw) } } }, scales:{ y:{ min:0, ticks:{ callback:v => millones(v) }, grid:{ color:GRID } }, x:{ grid:{ display:false } } } }, plugins:metaRef ? [lineaMeta(metaRef, 'meta ' + millones(metaRef))] : [] });
    }
    if(sInv.length > 1){
      const labs = sInv.map(x => x[0]), cacPor = Object.fromEntries(sCac);
      grafico('cx-g-cac', { data:{ labels:labs.map(mesCorto), datasets:[{ type:'bar', label:'Inversión', data:sInv.map(x => x[1]), backgroundColor:'rgba(255,209,102,.55)', borderRadius:5, yAxisID:'y' }, { type:'line', label:'Costo por cliente nuevo', data:labs.map(x => cacPor[x] == null ? null : cacPor[x]), borderColor:OK, backgroundColor:OK, pointRadius:4, tension:.3, spanGaps:true, yAxisID:'y2' }] }, options:{ maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#DDD', boxWidth:10 } }, tooltip:{ callbacks:{ label:i => i.dataset.label + ': ' + plata(i.raw) } } }, scales:{ y:{ min:0, ticks:{ callback:v => millones(v) }, grid:{ color:GRID } }, y2:{ position:'right', min:0, ticks:{ callback:v => '$' + Math.round(v / 1000) + ' mil' }, grid:{ display:false } }, x:{ grid:{ display:false } } } } });
    }
    if(sco && Array.isArray(sco.coaches) && sco.coaches.length){
      const sc = sco.coaches.slice().sort((a, b) => num(b.score) - num(a.score));
      grafico('cx-g-score', { type:'bar', data:{ labels:sc.map(x => x.coach), datasets:[{ data:sc.map(x => num(x.score)), backgroundColor:sc.map(x => num(x.score) >= 90 ? OK : num(x.score) >= 85 ? G : RO), borderRadius:5, barThickness:16 }] }, options:{ indexAxis:'y', maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ min:0, max:100, grid:{ color:GRID } }, y:{ grid:{ display:false }, ticks:{ color:'#E6E6E6' } } } } });
    }
  }

  // ---------------------------------------------------------------- enganches a la app
  // El CEO entra directo a su panel; RS y administradores ven un acceso en su inicio.
  const origCoach = window.renderCoachHome;
  if(typeof origCoach === 'function' && !origCoach.__cx){
    const nueva = async function(){
      if(profile && profile.role === 'ceo') return renderPanelCeo();
      const r = await origCoach.apply(this, arguments);
      try{
        if(esRol('responsable_sede', 'super_admin') && !$id('cx-acceso')){
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'pl-acceso'; b.id = 'cx-acceso';
          b.innerHTML = `<span class="pl-acceso-ico">📊</span><span class="pl-acceso-txt"><small>DIRECCIÓN</small><b>Panel CEO</b><em>Lo que ve el CEO: ventas, retención, protocolos y alertas</em></span><span class="pl-acceso-go">${IC('chevronRight')}</span>`;
          const ancla = $id('vt-acceso') || $id('btn-mis-plantillas');
          if(ancla) ancla.insertAdjacentElement('beforebegin', b);
          else { const h = root().querySelector('.header-actions'); if(h) h.insertAdjacentElement('afterend', b); else root().prepend(b); }
          b.onclick = () => renderPanelCeo();
        }
      }catch(_e){}
      return r;
    };
    nueva.__cx = true; window.renderCoachHome = nueva;
  }

  window.UCPanelCeo = { abrir: renderPanelCeo };
})();
