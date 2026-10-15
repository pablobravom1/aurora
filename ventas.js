// STC App — Perfil VENTAS: el trabajo diario de las vendedoras (clon de la parte comercial de MapFit,
// con el estilo de la app y lo que hoy se anota aparte en Excel): leads por canal, prospectos,
// agenda con confirmación, seguimiento de 5 contactos, ventas con lista de ingreso y dashboard.
// También reconoce el perfil CEO (solo uno). Se carga AL FINAL, después de todos los demás módulos.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const avatar = (p, cls) => (typeof renderProfileAvatar === 'function' ? renderProfileAvatar(p || {}, cls) : '');
  const toast = (m) => { try{ showToast(m); }catch(_e){} };
  const IC = (n) => (typeof ICONS !== 'undefined' && ICONS[n]) ? ICONS[n] : '';
  const $id = (id) => document.getElementById(id);
  const DIA = 864e5;
  const esRol = (...r) => !!profile && r.includes(profile.role);
  const puedeVer = () => esRol('ventas', 'loc', 'responsable_sede', 'super_admin');

  // ---------------------------------------------------------------- catálogos (los de STC)
  const CANALES = { instagram:'📸 Instagram', whatsapp:'💬 WhatsApp', referido:'🤝 Referido', recepcion:'🚪 Recepción', otro:'✳️ Otro' };
  const TIPOS = { intencion_compra:'Intención de compra', invitacion:'Invitación', compra_online:'Compra online' };
  const OBJETIVOS = ['Bajar grasa', 'Masa muscular', 'Salud', 'Rendimiento', 'Tonificar'];
  const ESTADOS = { agendado:'Agendado', asistio:'Asistió', compro:'Compró', compromiso:'Compromiso', reagendado:'Reagendado', no_asistio:'No asistió', no_compro:'No compró', perdido:'Perdido', descartado:'Descartado' };
  const CONFIRM = { pendiente:'Por confirmar', confirmada:'Confirmada', no_contesto:'No contestó', cancelada:'Cancelada' };
  const MOTIVOS = ['Precio', 'Tiempo', 'Solo información', 'Ubicación', 'Está en otro gimnasio', 'Salud', 'Otro'];
  const PLANES = ['PAT EVOLUTION', 'PAT VALLE', '3M VALLE', 'SMART ELITE 6M', 'SMART PREMIUM 12M', 'PREPAGO FLEX', 'CLASE SUELTA', 'OTRO'];
  const SESIONES = ['4 sesiones', '8 sesiones', '12 sesiones', '16 sesiones', '20 sesiones'];
  const MEDIOS = ['EVO App', 'Débito', 'Crédito', 'Transferencia', 'Link de pago', 'Efectivo'];
  const TIPOS_VENTA = { en_sede:'En sede (tras clase de prueba)', post_asistencia:'Post asistencia (seguimiento)', sin_agendar:'Llegó sin agendar', online:'Online', renovacion:'Renovación' };
  const CHECK = [['pago','Pago recibido'], ['evo','Registrado en EVO'], ['contrato','Contrato firmado'], ['tarjeta_pat','Tarjeta PAT registrada'], ['boleta','Boleta emitida'], ['wizfit','Alta en Wizfit'], ['whaticket','Alta en Whaticket'], ['entrevista','Entrevista inicial agendada']];
  const esProgramaPlan = (p) => /3M|6M|12M|ELITE|PREMIUM/i.test(p || '');
  const checkItems = (v) => CHECK.filter(([k]) => k !== 'tarjeta_pat' || /^PAT/i.test(v.plan || ''));
  const checkHechos = (v) => checkItems(v).filter(([k]) => v.checklist && v.checklist[k]).length;

  // ---------------------------------------------------------------- estilos
  const css = document.createElement('style');
  css.textContent = `
  .vt{padding-bottom:40px}
  .vt-nav{display:flex;gap:6px;overflow-x:auto;margin:0 0 14px;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .vt-nav button{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:9px 13px;border-radius:99px;border:1px solid #333;background:#141414;color:#E6E6E6;font:600 13px 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .vt-nav button.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .vt-nav button em{font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#FF6B72;color:#fff;font:700 10.5px 'IBM Plex Mono',monospace;display:grid;place-items:center}
  .vt-nav button.on em{background:#111;color:#FFFF66}
  .vt-sec{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:16px 2px 8px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:#A8A8A8;text-transform:uppercase}
  .vt-canales{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
  .vt-canal{padding:12px 10px 10px;border-radius:14px;border:1px solid #2e2e2e;background:#161616;text-align:center}
  .vt-canal small{display:block;font:600 11px 'Inter',sans-serif;color:#CFCFCF}
  .vt-canal b{display:block;font:600 28px Oswald,sans-serif;color:#FBFBFB;margin:2px 0 6px;font-variant-numeric:tabular-nums}
  .vt-pm{display:flex;gap:6px;justify-content:center}
  .vt-pm button{width:40px;height:34px;border-radius:10px;border:1px solid rgba(255,255,102,.45);background:transparent;color:#FFFF66;font:700 18px Inter,sans-serif;cursor:pointer}
  .vt-it{display:flex;align-items:center;gap:11px;width:100%;box-sizing:border-box;padding:10px 11px;margin:0 0 7px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .vt-it:hover{border-color:rgba(255,255,102,.35)}
  .vt-n{flex:none;display:grid;place-items:center;min-width:32px;height:32px;padding:0 6px;border-radius:10px;font:700 15px Oswald,sans-serif;color:#111;background:#FFFF66}
  .vt-n.r{background:#FF6B72;color:#fff}.vt-n.a{background:#FFD166}.vt-n.v{background:#5EE3B6}
  .vt-x{flex:1;min-width:0}
  .vt-x b{display:block;color:#F5F5F5;font-weight:600;font-size:14px}
  .vt-x span{display:block;color:#A8A8A8;font-size:12px;margin-top:1px}
  .vt-go{flex:none;color:#FFFF66;font:600 12px Inter,sans-serif;white-space:nowrap}
  .vt-av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:2px solid #FFFF66;background:#1d1d1d;color:#FFFF66;font:700 12px Inter,sans-serif}
  .vt-pill{display:inline-block;margin-top:5px;font:700 10.5px 'IBM Plex Mono',monospace;padding:2px 8px;border-radius:99px;color:#DDD;background:#2b2b2b}
  .vt-pill.v{color:#0d3326;background:#5EE3B6}.vt-pill.r{color:#fff;background:#C0392B}.vt-pill.a{color:#3a2a00;background:#FFD166}.vt-pill.y{color:#111;background:#FFFF66}
  .vt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
  .vt-chips button{padding:7px 11px;border-radius:10px;border:1px solid #333;background:#141414;color:#DDD;font:600 12.5px Inter,sans-serif;cursor:pointer}
  .vt-chips button.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .vt-chips button small{opacity:.7;margin-left:3px}
  .vt-bar{display:flex;gap:8px;align-items:center;margin:0 0 12px;flex-wrap:wrap}
  .vt-bar input,.vt-bar select{margin:0;flex:1;min-width:140px}
  .vt-bar .btn-sm{flex:none}
  .vt-cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:12px;border:0;background:linear-gradient(110deg,#FFFF00,#FFFB8A);color:#111;font:700 14px Inter,sans-serif;cursor:pointer;margin:0 0 12px}
  .vt-ag{padding:12px;margin:0 0 9px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03)}
  .vt-ag-h{display:flex;align-items:center;gap:10px}
  .vt-hr{flex:none;font:600 16px Oswald,sans-serif;color:#FFFF66}
  .vt-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
  .vt-acc button{flex:1 1 auto;padding:8px 10px;border-radius:10px;border:1px solid #333;background:#151515;color:#EEE;font:600 12px Inter,sans-serif;cursor:pointer}
  .vt-acc button.v{border-color:rgba(94,227,182,.5);color:#5EE3B6}
  .vt-acc button.r{border-color:rgba(255,107,114,.45);color:#FF8A8E}
  .vt-acc button.y{border-color:rgba(255,255,102,.5);color:#FFFF66}
  .vt-acc button.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .vt-q{margin-top:10px;padding-top:10px;border-top:1px dashed #333;font:600 12px Inter,sans-serif;color:#DDD}
  .vt-wsp{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;background:#25D366;color:#06301a;font:700 12px Inter,sans-serif;text-decoration:none}
  .vt-msg{margin:8px 0;padding:10px 12px;border-radius:12px 12px 12px 4px;background:#1f2b23;color:#d8f5e2;font-size:12.5px;line-height:1.5}
  .vt-pasos{display:flex;gap:4px;margin-top:6px}
  .vt-pasos i{flex:1;height:5px;border-radius:99px;background:#2b2b2b}
  .vt-pasos i.h{background:#5EE3B6}.vt-pasos i.a{background:#FFFF66}
  .vt-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px}
  .vt-kp div{padding:11px 12px;border-radius:13px;background:#161616;border:1px solid #2a2a2a;min-width:0}
  .vt-kp small{display:block;font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase}
  .vt-kp b{display:block;font:600 22px Oswald,sans-serif;color:#FBFBFB;margin:3px 0 1px;font-variant-numeric:tabular-nums}
  .vt-kp b.v{color:#5EE3B6}.vt-kp b.a{color:#FFD166}.vt-kp b.r{color:#FF6B72}
  .vt-kp span{display:block;font-size:11.5px;color:#A8A8A8}
  .vt-tb{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
  .vt-tb th{font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#A8A8A8;text-align:right;padding:6px;border-bottom:1px solid #2c2c2c;white-space:nowrap}
  .vt-tb th:first-child,.vt-tb td:first-child{text-align:left}
  .vt-tb td{padding:8px 6px;border-bottom:1px solid #222;text-align:right;color:#E8E8E8;white-space:nowrap}
  .vt-tw{overflow-x:auto}
  .vt-hj label{display:block;margin:11px 0 5px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase}
  .vt-hj input,.vt-hj select,.vt-hj textarea{width:100%;box-sizing:border-box;margin:0}
  .vt-hj .vt-dos{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .vt-cupo{margin-top:5px;font-size:11.5px;color:#5EE3B6}.vt-cupo.a{color:#FFD166}
  .vt-ck{list-style:none;margin:6px 0 0;padding:0}
  .vt-ck li{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #222;font-size:13.5px;color:#E6E6E6;cursor:pointer}
  .vt-ck li:last-child{border-bottom:0}
  .vt-ck i{flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-style:normal;font-size:13px;border:1.5px solid #444;color:transparent}
  .vt-ck li.h i{background:#5EE3B6;border-color:#5EE3B6;color:#0d3326}
  .vt-vacio{padding:18px 14px;border:1px dashed rgba(255,255,255,.18);border-radius:14px;text-align:center;color:#A8A8A8;font-size:13px}
  .vt-fecha{display:flex;align-items:center;gap:8px;margin:0 0 12px}
  .vt-fecha b{flex:1;text-align:center;font:600 16px Oswald,sans-serif;color:#FBFBFB;text-transform:capitalize}
  .vt-fecha button{padding:8px 12px;border-radius:10px;border:1px solid #333;background:#141414;color:#EEE;font:600 13px Inter,sans-serif;cursor:pointer}
  .vt-dosc{display:block}
  .vt-cols{display:block}

  /* ---------- Computador: menú lateral fijo y listas en columnas (en celular no cambia nada) ---------- */
  @media (min-width:900px){
    .wrap:has(.vt){max-width:1180px}
    .vt{display:grid;grid-template-columns:210px minmax(0,1fr);column-gap:26px;align-items:start}
    .vt > .header-actions{grid-column:1 / -1}
    .vt-nav{grid-column:1;flex-direction:column;overflow:visible;position:sticky;top:calc(16px + env(safe-area-inset-top, 0px));gap:4px;margin:0}
    .vt-nav button{justify-content:space-between;border-radius:12px;padding:12px 14px;font-size:14px;border-color:transparent;background:transparent}
    .vt-nav button:hover{background:#1a1a1a;border-color:#2e2e2e}
    .vt-nav button.on{background:#FFFF66;border-color:#FFFF66}
    #vt-cont{grid-column:2;min-width:0}
    .vt-dosc{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start}
    .vt-cta{max-width:340px}
    .eq-hoja.vt-hj{max-width:560px;margin-left:auto;margin-right:auto}
  }
  @media (min-width:1100px){
    .vt-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px;align-items:start}
    .vt-cols > .vt-vacio{grid-column:1 / -1}
    .vt-kp{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
  }
  @media (min-width:1500px){
    .wrap:has(.vt){max-width:1320px}
    .vt-cols{grid-template-columns:repeat(3,minmax(0,1fr))}
  }
  `;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- utilidades
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hoyISO = () => iso(new Date());
  const sumarDias = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DIA);
  const DSEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const fCorta = (s) => { if(!s) return '—'; const d = new Date(s + 'T12:00:00'); return DSEM[d.getDay()] + ' ' + d.getDate() + ' ' + MES[d.getMonth()]; };
  const fLarga = (s) => { const d = new Date(s + 'T12:00:00'); return ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()] + ' ' + d.getDate() + ' de ' + MESL[d.getMonth()].toLowerCase(); };
  const hora = (h) => h ? String(h).slice(0, 5) : '';
  const plata = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
  const pctTxt = (v) => v == null ? '—' : String(v).replace('.', ',') + '%';
  const iniciales = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
  const numWsp = (w) => { let d = String(w || '').replace(/\D/g, ''); if(d.length === 9 && d[0] === '9') d = '56' + d; if(d.length === 8) d = '569' + d; return d; };
  const linkWsp = (w, txt) => `https://wa.me/${numWsp(w)}?text=${encodeURIComponent(txt)}`;
  const turnoActual = () => new Date().getHours() < 14 ? 'AM' : 'PM';
  const nombreCorto = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const mesRango = (ym) => { const [y, m] = ym.split('-').map(Number); const fin = new Date(y, m, 0).getDate(); return [`${ym}-01`, `${ym}-${String(fin).padStart(2, '0')}`]; };

  // ---------------------------------------------------------------- hoja inferior (mismo estilo que el resto de la app)
  function hoja(html, montar){
    const ov = document.createElement('div');
    ov.className = 'eq-ov';
    ov.innerHTML = `<div class="eq-hoja vt-hj" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(ov);
    const kd = (e) => { if(e.key === 'Escape') cerrar(); };
    const cerrar = () => { ov.remove(); document.removeEventListener('keydown', kd); };
    document.addEventListener('keydown', kd);
    ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
    if(montar) montar(ov.querySelector('.eq-hoja'), cerrar);
    return cerrar;
  }
  const chipsSel = (cont, alElegir, multiple) => cont.querySelectorAll('button').forEach(b => b.onclick = () => {
    if(!multiple) cont.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.toggle('on', multiple ? !b.classList.contains('on') : true);
    if(alElegir) alElegir(b.dataset.v, b);
  });

  // ---------------------------------------------------------------- datos
  const S = { vista:'turno', equipo:[], agenda: hoyISO(), filtro:'todos', busqueda:'', mes: hoyISO().slice(0, 7), mesVentas: hoyISO().slice(0, 7) };
  async function cargarEquipo(){
    const { data, error } = await sb.rpc('ventas_equipo');
    S.equipo = error ? [] : (data || []);
    return S.equipo;
  }
  const persona = (id) => S.equipo.find(p => p.id === id) || null;
  const nomPersona = (id) => { const p = persona(id); return p ? p.nombre : '—'; };
  const coaches = () => S.equipo.filter(p => p.role === 'profesor' || p.role === 'responsable_sede');
  const vendedoras = () => S.equipo.filter(p => p.role === 'ventas' || p.role === 'loc' || p.role === 'responsable_sede');

  async function prospectosRango(desde, hasta){
    const { data, error } = await sb.from('ventas_prospectos').select('*').gte('fecha_visita', desde).lte('fecha_visita', hasta).order('fecha_visita').order('hora_visita', { nullsFirst:false });
    if(error) throw error;
    return data || [];
  }
  async function prospectosRecientes(dias){
    const desde = new Date(Date.now() - (dias || 120) * DIA).toISOString();
    const { data, error } = await sb.from('ventas_prospectos').select('*').gte('created_at', desde).order('created_at', { ascending:false }).limit(800);
    if(error) throw error;
    return data || [];
  }
  async function seguimientosDe(ids){
    if(!ids.length) return [];
    const { data } = await sb.from('ventas_seguimientos').select('*').in('prospecto_id', ids);
    return data || [];
  }

  // ---------------------------------------------------------------- seguimiento: los 5 contactos de la guía
  // Paso 1 inmediato · 2 día siguiente · 3 tres días después · 4 fin de semana · 5 segundo fin de semana
  function fechaPaso(base, paso){
    if(paso === 1) return base;
    if(paso === 2) return sumarDias(base, 1);
    if(paso === 3) return sumarDias(base, 3);
    const d3 = new Date(sumarDias(base, 3) + 'T12:00:00');
    const hastaSab = (6 - d3.getDay() + 7) % 7 || 7;
    const sab = iso(new Date(d3.getTime() + hastaSab * DIA));
    return paso === 4 ? sab : sumarDias(sab, 7);
  }
  const MSG = {
    no_asistio: ['Hola {n} 👋 te esperábamos hoy en STC. ¿Quieres que te reagende tu clase de prueba?', 'Hola {n}, ¿te acomoda otro día para tu clase de prueba? Tenemos horarios en la mañana y en la tarde.', 'Hola {n}, te guardamos un cupo esta semana para tu clase de prueba. ¿Te lo reservo?', 'Hola {n} 💪 ¿retomamos? Dime qué día te queda bien y te agendo.', 'Hola {n}, este es mi último mensaje para no molestarte. Cuando quieras partir, aquí estamos 🙌'],
    no_compro: ['Hola {n}, ¡gracias por venir hoy a STC! 💪 ¿Qué te pareció la clase?', 'Hola {n}, ¿pudiste pensar en el plan que conversamos? Quedo atenta a cualquier duda.', 'Hola {n}, esta semana te puedo dejar listo tu plan. ¿Te acomoda pasar a inscribirte?', 'Hola {n}, ¿cómo vas? Si quieres empezar, te reservo tu horario.', 'Hola {n}, este es mi último mensaje para no molestarte. Cuando quieras partir, aquí estamos 🙌'],
    compromiso: ['Hola {n}, te escribo de STC para recordarte lo que conversamos de tu plan. ¿Te esperamos?', 'Hola {n}, ¿seguimos con tu inscripción? Te dejo todo listo para que solo pases a pagar.', 'Hola {n}, te recuerdo tu compromiso de inscripción en STC. ¿Qué día pasas?', 'Hola {n}, ¿todo bien? Tu cupo sigue reservado.', 'Hola {n}, último recordatorio para no molestarte. Cuando quieras, aquí estamos 🙌']
  };
  const mensaje = (p, paso) => (MSG[p.estado] || MSG.no_compro)[paso - 1].replace('{n}', nombreCorto(p.nombre));
  function estadoSeguimiento(p, segs){
    const hechos = segs.filter(s => s.prospecto_id === p.id).length;
    if(hechos >= 5) return null;
    const base = p.estado === 'compromiso' && p.fecha_compromiso ? p.fecha_compromiso : (p.fecha_visita || String(p.updated_at || p.created_at).slice(0, 10));
    const paso = hechos + 1;
    const vence = p.estado === 'compromiso' && paso === 1 && p.fecha_compromiso ? p.fecha_compromiso : fechaPaso(base, paso);
    return { paso, hechos, vence, atraso: diasEntre(vence, hoyISO()) };
  }

  // ---------------------------------------------------------------- pantalla principal
  async function renderVentasHome(vista){
    if(vista) S.vista = vista;
    if(!S.equipo.length) await cargarEquipo();
    const esVendedora = esRol('ventas');
    root().innerHTML = `<div class="vt">
      <div class="header-actions">
        <div class="coach-home-titulo"><small>${esVendedora ? 'PANEL DE VENTAS' : 'VENTAS · ' + esc(typeof rolEtiqueta === 'function' ? rolEtiqueta(profile).toUpperCase() : '')}</small><b>Hola, ${esc(nombreCorto(profile.nombre) || 'equipo')}</b></div>
        <div class="student-header-actions">
          <button type="button" class="switch-user" id="vt-perfil" aria-label="Mi perfil">${IC('user') || '👤'}</button>
          ${esVendedora ? `<button class="switch-user" id="btn-logout">${IC('logout')} Salir</button>` : `<button class="switch-user" id="vt-volver">${IC('arrowLeft')} Volver</button>`}
        </div>
      </div>
      <nav class="vt-nav" id="vt-nav">${[['turno','Mi turno'],['prospectos','Prospectos'],['agenda','Agenda'],['seguimiento','Seguimiento'],['ventas','Ventas'],['dashboard','Dashboard']].map(([k, t]) => `<button type="button" data-v="${k}" class="${S.vista === k ? 'on' : ''}">${t}<em id="vt-b-${k}" hidden></em></button>`).join('')}</nav>
      <div id="vt-cont"><div class="loading">Cargando...</div></div>
    </div>`;
    const lo = $id('btn-logout'); if(lo && typeof handleLogout === 'function') lo.onclick = handleLogout;
    const vo = $id('vt-volver'); if(vo) vo.onclick = () => { S.vista = 'turno'; renderCoachHome(); };
    $id('vt-perfil').onclick = () => { if(typeof renderMiPerfil === 'function') renderMiPerfil(true); };
    $id('vt-nav').querySelectorAll('button').forEach(b => b.onclick = () => { S.vista = b.dataset.v; $id('vt-nav').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); pintarVista(); });
    pintarVista();
  }
  async function pintarVista(){
    const c = $id('vt-cont'); if(!c) return;
    c.innerHTML = '<div class="loading">Cargando...</div>';
    try{
      if(S.vista === 'turno') await vistaTurno(c);
      else if(S.vista === 'prospectos') await vistaProspectos(c);
      else if(S.vista === 'agenda') await vistaAgenda(c);
      else if(S.vista === 'seguimiento') await vistaSeguimiento(c);
      else if(S.vista === 'ventas') await vistaVentas(c);
      else if(S.vista === 'dashboard') await vistaDashboard(c);
    }catch(err){
      console.warn('ventas', err);
      c.innerHTML = `<div class="vt-vacio">No se pudo cargar esta sección.<br><small>${esc(err && err.message || '')}</small></div>`;
    }
  }
  const badge = (k, n) => { const e = $id('vt-b-' + k); if(e){ e.hidden = !n; e.textContent = n > 99 ? '99+' : n; } };

  // ---------------------------------------------------------------- 1) Mi turno
  async function vistaTurno(c){
    const hoy = hoyISO(), man = sumarDias(hoy, 1), turno = turnoActual();
    const [{ data: leads }, cps, recientes, { data: vts }] = await Promise.all([
      sb.from('ventas_leads_diarios').select('*').eq('fecha', hoy).eq('turno', turno).eq('vendedor_id', profile.id),
      prospectosRango(hoy, man),
      prospectosRecientes(45),
      sb.from('ventas_ventas').select('id,plan,checklist,cliente_nombre,fecha').gte('fecha', sumarDias(hoy, -30))
    ]);
    const cant = {}; (leads || []).forEach(l => { cant[l.canal] = l.cantidad; });
    const cpHoy = cps.filter(p => p.fecha_visita === hoy && ['agendado','reagendado'].includes(p.estado));
    const porConfirmar = cps.filter(p => p.fecha_visita === man && ['agendado','reagendado'].includes(p.estado) && ['pendiente','no_contesto'].includes(p.confirmacion));
    const sinResultado = recientes.filter(p => p.fecha_visita && p.fecha_visita < hoy && ['agendado','reagendado'].includes(p.estado));
    const cola = recientes.filter(p => ['no_asistio','no_compro','compromiso'].includes(p.estado));
    const segs = await seguimientosDe(cola.map(p => p.id));
    const paraHoy = cola.map(p => ({ p, s: estadoSeguimiento(p, segs) })).filter(x => x.s && x.s.atraso >= 0);
    const incompletas = (vts || []).filter(v => checkHechos(v) < checkItems(v).length);
    badge('agenda', porConfirmar.length); badge('seguimiento', paraHoy.length); badge('ventas', incompletas.length); badge('prospectos', sinResultado.length);
    const fila = (n, cls, t, sub, ir) => `<button type="button" class="vt-it" data-ir="${ir}"><span class="vt-n ${cls}">${n}</span><span class="vt-x"><b>${t}</b><span>${sub}</span></span><span class="vt-go">Ir ›</span></button>`;
    c.innerHTML = `<div class="vt-dosc"><div>
      <div class="vt-sec"><span>Leads de hoy · turno ${turno}</span><span>${Object.values(cant).reduce((a, b) => a + b, 0)} en total</span></div>
      <div class="vt-canales">${['instagram','whatsapp','referido','recepcion'].map(k => `<div class="vt-canal"><small>${CANALES[k]}</small><b id="vt-l-${k}">${cant[k] || 0}</b><div class="vt-pm"><button type="button" data-l="${k}" data-d="-1" aria-label="Restar">−</button><button type="button" data-l="${k}" data-d="1" aria-label="Sumar">+</button></div></div>`).join('')}</div>
      <p style="margin:8px 2px 0;font-size:12px;color:#8A8A8A">Suma cada lead nuevo que te escribe, según por dónde llegó. Esto alimenta la conversión del Dashboard.</p>
      <button type="button" class="vt-cta" id="vt-nuevo" style="margin-top:14px">${IC('plus') || '＋'} Nuevo prospecto</button>
      </div><div>
      <div class="vt-sec"><span>Pendientes del turno</span></div>
      ${fila(porConfirmar.length, porConfirmar.length ? 'r' : 'v', 'Confirmar clases de mañana', porConfirmar.filter(p => p.confirmacion === 'no_contesto').length + ' sin contestar', 'agenda-man')}
      ${fila(cpHoy.length, '', 'Clases de prueba de hoy', cpHoy.filter(p => p.confirmacion === 'confirmada').length + ' confirmadas', 'agenda')}
      ${fila(paraHoy.length, paraHoy.length ? 'a' : 'v', 'Seguimientos para hoy', paraHoy.filter(x => x.s.atraso > 0).length + ' atrasados', 'seguimiento')}
      ${fila(sinResultado.length, sinResultado.length ? 'r' : 'v', 'Clases sin resultado', 'pasó la fecha y no se marcó qué ocurrió', 'sin-resultado')}
      ${fila(incompletas.length, incompletas.length ? 'a' : 'v', 'Ingresos sin terminar', 'ventas con la lista de ingreso incompleta', 'ventas')}
      </div></div>`;
    let t = null;
    c.querySelectorAll('[data-l]').forEach(b => b.onclick = () => {
      const k = b.dataset.l; cant[k] = Math.max(0, (cant[k] || 0) + Number(b.dataset.d));
      $id('vt-l-' + k).textContent = cant[k];
      clearTimeout(t); t = setTimeout(async () => {
        const filas = Object.entries(cant).map(([canal, cantidad]) => ({ fecha: hoy, turno, vendedor_id: profile.id, canal, cantidad, updated_at: new Date().toISOString() }));
        const { error } = await sb.from('ventas_leads_diarios').upsert(filas, { onConflict:'fecha,turno,vendedor_id,canal' });
        if(error) toast('No se pudieron guardar los leads: ' + error.message);
      }, 700);
    });
    c.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => {
      const ir = b.dataset.ir;
      if(ir === 'agenda-man'){ S.agenda = man; S.vista = 'agenda'; }
      else if(ir === 'agenda'){ S.agenda = hoy; S.vista = 'agenda'; }
      else if(ir === 'sin-resultado'){ S.filtro = 'sin_resultado'; S.vista = 'prospectos'; }
      else S.vista = ir;
      renderVentasHome();
    });
    $id('vt-nuevo').onclick = () => formProspecto(null);
  }

  // ---------------------------------------------------------------- 2) Prospectos
  async function vistaProspectos(c){
    const lista = await prospectosRecientes(180);
    const hoy = hoyISO();
    const sinRes = (p) => p.fecha_visita && p.fecha_visita < hoy && ['agendado','reagendado'].includes(p.estado);
    const cuenta = (k) => k === 'todos' ? lista.length : k === 'sin_resultado' ? lista.filter(sinRes).length : lista.filter(p => p.estado === k).length;
    const filtros = [['todos','Todos'], ['sin_resultado','Sin resultado'], ...Object.entries(ESTADOS)];
    c.innerHTML = `
      <button type="button" class="vt-cta" id="vt-nuevo">${IC('plus') || '＋'} Nuevo prospecto</button>
      <div class="vt-bar"><input type="text" id="vt-q" placeholder="Buscar por nombre o WhatsApp..." value="${esc(S.busqueda)}" autocomplete="off"></div>
      <div class="vt-chips" id="vt-f">${filtros.map(([k, t]) => `<button type="button" data-v="${k}" class="${S.filtro === k ? 'on' : ''}">${t}<small>${cuenta(k)}</small></button>`).join('')}</div>
      <div id="vt-lista" class="vt-cols"></div>`;
    const pintar = () => {
      const q = S.busqueda.trim().toLowerCase();
      let vis = lista.filter(p => S.filtro === 'todos' ? true : S.filtro === 'sin_resultado' ? sinRes(p) : p.estado === S.filtro);
      if(q) vis = vis.filter(p => (p.nombre || '').toLowerCase().includes(q) || String(p.whatsapp || '').includes(q.replace(/\D/g, '') || '~'));
      $id('vt-lista').innerHTML = vis.length ? vis.slice(0, 200).map(p => {
        const dias = diasEntre(String(p.ultimo_contacto_at || p.updated_at || p.created_at).slice(0, 10), hoy);
        const cls = p.estado === 'compro' ? 'v' : ['no_asistio','no_compro','perdido'].includes(p.estado) ? 'r' : p.estado === 'compromiso' ? 'a' : 'y';
        return `<button type="button" class="vt-it" data-id="${p.id}"><span class="vt-av">${esc(iniciales(p.nombre))}</span><span class="vt-x"><b>${esc(p.nombre)}</b><span>${esc((CANALES[p.canal] || '').split(' ').slice(1).join(' '))} · ${esc(nomPersona(p.coach_id))} · visita ${esc(fCorta(p.fecha_visita))}</span><span class="vt-pill ${cls}">${esc(ESTADOS[p.estado] || p.estado)}</span>${sinRes(p) ? ' <span class="vt-pill r">sin resultado</span>' : ''}${dias > 3 && !['compro','perdido','descartado'].includes(p.estado) ? ` <span class="vt-pill a">${dias} días sin gestión</span>` : ''}</span><span class="vt-go">›</span></button>`;
      }).join('') : '<div class="vt-vacio">No hay prospectos con ese filtro.</div>';
      $id('vt-lista').querySelectorAll('[data-id]').forEach(b => b.onclick = () => fichaProspecto(lista.find(p => p.id === b.dataset.id)));
    };
    $id('vt-q').oninput = (e) => { S.busqueda = e.target.value; pintar(); };
    chipsSel($id('vt-f'), (v) => { S.filtro = v; pintar(); });
    $id('vt-nuevo').onclick = () => formProspecto(null);
    pintar();
  }

  function opcionesCoach(sel){
    return `<option value="">Se define después</option>` + coaches().map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nombre)} · ${p.alumnos} alumnos</option>`).join('');
  }
  function opcionesPersona(lista, sel, vacio){
    return (vacio ? `<option value="">${vacio}</option>` : '') + lista.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');
  }
  const textoCupo = (id) => { const p = persona(id); if(!p) return ''; const n = Number(p.alumnos) || 0; return n < 45 ? `✓ ${n} alumnos · tiene cupo (meta 45–55)` : n <= 55 ? `${n} alumnos · en su rango (45–55)` : `⚠ ${n} alumnos · cartera llena`; };

  function formProspecto(p0){
    const e = p0 || { canal:'instagram', tipo:'intencion_compra', fecha_visita: sumarDias(hoyISO(), 1), vendedor_id: profile.id };
    const p = p0 && !p0.__nuevo ? p0 : null; // p = prospecto existente que se edita; si no, se crea uno nuevo
    hoja(`<h3>${p ? 'Editar prospecto' : 'Nuevo prospecto'}</h3>
      <label>Nombre *</label><input type="text" id="vp-nombre" maxlength="120" value="${esc(e.nombre || '')}" autocomplete="off">
      <label>WhatsApp *</label><input type="tel" id="vp-wsp" maxlength="30" placeholder="+56 9 1234 5678" value="${esc(e.whatsapp || '')}">
      <label>Correo</label><input type="email" id="vp-mail" maxlength="120" value="${esc(e.correo || '')}">
      <label>¿Por dónde llegó? *</label><div class="vt-chips" id="vp-canal">${Object.entries(CANALES).map(([k, t]) => `<button type="button" data-v="${k}" class="${e.canal === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <label>Tipo</label><div class="vt-chips" id="vp-tipo">${Object.entries(TIPOS).map(([k, t]) => `<button type="button" data-v="${k}" class="${e.tipo === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <label>Objetivo</label><div class="vt-chips" id="vp-obj">${OBJETIVOS.map(o => `<button type="button" data-v="${esc(o)}" class="${e.objetivo === o ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>
      <div class="vt-dos"><div><label>Clase de prueba *</label><input type="date" id="vp-fecha" value="${esc(e.fecha_visita || '')}"></div><div><label>Hora</label><input type="time" id="vp-hora" value="${esc(hora(e.hora_visita))}"></div></div>
      <label>Coach de la clase</label><select id="vp-coach">${opcionesCoach(e.coach_id)}</select><div class="vt-cupo" id="vp-cupo">${esc(textoCupo(e.coach_id))}</div>
      <div class="vt-dos"><div><label>Vendedora</label><select id="vp-vend">${opcionesPersona(vendedoras(), e.vendedor_id, 'Sin asignar')}</select></div><div><label>Cerrador</label><select id="vp-cerr">${opcionesPersona(S.equipo, e.cerrador_id, 'Ninguno')}</select></div></div>
      <label>Salud o lesiones</label><textarea id="vp-salud" rows="2" maxlength="400" placeholder="Ej: dolor lumbar, operación de rodilla...">${esc(e.notas_salud || '')}</textarea>
      <label>Notas</label><textarea id="vp-notas" rows="2" maxlength="600">${esc(e.notas || '')}</textarea>
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">${p ? 'Guardar cambios' : 'Agendar clase de prueba'}</button></div>`,
    (h, cerrar) => {
      const v = { canal: e.canal, tipo: e.tipo, objetivo: e.objetivo || null };
      chipsSel(h.querySelector('#vp-canal'), x => v.canal = x);
      chipsSel(h.querySelector('#vp-tipo'), x => v.tipo = x);
      chipsSel(h.querySelector('#vp-obj'), x => v.objetivo = x);
      h.querySelector('#vp-coach').onchange = (ev) => { const cu = h.querySelector('#vp-cupo'); cu.textContent = textoCupo(ev.target.value); cu.classList.toggle('a', /llena/.test(cu.textContent)); };
      h.querySelector('[data-no]').onclick = cerrar;
      const si = h.querySelector('[data-si]');
      si.onclick = async () => {
        const nombre = h.querySelector('#vp-nombre').value.trim(), wsp = h.querySelector('#vp-wsp').value.trim(), fecha = h.querySelector('#vp-fecha').value;
        if(!nombre){ toast('Falta el nombre'); return; }
        if(wsp.replace(/\D/g, '').length < 8){ toast('Revisa el WhatsApp'); return; }
        if(!fecha){ toast('Falta la fecha de la clase de prueba'); return; }
        const fila = { nombre, whatsapp: wsp, correo: h.querySelector('#vp-mail').value.trim() || null, canal: v.canal, tipo: v.tipo, objetivo: v.objetivo, fecha_visita: fecha, hora_visita: h.querySelector('#vp-hora').value || null, coach_id: h.querySelector('#vp-coach').value || null, vendedor_id: h.querySelector('#vp-vend').value || null, cerrador_id: h.querySelector('#vp-cerr').value || null, notas_salud: h.querySelector('#vp-salud').value.trim() || null, notas: h.querySelector('#vp-notas').value.trim() || null, updated_at: new Date().toISOString() };
        si.disabled = true; si.textContent = 'Guardando...';
        const { error } = p ? await sb.from('ventas_prospectos').update(fila).eq('id', p.id) : await sb.from('ventas_prospectos').insert(fila);
        if(error){ toast('No se pudo guardar: ' + error.message); si.disabled = false; si.textContent = 'Guardar'; return; }
        cerrar(); toast(p ? 'Prospecto actualizado ✓' : 'Clase de prueba agendada ✓'); pintarVista();
      };
    });
  }

  async function fichaProspecto(p){
    if(!p) return;
    const segs = (await seguimientosDe([p.id])).sort((a, b) => a.paso - b.paso);
    const msgConf = `Hola ${nombreCorto(p.nombre)}, te escribo de STC para confirmar tu clase de prueba del ${p.fecha_visita ? fLarga(p.fecha_visita) : ''}${p.hora_visita ? ' a las ' + hora(p.hora_visita) : ''}${p.coach_id ? ' con ' + nombreCorto(nomPersona(p.coach_id)) : ''}. ¿Confirmas tu asistencia?`;
    hoja(`<h3>${esc(p.nombre)}</h3>
      <p style="margin:0 0 8px;color:#A8A8A8;font-size:13px">${esc(CANALES[p.canal] || '')} · ${esc(TIPOS[p.tipo] || '')}${p.objetivo ? ' · ' + esc(p.objetivo) : ''}</p>
      <span class="vt-pill y">${esc(ESTADOS[p.estado] || p.estado)}</span> <span class="vt-pill">${esc(CONFIRM[p.confirmacion] || '')}</span>
      <div class="vt-acc" style="margin-top:12px"><a class="vt-wsp" href="${esc(linkWsp(p.whatsapp, msgConf))}" target="_blank" rel="noopener">💬 WhatsApp</a></div>
      <label>Clase de prueba</label><p style="margin:0;font-size:14px">${esc(p.fecha_visita ? fLarga(p.fecha_visita) : 'Sin fecha')}${p.hora_visita ? ' · ' + esc(hora(p.hora_visita)) : ''} · coach ${esc(nomPersona(p.coach_id))}</p>
      ${p.motivo_no_compra ? `<label>Motivo de no compra</label><p style="margin:0;font-size:14px">${esc(p.motivo_no_compra)}</p>` : ''}
      ${p.fecha_compromiso ? `<label>Compromiso de pago</label><p style="margin:0;font-size:14px">${esc(fLarga(p.fecha_compromiso))}</p>` : ''}
      ${p.notas_salud ? `<label>Salud</label><p style="margin:0;font-size:13.5px">${esc(p.notas_salud)}</p>` : ''}
      ${p.notas ? `<label>Notas</label><p style="margin:0;font-size:13.5px">${esc(p.notas)}</p>` : ''}
      <label>Seguimientos (${segs.length} de 5)</label>${segs.length ? segs.map(s => `<p style="margin:0 0 4px;font-size:13px">✓ Contacto ${s.paso} · ${esc(fCorta(String(s.hecho_at).slice(0, 10)))}${s.nota ? ' · ' + esc(s.nota) : ''}</p>`).join('') : '<p style="margin:0;font-size:13px;color:#8A8A8A">Sin contactos registrados.</p>'}
      <div class="vt-acc" style="margin-top:14px">
        <button type="button" class="v" data-a="venta">Registrar venta</button>
        <button type="button" class="y" data-a="editar">Editar</button>
        <button type="button" data-a="reagendar">Reagendar</button>
        ${['perdido','descartado','compro'].includes(p.estado) ? '' : '<button type="button" class="r" data-a="perdido">Marcar perdido</button>'}
      </div>`,
    (h, cerrar) => h.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const a = b.dataset.a; cerrar();
      if(a === 'venta') formVenta(null, p);
      else if(a === 'editar') formProspecto(p);
      else if(a === 'reagendar') reagendar(p);
      else if(a === 'perdido'){ await actualizarProspecto(p.id, { estado:'perdido' }); toast('Marcado como perdido'); pintarVista(); }
    }));
  }

  async function actualizarProspecto(id, cambios){
    const { error } = await sb.from('ventas_prospectos').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', id);
    if(error){ toast('No se pudo guardar: ' + error.message); return false; }
    return true;
  }
  function reagendar(p){
    hoja(`<h3>Reagendar a ${esc(nombreCorto(p.nombre))}</h3>
      <div class="vt-dos"><div><label>Nueva fecha</label><input type="date" id="vr-f" value="${esc(sumarDias(hoyISO(), 1))}"></div><div><label>Hora</label><input type="time" id="vr-h" value="${esc(hora(p.hora_visita))}"></div></div>
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">Reagendar</button></div>`,
    (h, cerrar) => {
      h.querySelector('[data-no]').onclick = cerrar;
      h.querySelector('[data-si]').onclick = async () => {
        const f = h.querySelector('#vr-f').value; if(!f){ toast('Elige una fecha'); return; }
        if(await actualizarProspecto(p.id, { estado:'reagendado', fecha_visita: f, hora_visita: h.querySelector('#vr-h').value || null, confirmacion:'pendiente', intentos_confirmacion: 0 })){ cerrar(); toast('Clase reagendada ✓'); pintarVista(); }
      };
    });
  }

  // ---------------------------------------------------------------- 3) Agenda
  async function vistaAgenda(c){
    const f = S.agenda, hoy = hoyISO();
    const lista = (await prospectosRango(f, f)).filter(p => !['descartado'].includes(p.estado));
    c.innerHTML = `
      <div class="vt-fecha"><button type="button" id="va-ant" aria-label="Día anterior">‹</button><b>${esc(fLarga(f))}</b><button type="button" id="va-sig" aria-label="Día siguiente">›</button></div>
      <div class="vt-chips"><button type="button" id="va-hoy" class="${f === hoy ? 'on' : ''}">Hoy</button><button type="button" id="va-man" class="${f === sumarDias(hoy, 1) ? 'on' : ''}">Mañana</button><button type="button" id="va-nuevo">＋ Agendar</button></div>
      <div class="vt-sec"><span>${lista.length} clase${lista.length === 1 ? '' : 's'} de prueba</span><span>${lista.filter(p => p.confirmacion === 'confirmada').length} confirmadas</span></div>
      <div class="vt-cols">${lista.length ? lista.map(p => tarjetaAgenda(p, f <= hoy)).join('') : '<div class="vt-vacio">No hay clases de prueba este día.</div>'}</div>`;
    $id('va-ant').onclick = () => { S.agenda = sumarDias(f, -1); pintarVista(); };
    $id('va-sig').onclick = () => { S.agenda = sumarDias(f, 1); pintarVista(); };
    $id('va-hoy').onclick = () => { S.agenda = hoy; pintarVista(); };
    $id('va-man').onclick = () => { S.agenda = sumarDias(hoy, 1); pintarVista(); };
    $id('va-nuevo').onclick = () => formProspecto({ canal:'instagram', tipo:'intencion_compra', fecha_visita: f, vendedor_id: profile.id, __nuevo: true });
    c.querySelectorAll('[data-conf]').forEach(b => b.onclick = async () => {
      const p = lista.find(x => x.id === b.dataset.id); const v = b.dataset.conf;
      const cambios = { confirmacion: v }; if(v === 'no_contesto') cambios.intentos_confirmacion = (p.intentos_confirmacion || 0) + 1;
      if(await actualizarProspecto(p.id, cambios)) pintarVista();
    });
    c.querySelectorAll('[data-res]').forEach(b => b.onclick = () => resultado(lista.find(x => x.id === b.dataset.id), b.dataset.res));
    c.querySelectorAll('[data-ficha]').forEach(b => b.onclick = () => fichaProspecto(lista.find(x => x.id === b.dataset.ficha)));
  }
  function tarjetaAgenda(p, yaPaso){
    const msg = `Hola ${nombreCorto(p.nombre)}, te escribo de STC para confirmar tu clase de prueba del ${fLarga(p.fecha_visita)}${p.hora_visita ? ' a las ' + hora(p.hora_visita) : ''}${p.coach_id ? ' con ' + nombreCorto(nomPersona(p.coach_id)) : ''}. ¿Confirmas tu asistencia?`;
    const conf = p.confirmacion, abierto = ['agendado','reagendado'].includes(p.estado);
    const pillConf = conf === 'confirmada' ? 'v' : conf === 'cancelada' ? 'r' : conf === 'no_contesto' ? 'r' : 'a';
    return `<div class="vt-ag">
      <div class="vt-ag-h"><span class="vt-av">${esc(iniciales(p.nombre))}</span><span class="vt-x" data-ficha="${p.id}" style="cursor:pointer"><b>${esc(p.nombre)}</b><span>con ${esc(nomPersona(p.coach_id))} · ${esc((CANALES[p.canal] || '').split(' ').slice(1).join(' '))}</span></span><span class="vt-hr">${esc(hora(p.hora_visita) || '—')}</span></div>
      <span class="vt-pill ${pillConf}">${esc(CONFIRM[conf])}${conf === 'no_contesto' && p.intentos_confirmacion > 1 ? ' (' + p.intentos_confirmacion + ')' : ''}</span>${abierto ? '' : ` <span class="vt-pill y">${esc(ESTADOS[p.estado])}</span>`}
      ${abierto ? `<div class="vt-acc"><a class="vt-wsp" href="${esc(linkWsp(p.whatsapp, msg))}" target="_blank" rel="noopener">💬 Confirmar por WhatsApp</a></div>
      <div class="vt-acc"><button type="button" class="${conf === 'confirmada' ? 'on' : 'v'}" data-conf="confirmada" data-id="${p.id}">Confirmada</button><button type="button" class="${conf === 'no_contesto' ? 'on' : ''}" data-conf="no_contesto" data-id="${p.id}">No contestó</button><button type="button" class="${conf === 'cancelada' ? 'on' : 'r'}" data-conf="cancelada" data-id="${p.id}">Cancelada</button></div>` : ''}
      ${abierto && yaPaso ? `<div class="vt-q">¿Qué pasó en la clase?<div class="vt-acc"><button type="button" class="v" data-res="compro" data-id="${p.id}">Compró</button><button type="button" class="y" data-res="compromiso" data-id="${p.id}">Compromiso</button><button type="button" data-res="reagendar" data-id="${p.id}">Reagendar</button><button type="button" class="r" data-res="no_compro" data-id="${p.id}">No le interesó</button><button type="button" class="r" data-res="no_asistio" data-id="${p.id}">No asistió</button></div></div>` : ''}
    </div>`;
  }
  function resultado(p, r){
    if(r === 'compro') return formVenta(null, p);
    if(r === 'reagendar') return reagendar(p);
    if(r === 'no_asistio') return actualizarProspecto(p.id, { estado:'no_asistio' }).then(ok => { if(ok){ toast('Marcado: no asistió. Pasa a Seguimiento.'); pintarVista(); } });
    if(r === 'compromiso'){
      return hoja(`<h3>Compromiso de ${esc(nombreCorto(p.nombre))}</h3><label>¿Qué día se compromete a pagar?</label><input type="date" id="vc-f" value="${esc(sumarDias(hoyISO(), 2))}"><label>Nota</label><input type="text" id="vc-n" maxlength="200" placeholder="Ej: paga cuando le llegue el sueldo">
        <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">Guardar</button></div>`,
      (h, cerrar) => { h.querySelector('[data-no]').onclick = cerrar; h.querySelector('[data-si]').onclick = async () => {
        const f = h.querySelector('#vc-f').value; if(!f){ toast('Elige la fecha'); return; }
        const n = h.querySelector('#vc-n').value.trim();
        if(await actualizarProspecto(p.id, { estado:'compromiso', fecha_compromiso: f, notas: n ? ((p.notas ? p.notas + ' · ' : '') + n) : p.notas })){ cerrar(); toast('Compromiso guardado. Aparece en Seguimiento.'); pintarVista(); }
      }; });
    }
    if(r === 'no_compro'){
      return hoja(`<h3>¿Por qué no compró?</h3><div class="vt-chips" id="vm-m">${MOTIVOS.map(m => `<button type="button" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div><label>Detalle (opcional)</label><input type="text" id="vm-d" maxlength="200">
        <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">Guardar</button></div>`,
      (h, cerrar) => { let m = null; chipsSel(h.querySelector('#vm-m'), x => m = x); h.querySelector('[data-no]').onclick = cerrar; h.querySelector('[data-si]').onclick = async () => {
        if(!m){ toast('Elige un motivo'); return; }
        const d = h.querySelector('#vm-d').value.trim();
        if(await actualizarProspecto(p.id, { estado:'no_compro', motivo_no_compra: d ? m + ' · ' + d : m })){ cerrar(); toast('Guardado. Pasa a Seguimiento.'); pintarVista(); }
      }; });
    }
  }

  // ---------------------------------------------------------------- 4) Seguimiento
  async function vistaSeguimiento(c){
    const lista = (await prospectosRecientes(120)).filter(p => ['no_asistio','no_compro','compromiso'].includes(p.estado));
    const segs = await seguimientosDe(lista.map(p => p.id));
    const items = lista.map(p => ({ p, s: estadoSeguimiento(p, segs) })).filter(x => x.s).sort((a, b) => b.s.atraso - a.s.atraso);
    const hoy = items.filter(x => x.s.atraso >= 0), prox = items.filter(x => x.s.atraso < 0);
    const terminados = lista.length - items.length;
    const tarjeta = ({ p, s }) => {
      const msg = mensaje(p, s.paso);
      return `<div class="vt-ag">
        <div class="vt-ag-h"><span class="vt-av">${esc(iniciales(p.nombre))}</span><span class="vt-x" data-ficha="${p.id}" style="cursor:pointer"><b>${esc(p.nombre)}</b><span>${esc(ESTADOS[p.estado])}${p.motivo_no_compra ? ' · ' + esc(p.motivo_no_compra) : ''}${p.fecha_compromiso ? ' · paga el ' + esc(fCorta(p.fecha_compromiso)) : ''}</span></span></div>
        <div class="vt-pasos">${[1,2,3,4,5].map(i => `<i class="${i <= s.hechos ? 'h' : i === s.paso ? 'a' : ''}"></i>`).join('')}</div>
        <span class="vt-pill ${s.atraso > 0 ? 'r' : s.atraso === 0 ? 'y' : ''}">Contacto ${s.paso} de 5 · ${s.atraso > 0 ? 'atrasado ' + s.atraso + ' día' + (s.atraso === 1 ? '' : 's') : s.atraso === 0 ? 'toca hoy' : 'el ' + esc(fCorta(s.vence))}</span>
        <div class="vt-msg">${esc(msg)}</div>
        <div class="vt-acc"><a class="vt-wsp" href="${esc(linkWsp(p.whatsapp, msg))}" target="_blank" rel="noopener">💬 Abrir WhatsApp</a><button type="button" class="y" data-hecho="${p.id}" data-paso="${s.paso}">✓ Contacto hecho</button></div>
        <div class="vt-acc"><button type="button" class="v" data-venta="${p.id}">Compró</button><button type="button" data-reag="${p.id}">Reagendar clase</button><button type="button" class="r" data-perdido="${p.id}">Perdido</button></div>
      </div>`;
    };
    badge('seguimiento', hoy.length);
    c.innerHTML = `
      <div class="vt-sec"><span>Para hoy y atrasados</span><span>${hoy.length}</span></div>
      <div class="vt-cols">${hoy.length ? hoy.map(tarjeta).join('') : '<div class="vt-vacio">✓ No hay seguimientos pendientes para hoy.</div>'}</div>
      <div class="vt-sec"><span>Próximos</span><span>${prox.length}</span></div>
      <div class="vt-cols">${prox.length ? prox.map(tarjeta).join('') : '<div class="vt-vacio">Sin seguimientos programados.</div>'}</div>
      <p style="margin:12px 2px 0;font-size:12px;color:#8A8A8A">Secuencia de la guía de ventas: inmediato · día siguiente · 3 días después · fin de semana · segundo fin de semana. ${terminados} prospecto${terminados === 1 ? '' : 's'} ya completaron los 5 contactos.</p>`;
    const por = (id) => lista.find(p => p.id === id);
    c.querySelectorAll('[data-hecho]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      const { error } = await sb.from('ventas_seguimientos').insert({ prospecto_id: b.dataset.hecho, paso: Number(b.dataset.paso) });
      if(error){ toast('No se pudo guardar: ' + error.message); b.disabled = false; return; }
      await actualizarProspecto(b.dataset.hecho, { ultimo_contacto_at: new Date().toISOString() });
      toast('Contacto registrado ✓'); pintarVista();
    });
    c.querySelectorAll('[data-venta]').forEach(b => b.onclick = () => formVenta(null, por(b.dataset.venta)));
    c.querySelectorAll('[data-reag]').forEach(b => b.onclick = () => reagendar(por(b.dataset.reag)));
    c.querySelectorAll('[data-perdido]').forEach(b => b.onclick = async () => { if(await actualizarProspecto(b.dataset.perdido, { estado:'perdido' })){ toast('Marcado como perdido'); pintarVista(); } });
    c.querySelectorAll('[data-ficha]').forEach(b => b.onclick = () => fichaProspecto(por(b.dataset.ficha)));
  }

  // ---------------------------------------------------------------- 5) Ventas
  async function vistaVentas(c){
    const [desde, hasta] = mesRango(S.mesVentas);
    const { data, error } = await sb.from('ventas_ventas').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending:false }).order('created_at', { ascending:false });
    if(error) throw error;
    const vts = data || [];
    const total = vts.reduce((a, v) => a + (v.monto || 0) + (v.inscripcion || 0), 0);
    const nuevos = vts.filter(v => v.cliente_nuevo);
    const incompletas = vts.filter(v => checkHechos(v) < checkItems(v).length).length;
    badge('ventas', incompletas);
    c.innerHTML = `
      <button type="button" class="vt-cta" id="vv-nueva">${IC('plus') || '＋'} Registrar venta</button>
      <div class="vt-bar"><input type="month" id="vv-mes" value="${esc(S.mesVentas)}"></div>
      <div class="vt-kp"><div><small>Ventas del mes</small><b>${vts.length}</b><span>${plata(total)}</span></div><div><small>Clientes nuevos</small><b class="v">${nuevos.length}</b><span>${plata(nuevos.reduce((a, v) => a + (v.monto || 0) + (v.inscripcion || 0), 0))}</span></div><div><small>Programas</small><b>${vts.filter(v => esProgramaPlan(v.plan)).length}</b><span>3, 6 y 12 meses</span></div><div><small>Ingresos incompletos</small><b class="${incompletas ? 'a' : 'v'}">${incompletas}</b><span>falta algo de la lista</span></div></div>
      <div class="vt-cols">${vts.length ? vts.map(v => { const h = checkHechos(v), t = checkItems(v).length; return `<button type="button" class="vt-it" data-id="${v.id}"><span class="vt-n ${h === t ? 'v' : 'a'}">${h}/${t}</span><span class="vt-x"><b>${esc(v.cliente_nombre)}</b><span>${esc(v.plan)}${v.sesiones ? ' · ' + esc(v.sesiones) : ''}${v.modalidad === 'duo' ? ' · dúo' : ''} · ${esc(fCorta(v.fecha))} · ${esc(nombreCorto(nomPersona(v.vendedor_id)))}</span></span><span class="vt-go">${plata((v.monto || 0) + (v.inscripcion || 0))}</span></button>`; }).join('') : '<div class="vt-vacio">No hay ventas registradas este mes.</div>'}</div>`;
    $id('vv-nueva').onclick = () => formVenta(null, null);
    $id('vv-mes').onchange = (e) => { if(e.target.value){ S.mesVentas = e.target.value; pintarVista(); } };
    c.querySelectorAll('[data-id]').forEach(b => b.onclick = () => fichaVenta(vts.find(v => v.id === b.dataset.id)));
  }

  function formVenta(v, p){
    const e = v || { cliente_nombre: p ? p.nombre : '', plan:'PAT EVOLUTION', sesiones:'12 sesiones', modalidad:'individual', medio_pago:'EVO App', tipo: p ? (p.estado === 'agendado' || p.estado === 'reagendado' || p.estado === 'asistio' ? 'en_sede' : 'post_asistencia') : 'sin_agendar', cliente_nuevo:true, coach_id: p ? p.coach_id : null, vendedor_id: profile.id, cerrador_id: p ? p.cerrador_id : null, fecha: hoyISO(), checklist:{ pago:true } };
    hoja(`<h3>${v ? 'Editar venta' : 'Registrar venta'}</h3>
      <label>Cliente *</label><input type="text" id="vf-cli" maxlength="120" value="${esc(e.cliente_nombre)}">
      <label>Plan *</label><select id="vf-plan">${PLANES.map(x => `<option ${x === e.plan ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <label>Sesiones</label><div class="vt-chips" id="vf-ses">${SESIONES.map(x => `<button type="button" data-v="${x}" class="${x === e.sesiones ? 'on' : ''}">${x}</button>`).join('')}</div>
      <label>Modalidad</label><div class="vt-chips" id="vf-mod"><button type="button" data-v="individual" class="${e.modalidad !== 'duo' ? 'on' : ''}">Individual</button><button type="button" data-v="duo" class="${e.modalidad === 'duo' ? 'on' : ''}">Dúo</button></div>
      <div class="vt-dos"><div><label>Monto del plan *</label><input type="number" id="vf-monto" min="0" step="10" inputmode="numeric" value="${esc(e.monto || '')}"></div><div><label>Inscripción</label><input type="number" id="vf-ins" min="0" step="10" inputmode="numeric" value="${esc(e.inscripcion || '')}"></div></div>
      <div class="vt-dos"><div><label>Descuento</label><input type="number" id="vf-desc" min="0" step="10" inputmode="numeric" value="${esc(e.descuento || '')}"></div><div><label>Medio de pago</label><select id="vf-medio">${MEDIOS.map(x => `<option ${x === e.medio_pago ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
      <label>Tipo de venta</label><select id="vf-tipo">${Object.entries(TIPOS_VENTA).map(([k, t]) => `<option value="${k}" ${k === e.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font:600 13px Inter,sans-serif;color:#E6E6E6"><input type="checkbox" id="vf-nuevo" style="width:auto" ${e.cliente_nuevo ? 'checked' : ''}> Es cliente nuevo</label>
      <label>Coach</label><select id="vf-coach">${opcionesCoach(e.coach_id)}</select>
      <div class="vt-dos"><div><label>Vendedora</label><select id="vf-vend">${opcionesPersona(vendedoras(), e.vendedor_id, 'Sin asignar')}</select></div><div><label>Cerrador</label><select id="vf-cerr">${opcionesPersona(S.equipo, e.cerrador_id, 'Ninguno')}</select></div></div>
      <div class="vt-dos"><div><label>Fecha</label><input type="date" id="vf-fecha" value="${esc(e.fecha)}"></div><div><label>N° de boleta</label><input type="text" id="vf-bol" maxlength="30" value="${esc(e.boleta_numero || '')}"></div></div>
      <label>Notas</label><input type="text" id="vf-notas" maxlength="300" value="${esc(e.notas || '')}">
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">${v ? 'Guardar cambios' : 'Registrar venta'}</button></div>`,
    (h, cerrar) => {
      const sel = { sesiones: e.sesiones, modalidad: e.modalidad };
      chipsSel(h.querySelector('#vf-ses'), x => sel.sesiones = x);
      chipsSel(h.querySelector('#vf-mod'), x => sel.modalidad = x);
      h.querySelector('[data-no]').onclick = cerrar;
      const si = h.querySelector('[data-si]');
      si.onclick = async () => {
        const cli = h.querySelector('#vf-cli').value.trim(), monto = Math.max(0, parseInt(h.querySelector('#vf-monto').value, 10) || 0);
        if(!cli){ toast('Falta el nombre del cliente'); return; }
        if(!monto){ toast('Falta el monto del plan'); return; }
        const bol = h.querySelector('#vf-bol').value.trim();
        const checklist = Object.assign({}, e.checklist || {}); if(bol) checklist.boleta = true;
        const fila = { cliente_nombre: cli, plan: h.querySelector('#vf-plan').value, sesiones: sel.sesiones || null, modalidad: sel.modalidad || 'individual', monto, inscripcion: Math.max(0, parseInt(h.querySelector('#vf-ins').value, 10) || 0), descuento: Math.max(0, parseInt(h.querySelector('#vf-desc').value, 10) || 0), medio_pago: h.querySelector('#vf-medio').value, tipo: h.querySelector('#vf-tipo').value, cliente_nuevo: h.querySelector('#vf-nuevo').checked, coach_id: h.querySelector('#vf-coach').value || null, vendedor_id: h.querySelector('#vf-vend').value || null, cerrador_id: h.querySelector('#vf-cerr').value || null, fecha: h.querySelector('#vf-fecha').value || hoyISO(), boleta_numero: bol || null, notas: h.querySelector('#vf-notas').value.trim() || null, checklist, updated_at: new Date().toISOString() };
        if(!v && p) fila.prospecto_id = p.id;
        si.disabled = true; si.textContent = 'Guardando...';
        const { data, error } = v ? await sb.from('ventas_ventas').update(fila).eq('id', v.id).select().single() : await sb.from('ventas_ventas').insert(fila).select().single();
        if(error){ toast('No se pudo guardar: ' + error.message); si.disabled = false; si.textContent = 'Registrar venta'; return; }
        if(!v && p) await actualizarProspecto(p.id, { estado:'compro' });
        cerrar(); toast(v ? 'Venta actualizada ✓' : 'Venta registrada ✓ Completa la lista de ingreso.');
        if(!v && data) fichaVenta(data); else pintarVista();
      };
    });
  }

  function fichaVenta(v){
    if(!v) return;
    const items = checkItems(v);
    hoja(`<h3>${esc(v.cliente_nombre)}</h3>
      <p style="margin:0 0 6px;color:#A8A8A8;font-size:13px">${esc(v.plan)}${v.sesiones ? ' · ' + esc(v.sesiones) : ''}${v.modalidad === 'duo' ? ' · dúo' : ''} · ${esc(v.medio_pago || '')} · ${esc(fCorta(v.fecha))}</p>
      <div class="vt-kp" style="margin-top:8px"><div><small>Total</small><b class="v">${plata((v.monto || 0) + (v.inscripcion || 0))}</b><span>plan ${plata(v.monto)}${v.inscripcion ? ' + inscripción ' + plata(v.inscripcion) : ''}</span></div><div><small>Coach</small><b style="font-size:16px">${esc(nombreCorto(nomPersona(v.coach_id)))}</b><span>vende ${esc(nombreCorto(nomPersona(v.vendedor_id)))}</span></div></div>
      <label>Lista de ingreso · toca para marcar</label>
      <ul class="vt-ck" id="vk">${items.map(([k, t]) => `<li data-k="${k}" class="${v.checklist && v.checklist[k] ? 'h' : ''}"><i>✓</i>${t}</li>`).join('')}</ul>
      <p style="margin:8px 0 0;font-size:12px;color:#8A8A8A">La venta queda cerrada cuando la lista está completa (pago, EVO, contrato y tarjeta si es PAT).</p>
      <div class="eq-btns"><button type="button" class="btn-sm" data-ed>Editar venta</button><button type="button" class="btn-sm" data-ok style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">Listo</button></div>`,
    (h, cerrar) => {
      const ck = Object.assign({}, v.checklist || {});
      let t = null;
      h.querySelectorAll('#vk li').forEach(li => li.onclick = () => {
        ck[li.dataset.k] = !ck[li.dataset.k]; li.classList.toggle('h', !!ck[li.dataset.k]);
        clearTimeout(t); t = setTimeout(async () => {
          const { error } = await sb.from('ventas_ventas').update({ checklist: ck, updated_at: new Date().toISOString() }).eq('id', v.id);
          if(error) toast('No se pudo guardar la lista: ' + error.message); else v.checklist = ck;
        }, 400);
      });
      h.querySelector('[data-ed]').onclick = () => { cerrar(); formVenta(Object.assign({}, v, { checklist: ck }), null); };
      h.querySelector('[data-ok]').onclick = () => { cerrar(); if(S.vista === 'ventas' || S.vista === 'turno') pintarVista(); };
    });
  }

  // ---------------------------------------------------------------- 6) Dashboard comercial (como el de MapFit)
  async function vistaDashboard(c){
    const [desde, hasta] = mesRango(S.mes);
    const hoy = hoyISO(), corte = hasta < hoy ? hasta : hoy;
    const [{ data: leads }, prosp, { data: vts }] = await Promise.all([
      sb.from('ventas_leads_diarios').select('*').gte('fecha', desde).lte('fecha', hasta),
      prospectosRango(desde, hasta),
      sb.from('ventas_ventas').select('*').gte('fecha', desde).lte('fecha', hasta)
    ]);
    const L = leads || [], V = vts || [];
    const totLeads = L.reduce((a, l) => a + (l.cantidad || 0), 0);
    const porCanal = {}; L.forEach(l => { porCanal[l.canal] = (porCanal[l.canal] || 0) + (l.cantidad || 0); });
    const debian = prosp.filter(p => p.fecha_visita <= corte && !['reagendado','descartado'].includes(p.estado));
    const asistieron = debian.filter(p => ['asistio','compro','compromiso','no_compro'].includes(p.estado));
    const compraron = debian.filter(p => p.estado === 'compro');
    const noShow = debian.filter(p => p.estado === 'no_asistio').length;
    const nuevos = V.filter(v => v.cliente_nuevo), totNuevos = nuevos.reduce((a, v) => a + (v.monto || 0) + (v.inscripcion || 0), 0);
    const totVentas = V.reduce((a, v) => a + (v.monto || 0) + (v.inscripcion || 0), 0);
    const kp = (t, val, sub, cls) => `<div><small>${t}</small><b class="${cls || ''}">${val}</b><span>${sub}</span></div>`;
    const sem = (v, meta) => v == null ? '' : v >= meta ? 'v' : v >= meta - 10 ? 'a' : 'r';
    const pAg = pct(prosp.length, totLeads), pAs = pct(asistieron.length, debian.length), pCp = pct(compraron.length, asistieron.length), pCa = pct(compraron.length, debian.length);
    const porVend = {}; const sumar = (id, k, n) => { const x = porVend[id || 'sin'] = porVend[id || 'sin'] || { leads:0, prosp:0, ventas:0, monto:0 }; x[k] += n; };
    L.forEach(l => sumar(l.vendedor_id, 'leads', l.cantidad || 0)); prosp.forEach(p => sumar(p.vendedor_id, 'prosp', 1)); V.forEach(v => { sumar(v.vendedor_id, 'ventas', 1); sumar(v.vendedor_id, 'monto', (v.monto || 0) + (v.inscripcion || 0)); });
    const porCoach = {}; debian.forEach(p => { const x = porCoach[p.coach_id || 'sin'] = porCoach[p.coach_id || 'sin'] || { cp:0, asis:0, vend:0 }; x.cp++; if(asistieron.includes(p)) x.asis++; if(p.estado === 'compro') x.vend++; });
    const motivos = {}; prosp.filter(p => p.motivo_no_compra).forEach(p => { const m = p.motivo_no_compra.split(' · ')[0]; motivos[m] = (motivos[m] || 0) + 1; });
    c.innerHTML = `
      <div class="vt-bar"><input type="month" id="vd-mes" value="${esc(S.mes)}"><button type="button" class="btn-sm" id="vd-act">Actualizar</button></div>
      <div class="vt-sec"><span>Embudo · ${esc(MESL[Number(S.mes.slice(5)) - 1])} ${esc(S.mes.slice(0, 4))}</span></div>
      <div class="vt-kp">
        ${kp('Leads', totLeads.toLocaleString('es-CL'), Object.entries(porCanal).sort((a, b) => b[1] - a[1]).map(([k, n]) => (CANALES[k] || k).split(' ').slice(1).join(' ') + ' ' + n).join(' · ') || 'anotados en Mi turno')}
        ${kp('% Agendamiento', pctTxt(pAg), `${prosp.length} clases de ${totLeads} leads`)}
        ${kp('% Asistencia', pctTxt(pAs), `${asistieron.length} de ${debian.length} · no-show ${noShow}`, sem(pAs, 80))}
        ${kp('% Conversión asistidas', pctTxt(pCp), `${compraron.length} de ${asistieron.length} · meta 80%`, sem(pCp, 80))}
        ${kp('% Conversión agendadas', pctTxt(pCa), `${compraron.length} de ${debian.length}`)}
        ${kp('Ticket medio', nuevos.length ? plata(totNuevos / nuevos.length) : '—', 'por cliente nuevo')}
      </div>
      <div class="vt-sec"><span>Resultado del mes</span></div>
      <div class="vt-kp">
        ${kp('Clientes nuevos', nuevos.length, plata(totNuevos), 'v')}
        ${kp('Ventas totales', V.length, plata(totVentas))}
        ${kp('Programas 3·6·12', V.filter(v => esProgramaPlan(v.plan)).length, 'el resto son planes mensuales')}
        ${kp('Clases por venir', prosp.filter(p => p.fecha_visita > corte && ['agendado','reagendado'].includes(p.estado)).length, 'agendadas después de hoy')}
      </div>
      <div class="vt-sec"><span>Por vendedora</span></div>
      <div class="vt-tw"><table class="vt-tb"><thead><tr><th>Vendedora</th><th>Leads</th><th>Clases</th><th>Ventas</th><th>Monto</th></tr></thead><tbody>${Object.entries(porVend).sort((a, b) => b[1].monto - a[1].monto).map(([id, x]) => `<tr><td>${esc(id === 'sin' ? 'Sin asignar' : nombreCorto(nomPersona(id)))}</td><td>${x.leads}</td><td>${x.prosp}</td><td>${x.ventas}</td><td>${plata(x.monto)}</td></tr>`).join('') || '<tr><td colspan="5">Sin datos este mes</td></tr>'}</tbody></table></div>
      <div class="vt-sec"><span>Clases de prueba por coach</span></div>
      <div class="vt-tw"><table class="vt-tb"><thead><tr><th>Coach</th><th>Agend.</th><th>Asist.</th><th>Vend.</th><th>Asistencia</th><th>Conversión</th></tr></thead><tbody>${Object.entries(porCoach).sort((a, b) => b[1].cp - a[1].cp).map(([id, x]) => { const as = pct(x.asis, x.cp), cv = pct(x.vend, x.asis); return `<tr><td>${esc(id === 'sin' ? 'Sin coach' : nombreCorto(nomPersona(id)))}</td><td>${x.cp}</td><td>${x.asis}</td><td>${x.vend}</td><td><span class="vt-pill ${sem(as, 80)}">${pctTxt(as)}</span></td><td><span class="vt-pill ${sem(cv, 80)}">${pctTxt(cv)}</span></td></tr>`; }).join('') || '<tr><td colspan="6">Sin clases este mes</td></tr>'}</tbody></table></div>
      ${Object.keys(motivos).length ? `<div class="vt-sec"><span>Motivos de no compra</span></div><div class="vt-chips">${Object.entries(motivos).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<button type="button" disabled>${esc(m)}<small>${n}</small></button>`).join('')}</div>` : ''}
      <p style="margin:12px 2px 0;font-size:12px;color:#8A8A8A">Las métricas se calculan con lo que se registra en Mi turno, Agenda y Ventas. Más registro = métricas más precisas.</p>`;
    $id('vd-mes').onchange = (e) => { if(e.target.value){ S.mes = e.target.value; pintarVista(); } };
    $id('vd-act').onclick = () => { cargarEquipo().then(pintarVista); };
  }

  // ---------------------------------------------------------------- CEO (solo uno): por ahora una portada; el panel con los Excel viene después
  function renderCeoHome(){
    root().innerHTML = `<div class="vt">
      <div class="header-actions"><div class="coach-home-titulo"><small>PANEL CEO</small><b>Hola, ${esc(nombreCorto(profile.nombre))}</b></div><div class="student-header-actions"><button class="switch-user" id="btn-logout">${IC('logout')} Salir</button></div></div>
      <div class="card"><h2 style="margin-top:0">Tu panel está en construcción</h2><p class="sub" style="margin-bottom:12px">Aquí verás ventas contra la meta, leads, clases de prueba, conversión, inversión, costo por cliente, clientes nuevos y retención, con los datos de los Excel de STC.</p>
      <button type="button" class="vt-cta" id="vc-ventas" style="margin:0">Ver el Dashboard de ventas</button></div>
    </div>`;
    $id('btn-logout').onclick = handleLogout;
    $id('vc-ventas').onclick = () => { S.vista = 'dashboard'; renderVentasHome(); };
  }

  // ---------------------------------------------------------------- enganches a la app
  // Etiquetas de los perfiles nuevos
  const origEtiqueta = window.rolEtiqueta;
  if(typeof origEtiqueta === 'function' && !origEtiqueta.__vt){
    const nueva = (p) => p && p.role === 'ventas' ? 'Ventas' : p && p.role === 'ceo' ? 'CEO' : origEtiqueta(p);
    nueva.__vt = true; window.rolEtiqueta = nueva;
  }
  // Los perfiles ventas y ceo usan la vista de equipo (no la de alumno)
  const origVista = window.esVistaCoach;
  if(typeof origVista === 'function' && !origVista.__vt){
    const nueva = (role) => role === 'ventas' || role === 'ceo' || origVista(role);
    nueva.__vt = true; window.esVistaCoach = nueva;
  }
  // Inicio: la vendedora entra a su panel; el CEO a su portada; RS, LOC y admin ven un acceso al panel de ventas
  const origCoach = window.renderCoachHome;
  if(typeof origCoach === 'function' && !origCoach.__vt){
    const nueva = async function(){
      if(profile && profile.role === 'ventas') return renderVentasHome();
      if(profile && profile.role === 'ceo') return renderCeoHome();
      const r = await origCoach.apply(this, arguments);
      try{
        if(puedeVer() && !$id('vt-acceso')){
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'pl-acceso'; b.id = 'vt-acceso';
          b.innerHTML = `<span class="pl-acceso-ico">📈</span><span class="pl-acceso-txt"><small>EQUIPO DE VENTAS</small><b>Panel de ventas</b><em>Prospectos, agenda, seguimiento y dashboard</em></span><span class="pl-acceso-go">${IC('chevronRight')}</span>`;
          const ancla = $id('btn-mis-plantillas');
          if(ancla) ancla.insertAdjacentElement('beforebegin', b);
          else { const h = root().querySelector('.header-actions'); if(h) h.insertAdjacentElement('afterend', b); else root().prepend(b); }
          b.onclick = () => { S.vista = 'turno'; renderVentasHome(); };
        }
      }catch(_e){}
      return r;
    };
    nueva.__vt = true; window.renderCoachHome = nueva;
  }
  // Gestión de perfiles: agrega "Ventas" y "CEO" a la lista de perfiles que puede asignar el administrador
  new MutationObserver(() => {
    document.querySelectorAll('.rl-perfil select[data-rol]:not([data-vt])').forEach(sel => {
      sel.dataset.vt = '1';
      const fila = sel.closest('.rl-perfil'), etiqueta = (fila && fila.querySelector('.n small') || {}).textContent || '';
      const op = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); return o; };
      const ov = op('ventas', 'Ventas'), oc = op('ceo', 'CEO (solo uno)');
      if(etiqueta === 'Ventas') ov.selected = true;
      if(etiqueta === 'CEO') oc.selected = true;
    });
  }).observe(document.body, { childList:true, subtree:true });

  window.UCVentas = { abrir: renderVentasHome, fechaPaso, estadoSeguimiento };
})();
