// STC App — Mesociclos: plantilla que divide el entrenamiento por semanas (ejercicios, series, reps, pesos y descansos).
// Cada semana se aplica como la rutina normal del alumno (así conserva fotos, videos, registro de series y "rutina al día");
// las semanas anteriores quedan en "Rutinas anteriores". Se carga DESPUÉS de app.js y equipo.js.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const avatar = (p, cls) => (typeof renderProfileAvatar === 'function' ? renderProfileAvatar(p, cls) : '');
  const toast = (m) => { try{ showToast(m); }catch(_e){} };
  const $id = (id) => document.getElementById(id);
  const IC = (n) => (typeof ICONS !== 'undefined' && ICONS[n]) ? ICONS[n] : '';
  const hoyStr = () => todayStr();
  const norm = (s) => (typeof normalizarTexto === 'function' ? normalizarTexto(s || '') : String(s || '').toLowerCase());
  const clon = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- estilos
  const css = document.createElement('style');
  css.textContent = `
  .ms{padding-bottom:110px}
  .ms-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
  .ms-pill{display:inline-block;background:rgba(247,197,30,.15);color:#F7C51E;border-radius:99px;padding:4px 11px;font:700 11px 'IBM Plex Mono',monospace;letter-spacing:.04em}
  .ms-pill.ok{background:rgba(101,214,110,.15);color:#65D66E}.ms-pill.des{background:rgba(124,196,255,.15);color:#7cc4ff}
  .ms h1{margin:4px 0 4px}
  .ms-sub{color:#A8A8A8;font-size:13px;margin:0 0 12px}
  .ms-in{width:100%;box-sizing:border-box;margin:0 0 8px}
  .ms-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;margin:6px 0 4px;-webkit-overflow-scrolling:touch}
  .ms-tab{flex:1 0 auto;min-width:62px;text-align:center;padding:10px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#141414;color:#F5F5F5;font:700 13px 'Oswald',sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}
  .ms-tab small{display:block;font:500 9.5px 'IBM Plex Mono',monospace;letter-spacing:.06em;margin-top:2px;opacity:.8}
  .ms-tab.on{background:#F7C51E;border-color:#F7C51E;color:#111}
  .ms-tab.des{border-style:dashed;border-color:#35607f;color:#7cc4ff}.ms-tab.des.on{background:#7cc4ff;border-color:#7cc4ff;color:#0b2233}
  .ms-tab.add{flex:0 0 46px;min-width:46px;color:#F7C51E;border-color:rgba(247,197,30,.5)}
  .ms-tools{display:flex;gap:7px;flex-wrap:wrap;margin:2px 0 12px}
  .ms-chipb{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid rgba(247,197,30,.55);background:transparent;color:#F7C51E;font:700 12.5px 'Inter',sans-serif;cursor:pointer}
  .ms-chipb.plain{border-color:rgba(255,255,255,.18);color:#E6E6E6}
  .ms-chipb.peligro{border-color:rgba(229,72,77,.6);color:#FF8A8E}
  .ms-chipb[disabled]{opacity:.5}
  .ms-dias{display:flex;gap:6px;overflow-x:auto;margin:0 0 10px;padding-bottom:4px}
  .ms-dia{flex:0 0 auto;padding:8px 14px;border-radius:99px;border:1px solid rgba(255,255,255,.16);background:#141414;color:#E6E6E6;font:600 13px 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .ms-dia.on{border-color:#F7C51E;color:#F7C51E;background:rgba(247,197,30,.1)}
  .ms-diahead{display:flex;gap:8px;align-items:center;margin-bottom:10px}
  .ms-diahead input{flex:1;margin:0}
  .ms-ex{background:linear-gradient(135deg,#232323,#171717);border:1px solid #2c2c2c;border-radius:16px;padding:13px;margin-bottom:12px}
  .ms-exr{display:flex;gap:11px;align-items:flex-start}
  .ms-exr .routine-exercise-thumb,.ms-exr .ms-ph{flex:none;width:64px;height:64px;border-radius:13px;overflow:hidden;border:1px solid #333;background:#fff;padding:0}
  .ms-exr .routine-exercise-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .ms-ph{display:grid;place-items:center;background:#1c1c1c !important;color:#777;font:700 22px 'Oswald',sans-serif}
  .ms-ext{flex:1;min-width:0}
  .ms-exn{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
  .ms-exn b{font:600 15.5px/1.25 'Inter',sans-serif;color:#FBFBFB}
  .ms-tipo{flex:none;font:700 10.5px 'IBM Plex Mono',monospace;color:#F7C51E;letter-spacing:.04em}
  .ms-exv{margin-top:6px}
  .ms-more{flex:none;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#E6E6E6;font-size:18px;line-height:1;cursor:pointer}
  .ms-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:11px}
  .ms-f{display:flex;flex-direction:column;gap:4px;min-width:0}
  .ms-f span{font:600 9.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase;display:flex;justify-content:space-between}
  .ms-f span em{font-style:normal;color:#F7C51E}.ms-f span em.neg{color:#7cc4ff}
  .ms-f input{width:100%;box-sizing:border-box;margin:0;text-align:center;padding:9px 4px;font-weight:700;font-size:15px;border-radius:10px;min-width:0}
  .ms-f input.cam{border-color:#F7C51E;color:#F7C51E}
  .ms-masd{margin-top:9px}
  .ms-masd summary{cursor:pointer;color:#A8A8A8;font:600 12px 'IBM Plex Mono',monospace;letter-spacing:.04em;padding:4px 0}
  .ms-masd .ms-g2{display:grid;grid-template-columns:90px 1fr;gap:7px;margin-top:6px}
  .ms-masd input{margin:0;width:100%;box-sizing:border-box}
  .ms-vacio{border:1px dashed rgba(255,255,255,.2);border-radius:14px;padding:22px 14px;text-align:center;color:#A8A8A8;margin-bottom:12px}
  .ms-bar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(0deg,#0b0b0b 70%,rgba(11,11,11,0));justify-content:center}
  .ms-bar .btn{margin:0;max-width:520px;flex:1}
  .ms-bar .btn-ghost{flex:0 0 auto;margin:0}
  .ms-sucio{display:inline-block;width:8px;height:8px;border-radius:50%;background:#F7C51E;margin-right:6px}
  .ms-gen{overflow-x:auto;margin-bottom:12px}
  .ms-gen table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:300px}
  .ms-gen th{font:700 10.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#A8A8A8;padding:6px 4px;text-align:center;cursor:pointer}
  .ms-gen th.des{color:#7cc4ff}
  .ms-gen td{padding:8px 4px;border-top:1px solid #2a2a2a;text-align:center;line-height:1.3}
  .ms-gen td:first-child{text-align:left;font-weight:600;min-width:120px}
  .ms-gen td:first-child img{width:30px;height:30px;border-radius:7px;object-fit:cover;background:#fff;vertical-align:middle;margin-right:7px}
  .ms-gen td.up{color:#F7C51E;font-weight:700}.ms-gen td.d{color:#7cc4ff}
  .ms-lcard{background:linear-gradient(135deg,#232323,#171717);border:1px solid #2c2c2c;border-radius:16px;padding:14px;margin-bottom:12px}
  .ms-lcard h3{margin:0 0 3px;font:600 17px 'Inter',sans-serif;color:#FBFBFB}
  .ms-lcard small{display:block;color:#A8A8A8;font-size:12.5px}
  .ms-lcard .ms-acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .ms-lcard .ms-acc button{flex:1 1 auto;justify-content:center}
  .ms-lh{display:flex;gap:12px;align-items:center}
  .ms-lh .profile-avatar{width:44px;height:44px;flex:none}
  .ms-card{border:1px solid rgba(247,197,30,.35);background:linear-gradient(145deg,rgba(247,197,30,.09),rgba(23,23,23,.9));border-radius:18px;padding:14px;margin:0 0 14px}
  .ms-ck{font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#A8A8A8}
  .ms-card h3{margin:3px 0 0;font:600 18px 'Inter',sans-serif;color:#FBFBFB}
  .ms-prog{height:9px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:11px 0 8px}
  .ms-prog i{display:block;height:100%;background:#F7C51E;border-radius:99px}
  .ms-aviso{margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(247,197,30,.12);border:1px solid rgba(247,197,30,.4);font-size:13.5px;color:#FBFBFB}
  .ms-op{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:10px;margin:0 0 6px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.04);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .ms-op img{width:44px;height:44px;border-radius:10px;object-fit:cover;background:#fff;flex:none}
  .ms-op b{display:block;font:600 14.5px 'Inter',sans-serif}.ms-op small{color:#A8A8A8;font-size:12px}
  .ms-op.pel b{color:#FF8A8E}
  .ms-chipsel{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
  .ms-chipsel button{padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#141414;color:#E6E6E6;font:600 12.5px 'Inter',sans-serif;cursor:pointer}
  .ms-chipsel button.on{background:#F7C51E;border-color:#F7C51E;color:#111}
  .ms-hj label{display:block;margin:12px 0 5px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase}
  .ms-hj input,.ms-hj select{width:100%;box-sizing:border-box;margin:0}
  .ms-hj .ms-fila2{display:flex;gap:8px;align-items:center}
  .ms-stp{display:flex;align-items:center;gap:10px}
  .ms-stp button{width:42px;height:42px;border-radius:12px;border:1px solid rgba(247,197,30,.5);background:transparent;color:#F7C51E;font-size:22px;cursor:pointer}
  .ms-stp b{min-width:34px;text-align:center;font:700 20px 'Oswald',sans-serif}
  .ms-sep{height:1px;background:rgba(255,255,255,.1);margin:14px 0}
  .ms-ver .ms-ex{padding:12px}
  .ms-ver .ms-datos{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
  .ms-ver .ms-datos span{background:#101010;border:1px solid #303030;border-radius:9px;padding:5px 9px;font:600 12.5px 'Inter',sans-serif;color:#FBFBFB}
  .ms-ver .ms-datos span.p{color:#F7C51E}
  .ms-ver .ms-nota{margin-top:7px;font-size:12.5px;color:#A8A8A8}
  .ms-hist{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #2a2a2a}.ms-hist:first-child{border-top:0}
  .ms-hist .b{flex:1;min-width:0}.ms-hist small{display:block;color:#A8A8A8;font-size:12px}
  .ms-btn-lista{display:flex;align-items:center;gap:13px;width:100%;margin:0 0 14px;padding:13px 16px;border-radius:16px;border:1px solid rgba(247,197,30,.4);background:linear-gradient(145deg,rgba(247,197,30,.12),#161616);color:#F5F5F5;cursor:pointer;text-align:left;font:inherit}
  .ms-btn-lista .i{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(247,197,30,.16);color:#F7C51E;font-size:19px}
  .ms-btn-lista .t{flex:1;font:600 16px 'Oswald',sans-serif;letter-spacing:.05em;text-transform:uppercase;line-height:1.15}
  .ms-btn-lista .t small{display:block;margin-top:3px;font:400 10.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#A8A8A8;text-transform:none}
  .ms-btn-lista .go{color:#F7C51E;font-size:26px;line-height:1}
  .ms-peligro{background:#C0392B !important;border-color:#C0392B !important;color:#fff !important;font-weight:700}
  @media (min-width:900px){
    .ms-grid{grid-template-columns:repeat(4,minmax(0,140px))}
    .ms-exs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ms-exs .ms-ex{margin:0}.ms-exs{margin-bottom:12px}
    .ms-bar{left:0}
  }
  `;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- hoja inferior
  function hoja(html, montar, alCerrar){
    const ov = document.createElement('div');
    ov.className = 'eq-ov';
    ov.innerHTML = `<div class="eq-hoja ms-hj" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(ov);
    const kd = (e) => { if(e.key === 'Escape') cerrar(); };
    let cerrada = false;
    const cerrar = () => { if(cerrada) return; cerrada = true; ov.remove(); document.removeEventListener('keydown', kd); if(alCerrar) alCerrar(); };
    document.addEventListener('keydown', kd);
    ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
    if(montar) montar(ov.querySelector('.eq-hoja'), cerrar);
    return cerrar;
  }
  function confirmar(titulo, texto, textoSi, peligro){
    return new Promise(res => {
      let hecho = false;
      const fin = (v) => { if(!hecho){ hecho = true; res(v); } };
      hoja(`<h3>${esc(titulo)}</h3><p>${texto}</p><div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm ${peligro ? 'ms-peligro' : ''}" data-si style="${peligro ? '' : 'background:#F7C51E;color:#111;border-color:#F7C51E;font-weight:700'}">${esc(textoSi)}</button></div>`, (h, cerrar) => {
        h.querySelector('[data-no]').onclick = () => { fin(false); cerrar(); };
        h.querySelector('[data-si]').onclick = () => { fin(true); cerrar(); };
      }, () => fin(false));
    });
  }

  // ---------------------------------------------------------------- datos / plan
  let _ok = null;
  async function disponible(){
    if(_ok !== null) return _ok;
    try{
      const { error } = await sb.from('mesociclos').select('id').limit(1);
      _ok = !error;
    }catch(_e){ _ok = false; }
    return _ok;
  }
  const celdaBase = () => ({ series:'3', reps:'10', peso:'', descanso:'', rir:'', nota:'' });
  function planNuevo(semanas, dias){
    return {
      dias: Array.from({ length: dias }, (_, i) => ({ nombre: 'Día ' + (i + 1), ejercicios: [] })),
      prog: { modo:'kg', paso:2.5, factor:0.8, descarga:[] }
    };
  }
  function ejNuevo(nombre, semanas){
    return { nombre, tipo:'', lado:'', nota:'', semanas: Array.from({ length: semanas }, () => celdaBase()) };
  }
  function normalizarPlan(m){
    const p = (m.plan && typeof m.plan === 'object') ? m.plan : {};
    p.prog = Object.assign({ modo:'kg', paso:2.5, factor:0.8, descarga:[] }, p.prog || {});
    if(!Array.isArray(p.prog.descarga)) p.prog.descarga = [];
    p.dias = Array.isArray(p.dias) && p.dias.length ? p.dias : [{ nombre:'Día 1', ejercicios:[] }];
    p.dias.forEach(d => {
      d.ejercicios = Array.isArray(d.ejercicios) ? d.ejercicios : [];
      d.ejercicios.forEach(e => {
        e.semanas = Array.isArray(e.semanas) ? e.semanas : [];
        while(e.semanas.length < m.semanas) e.semanas.push(Object.assign(celdaBase(), clon(e.semanas[e.semanas.length - 1] || {})));
        if(e.semanas.length > m.semanas) e.semanas.length = m.semanas;
        e.semanas = e.semanas.map(c => Object.assign(celdaBase(), c || {}));
        e.tipo = e.tipo || ''; e.lado = e.lado || ''; e.nota = e.nota || '';
      });
    });
    m.plan = p;
    return m;
  }
  const numPeso = (t) => { const x = String(t == null ? '' : t).match(/^\s*(\d+(?:[.,]\d+)?)/); return x ? parseFloat(x[1].replace(',', '.')) : null; };
  const unidadPeso = (t) => { const x = String(t == null ? '' : t).replace(/^\s*\d+(?:[.,]\d+)?/, '').trim(); return x; };
  const redondear = (n) => Math.round(n * 2) / 2;
  const fmtPeso = (n, u) => { const s = (Math.round(n * 10) / 10).toString().replace('.', ','); return s + (u ? (/^%/.test(u) ? u : ' ' + u) : ''); };
  function siguientePeso(prevTxt, prog){
    const n = numPeso(prevTxt); if(n == null) return prevTxt;
    const u = unidadPeso(prevTxt) || (prog.modo === 'pct' ? '%' : '');
    const v = prog.modo === 'pct' ? n * (1 + (Number(prog.paso) || 0) / 100) : n + (Number(prog.paso) || 0);
    return fmtPeso(redondear(v), u);
  }
  function aplicarProgresion(plan, semanas){
    const pr = plan.prog; if(pr.modo === 'manual') return;
    plan.dias.forEach(d => d.ejercicios.forEach(e => {
      const base = e.semanas[0]; if(!base) return;
      const n0 = numPeso(base.peso); if(n0 == null) return;
      let ultNormal = base.peso;
      for(let w = 1; w < semanas; w++){
        const c = e.semanas[w];
        if((pr.descarga || []).includes(w + 1)){
          const f = Number(pr.factor) || 0.8;
          const nn = numPeso(ultNormal);
          c.peso = fmtPeso(redondear(nn * f), unidadPeso(ultNormal));
          c.series = String(Math.max(1, Math.round((Number(base.series) || 3) * 0.7)));
        } else {
          ultNormal = siguientePeso(ultNormal, pr);
          c.peso = ultNormal; c.series = base.series;
        }
      }
    }));
  }
  function semanaPorFecha(m){
    if(!m.inicio) return 1;
    const d = Math.floor((new Date(hoyStr() + 'T12:00:00') - new Date(m.inicio + 'T12:00:00')) / 864e5);
    return Math.floor(d / 7) + 1; // puede pasar de m.semanas (= terminado) o ser < 1 (aún no empieza)
  }
  const semanaActual = (m) => Math.max(1, Math.min(m.semanas, semanaPorFecha(m)));
  function filasDeSemana(plan, w){
    const filas = [];
    plan.dias.forEach((d, di) => {
      const nombreDia = (d.nombre || '').trim() || ('Día ' + (di + 1));
      d.ejercicios.filter(e => (e.nombre || '').trim()).forEach((e, ei) => {
        const c = e.semanas[w - 1] || celdaBase();
        const peso = String(c.peso || '').trim();
        const notas = [String(c.nota || '').trim(), String(c.rir || '').trim() ? 'RIR ' + String(c.rir).trim() : '', String(e.nota || '').trim()].filter(Boolean).join(' · ');
        filas.push({
          nombre: e.nombre.trim(),
          series_objetivo: c.series !== '' && !isNaN(Number(c.series)) ? Number(c.series) : null,
          reps_objetivo: String(c.reps || '').trim() || null,
          unidad_objetivo: 'reps',
          peso_objetivo: peso ? (/^[\d.,]+$/.test(peso) ? peso + ' kg' : peso) : null,
          nota: notas || null,
          descanso_seg: c.descanso !== '' && !isNaN(Number(c.descanso)) ? Number(c.descanso) : null,
          tipo_serie_objetivo: e.tipo || null,
          lado_objetivo: e.lado || null,
          dia_nombre: nombreDia,
          dia_orden: di,
          orden: ei
        });
      });
    });
    return filas;
  }
  const firmaSemana = (plan, w) => JSON.stringify(filasDeSemana(plan, w));

  // ---------------------------------------------------------------- aplicar una semana como rutina del alumno
  async function aplicarSemana(m, w, opts){
    opts = opts || {};
    const filas = filasDeSemana(m.plan, w);
    if(!filas.length) throw new Error('El mesociclo no tiene ejercicios en la semana ' + w);
    const { data: rutina, error } = await sb.from('rutinas').insert({
      alumno_id: m.alumno_id, nombre: `${m.nombre} · Semana ${w}`, objetivo: m.objetivo || null, activa: false, fecha: hoyStr(),
      origen: 'profesor', creada_por: profile.id
    }).select().single();
    if(error || !rutina) throw new Error('No se pudo crear la rutina de la semana ' + w);
    const { error: eEj } = await sb.from('rutina_ejercicios').insert(filas.map(f => ({ ...f, rutina_id: rutina.id })));
    if(eEj){ await sb.from('rutinas').delete().eq('id', rutina.id); throw new Error('No se pudieron guardar los ejercicios'); }
    const { error: eDes } = await sb.from('rutinas').update({ activa: false }).eq('alumno_id', m.alumno_id).eq('activa', true).neq('id', rutina.id);
    if(eDes){ await sb.from('rutinas').delete().eq('id', rutina.id); throw new Error('No se pudo activar la rutina'); }
    const { error: eAct } = await sb.from('rutinas').update({ activa: true }).eq('id', rutina.id);
    if(eAct) throw new Error('La rutina se guardó pero no pudo activarse');
    const { error: eM } = await sb.from('mesociclos').update({ semana_aplicada: w, rutina_id: rutina.id, updated_at: new Date().toISOString() }).eq('id', m.id);
    if(eM) throw new Error('No se pudo registrar la semana aplicada');
    m.semana_aplicada = w; m.rutina_id = rutina.id;
    if(!opts.silencioso){ try{ avisarPush({ tipo:'rutina', rutina_id: rutina.id, actualizada: w > 1 || !!opts.actualizada }); }catch(_e){} }
    return rutina;
  }

  // ---------------------------------------------------------------- pantallas: editor
  let E = null; // estado del editor: { m, semana, dia, sucio, volver, firmaInicial }

  const resumenM = (m) => `${m.semanas} sem · ${(m.plan.dias || []).length} día${(m.plan.dias || []).length === 1 ? '' : 's'}`;
  const exTotal = (m) => (m.plan.dias || []).reduce((a, d) => a + d.ejercicios.length, 0);

  function pedirDatosIniciales(volver, alumnoPre){
    hoja(`<h3>Nuevo mesociclo</h3>
      <p>Una plantilla que divide la rutina por semanas, con sus ejercicios, series y pesos.</p>
      <label>Nombre</label><input type="text" id="msn-nombre" maxlength="60" placeholder="Ej: Fuerza base" autocomplete="off">
      <label>Objetivo (opcional)</label><input type="text" id="msn-obj" maxlength="120" placeholder="Ej: Ganar fuerza en básicos" autocomplete="off">
      <label>Duración</label><div class="ms-chipsel" id="msn-sem">${[3,4,6,8].map(n => `<button type="button" data-v="${n}" class="${n === 4 ? 'on' : ''}">${n} sem</button>`).join('')}<button type="button" data-v="otro">Otra</button></div>
      <label>Días por semana</label><div class="ms-chipsel" id="msn-dias">${[2,3,4,5,6].map(n => `<button type="button" data-v="${n}" class="${n === 4 ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#F7C51E;color:#111;border-color:#F7C51E;font-weight:700">Continuar</button></div>`,
    (h, cerrar) => {
      let sem = 4, dias = 4;
      const sel = (cont, cb) => cont.querySelectorAll('button').forEach(b => b.onclick = () => {
        cont.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        cb(b.dataset.v);
      });
      sel(h.querySelector('#msn-sem'), v => {
        if(v === 'otro'){
          const bs = h.querySelector('#msn-sem [data-v=otro]');
          bs.outerHTML = '<input type="number" min="1" max="16" id="msn-sem-otro" value="5" style="width:80px;margin:0">';
          const inp = h.querySelector('#msn-sem-otro'); inp.focus(); inp.select();
          inp.oninput = () => { sem = Math.max(1, Math.min(16, parseInt(inp.value, 10) || 1)); };
          sem = 5;
        } else sem = parseInt(v, 10);
      });
      sel(h.querySelector('#msn-dias'), v => { dias = parseInt(v, 10); });
      h.querySelector('[data-no]').onclick = cerrar;
      h.querySelector('[data-si]').onclick = () => {
        const nombre = h.querySelector('#msn-nombre').value.trim();
        if(!nombre){ toast('Ponle un nombre al mesociclo'); return; }
        cerrar();
        abrirEditor({ id:null, nombre, objetivo: h.querySelector('#msn-obj').value.trim() || null, semanas: sem, alumno_id: null, estado:'plantilla', plan: planNuevo(sem, dias) }, volver, true);
      };
    });
  }

  function abrirEditor(m, volver, nuevo){
    normalizarPlan(m);
    E = { m, semana: 1, dia: 0, sucio: !!nuevo, volver, firmaInicial: m.id ? firmaSemana(m.plan, m.semana_aplicada || 1) : null, nuevo: !!nuevo };
    if(m.alumno_id && m.estado === 'activo') E.semana = m.semana_aplicada || semanaActual(m);
    pintarEditor();
  }

  const sucio = () => { if(E && !E.sucio){ E.sucio = true; const p = $id('ms-sucio'); if(p) p.hidden = false; } };

  function deltaHtml(e, w, campo){
    if(w <= 1) return '';
    const a = numPeso(e.semanas[w - 2].peso), b = numPeso(e.semanas[w - 1].peso);
    if(campo !== 'peso' || a == null || b == null || a === b) return '';
    const d = Math.round((b - a) * 10) / 10;
    return `<em class="${d < 0 ? 'neg' : ''}">${d > 0 ? '+' : ''}${String(d).replace('.', ',')}</em>`;
  }
  function cambiaVsAnterior(e, w, campo){
    if(w <= 1) return false;
    return String(e.semanas[w - 2][campo] || '') !== String(e.semanas[w - 1][campo] || '');
  }
  const TIPOS = { '':'Normal', drop_set:'Drop set', rest_pause:'Rest-pause', forzada:'Forzada al fallo', bi_serie:'Bi-serie', super_serie:'Super serie' };
  const LADOS = { '':'No aplica', unilateral:'Unilateral', bilateral:'Bilateral', peso_por_lado:'Peso por lado' };

  function cardEjercicio(e, i, w, dia){
    const c = e.semanas[w - 1];
    const des = (E.m.plan.prog.descarga || []).includes(w);
    const thumb = (typeof renderExerciseThumbnail === 'function' ? renderExerciseThumbnail(e) : '') || `<span class="ms-ph">${esc((e.nombre || '?').slice(0, 1).toUpperCase())}</span>`;
    const video = typeof renderExerciseVideoButton === 'function' ? renderExerciseVideoButton(e) : '';
    const campo = (k, etq, tipo, extra) => `<label class="ms-f"><span>${etq}${deltaHtml(e, w, k)}</span><input type="${tipo || 'text'}" ${tipo === 'number' ? 'inputmode="decimal"' : ''} data-k="${k}" value="${esc(c[k])}" class="${cambiaVsAnterior(e, w, k) ? 'cam' : ''}" ${extra || ''}></label>`;
    return `<div class="ms-ex" data-e="${i}">
      <div class="ms-exr">${thumb}<div class="ms-ext"><div class="ms-exn"><b>${esc(e.nombre)}</b><span class="ms-tipo">${e.tipo ? esc(TIPOS[e.tipo] || '') : ''}</span></div><div class="ms-exv">${video}</div></div><button type="button" class="ms-more" data-more="${i}" aria-label="Más opciones de ${esc(e.nombre)}">⋯</button></div>
      <div class="ms-grid">${campo('series','Series','number')}${campo('reps','Reps','text')}${campo('peso','Peso','text','placeholder="kg o %"')}${campo('descanso','Desc. s','number')}</div>
      <details class="ms-masd" ${(c.rir || c.nota || e.nota) ? 'open' : ''}><summary>RIR y notas</summary><div class="ms-g2"><input type="text" data-k="rir" placeholder="RIR" value="${esc(c.rir)}"><input type="text" data-k="nota" placeholder="Nota de esta semana" value="${esc(c.nota)}"></div></details>
    </div>`;
  }

  function pintarEditor(){
    const m = E.m, p = m.plan, w = E.semana;
    if(E.dia >= p.dias.length) E.dia = p.dias.length - 1;
    const dia = p.dias[E.dia];
    const des = p.prog.descarga || [];
    const asignado = !!m.alumno_id;
    root().innerHTML = `<div class="ms">
      <div class="ms-head"><button type="button" class="back-link" id="ms-volver">${IC('arrowLeft')} Volver</button><span class="ms-pill ${asignado ? 'ok' : ''}">${asignado ? 'En curso · ' : ''}${esc(resumenM(m))}</span></div>
      <h1><input type="text" id="ms-nombre" class="ms-in" maxlength="60" value="${esc(m.nombre)}" aria-label="Nombre del mesociclo" style="font:700 22px 'Oswald',sans-serif;"></h1>
      <input type="text" id="ms-objetivo" class="ms-in" maxlength="120" placeholder="Objetivo (opcional)" value="${esc(m.objetivo || '')}">
      <div class="ms-tabs" id="ms-sems">${Array.from({ length: m.semanas }, (_, i) => `<button type="button" class="ms-tab ${i + 1 === w ? 'on' : ''} ${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">Sem ${i + 1}${des.includes(i + 1) ? '<small>DESCARGA</small>' : (asignado && m.semana_aplicada === i + 1 ? '<small>ACTUAL</small>' : '')}</button>`).join('')}${m.semanas < 16 ? '<button type="button" class="ms-tab add" id="ms-addsem" aria-label="Agregar semana">+</button>' : ''}</div>
      <div class="ms-tools">
        <button type="button" class="ms-chipb" id="ms-copiar">⧉ Copiar semana</button>
        <button type="button" class="ms-chipb plain" id="ms-descarga">${des.includes(w) ? '↺ Quitar descarga' : '▽ Semana de descarga'}</button>
        <button type="button" class="ms-chipb plain" id="ms-general">▦ Vista general</button>
        <button type="button" class="ms-chipb plain" id="ms-ajustes">⚙ Ajustes</button>
      </div>
      <div class="ms-dias" id="ms-dias">${p.dias.map((d, i) => `<button type="button" class="ms-dia ${i === E.dia ? 'on' : ''}" data-d="${i}">${esc(d.nombre || 'Día ' + (i + 1))}</button>`).join('')}<button type="button" class="ms-dia" id="ms-adddia">＋ Día</button></div>
      <div class="ms-diahead"><input type="text" id="ms-dianombre" maxlength="60" value="${esc(dia.nombre)}" aria-label="Nombre del día"><button type="button" class="ms-more" id="ms-diamas" aria-label="Más opciones del día">⋯</button></div>
      <div class="ms-exs" id="ms-exs">${dia.ejercicios.length ? dia.ejercicios.map((e, i) => cardEjercicio(e, i, w, dia)).join('') : '<div class="ms-vacio" style="grid-column:1/-1">Este día aún no tiene ejercicios.</div>'}</div>
      <button type="button" class="ms-chipb" id="ms-addex" style="width:100%;justify-content:center;padding:13px">＋ Agregar ejercicio</button>
      <div class="ms-bar"><button type="button" class="btn" id="ms-guardar"><span class="ms-sucio" id="ms-sucio" ${E.sucio ? '' : 'hidden'}></span>${m.id ? 'Guardar cambios' : 'Guardar mesociclo'}</button></div>
    </div>`;
    cablearEditor();
  }

  function cablearEditor(){
    const m = E.m, p = m.plan, w = E.semana;
    $id('ms-volver').onclick = async () => {
      if(E.sucio && !(await confirmar('¿Salir sin guardar?', 'Tienes cambios sin guardar en este mesociclo. Si sales ahora se pierden.', 'Salir sin guardar', true))) return;
      const v = E.volver; E = null; v();
    };
    $id('ms-nombre').oninput = (ev) => { m.nombre = ev.target.value; sucio(); };
    $id('ms-objetivo').oninput = (ev) => { m.objetivo = ev.target.value.trim() || null; sucio(); };
    document.querySelectorAll('#ms-sems [data-w]').forEach(b => b.onclick = () => { E.semana = parseInt(b.dataset.w, 10); pintarEditor(); });
    const add = $id('ms-addsem'); if(add) add.onclick = agregarSemana;
    $id('ms-copiar').onclick = copiarSemana;
    $id('ms-descarga').onclick = () => {
      const d = p.prog.descarga || (p.prog.descarga = []);
      const k = d.indexOf(w); if(k >= 0) d.splice(k, 1); else d.push(w);
      sucio(); pintarEditor();
    };
    $id('ms-general').onclick = () => pintarGeneral(false);
    $id('ms-ajustes').onclick = ajustes;
    document.querySelectorAll('#ms-dias [data-d]').forEach(b => b.onclick = () => { E.dia = parseInt(b.dataset.d, 10); pintarEditor(); });
    $id('ms-adddia').onclick = () => { p.dias.push({ nombre: 'Día ' + (p.dias.length + 1), ejercicios: [] }); E.dia = p.dias.length - 1; sucio(); pintarEditor(); };
    $id('ms-dianombre').oninput = (ev) => { p.dias[E.dia].nombre = ev.target.value; sucio(); const b = document.querySelector(`#ms-dias [data-d="${E.dia}"]`); if(b) b.textContent = ev.target.value || 'Día ' + (E.dia + 1); };
    $id('ms-diamas').onclick = menuDia;
    $id('ms-addex').onclick = () => elegirEjercicio(null, (nombre) => {
      p.dias[E.dia].ejercicios.push(ejNuevo(nombre, m.semanas));
      sucio(); pintarEditor();
    });
    document.querySelectorAll('#ms-exs .ms-ex').forEach(card => {
      const i = parseInt(card.dataset.e, 10), e = p.dias[E.dia].ejercicios[i];
      card.querySelectorAll('input[data-k]').forEach(inp => {
        inp.oninput = () => { e.semanas[w - 1][inp.dataset.k] = inp.value; sucio(); };
        inp.onchange = () => { // marca cambios contra la semana anterior sin perder el foco
          inp.classList.toggle('cam', cambiaVsAnterior(e, w, inp.dataset.k));
          if(inp.dataset.k === 'peso'){ const sp = inp.closest('.ms-f').querySelector('span'); sp.innerHTML = 'Peso' + deltaHtml(e, w, 'peso'); }
        };
      });
      card.querySelector('[data-more]').onclick = () => menuEjercicio(i);
    });
    $id('ms-guardar').onclick = () => guardar(false);
  }

  function agregarSemana(){
    const m = E.m, p = m.plan;
    m.semanas += 1;
    const des = p.prog.descarga || [];
    let base = m.semanas - 1; // última semana normal (no de descarga) antes de la nueva
    while(base > 1 && des.includes(base)) base--;
    p.dias.forEach(d => d.ejercicios.forEach(e => {
      const ult = clon(e.semanas[base - 1] || e.semanas[e.semanas.length - 1]);
      if(p.prog.modo !== 'manual') ult.peso = siguientePeso(ult.peso, p.prog);
      e.semanas.push(ult);
    }));
    E.semana = m.semanas; sucio(); pintarEditor();
  }

  function copiarSemana(){
    const m = E.m, w = E.semana;
    if(m.semanas < 2){ toast('Solo hay una semana'); return; }
    hoja(`<h3>Copiar semana</h3><p>Elige desde qué semana copiar todo (ejercicios, series, reps, pesos y notas) hacia la <b>semana ${w}</b>. Lo que hoy tiene la semana ${w} se reemplaza.</p>
      ${Array.from({ length: m.semanas }, (_, i) => i + 1).filter(n => n !== w).map(n => `<button type="button" class="ms-op" data-w="${n}"><span><b>Semana ${n}</b><small>Copiar hacia la semana ${w}</small></span></button>`).join('')}`,
    (h, cerrar) => h.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
      const o = parseInt(b.dataset.w, 10);
      m.plan.dias.forEach(d => d.ejercicios.forEach(e => { e.semanas[w - 1] = clon(e.semanas[o - 1]); }));
      cerrar(); sucio(); toast(`Semana ${o} copiada a la semana ${w}`); pintarEditor();
    }));
  }

  function menuDia(){
    const p = E.m.plan, i = E.dia;
    hoja(`<h3>${esc(p.dias[i].nombre || 'Día ' + (i + 1))}</h3>
      <button type="button" class="ms-op" data-a="izq" ${i === 0 ? 'disabled style="opacity:.4"' : ''}><span><b>◀ Mover antes</b></span></button>
      <button type="button" class="ms-op" data-a="der" ${i === p.dias.length - 1 ? 'disabled style="opacity:.4"' : ''}><span><b>Mover después ▶</b></span></button>
      <button type="button" class="ms-op" data-a="dup"><span><b>⧉ Duplicar día</b><small>Con todos sus ejercicios y pesos</small></span></button>
      <button type="button" class="ms-op pel" data-a="del" ${p.dias.length < 2 ? 'disabled style="opacity:.4"' : ''}><span><b>🗑 Eliminar día</b><small>${p.dias.length < 2 ? 'Debe quedar al menos un día' : 'Se borran sus ejercicios'}</small></span></button>`,
    (h, cerrar) => h.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      if(b.disabled) return;
      const a = b.dataset.a;
      if(a === 'izq'){ [p.dias[i - 1], p.dias[i]] = [p.dias[i], p.dias[i - 1]]; E.dia = i - 1; }
      else if(a === 'der'){ [p.dias[i + 1], p.dias[i]] = [p.dias[i], p.dias[i + 1]]; E.dia = i + 1; }
      else if(a === 'dup'){ const c = clon(p.dias[i]); c.nombre = (c.nombre || 'Día') + ' (copia)'; p.dias.splice(i + 1, 0, c); E.dia = i + 1; }
      else if(a === 'del'){
        cerrar();
        if(!(await confirmar('¿Eliminar este día?', `Se borran los ${p.dias[i].ejercicios.length} ejercicios de «${esc(p.dias[i].nombre)}» en todas las semanas.`, 'Sí, eliminar', true))) return;
        p.dias.splice(i, 1); E.dia = Math.max(0, i - 1); sucio(); pintarEditor(); return;
      }
      cerrar(); sucio(); pintarEditor();
    }));
  }

  function menuEjercicio(i){
    const m = E.m, p = m.plan, w = E.semana, lista = p.dias[E.dia].ejercicios, e = lista[i];
    const chips = (obj, actual, k) => `<div class="ms-chipsel" data-chips="${k}">${Object.entries(obj).map(([v, t]) => `<button type="button" data-v="${v}" class="${v === (actual || '') ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`;
    hoja(`<h3>${esc(e.nombre)}</h3>
      <button type="button" class="ms-op" data-a="cambiar"><span><b>⇄ Cambiar ejercicio</b><small>Se mantienen series, reps y pesos</small></span></button>
      <button type="button" class="ms-op" data-a="arriba" ${i === 0 ? 'disabled style="opacity:.4"' : ''}><span><b>▲ Subir</b></span></button>
      <button type="button" class="ms-op" data-a="abajo" ${i === lista.length - 1 ? 'disabled style="opacity:.4"' : ''}><span><b>▼ Bajar</b></span></button>
      <button type="button" class="ms-op" data-a="dup"><span><b>⧉ Duplicar ejercicio</b></span></button>
      <button type="button" class="ms-op" data-a="repetir"><span><b>↻ Repetir la semana ${w} en todas</b><small>Copia series, reps, peso y descanso de esta semana a las demás</small></span></button>
      <label>Tipo de serie</label>${chips(TIPOS, e.tipo, 'tipo')}
      <label>Lado</label>${chips(LADOS, e.lado, 'lado')}
      <label>Nota del ejercicio (todas las semanas)</label><input type="text" id="mse-nota" maxlength="200" value="${esc(e.nota)}" placeholder="Ej: pausa de 1 s abajo">
      <div class="ms-sep"></div>
      <button type="button" class="ms-op pel" data-a="del"><span><b>🗑 Quitar ejercicio</b><small>Se borra de todas las semanas</small></span></button>`,
    (h, cerrar) => {
      h.querySelectorAll('[data-chips]').forEach(cont => cont.querySelectorAll('button').forEach(b => b.onclick = () => {
        cont.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        e[cont.dataset.chips] = b.dataset.v; sucio();
      }));
      h.querySelector('#mse-nota').oninput = (ev) => { e.nota = ev.target.value; sucio(); };
      h.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
        if(b.disabled) return;
        const a = b.dataset.a;
        if(a === 'cambiar'){ cerrar(); elegirEjercicio(e.nombre, (nombre) => { e.nombre = nombre; sucio(); pintarEditor(); }); return; }
        if(a === 'arriba'){ [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; }
        else if(a === 'abajo'){ [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; }
        else if(a === 'dup'){ lista.splice(i + 1, 0, clon(e)); }
        else if(a === 'repetir'){ const c = e.semanas[w - 1]; e.semanas = e.semanas.map(() => clon(c)); toast('Semana ' + w + ' repetida en todas'); }
        else if(a === 'del'){
          cerrar();
          if(!(await confirmar('¿Quitar este ejercicio?', `«${esc(e.nombre)}» se borra de todas las semanas de este día.`, 'Sí, quitar', true))) return;
          lista.splice(i, 1); sucio(); pintarEditor(); return;
        }
        cerrar(); sucio(); pintarEditor();
      });
    }, () => { if(E) pintarEditor(); });
  }

  // Selector de ejercicio con foto (banco de la app + nombre personalizado)
  function elegirEjercicio(actual, alElegir){
    const banco = typeof EXERCISE_BANK !== 'undefined' ? EXERCISE_BANK : [];
    const grupos = [...new Set(banco.map(x => x.group))];
    hoja(`<h3>${actual ? 'Cambiar ejercicio' : 'Agregar ejercicio'}</h3>
      <input type="text" class="eq-buscar" id="msx-q" placeholder="Buscar ejercicio..." autocomplete="off" style="margin-bottom:8px">
      <div class="ms-chipsel" id="msx-g"><button type="button" data-g="" class="on">Todos</button>${grupos.map(g => `<button type="button" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div id="msx-l"></div>`,
    (h, cerrar) => {
      let g = '';
      const q = h.querySelector('#msx-q'), l = h.querySelector('#msx-l');
      const pintar = () => {
        const t = norm(q.value.trim());
        const vis = banco.filter(x => (!g || x.group === g) && (!t || norm([x.name, ...(x.aliases || [])].join(' ')).includes(t)));
        const exacto = banco.some(x => norm(x.name) === t);
        const propio = t && !exacto ? `<button type="button" class="ms-op" data-n="${esc(q.value.trim())}"><span class="ms-ph" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:#1c1c1c;color:#F7C51E;flex:none">＋</span><span><b>Usar «${esc(q.value.trim())}»</b><small>Ejercicio personalizado</small></span></button>` : '';
        l.innerHTML = vis.map(x => `<button type="button" class="ms-op" data-n="${esc(x.name)}"><img src="${esc(x.image)}" alt=""><span><b>${esc(x.name)}</b><small>${esc(x.group)}</small></span></button>`).join('') + propio + (!vis.length && !t ? '<p>No hay ejercicios en esta categoría.</p>' : '');
        l.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { cerrar(); alElegir(b.dataset.n); });
      };
      q.oninput = pintar;
      h.querySelectorAll('#msx-g button').forEach(b => b.onclick = () => { h.querySelectorAll('#msx-g button').forEach(x => x.classList.remove('on')); b.classList.add('on'); g = b.dataset.g; pintar(); });
      pintar();
    });
  }

  function ajustes(){
    const m = E.m, p = m.plan, pr = p.prog;
    hoja(`<h3>Ajustes del mesociclo</h3>
      <label>Semanas</label><div class="ms-stp"><button type="button" id="mj-menos" aria-label="Quitar una semana">−</button><b id="mj-n">${m.semanas}</b><button type="button" id="mj-mas" aria-label="Agregar una semana">+</button></div>
      <label>Cómo suben los pesos</label>
      <div class="ms-chipsel" id="mj-modo">${[['kg','+ kg por semana'],['pct','+ % por semana'],['manual','Manual']].map(([v, t]) => `<button type="button" data-v="${v}" class="${pr.modo === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="ms-fila2" id="mj-pasos"><div style="flex:1"><label style="margin-top:0">Aumento semanal</label><input type="number" step="0.5" min="0" id="mj-paso" value="${esc(pr.paso)}"></div><div style="flex:1"><label style="margin-top:0">Descarga (× peso)</label><input type="number" step="0.05" min="0.3" max="1" id="mj-factor" value="${esc(pr.factor)}"></div></div>
      <button type="button" class="ms-op" id="mj-aplicar" style="margin-top:12px"><span><b>⚡ Aplicar progresión automática</b><small>Calcula los pesos de las semanas 2 en adelante a partir de la semana 1. Reemplaza los pesos que ya escribiste.</small></span></button>
      ${m.alumno_id ? `<label>Inicio del mesociclo</label><input type="date" id="mj-inicio" value="${esc(m.inicio || '')}">` : ''}
      <div class="ms-sep"></div>
      <button type="button" class="ms-op" data-a="vista"><span><b>▦ Vista general</b><small>Todas las semanas de un vistazo</small></span></button>
      ${m.id ? `<button type="button" class="ms-op" data-a="dup"><span><b>⧉ Duplicar como plantilla</b><small>Crea una copia sin alumno</small></span></button>` : ''}
      ${m.alumno_id ? `<button type="button" class="ms-op" data-a="terminar"><span><b>⏹ Terminar mesociclo</b><small>Queda en "anteriores"; la rutina actual del alumno no cambia</small></span></button>` : ''}
      ${m.id ? `<button type="button" class="ms-op pel" data-a="eliminar"><span><b>🗑 Eliminar mesociclo</b><small>${m.alumno_id ? 'Las rutinas semanales ya aplicadas se conservan' : 'No se puede deshacer'}</small></span></button>` : ''}`,
    (h, cerrar) => {
      const refrescar = () => { h.querySelector('#mj-n').textContent = m.semanas; };
      h.querySelector('#mj-mas').onclick = () => { if(m.semanas >= 16){ toast('Máximo 16 semanas'); return; } agregarSemana(); refrescar(); };
      h.querySelector('#mj-menos').onclick = async () => {
        if(m.semanas <= 1){ toast('Debe quedar al menos una semana'); return; }
        if(m.alumno_id && m.semana_aplicada && m.semana_aplicada >= m.semanas){ toast('Esa semana ya está aplicada al alumno'); return; }
        const n = m.semanas;
        const con = p.dias.some(d => d.ejercicios.length);
        if(con && !(await confirmar('¿Quitar la semana ' + n + '?', 'Se borran sus ejercicios, series y pesos.', 'Sí, quitar', true))) return;
        m.semanas -= 1; p.dias.forEach(d => d.ejercicios.forEach(e => { e.semanas.length = m.semanas; }));
        pr.descarga = (pr.descarga || []).filter(x => x <= m.semanas);
        if(E.semana > m.semanas) E.semana = m.semanas;
        sucio(); pintarEditor(); refrescar();
      };
      h.querySelectorAll('#mj-modo button').forEach(b => b.onclick = () => { h.querySelectorAll('#mj-modo button').forEach(x => x.classList.remove('on')); b.classList.add('on'); pr.modo = b.dataset.v; sucio(); });
      h.querySelector('#mj-paso').oninput = (ev) => { pr.paso = parseFloat(ev.target.value) || 0; sucio(); };
      h.querySelector('#mj-factor').oninput = (ev) => { pr.factor = Math.min(1, Math.max(0.3, parseFloat(ev.target.value) || 0.8)); sucio(); };
      h.querySelector('#mj-aplicar').onclick = async () => {
        if(pr.modo === 'manual'){ toast('Elige "+ kg" o "+ %" para usar la progresión automática'); return; }
        const hay = p.dias.some(d => d.ejercicios.some(e => numPeso(e.semanas[0].peso) != null));
        if(!hay){ toast('Escribe primero los pesos de la semana 1 (ej: 60)'); return; }
        cerrar();
        if(!(await confirmar('¿Aplicar progresión?', `Los pesos de las semanas 2 a ${m.semanas} se recalculan desde la semana 1. Reemplaza los que ya escribiste.`, 'Aplicar', false))) return;
        aplicarProgresion(p, m.semanas); sucio(); toast('Progresión aplicada'); pintarEditor();
      };
      const ini = h.querySelector('#mj-inicio'); if(ini) ini.onchange = () => { m.inicio = ini.value || null; sucio(); };
      h.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
        const a = b.dataset.a; cerrar();
        if(a === 'vista') return pintarGeneral(false);
        if(a === 'dup'){ const ok = await guardarSiHaceFalta(); if(ok) duplicarPlantilla(m); return; }
        if(a === 'terminar'){
          if(!(await confirmar('¿Terminar el mesociclo?', 'Pasa a "anteriores". La rutina que el alumno tiene hoy se mantiene.', 'Terminar', false))) return;
          const { error } = await sb.from('mesociclos').update({ estado:'completado', updated_at: new Date().toISOString() }).eq('id', m.id);
          if(error){ toast('No se pudo terminar: ' + error.message); return; }
          toast('Mesociclo terminado'); const v = E.volver; E = null; v(); return;
        }
        if(a === 'eliminar'){
          if(!(await confirmar('¿Eliminar este mesociclo?', 'Se borra el plan completo. ' + (m.alumno_id ? 'Las rutinas semanales ya aplicadas al alumno se conservan.' : 'No se puede deshacer.'), 'Sí, eliminar', true))) return;
          const { error } = await sb.from('mesociclos').delete().eq('id', m.id);
          if(error){ toast('No se pudo eliminar: ' + error.message); return; }
          toast('Mesociclo eliminado'); const v = E.volver; E = null; v();
        }
      });
    });
  }

  async function guardarSiHaceFalta(){
    if(!E.sucio) return true;
    return guardar(true);
  }

  async function guardar(silencioso){
    const m = E.m;
    m.nombre = (m.nombre || '').trim();
    if(!m.nombre){ toast('Ponle un nombre al mesociclo'); return false; }
    if(!exTotal(m)){ toast('Agrega al menos un ejercicio'); return false; }
    if(m.alumno_id){
      const sinEj = m.plan.dias.find(d => !d.ejercicios.length);
      if(sinEj){ toast(`«${sinEj.nombre}» no tiene ejercicios: agrégale uno o elimina el día`); return false; }
    }
    const btn = $id('ms-guardar'); if(btn){ btn.disabled = true; }
    const ahora = new Date().toISOString();
    try{
      if(m.id){
        const { error } = await sb.from('mesociclos').update({ nombre: m.nombre, objetivo: m.objetivo || null, semanas: m.semanas, plan: m.plan, inicio: m.inicio || null, updated_at: ahora }).eq('id', m.id);
        if(error) throw error;
      } else {
        const { data, error } = await sb.from('mesociclos').insert({ creado_por: profile.id, alumno_id: null, nombre: m.nombre, objetivo: m.objetivo || null, semanas: m.semanas, estado:'plantilla', plan: m.plan }).select().single();
        if(error) throw error;
        m.id = data.id;
      }
      // Mesociclo en curso: si cambió la semana aplicada, se actualiza la rutina del alumno (la anterior queda en "Rutinas anteriores")
      if(m.alumno_id && m.estado === 'activo' && m.semana_aplicada){
        const w = m.semana_aplicada;
        if(E.firmaInicial !== firmaSemana(m.plan, w)){
          await aplicarSemana(m, w, { actualizada:true });
          toast('Mesociclo guardado y rutina del alumno actualizada ✓');
        } else if(!silencioso) toast('Mesociclo guardado ✓');
      } else if(!silencioso) toast('Mesociclo guardado ✓');
      E.firmaInicial = m.alumno_id && m.semana_aplicada ? firmaSemana(m.plan, m.semana_aplicada) : null;
      E.sucio = false; E.nuevo = false;
      if(!silencioso){ const v = E.volver; E = null; v(); } else if($id('ms-sucio')) $id('ms-sucio').hidden = true;
      return true;
    }catch(err){
      toast('No se pudo guardar: ' + (err && err.message ? err.message : 'error'));
      if(btn) btn.disabled = false;
      return false;
    }
  }

  async function duplicarPlantilla(m){
    const { data, error } = await sb.from('mesociclos').insert({ creado_por: profile.id, alumno_id: null, nombre: m.nombre + ' (copia)', objetivo: m.objetivo || null, semanas: m.semanas, estado:'plantilla', plan: clon(m.plan) }).select().single();
    if(error){ toast('No se pudo duplicar: ' + error.message); return; }
    toast('Copia creada en tus plantillas');
    const v = E ? E.volver : renderMisPlantillas; E = null; v();
    return data;
  }

  // ---------------------------------------------------------------- vista general (matriz)
  function pintarGeneral(soloLectura, m0, volverFn){
    const m = m0 || E.m, p = m.plan, des = p.prog.descarga || [];
    const celda = (e, w) => {
      const c = e.semanas[w - 1];
      const prev = w > 1 ? e.semanas[w - 2] : null;
      const cam = prev && String(prev.peso || '') !== String(c.peso || '') || prev && String(prev.reps || '') !== String(c.reps || '') || prev && String(prev.series || '') !== String(c.series || '');
      const cls = des.includes(w) ? 'd' : (cam ? 'up' : '');
      return `<td class="${cls}">${esc(c.series || '–')}×${esc(c.reps || '–')}${c.peso ? '<br>' + esc(/^[\d.,]+$/.test(String(c.peso).trim()) ? c.peso + ' kg' : c.peso) : ''}</td>`;
    };
    root().innerHTML = `<div class="ms">
      <div class="ms-head"><button type="button" class="back-link" id="msg-volver">${IC('arrowLeft')} Volver</button><span class="ms-pill">${esc(resumenM(m))}</span></div>
      <h1>Vista general</h1><p class="ms-sub">${esc(m.nombre)} · cómo evolucionan los ejercicios semana a semana. Lo que cambia respecto a la semana anterior va en amarillo; las semanas de descarga en celeste.</p>
      ${p.dias.map((d, di) => `<div class="card" style="padding:12px 10px"><h2 style="margin:0 0 6px 4px">${esc(d.nombre || 'Día ' + (di + 1))}</h2>
        ${d.ejercicios.length ? `<div class="ms-gen"><table><tr><th></th>${Array.from({ length: m.semanas }, (_, i) => `<th class="${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">SEM ${i + 1}${des.includes(i + 1) ? '<br>DESC.' : ''}</th>`).join('')}</tr>
        ${d.ejercicios.map(e => { const ent = typeof findExerciseBankEntry === 'function' ? findExerciseBankEntry(e.nombre) : null; return `<tr><td>${ent ? `<img src="${esc(ent.image)}" alt="">` : ''}${esc(e.nombre)}</td>${Array.from({ length: m.semanas }, (_, i) => celda(e, i + 1)).join('')}</tr>`; }).join('')}</table></div>` : '<p class="ms-sub" style="margin:4px">Sin ejercicios.</p>'}</div>`).join('')}
      ${soloLectura ? '' : `<div class="ms-tools"><button type="button" class="ms-chipb" id="msg-editar">${IC('edit')} Editar el mesociclo</button></div>`}
    </div>`;
    $id('msg-volver').onclick = () => { if(soloLectura) volverFn(); else pintarEditor(); };
    if(!soloLectura){
      document.querySelectorAll('.ms-gen th[data-w]').forEach(th => th.onclick = () => { E.semana = parseInt(th.dataset.w, 10); pintarEditor(); });
      $id('msg-editar').onclick = () => pintarEditor();
    }
  }

  // ---------------------------------------------------------------- lista de mesociclos (plantillas + en curso)
  async function nombresDe(ids){
    const out = {};
    const uniq = [...new Set(ids.filter(Boolean))];
    if(!uniq.length) return out;
    const { data } = await sb.from('profiles').select('id,nombre,avatar_key,foto_perfil_url').in('id', uniq);
    (data || []).forEach(p => { out[p.id] = p; });
    return out;
  }

  async function lista(volver){
    root().innerHTML = '<div class="loading">Cargando mesociclos...</div>';
    if(!(await disponible())){
      root().innerHTML = `<button type="button" class="back-link" id="ms-v0">${IC('arrowLeft')} Volver</button><div class="card"><div class="empty">Los mesociclos se están activando. Intenta de nuevo en unos minutos.</div></div>`;
      $id('ms-v0').onclick = volver; return;
    }
    const { data, error } = await sb.from('mesociclos').select('*').order('updated_at', { ascending:false });
    if(error){ toast('No se pudieron cargar los mesociclos'); volver(); return; }
    const todos = (data || []).map(normalizarPlan);
    const gestor = typeof esGestor === 'function' && esGestor();
    const plantillas = todos.filter(m => !m.alumno_id && (m.creado_por === profile.id || gestor));
    const enCurso = todos.filter(m => m.alumno_id && m.estado === 'activo');
    const antes = todos.filter(m => m.alumno_id && m.estado !== 'activo');
    const per = await nombresDe([...enCurso, ...antes].map(m => m.alumno_id));
    const refrescar = () => lista(volver);
    root().innerHTML = `<div class="ms">
      <div class="ms-head"><button type="button" class="back-link" id="ms-volver">${IC('arrowLeft')} Volver</button><button type="button" class="pl-btn-crear" id="ms-nuevo">${IC('plus')} Nuevo mesociclo</button></div>
      <h1>Mesociclos</h1>
      <p class="ms-sub">Planes por semanas con ejercicios, series y pesos. Al usarlos, cada alumno recibe su propia copia y la semana en curso queda como su rutina.</p>
      <h2 style="margin:6px 0 8px">Plantillas</h2>
      ${plantillas.length ? plantillas.map(m => `<div class="ms-lcard"><h3>${esc(m.nombre)}</h3><small>${esc(resumenM(m))} · ${exTotal(m)} ejercicio${exTotal(m) === 1 ? '' : 's'}${m.objetivo ? ' · ' + esc(m.objetivo) : ''}</small>
        <div class="ms-acc"><button type="button" class="ms-chipb" data-usar="${m.id}">▶ Usar</button><button type="button" class="ms-chipb plain" data-edit="${m.id}">${IC('edit')} Editar</button><button type="button" class="ms-chipb plain" data-dup="${m.id}">⧉ Duplicar</button></div></div>`).join('')
        : '<div class="ms-vacio">Aún no tienes plantillas de mesociclo. Crea la primera con "Nuevo mesociclo".</div>'}
      <h2 style="margin:18px 0 8px">En curso</h2>
      ${enCurso.length ? enCurso.map(m => { const a = per[m.alumno_id] || { nombre:'Alumno' }; return `<div class="ms-lcard"><div class="ms-lh">${avatar(a, 'avatar-chat')}<div><h3>${esc(a.nombre)}</h3><small>${esc(m.nombre)} · semana ${m.semana_aplicada || semanaActual(m)} de ${m.semanas}</small></div></div>
        <div class="ms-acc"><button type="button" class="ms-chipb" data-edit="${m.id}">${IC('edit')} Abrir / editar</button></div></div>`; }).join('') : '<div class="ms-vacio">Ningún alumno tiene un mesociclo en curso.</div>'}
      ${antes.length ? `<h2 style="margin:18px 0 8px">Anteriores</h2>${antes.map(m => { const a = per[m.alumno_id] || { nombre:'Alumno' }; return `<div class="ms-lcard"><div class="ms-lh">${avatar(a, 'avatar-chat')}<div><h3>${esc(a.nombre)}</h3><small>${esc(m.nombre)} · ${esc(resumenM(m))}</small></div></div><div class="ms-acc"><button type="button" class="ms-chipb plain" data-ver="${m.id}">▦ Ver</button></div></div>`; }).join('')}` : ''}
    </div>`;
    $id('ms-volver').onclick = volver;
    $id('ms-nuevo').onclick = () => pedirDatosIniciales(refrescar);
    const por = (id) => todos.find(x => x.id === id);
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => abrirEditor(clon(por(b.dataset.edit)), refrescar, false));
    document.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => asignar(por(b.dataset.usar), null, refrescar));
    document.querySelectorAll('[data-dup]').forEach(b => b.onclick = async () => { E = { volver: refrescar }; await duplicarPlantilla(por(b.dataset.dup)); });
    document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => verSoloLectura(por(b.dataset.ver), refrescar));
  }

  // ---------------------------------------------------------------- asignar a un alumno
  async function alumnosAsignables(){
    const gestor = typeof esGestor === 'function' && esGestor();
    let q = sb.from('profiles').select('id,nombre,avatar_key,foto_perfil_url,profesor_id').eq('role', 'alumno').order('nombre');
    if(!gestor) q = q.eq('profesor_id', profile.id);
    const { data } = await q;
    return data || [];
  }

  async function asignar(plantilla, alumnoPre, volver){
    let alumno = alumnoPre;
    if(!alumno){
      const lista = await alumnosAsignables();
      if(!lista.length){ toast('No tienes alumnos asignados todavía'); return; }
      if(window.UCEquipo && window.UCEquipo.elegir){
        window.UCEquipo.elegir({ titulo:'¿Para qué alumno?', actual:'', items: lista.map(a => ({ id:a.id, nombre:a.nombre, persona:a })), alElegir: (id) => { const a = lista.find(x => x.id === id); if(a) asignar(plantilla, a, volver); } });
      }
      return;
    }
    // fecha de inicio + confirmación
    hoja(`<h3>Usar «${esc(plantilla.nombre)}»</h3>
      <div class="eq-prev">${avatar(alumno, 'avatar-chat')}<span>${esc(alumno.nombre)}</span></div>
      <p>Se crea una copia del mesociclo para este alumno y la <b>semana en curso pasa a ser su rutina activa</b>. Su rutina actual queda en "Rutinas anteriores" (no se borra) y le llega un aviso.</p>
      <label>Fecha de inicio</label><input type="date" id="msa-inicio" value="${hoyStr()}">
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#F7C51E;color:#111;border-color:#F7C51E;font-weight:700">Asignar</button></div>`,
    (h, cerrar) => {
      h.querySelector('[data-no]').onclick = cerrar;
      const si = h.querySelector('[data-si]');
      si.onclick = async () => {
        const inicio = h.querySelector('#msa-inicio').value || hoyStr();
        si.disabled = true; si.textContent = 'Asignando...';
        let creado = null;
        try{
          const { data: previos } = await sb.from('mesociclos').select('id').eq('alumno_id', alumno.id).eq('estado', 'activo');
          const { data: nuevo, error } = await sb.from('mesociclos').insert({ creado_por: profile.id, alumno_id: alumno.id, nombre: plantilla.nombre, objetivo: plantilla.objetivo || null, semanas: plantilla.semanas, estado:'activo', inicio, plan: clon(plantilla.plan) }).select().single();
          if(error || !nuevo) throw new Error(error ? error.message : 'No se pudo crear la copia');
          creado = nuevo;
          normalizarPlan(nuevo);
          const w = Math.max(1, Math.min(nuevo.semanas, semanaPorFecha(nuevo)));
          await aplicarSemana(nuevo, w, { actualizada:false });
          const viejos = (previos || []).map(x => x.id).filter(id => id !== nuevo.id);
          if(viejos.length) await sb.from('mesociclos').update({ estado:'completado', updated_at: new Date().toISOString() }).in('id', viejos);
          cerrar();
          try{ mostrarRutinaEnviada(alumno.nombre, false); }catch(_e){ toast('Mesociclo asignado ✓'); }
          if(volver) volver();
        }catch(err){
          if(creado && creado.id){ try{ await sb.from('mesociclos').delete().eq('id', creado.id); }catch(_e){} }
          toast('No se pudo asignar: ' + (err && err.message ? err.message : 'error'));
          si.disabled = false; si.textContent = 'Asignar';
        }
      };
    });
  }

  // ---------------------------------------------------------------- vista del alumno / solo lectura
  function verSoloLectura(m, volver, semanaIni){
    normalizarPlan(m);
    const des = m.plan.prog.descarga || [];
    let w = semanaIni || (m.estado === 'activo' ? (m.semana_aplicada || semanaActual(m)) : 1);
    const pintar = () => {
      root().innerHTML = `<div class="ms ms-ver" style="padding-bottom:30px">
        <div class="ms-head"><button type="button" class="back-link" id="msv-volver">${IC('arrowLeft')} Volver</button><span class="ms-pill ${m.estado === 'activo' ? 'ok' : ''}">${m.estado === 'activo' ? 'Semana ' + (m.semana_aplicada || semanaActual(m)) + ' de ' + m.semanas : esc(resumenM(m))}</span></div>
        <h1>${esc(m.nombre)}</h1>${m.objetivo ? `<p class="ms-sub">${esc(m.objetivo)}</p>` : ''}
        <div class="ms-tabs">${Array.from({ length: m.semanas }, (_, i) => `<button type="button" class="ms-tab ${i + 1 === w ? 'on' : ''} ${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">Sem ${i + 1}${des.includes(i + 1) ? '<small>DESCARGA</small>' : (m.estado === 'activo' && (m.semana_aplicada || semanaActual(m)) === i + 1 ? '<small>ACTUAL</small>' : '')}</button>`).join('')}</div>
        ${m.plan.dias.map((d, di) => `<h2 style="margin:14px 0 8px">${esc(d.nombre || 'Día ' + (di + 1))}</h2>${d.ejercicios.length ? d.ejercicios.map(e => {
          const c = e.semanas[w - 1] || celdaBase();
          const thumb = (typeof renderExerciseThumbnail === 'function' ? renderExerciseThumbnail(e) : '') || `<span class="ms-ph">${esc((e.nombre || '?').slice(0, 1).toUpperCase())}</span>`;
          const video = typeof renderExerciseVideoButton === 'function' ? renderExerciseVideoButton(e) : '';
          const peso = String(c.peso || '').trim();
          const prevPeso = w > 1 ? String((e.semanas[w - 2] || {}).peso || '').trim() : '';
          return `<div class="ms-ex"><div class="ms-exr">${thumb}<div class="ms-ext"><div class="ms-exn"><b>${esc(e.nombre)}</b><span class="ms-tipo">${e.tipo ? esc(TIPOS[e.tipo] || '') : ''}</span></div><div class="ms-exv">${video}</div></div></div>
            <div class="ms-datos"><span>${esc(c.series || '–')} series</span><span>${esc(c.reps || '–')} reps</span>${peso ? `<span class="p">${esc(/^[\d.,]+$/.test(peso) ? peso + ' kg' : peso)}</span>` : ''}${c.descanso ? `<span>${esc(c.descanso)} s desc.</span>` : ''}${c.rir ? `<span>RIR ${esc(c.rir)}</span>` : ''}${e.lado ? `<span>${esc(LADOS[e.lado] || '')}</span>` : ''}</div>
            ${(c.nota || e.nota) ? `<div class="ms-nota">📝 ${esc([c.nota, e.nota].filter(Boolean).join(' · '))}</div>` : ''}
            ${prevPeso && peso && prevPeso !== peso ? `<div class="ms-nota">Semana anterior: ${esc(/^[\d.,]+$/.test(prevPeso) ? prevPeso + ' kg' : prevPeso)}</div>` : ''}</div>`;
        }).join('') : '<div class="ms-vacio">Sin ejercicios.</div>'}`).join('')}
      </div>`;
      $id('msv-volver').onclick = volver;
      document.querySelectorAll('.ms-tab[data-w]').forEach(b => b.onclick = () => { w = parseInt(b.dataset.w, 10); pintar(); });
    };
    pintar();
  }

  async function anterioresDe(alumnoId, volver, puedeEditar){
    root().innerHTML = '<div class="loading">Cargando mesociclos anteriores...</div>';
    const { data, error } = await sb.from('mesociclos').select('*').eq('alumno_id', alumnoId).neq('estado', 'activo').order('created_at', { ascending:false });
    if(error){ toast('No se pudieron cargar'); volver(); return; }
    const ms = (data || []).map(normalizarPlan);
    root().innerHTML = `<div class="ms" style="padding-bottom:30px"><div class="ms-head"><button type="button" class="back-link" id="msa-v">${IC('arrowLeft')} Volver</button></div>
      <h1>Mesociclos anteriores</h1><p class="ms-sub">Todo lo que ya se planificó, para consultarlo.</p>
      ${ms.length ? `<div class="card">${ms.map(m => `<div class="ms-hist"><div class="b"><b>${esc(m.nombre)}</b><small>${esc(resumenM(m))}${m.inicio ? ' · desde ' + esc(formatDateShort(m.inicio)) : ''}</small></div><button type="button" class="ms-chipb plain" data-ver="${m.id}">Abrir</button></div>`).join('')}</div>` : emptyKiloHtml('Todavía no hay mesociclos anteriores.', 'espera')}</div>`;
    $id('msa-v').onclick = volver;
    document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => verSoloLectura(ms.find(x => x.id === b.dataset.ver), () => anterioresDe(alumnoId, volver, puedeEditar)));
  }

  // ---------------------------------------------------------------- avance automático y tarjetas
  async function avanzarSiCorresponde(m){
    // Devuelve true si cambió algo. Reclama la semana primero para que dos pantallas abiertas a la vez no la apliquen dos veces.
    const due = semanaPorFecha(m);
    if(m.estado !== 'activo' || due < 1) return false;
    if(due > m.semanas){
      if((m.semana_aplicada || 0) < m.semanas) { /* aplicar la última semana antes de cerrar */ }
      else { await sb.from('mesociclos').update({ estado:'completado', updated_at: new Date().toISOString() }).eq('id', m.id); m.estado = 'completado'; return true; }
    }
    const w = Math.min(due, m.semanas);
    if((m.semana_aplicada || 0) >= w) return false;
    const prev = m.semana_aplicada || null;
    let q = sb.from('mesociclos').update({ semana_aplicada: w, updated_at: new Date().toISOString() }).eq('id', m.id);
    q = prev == null ? q.is('semana_aplicada', null) : q.eq('semana_aplicada', prev);
    const { data: reclamo, error } = await q.select('id');
    if(error || !reclamo || !reclamo.length) return false;
    try{ await aplicarSemana(m, w, { actualizada:true }); return true; }
    catch(err){
      await sb.from('mesociclos').update({ semana_aplicada: prev }).eq('id', m.id);
      throw err;
    }
  }

  function tarjetaStaff(alumno, m, puede, volver){
    if(!m){
      return `<div class="ms-card" id="ms-card-det"><div class="ms-ck">MESOCICLO</div><h3>Sin mesociclo en curso</h3>
        ${puede ? '<div class="ms-tools" style="margin:10px 0 0"><button type="button" class="ms-chipb" id="msd-asignar">＋ Asignar mesociclo</button><button type="button" class="ms-chipb plain" id="msd-ant">Anteriores</button></div>' : '<div class="ms-tools" style="margin:10px 0 0"><button type="button" class="ms-chipb plain" id="msd-ant">Anteriores</button></div>'}</div>`;
    }
    const w = m.semana_aplicada || semanaActual(m);
    const due = Math.min(m.semanas, Math.max(1, semanaPorFecha(m)));
    return `<div class="ms-card" id="ms-card-det"><div class="ms-ck">MESOCICLO</div>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3>${esc(m.nombre)}</h3><span class="ms-pill">Semana ${w} de ${m.semanas}</span></div>
      <div class="ms-prog"><i style="width:${Math.round(w / m.semanas * 100)}%"></i></div>
      ${puede && due > w ? `<div class="ms-aviso">Ya corresponde la <b>semana ${due}</b>. <button type="button" class="ms-chipb" id="msd-avanzar" style="margin-left:6px;padding:6px 10px">Aplicar ahora</button></div>` : ''}
      <div class="ms-tools" style="margin:8px 0 0">${puede ? `<button type="button" class="ms-chipb" id="msd-abrir">${IC('edit')} Ver / editar</button>` : '<button type="button" class="ms-chipb" id="msd-abrir">▦ Ver</button>'}<button type="button" class="ms-chipb plain" id="msd-ant">Anteriores</button>${puede ? '<button type="button" class="ms-chipb plain" id="msd-asignar">Cambiar</button>' : ''}</div></div>`;
  }

  async function inyectarDetalle(alumnoId){
    const cab = document.querySelector('.header-actions');
    if(!cab || !$id('alumno-nombre-holder') || $id('ms-card-det')) return;
    if(!(await disponible())) return;
    const [{ data: ms }, { data: al }] = await Promise.all([
      sb.from('mesociclos').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending:false }),
      sb.from('profiles').select('id,nombre,avatar_key,foto_perfil_url,profesor_id').eq('id', alumnoId).maybeSingle()
    ]);
    const cab2 = document.querySelector('.header-actions');
    if(!cab2 || !$id('alumno-nombre-holder') || $id('ms-card-det') || !al) return;
    const lista = (ms || []).map(normalizarPlan);
    let activo = lista.find(x => x.estado === 'activo') || null;
    const puede = (typeof esGestor === 'function' && esGestor()) || al.profesor_id === profile.id;
    const volver = () => renderCoachAlumnoDetail(alumnoId);
    if(activo && puede){ try{ if(await avanzarSiCorresponde(activo)){ toast('Semana del mesociclo actualizada ✓'); volver(); return; } }catch(_e){ toast('No se pudo aplicar la nueva semana'); } }
    if(!activo && !lista.length && !puede) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = tarjetaStaff(al, activo, puede, volver);
    cab2.insertAdjacentElement('afterend', wrap.firstElementChild);
    const bAsignar = $id('msd-asignar'), bAnt = $id('msd-ant'), bAbrir = $id('msd-abrir'), bAv = $id('msd-avanzar');
    if(bAsignar) bAsignar.onclick = async () => {
      const { data: plant } = await sb.from('mesociclos').select('*').is('alumno_id', null).order('updated_at', { ascending:false });
      const propias = (plant || []).filter(x => x.creado_por === profile.id || (typeof esGestor === 'function' && esGestor())).map(normalizarPlan);
      if(!propias.length){ toast('Primero crea una plantilla en Mis plantillas → Mesociclos'); return; }
      if(window.UCEquipo && window.UCEquipo.elegir){
        window.UCEquipo.elegir({ titulo:'¿Qué mesociclo usar?', actual:'', items: propias.map(x => ({ id:x.id, nombre:x.nombre, sub: resumenM(x) })), alElegir: (id) => asignar(propias.find(x => x.id === id), al, volver) });
      }
    };
    if(bAnt) bAnt.onclick = () => anterioresDe(alumnoId, volver, puede);
    if(bAbrir) bAbrir.onclick = () => { if(puede) abrirEditor(clon(activo), volver, false); else verSoloLectura(activo, volver); };
    if(bAv) bAv.onclick = async () => {
      bAv.disabled = true;
      try{ await avanzarSiCorresponde(activo); toast('Semana aplicada ✓'); volver(); }catch(err){ toast('No se pudo aplicar: ' + err.message); bAv.disabled = false; }
    };
  }

  async function inyectarAlumno(){
    if(!profile || profile.role !== 'alumno') return;
    const ancla = $id('btn-toggle-rutina') || document.querySelector('.streak-row');
    if(!ancla || $id('ms-card-alumno')) return;
    if(!(await disponible())) return;
    const { data } = await sb.from('mesociclos').select('*').eq('alumno_id', profile.id).order('created_at', { ascending:false });
    const ms = (data || []).map(normalizarPlan);
    const activo = ms.find(x => x.estado === 'activo');
    const previos = ms.filter(x => x.estado !== 'activo');
    const ancla2 = $id('btn-toggle-rutina') || document.querySelector('.streak-row');
    if(!ancla2 || $id('ms-card-alumno') || (!activo && !previos.length)) return;
    const volver = renderAlumnoHome;
    let sesiones = null;
    if(activo){
      try{
        const { count } = await sb.from('sesiones').select('id', { count:'exact', head:true }).eq('alumno_id', profile.id).gte('fecha', activo.inicio || '1900-01-01');
        sesiones = count;
      }catch(_e){}
    }
    const div = document.createElement('div');
    if(activo){
      const w = activo.semana_aplicada || semanaActual(activo);
      const total = activo.semanas * activo.plan.dias.length;
      div.innerHTML = `<div class="ms-card" id="ms-card-alumno"><div class="ms-ck">MI MESOCICLO</div>
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3>${esc(activo.nombre)}</h3><span class="ms-pill">Semana ${w} de ${activo.semanas}</span></div>
        <div class="ms-prog"><i style="width:${Math.round(w / activo.semanas * 100)}%"></i></div>
        <div style="font-size:12.5px;color:#A8A8A8">${sesiones != null ? `${sesiones} de ${total} sesiones` : `${activo.plan.dias.length} días por semana`}</div>
        <div class="ms-tools" style="margin:10px 0 0"><button type="button" class="ms-chipb" id="msa-ver">▦ Ver mi mesociclo</button>${previos.length ? '<button type="button" class="ms-chipb plain" id="msa-ant">Anteriores</button>' : ''}</div></div>`;
    } else {
      div.innerHTML = `<button type="button" class="ms-btn-lista" id="ms-card-alumno"><span class="i">▦</span><span class="t">Mesociclos anteriores<small>${previos.length} guardado${previos.length === 1 ? '' : 's'}</small></span><span class="go">›</span></button>`;
    }
    ancla2.insertAdjacentElement('beforebegin', div.firstElementChild);
    const ver = $id('msa-ver'); if(ver) ver.onclick = () => verSoloLectura(activo, volver);
    const ant = $id('msa-ant'); if(ant) ant.onclick = () => anterioresDe(profile.id, volver, false);
    if(!activo) $id('ms-card-alumno').onclick = () => anterioresDe(profile.id, volver, false);
  }

  async function autoAvanzarHome(){
    if(!profile || profile.role === 'alumno') return;
    if(!(await disponible())) return;
    const gestor = typeof esGestor === 'function' && esGestor();
    const { data } = await sb.from('mesociclos').select('*').eq('estado', 'activo').not('alumno_id', 'is', null);
    let n = 0;
    for(const m of (data || [])){
      if(!(gestor || m.creado_por === profile.id)) continue;
      normalizarPlan(m);
      try{ if(await avanzarSiCorresponde(m)) n++; }catch(_e){}
    }
    if(n) toast(`Se actualizó la semana de ${n} mesociclo${n === 1 ? '' : 's'} ✓`);
  }

  // ---------------------------------------------------------------- enganches a la app
  function envolver(nombre, despues){
    const orig = window[nombre];
    if(typeof orig !== 'function' || orig.__ms) return;
    const nueva = async function(){
      const r = await orig.apply(this, arguments);
      try{ await despues.apply(this, arguments); }catch(_e){ console.warn(nombre, _e); }
      return r;
    };
    nueva.__ms = true;
    window[nombre] = nueva;
  }
  envolver('renderMisPlantillas', async function(){
    const cab = document.querySelector('.pl-head');
    if(!cab || $id('ms-btn-lista') || !(await disponible())) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ms-btn-lista'; b.id = 'ms-btn-lista';
    b.innerHTML = '<span class="i">▦</span><span class="t">Mesociclos<small>Planes por semanas con pesos y progresión</small></span><span class="go">›</span>';
    b.style.marginTop = '12px';
    cab.insertAdjacentElement('afterend', b);
    b.onclick = () => lista(renderMisPlantillas);
  });
  envolver('renderCoachAlumnoDetail', function(alumnoId){ return inyectarDetalle(alumnoId); });
  envolver('renderAlumnoHome', function(){ return inyectarAlumno(); });
  envolver('renderCoachHome', function(){ return autoAvanzarHome(); });

  window.UCMeso = { lista, planNuevo, filasDeSemana, aplicarProgresion, semanaPorFecha, normalizarPlan };
})();
