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
  .ms-titulo{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .ms-titulo h1{flex:1;min-width:0;margin:2px 0 4px}
  .ms-pill{display:inline-block;flex:none;background:rgba(255,255,102,.15);color:#FFFF66;border-radius:99px;padding:5px 12px;font:700 12px 'Inter',sans-serif;white-space:nowrap}
  .ms-pill.ok{background:rgba(101,214,110,.15);color:#65D66E}.ms-pill.des{background:rgba(124,196,255,.15);color:#7cc4ff}
  .ms-sub{color:#AEAEAE;font-size:13.5px;margin:0 0 14px}
  .ms-in{width:100%;box-sizing:border-box;margin:0}
  .ms-in-t{font:inherit;color:inherit;background:transparent;border:0;border-bottom:1px dashed transparent;border-radius:0;padding:0;width:100%;box-sizing:border-box;outline:0;letter-spacing:inherit;text-shadow:inherit}
  .ms-in-t{border-bottom-color:rgba(255,255,255,.14)}
  .ms-in-t:hover,.ms-in-t:focus{border-bottom-color:rgba(255,255,102,.6)}
  .ms-in-s{font:400 13.5px 'Inter',sans-serif;color:#AEAEAE;background:transparent;border:0;border-bottom:1px dashed rgba(255,255,255,.12);border-radius:0;padding:0 0 3px;width:100%;box-sizing:border-box;margin:0 0 14px;outline:0}
  .ms-in-s:hover,.ms-in-s:focus{border-bottom-color:rgba(255,255,102,.6)}
  .ms-tabs{display:flex;gap:6px;overflow-x:auto;padding:0 0 4px;margin:0 0 12px;-webkit-overflow-scrolling:touch}
  .ms-tab{flex:1 0 auto;min-width:54px;text-align:center;padding:11px 8px;border-radius:10px;border:1px solid #333;background:#121212;color:#F5F5F5;font:700 14px 'Inter',sans-serif;cursor:pointer;line-height:1.25}
  .ms-tab small{display:block;font:600 10.5px 'Inter',sans-serif;margin-top:1px;opacity:.85}
  .ms-tab.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .ms-tab.des{border-style:dashed;border-color:#35607f;color:#7cc4ff}.ms-tab.des.on{background:#7cc4ff;border-color:#7cc4ff;color:#0b2233}
  .ms-tab.add{flex:0 0 40px;min-width:40px;color:#FFFF66;border-color:rgba(255,255,102,.5)}
  .ms-tools{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
  .ms-chipb{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 13px;border-radius:10px;border:1px solid #FFFF66;background:transparent;color:#FFFF66;font:700 13px 'Inter',sans-serif;cursor:pointer}
  .ms-chipb.plain{border-color:#3a3a3a;color:#E6E6E6}
  .ms-chipb.peligro{border-color:rgba(229,72,77,.6);color:#FF8A8E}
  .ms-chipb[disabled]{opacity:.5}
  .ms-row2{display:flex;justify-content:space-between;gap:10px;margin:12px 0 8px}
  .ms-row2 .ms-chipb{flex:1;padding:11px 8px}
  .ms-dias{display:flex;gap:6px;overflow-x:auto;margin:0 0 10px;padding-bottom:4px}
  .ms-dia{flex:0 0 auto;padding:8px 14px;border-radius:99px;border:1px solid #333;background:#121212;color:#E6E6E6;font:600 13px 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .ms-dia.on{border-color:#FFFF66;color:#111;background:#FFFF66}
  .ms-diahead{display:flex;gap:8px;align-items:center;margin-bottom:10px}
  .ms-diahead input.ms-in-d{flex:1;min-width:0;margin:0;font:700 15px 'Inter',sans-serif;color:#F5F5F5;background:transparent;border:0;border-bottom:1px dashed rgba(255,255,255,.22);border-radius:0;padding:6px 0;outline:0;box-shadow:none}
  .ms-diahead input.ms-in-d:focus{border-bottom-color:#FFFF66}
  .ms-exs{background:linear-gradient(135deg,#232323,#171717);border:1px solid #2c2c2c;border-radius:14px;padding:2px 14px;margin-bottom:12px}
  .ms-ex{border-top:1px solid #2a2a2a;padding:12px 0}.ms-ex:first-child{border-top:0}
  .ms-exr{display:flex;gap:11px;align-items:flex-start}
  .ms-exr .routine-exercise-thumb,.ms-exr .ms-ph{flex:none;width:62px;height:62px;border-radius:12px;overflow:hidden;border:1px solid #333;background:#fff;padding:0}
  .ms-exr .routine-exercise-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .ms-ph{display:grid;place-items:center;background:#1c1c1c !important;color:#777;font:700 22px 'Oswald',sans-serif}
  .ms-ext{flex:1;min-width:0}
  .ms-exn{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
  .ms-exn b{font:700 15px/1.25 'Inter',sans-serif;color:#FBFBFB}
  .ms-tipo{flex:none;font:700 12px 'Inter',sans-serif;color:#FFFF66}
  .ms-exv{margin-top:5px;display:flex;align-items:center;gap:8px}
  .ms .exercise-video-btn{display:inline-flex;align-items:center;gap:6px;background:#E5484D;border:0;color:#fff;border-radius:8px;padding:5px 10px;font:800 11px 'Inter',sans-serif;text-decoration:none}
  .ms .exercise-video-btn:hover{background:#ff5a5f;transform:none}
  .ms .exercise-video-btn span{display:inline !important}
  .ms .exercise-video-btn.is-pending{background:#3a2a2c;color:#d99;opacity:1}
  .ms-more{flex:none;width:34px;height:34px;border-radius:10px;border:1px solid #3a3a3a;background:transparent;color:#E6E6E6;font-size:18px;line-height:1;cursor:pointer}
  .ms-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
  .ms-f{display:block;min-width:0;background:#101010;border:1px solid #303030;border-radius:9px;padding:8px 4px 9px;text-align:center}
  .ms-f span{display:block;font:500 12px 'Inter',sans-serif;color:#AEAEAE;text-transform:none;letter-spacing:0;text-align:center}
  .ms-f span em{font-style:normal;color:#FFFF66;margin-left:3px;font-weight:700}.ms-f span em.neg{color:#7cc4ff}
  .ms-f input{display:block;width:100%;box-sizing:border-box;margin:0;text-align:center;padding:2px 0 0;-moz-appearance:textfield;font:700 15px/20px 'Inter',sans-serif;height:22px;color:#fff;background:transparent !important;border:0 !important;border-radius:0;min-width:0;outline:0;box-shadow:none}
  .ms-f input.cam{color:#FFFF66}
  .ms-f:focus-within{border-color:#FFFF66}
  .ms-masd{margin-top:9px}
  .ms-masd summary{cursor:pointer;color:#AEAEAE;font:600 12.5px 'Inter',sans-serif;padding:4px 0}
  .ms-masd .ms-g2{display:grid;grid-template-columns:90px 1fr;gap:7px;margin-top:6px}
  .ms-masd input{margin:0;width:100%;box-sizing:border-box}
  .ms-vacio{border:1px dashed rgba(255,255,255,.2);border-radius:14px;padding:22px 14px;text-align:center;color:#AEAEAE;margin:10px 0}
  .ms-bar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(0deg,#0b0b0b 70%,rgba(11,11,11,0));justify-content:center}
  .ms-bar .btn{margin:0;max-width:520px;flex:1}
  .ms-sucio{display:inline-block;width:8px;height:8px;border-radius:50%;background:#111;margin-right:6px}
  .ms-card{background:linear-gradient(135deg,#232323,#171717);border:1px solid #2c2c2c;border-radius:14px;padding:14px;margin:0 0 12px}
  .ms-card h2,.ms-h2{font:700 12px 'Inter',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#FFFF66;margin:0 0 10px}
  .ms-card.acento{border-color:rgba(255,255,102,.35);background:linear-gradient(145deg,rgba(255,255,102,.09),rgba(23,23,23,.9))}
  .ms-ck{font:700 11px 'Inter',sans-serif;letter-spacing:.12em;color:#AEAEAE}
  .ms-card h3{margin:3px 0 0;font:700 17px 'Inter',sans-serif;color:#FBFBFB}
  .ms-prog{height:8px;border-radius:99px;background:#262626;overflow:hidden;margin:10px 0 8px}
  .ms-prog i{display:block;height:100%;background:#FFFF66;border-radius:99px}
  .ms-aviso{margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,102,.12);border:1px solid rgba(255,255,102,.4);font-size:13.5px;color:#FBFBFB}
  .ms-gen{overflow-x:auto}
  .ms-gen table{width:100%;border-collapse:collapse;font-size:12px;min-width:300px}
  .ms-gen th{font:700 10px 'Inter',sans-serif;letter-spacing:.08em;color:#AEAEAE;padding:4px 2px;text-align:center;cursor:pointer}
  .ms-gen th.des{color:#7cc4ff}
  .ms-gen td{padding:8px 2px;border-top:1px solid #262626;text-align:center;line-height:1.35;white-space:nowrap}
  .ms-gen th{white-space:nowrap}
  .ms-gn{display:flex;align-items:center;gap:7px;white-space:normal;min-width:112px}.ms-gn span{font-size:12px;line-height:1.25}
  .ms-gen td:first-child{text-align:left;font-weight:600;font-size:12.5px;min-width:120px}
  .ms-gen td:first-child img{width:30px;height:30px;flex:none;border-radius:7px;object-fit:cover;background:#fff}
  .ms-gen td.up{color:#FFFF66;font-weight:700}.ms-gen td.d{color:#7cc4ff}
  .ms-lcard{background:linear-gradient(135deg,#232323,#171717);border:1px solid #2c2c2c;border-radius:14px;padding:14px;margin-bottom:12px}
  .ms-lcard h3{margin:0 0 3px;font:700 16px 'Inter',sans-serif;color:#FBFBFB}
  .ms-lcard small{display:block;color:#AEAEAE;font-size:12.5px}
  .ms-lcard .ms-acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .ms-lcard .ms-acc button{flex:1 1 auto}
  .ms-lh{display:flex;gap:12px;align-items:center}
  .ms-lh .profile-avatar{width:44px;height:44px;flex:none}
  .ms-op{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:10px;margin:0 0 6px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.04);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .ms-op img{width:44px;height:44px;border-radius:10px;object-fit:cover;background:#fff;flex:none}
  .ms-op b{display:block;font:600 14.5px 'Inter',sans-serif}.ms-op small{color:#AEAEAE;font-size:12px}
  .ms-op.pel b{color:#FF8A8E}
  .ms-chips,.ms-chipsel{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px}
  .ms-chips button,.ms-chipsel button{padding:9px 14px;border-radius:10px;border:1px solid #3a3a3a;background:#101010;color:#E6E6E6;font:600 14px 'Inter',sans-serif;cursor:pointer}
  .ms-chips button.on,.ms-chipsel button.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .ms-chips input{width:90px;margin:0;padding:9px 10px}
  .ms-hj label,.ms label.ms-l{display:block;margin:12px 0 6px;font:600 11px 'Inter',sans-serif;letter-spacing:.1em;color:#AEAEAE;text-transform:uppercase}
  .ms-hj input,.ms-hj select{width:100%;box-sizing:border-box;margin:0}
  .ms-form input[type=text],.ms-form input[type=number]{width:100%;box-sizing:border-box;margin:0;background:#101010;border:1px solid #333;border-radius:10px;padding:11px 12px;color:#fff}
  .ms-form .ms-chips input[type=number]{width:90px}
  .ms-hj .ms-fila2{display:flex;gap:8px;align-items:center}
  .ms-stp{display:flex;align-items:center;gap:10px}
  .ms-stp button{width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,102,.5);background:transparent;color:#FFFF66;font-size:22px;cursor:pointer}
  .ms-stp b{min-width:34px;text-align:center;font:700 20px 'Oswald',sans-serif}
  .ms-sep{height:1px;background:rgba(255,255,255,.1);margin:14px 0}
  .ms-cta{display:block;width:100%;text-align:center;background:#FFFF66;color:#111;font:800 15px 'Inter',sans-serif;border:0;border-radius:12px;padding:14px;margin-top:14px;cursor:pointer}
  .ms-note{font-size:12.5px;color:#AEAEAE;margin-top:8px}
  .ms-ver .ms-datos{display:none}
  .ms-ver .ms-grid{margin-top:10px}
  .ms-ver .ms-f{padding:7px 4px}
  .ms-ver .ms-f.up b{color:#FFFF66}
  .ms-ver .ms-f b{display:block;font:700 14px 'Inter',sans-serif;color:#fff;margin-top:2px}
  .ms-ver .ms-f.up b,.ms-ver .ms-f.hi b{color:#FFFF66}
  .ms-semchips{display:flex;gap:6px;margin-top:10px}
  .ms-semchips .ms-tab{flex:1;min-width:0;padding:11px 0}
  .ms-hist{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #2a2a2a}.ms-hist:first-child{border-top:0}
  .ms-hist .b{flex:1;min-width:0}.ms-hist b{font:700 15.5px 'Inter',sans-serif}.ms-hist small{display:block;color:#AEAEAE;font-size:12.5px;margin-top:2px}
  .ms-ok{display:block;color:#65D66E;font:700 12.5px 'Inter',sans-serif;margin-top:5px}
  .ms-lnk{display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box;padding:14px;border:1px solid #2c2c2c;border-radius:12px;background:#161616;margin-top:10px;font:700 15px 'Inter',sans-serif;color:#FBFBFB;cursor:pointer;text-align:left}
  .ms-lnk span{color:#FFFF66}
  .ms-btn-lista{display:flex;align-items:center;gap:13px;width:100%;margin:0 0 14px;padding:13px 16px;border-radius:16px;border:1px solid rgba(255,255,102,.4);background:linear-gradient(145deg,rgba(255,255,102,.12),#161616);color:#F5F5F5;cursor:pointer;text-align:left;font:inherit}
  .ms-btn-lista .i{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,102,.16);color:#FFFF66;font-size:19px}
  .ms-btn-lista .t{flex:1;font:600 16px 'Oswald',sans-serif;letter-spacing:.05em;text-transform:uppercase;line-height:1.15}
  .ms-btn-lista .t small{display:block;margin-top:3px;font:400 10.5px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#A8A8A8;text-transform:none}
  .ms-btn-lista .go{color:#FFFF66;font-size:26px;line-height:1}
  .ms-peligro{background:#C0392B !important;border-color:#C0392B !important;color:#fff !important;font-weight:700}

  .ms-row{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .ms-av-t{color:#AEAEAE;font-size:13px}
  .ms-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px}
  .ms-tab small{text-transform:lowercase}
  .ms-tools .ms-chipb{padding:7px 11px;font-size:12px;font-weight:600}
  .ms-dia.add{border-style:dashed;color:#FFFF66;border-color:rgba(255,255,102,.45);background:transparent}
  .ms-titulo h1{font-size:24px;line-height:1.15}
  .ms-titulo .ms-in-t{font-family:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;color:inherit;padding:2px 0}
  .ms-card h2{margin-top:0}
  .ms-form .ms-card .ms-chips{margin:0}
  .ms-hist .ms-chipb{flex:none;padding:8px 14px}
  .ms-semchips .ms-tab{min-height:44px}
  .ms-ver .ms-ex{padding:14px 0}
  .ms-ver .ms-note{margin:8px 0 0}
  .ms-ver .ms-ex .ms-grid{margin-top:12px}
  .ms-ver .ms-ex .ms-f span{font-size:12px}
  .ms-ver .ms-tipo{color:#FFFF66}
  .ms-ex .ms-exr .exercise-video-btn{font-size:11.5px}
  .ms-ex .ms-ph{width:62px;height:62px}
  @media (min-width:900px){
    .ms-grid{grid-template-columns:repeat(4,minmax(0,150px))}
    .ms-exs.dos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px}.ms-exs.dos .ms-ex:nth-child(2){border-top:0}
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
      hoja(`<h3>${esc(titulo)}</h3><p>${texto}</p><div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm ${peligro ? 'ms-peligro' : ''}" data-si style="${peligro ? '' : 'background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700'}">${esc(textoSi)}</button></div>`, (h, cerrar) => {
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
  function pesosAuto(base, semanas, pr){
    const out = []; let ult = base;
    for(let w = 2; w <= semanas; w++){
      if((pr.descarga || []).includes(w)){
        const nn = numPeso(ult);
        out.push(nn == null ? '' : fmtPeso(redondear(nn * (Number(pr.factor) || 0.8)), unidadPeso(ult)));
      } else { ult = siguientePeso(ult, pr); out.push(ult); }
    }
    return out;
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
    let sem = 4, dias = 4, des = 'ultima', modo = 'kg', paso = 2.5;
    const chips = (id, arr) => `<div class="ms-chips" id="${id}">${arr.map(([v, t, on]) => `<button type="button" data-v="${v}" class="${on ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    const pasoChips = () => chips('msn-paso', [['2.5', modo === 'pct' ? '+2,5 %' : '+2,5 kg', paso === 2.5], ['5', modo === 'pct' ? '+5 %' : '+5 kg', paso === 5], ['otro', 'Otro', paso !== 2.5 && paso !== 5]]);
    root().innerHTML = `<div class="ms ms-form" style="padding-bottom:30px">
      <div class="ms-head"><button type="button" class="back-link" id="msn-volver">${IC('arrowLeft')} Volver</button></div>
      <h1>Nuevo mesociclo</h1>
      <p class="ms-sub">${alumnoPre ? `Para <b>${esc(alumnoPre.nombre)}</b>. ` : ''}Una plantilla que divide la rutina por semanas, con ejercicios, series y pesos planificados.${alumnoPre ? ' Al guardar, la semana en curso queda como su rutina activa.' : ''}</p>
      <div class="ms-card">
        <label class="ms-l" style="margin-top:0">Nombre</label><input type="text" id="msn-nombre" maxlength="60" placeholder="Ej: Fuerza base" autocomplete="off">
        <label class="ms-l">Objetivo (opcional)</label><input type="text" id="msn-obj" maxlength="120" placeholder="Ej: Ganar fuerza en básicos" autocomplete="off">
        <label class="ms-l">Duración</label><div class="ms-chips" id="msn-sem">${[3, 4, 6, 8].map(n => `<button type="button" data-v="${n}" class="${n === 4 ? 'on' : ''}">${n} sem</button>`).join('')}<button type="button" data-v="otro">Otra</button></div>
        <label class="ms-l">Días por semana</label><div class="ms-chips" id="msn-dias">${[2, 3, 4, 5, 6].map(n => `<button type="button" data-v="${n}" class="${n === 4 ? 'on' : ''}">${n}</button>`).join('')}</div>
        <label class="ms-l">Semana de descarga</label>${chips('msn-des', [['none', 'Ninguna', false], ['ultima', 'Última semana', true]])}
      </div>
      <div class="ms-card">
        <h2>Progresión</h2>
        ${chips('msn-modo', [['kg', '+ kg por semana', true], ['pct', '+ % por semana', false], ['manual', 'Manual', false]])}
        <div id="msn-pasos"><label class="ms-l">Aumento semanal</label><div id="msn-paso-w">${pasoChips()}</div></div>
        <p class="ms-note">Escribes el peso de la semana 1 y la app completa las demás. Después puedes ajustar cualquier semana a mano.</p>
      </div>
      <button type="button" class="ms-cta" id="msn-continuar" data-si>Continuar: elegir ejercicios</button>
    </div>`;
    const sel = (cont, cb) => cont.querySelectorAll('button').forEach(b => b.onclick = () => {
      cont.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      cb(b.dataset.v);
    });
    const cablearPaso = () => {
      const c = $id('msn-paso');
      sel(c, v => {
        if(v === 'otro'){
          const bo = c.querySelector('[data-v=otro]');
          bo.outerHTML = '<input type="number" min="0" step="0.5" id="msn-paso-otro" value="1" inputmode="decimal">';
          const inp = $id('msn-paso-otro'); inp.focus(); inp.select();
          inp.oninput = () => { paso = Math.max(0, parseFloat(inp.value) || 0); };
          paso = 1;
        } else paso = parseFloat(v);
      });
    };
    sel($id('msn-sem'), v => {
      if(v === 'otro'){
        const bs = document.querySelector('#msn-sem [data-v=otro]');
        bs.outerHTML = '<input type="number" min="1" max="16" id="msn-sem-otro" value="5" inputmode="numeric">';
        const inp = $id('msn-sem-otro'); inp.focus(); inp.select();
        inp.oninput = () => { sem = Math.max(1, Math.min(16, parseInt(inp.value, 10) || 1)); };
        sem = 5;
      } else sem = parseInt(v, 10);
    });
    sel($id('msn-dias'), v => { dias = parseInt(v, 10); });
    sel($id('msn-des'), v => { des = v; });
    sel($id('msn-modo'), v => {
      modo = v; paso = 2.5;
      $id('msn-pasos').style.display = modo === 'manual' ? 'none' : '';
      $id('msn-paso-w').innerHTML = pasoChips(); cablearPaso();
    });
    cablearPaso();
    $id('msn-volver').onclick = volver;
    $id('msn-continuar').onclick = () => {
      const nombre = $id('msn-nombre').value.trim();
      if(!nombre){ toast('Ponle un nombre al mesociclo'); $id('msn-nombre').focus(); return; }
      const plan = planNuevo(sem, dias);
      plan.prog.modo = modo; plan.prog.paso = modo === 'manual' ? 2.5 : paso;
      plan.prog.descarga = (des === 'ultima' && sem >= 2) ? [sem] : [];
      abrirEditor({ id:null, nombre, objetivo: $id('msn-obj').value.trim() || null, semanas: sem, alumno_id: alumnoPre ? alumnoPre.id : null, estado: alumnoPre ? 'activo' : 'plantilla', inicio: alumnoPre ? hoyStr() : null, plan }, volver, true, alumnoPre);
    };
  }

  function abrirEditor(m, volver, nuevo, alumno){
    normalizarPlan(m);
    E = { m, semana: 1, dia: 0, sucio: !!nuevo, volver, firmaInicial: m.id ? firmaSemana(m.plan, m.semana_aplicada || 1) : null, nuevo: !!nuevo, alumno: alumno || null };
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
    const thumb = (typeof renderExerciseThumbnail === 'function' ? renderExerciseThumbnail(e) : '') || `<span class="ms-ph">${esc((e.nombre || '?').slice(0, 1).toUpperCase())}</span>`;
    const video = verTecnica(e);
    const campo = (k, etq, tipo, extra) => `<label class="ms-f"><span>${etq}${deltaHtml(e, w, k)}</span><input type="${tipo || 'text'}" ${tipo === 'number' ? 'inputmode="decimal"' : ''} data-k="${k}" value="${esc(c[k])}" class="${cambiaVsAnterior(e, w, k) ? 'cam' : ''}" ${extra || ''}></label>`;
    return `<div class="ms-ex" data-e="${i}">
      <div class="ms-exr">${thumb}<div class="ms-ext"><div class="ms-exn"><b>${esc(e.nombre)}</b><span class="ms-tipo">${esc(TIPOS[e.tipo || ''] || 'Normal')}</span></div><div class="ms-exv">${video}</div></div><button type="button" class="ms-more" data-more="${i}" aria-label="Más opciones de ${esc(e.nombre)}">⋯</button></div>
      <div class="ms-grid">${campo('series', 'Series', 'number')}${campo('reps', 'Reps', 'text')}${campo('peso', 'Peso', 'text', 'placeholder="kg o %"')}${campo('descanso', 'Desc. (s)', 'number')}</div>
      <details class="ms-masd" ${(c.rir || c.nota || e.nota) ? 'open' : ''}><summary>RIR y notas</summary><div class="ms-g2"><input type="text" data-k="rir" placeholder="RIR" value="${esc(c.rir)}"><input type="text" data-k="nota" placeholder="Nota de esta semana" value="${esc(c.nota)}"></div></details>
    </div>`;
  }
  // Botón rojo "Ver técnica" (el mismo del resto de la app, con texto completo)
  function verTecnica(e){
    const v = typeof renderExerciseVideoButton === 'function' ? renderExerciseVideoButton(e) : '';
    return v ? v.replace('<span>Técnica</span>', '<span>Ver técnica</span>') : '';
  }

  const etiquetaSemana = (i, des, extra) => `Sem ${i}${des ? '<small>descarga</small>' : (extra || '')}`;

  function pintarEditor(){
    const m = E.m, p = m.plan, w = E.semana;
    if(E.dia >= p.dias.length) E.dia = p.dias.length - 1;
    const dia = p.dias[E.dia];
    const des = p.prog.descarga || [];
    const asignado = !!m.alumno_id;
    const exTxt = `${m.semanas} sem · ${p.dias.length} día${p.dias.length === 1 ? '' : 's'}`;
    root().innerHTML = `<div class="ms">
      <div class="ms-head"><button type="button" class="back-link" id="ms-volver">${IC('arrowLeft')} Volver</button></div>
      <div class="ms-titulo"><h1><input type="text" id="ms-nombre" class="ms-in-t" maxlength="60" value="${esc(m.nombre)}" aria-label="Nombre del mesociclo"></h1><span class="ms-pill ${asignado ? 'ok' : ''}">${asignado ? 'En curso · ' : ''}${esc(exTxt)}</span></div>
      <input type="text" id="ms-objetivo" class="ms-in-s" maxlength="120" placeholder="Objetivo (opcional)" value="${esc(m.objetivo || '')}" aria-label="Objetivo">
      <div class="ms-tabs" id="ms-sems">${Array.from({ length: m.semanas }, (_, i) => `<button type="button" class="ms-tab ${i + 1 === w ? 'on' : ''} ${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">${etiquetaSemana(i + 1, des.includes(i + 1), asignado && m.semana_aplicada === i + 1 ? '<small>actual</small>' : '')}</button>`).join('')}${m.semanas < 16 ? '<button type="button" class="ms-tab add" id="ms-addsem" aria-label="Agregar semana">+</button>' : ''}</div>
      <div class="ms-tools">
        <button type="button" class="ms-chipb plain" id="ms-descarga">${des.includes(w) ? '↺ Quitar descarga' : '▽ Semana de descarga'}</button>
        <button type="button" class="ms-chipb plain" id="ms-general">▦ Vista general</button>
        <button type="button" class="ms-chipb plain" id="ms-ajustes">⚙ Ajustes</button>
      </div>
      <div class="ms-dias" id="ms-dias">${p.dias.map((d, i) => `<button type="button" class="ms-dia ${i === E.dia ? 'on' : ''}" data-d="${i}">${esc(d.nombre || 'Día ' + (i + 1))}</button>`).join('')}<button type="button" class="ms-dia add" id="ms-adddia">＋ Día</button></div>
      <div class="ms-diahead"><input type="text" id="ms-dianombre" class="ms-in-d" maxlength="60" value="${esc(dia.nombre)}" aria-label="Nombre del día"><button type="button" class="ms-more" id="ms-diamas" aria-label="Más opciones del día">⋯</button></div>
      <div class="ms-exs" id="ms-exs">${dia.ejercicios.length ? dia.ejercicios.map((e, i) => cardEjercicio(e, i, w, dia)).join('') : '<div class="ms-vacio" style="border:0;margin:0">Este día aún no tiene ejercicios.</div>'}</div>
      <div class="ms-row2"><button type="button" class="ms-chipb" id="ms-copiar">⧉ Copiar semana</button><button type="button" class="ms-chipb" id="ms-addex">＋ Agregar ejercicio</button></div>
      <p class="ms-note">Cada ejercicio muestra su foto y un botón para ver el video de la técnica. Lo que cambia respecto a la semana anterior se marca en amarillo.</p>
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
        if(inp.dataset.k === 'peso') inp.dataset.prev = inp.value;
        inp.onchange = () => { // marca cambios contra la semana anterior sin perder el foco
          inp.classList.toggle('cam', cambiaVsAnterior(e, w, inp.dataset.k));
          if(inp.dataset.k === 'peso'){
            const sp = inp.closest('.ms-f').querySelector('span'); sp.innerHTML = 'Peso' + deltaHtml(e, w, 'peso');
            // Semana 1: completa solas las semanas siguientes, salvo que ya las hayas ajustado a mano
            const pr = p.prog;
            if(w === 1 && pr.modo !== 'manual' && m.semanas > 1 && numPeso(inp.value) != null){
              const antes = inp.dataset.prev || '';
              const seqVieja = numPeso(antes) != null ? pesosAuto(antes, m.semanas, pr) : null;
              const actuales = e.semanas.slice(1).map(c => String(c.peso || '').trim());
              if(actuales.every((v, k) => v === '' || (seqVieja && v === seqVieja[k]))){
                pesosAuto(inp.value, m.semanas, pr).forEach((v, k) => { e.semanas[k + 1].peso = v; });
                if(actuales.some((v, k) => v !== pesosAuto(inp.value, m.semanas, pr)[k])) toast('Pesos de las demás semanas calculados ✓');
              }
            }
            inp.dataset.prev = inp.value;
          }
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
        const propio = t && !exacto ? `<button type="button" class="ms-op" data-n="${esc(q.value.trim())}"><span class="ms-ph" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:#1c1c1c;color:#FFFF66;flex:none">＋</span><span><b>Usar «${esc(q.value.trim())}»</b><small>Ejercicio personalizado</small></span></button>` : '';
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
    let creadoAhora = false;
    try{
      if(!m.id && m.alumno_id){
        // Mesociclo nuevo armado directamente para un alumno: se crea activo y la semana en curso pasa a ser su rutina
        const inicio = m.inicio || hoyStr();
        const { data: previos } = await sb.from('mesociclos').select('id').eq('alumno_id', m.alumno_id).eq('estado', 'activo');
        const { data, error } = await sb.from('mesociclos').insert({ creado_por: profile.id, alumno_id: m.alumno_id, nombre: m.nombre, objetivo: m.objetivo || null, semanas: m.semanas, estado:'activo', inicio, plan: m.plan }).select().single();
        if(error || !data) throw new Error(error ? error.message : 'No se pudo crear el mesociclo');
        creadoAhora = true; m.id = data.id; m.estado = 'activo'; m.inicio = inicio;
        const w = Math.max(1, Math.min(m.semanas, semanaPorFecha(m)));
        await aplicarSemana(m, w, { actualizada:false });
        const viejos = (previos || []).map(x => x.id).filter(id => id !== m.id);
        if(viejos.length) await sb.from('mesociclos').update({ estado:'completado', updated_at: ahora }).in('id', viejos);
        E.firmaInicial = firmaSemana(m.plan, w); E.sucio = false; E.nuevo = false;
        const v = E.volver, nom = E.alumno ? E.alumno.nombre : null; E = null;
        try{ mostrarRutinaEnviada(nom, false); }catch(_e){ toast('Mesociclo asignado ✓'); }
        v();
        return true;
      }
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
      if(creadoAhora && m.id){ try{ await sb.from('mesociclos').delete().eq('id', m.id); }catch(_e){} m.id = null; m.estado = 'activo'; m.semana_aplicada = null; }
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
      const cam = prev && (String(prev.peso || '') !== String(c.peso || '') || String(prev.reps || '') !== String(c.reps || '') || String(prev.series || '') !== String(c.series || ''));
      const cls = des.includes(w) ? 'd' : (cam ? 'up' : '');
      return `<td class="${cls}">${esc(c.series || '–')}×${esc(c.reps || '–')}${c.peso ? '<br>' + esc(/^[\d.,]+$/.test(String(c.peso).trim()) ? c.peso + ' kg' : c.peso) : ''}</td>`;
    };
    const guardado = !!m.id;
    root().innerHTML = `<div class="ms">
      <div class="ms-head"><button type="button" class="back-link" id="msg-volver">${IC('arrowLeft')} Volver</button></div>
      <div class="ms-titulo"><h1>Vista general</h1><span class="ms-pill">${esc(resumenM(m))}</span></div>
      <p class="ms-sub">${esc(m.nombre)} · cómo evolucionan los ejercicios semana a semana.</p>
      ${p.dias.map((d, di) => `<div class="ms-card" style="padding:10px 8px"><h2 style="padding-left:6px">${esc(d.nombre || 'Día ' + (di + 1))}</h2>
        ${d.ejercicios.length ? `<div class="ms-gen"><table style="min-width:${Math.max(300, 124 + m.semanas * 56)}px"><tr><th></th>${Array.from({ length: m.semanas }, (_, i) => `<th class="${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">SEM ${i + 1}${des.includes(i + 1) ? '<br>DESC.' : ''}</th>`).join('')}</tr>
        ${d.ejercicios.map(e => { const ent = typeof findExerciseBankEntry === 'function' ? findExerciseBankEntry(e.nombre) : null; return `<tr><td><div class="ms-gn">${ent ? `<img src="${esc(ent.image)}" alt="">` : ''}<span>${esc(e.nombre)}</span></div></td>${Array.from({ length: m.semanas }, (_, i) => celda(e, i + 1)).join('')}</tr>`; }).join('')}</table></div>` : '<p class="ms-sub" style="margin:4px 6px">Sin ejercicios.</p>'}</div>`).join('')}
      <p class="ms-note" style="margin:0 0 4px">Lo que cambia respecto a la semana anterior va en amarillo; las semanas de descarga, en celeste.</p>
      ${soloLectura ? '' : `<div class="ms-row2"><button type="button" class="ms-chipb" id="msg-editar">${IC('edit')} Editar una semana</button>${(guardado && !m.alumno_id) ? '<button type="button" class="ms-chipb" id="msg-asignar">Asignar a alumno</button>' : ''}</div>`}
      ${(!soloLectura && m.alumno_id) ? '<button type="button" class="ms-lnk" id="msg-ant">Mesociclos anteriores<span>Ver ›</span></button>' : ''}
    </div>`;
    $id('msg-volver').onclick = () => { if(soloLectura) volverFn(); else pintarEditor(); };
    if(!soloLectura){
      document.querySelectorAll('.ms-gen th[data-w]').forEach(th => th.onclick = () => { E.semana = parseInt(th.dataset.w, 10); pintarEditor(); });
      $id('msg-editar').onclick = () => pintarEditor();
      const a = $id('msg-asignar');
      if(a) a.onclick = async () => { if(!(await guardarSiHaceFalta())) return; const v = E.volver; asignar(clon(E.m), null, () => { E = null; v(); }); };
      const an = $id('msg-ant');
      if(an) an.onclick = async () => { if(E.sucio && !(await guardarSiHaceFalta())) return; const v = E.volver, aid = E.m.alumno_id; E = null; anterioresDe(aid, v, true); };
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
      <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm" data-si style="background:#FFFF66;color:#111;border-color:#FFFF66;font-weight:700">Asignar</button></div>`,
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
    const activo = m.estado === 'activo' && !!m.alumno_id;
    const actual = activo ? (m.semana_aplicada || semanaActual(m)) : 0;
    const esAlumno = profile && profile.role === 'alumno' && m.alumno_id === profile.id;
    let w = semanaIni || (activo ? actual : 1);
    let sesiones = null, profe = null;
    const total = m.semanas * m.plan.dias.length;
    const datos = (c) => {
      const peso = String(c.peso || '').trim();
      const pesoTxt = peso ? (/^[\d.,]+$/.test(peso) ? peso + ' kg' : peso) : '—';
      const desTxt = c.descanso ? (Number(c.descanso) >= 60 && Number(c.descanso) % 60 === 0 ? (Number(c.descanso) / 60) + "'" : c.descanso + '"') : '—';
      return `<div class="ms-grid"><div class="ms-f"><span>Series</span><b>${esc(c.series || '—')}</b></div><div class="ms-f"><span>Reps</span><b>${esc(c.reps || '—')}</b></div><div class="ms-f up"><span>Peso</span><b>${esc(pesoTxt)}</b></div><div class="ms-f"><span>Desc.</span><b>${esc(desTxt)}</b></div></div>`;
    };
    const pintar = () => {
      const pesoPrev = (e) => { const c = w > 1 ? e.semanas[w - 2] : null; if(!c || !String(c.peso || '').trim()) return ''; const t = String(c.peso).trim(); return (/^[\d.,]+$/.test(t) ? t + ' kg' : t) + (c.reps ? ' × ' + c.reps : ''); };
      const pctAv = sesiones != null && total ? Math.min(100, Math.round(sesiones / total * 100)) : Math.round(actual / m.semanas * 100);
      root().innerHTML = `<div class="ms ms-ver" style="padding-bottom:30px">
        <div class="ms-head"><button type="button" class="back-link" id="msv-volver">${IC('arrowLeft')} Volver</button></div>
        <div class="ms-titulo"><h1>${esAlumno && activo ? 'Mi mesociclo' : esc(m.nombre)}</h1><span class="ms-pill ${activo ? 'ok' : ''}">${activo ? 'Semana ' + actual + ' de ' + m.semanas : esc(resumenM(m))}</span></div>
        <p class="ms-sub">${esAlumno && activo ? esc(m.nombre) + (profe ? ' · con el profe ' + esc(String(profe.nombre || '').split(' ')[0]) : '') : (m.objetivo ? esc(m.objetivo) : esc(resumenM(m)))}</p>
        <div class="ms-card"><div class="ms-row"><b>${activo ? 'Avance' : 'Semanas'}</b><span class="ms-av-t" id="msv-av">${activo ? (sesiones != null ? `${sesiones} de ${total} sesiones` : `Semana ${actual} de ${m.semanas}`) : `${m.semanas} semanas`}</span></div>
          ${activo ? `<div class="ms-prog"><i style="width:${pctAv}%"></i></div>` : ''}
          <div class="ms-semchips" style="margin-top:${activo ? 10 : 8}px">${Array.from({ length: m.semanas }, (_, i) => `<button type="button" class="ms-tab ${i + 1 === w ? 'on' : ''} ${des.includes(i + 1) ? 'des' : ''}" data-w="${i + 1}">S${i + 1}${activo && i + 1 < actual ? ' ✓' : ''}</button>`).join('')}</div></div>
        ${m.plan.dias.map((d, di) => `<div class="ms-card"><h2>${esc(d.nombre || 'Día ' + (di + 1))}</h2>${d.ejercicios.length ? d.ejercicios.map(e => {
          const c = e.semanas[w - 1] || celdaBase();
          const thumb = (typeof renderExerciseThumbnail === 'function' ? renderExerciseThumbnail(e) : '') || `<span class="ms-ph">${esc((e.nombre || '?').slice(0, 1).toUpperCase())}</span>`;
          const prev = pesoPrev(e);
          return `<div class="ms-ex"><div class="ms-exr">${thumb}<div class="ms-ext"><div class="ms-exn"><b>${esc(e.nombre)}</b><span class="ms-tipo">${e.tipo ? esc(TIPOS[e.tipo] || '') : esc(String(c.series || '–')) + ' × ' + esc(String(c.reps || '–'))}</span></div><div class="ms-exv">${verTecnica(e)}</div></div></div>
            ${datos(c)}
            ${(c.nota || c.rir || e.nota || e.lado) ? `<p class="ms-note">${esc([c.rir ? 'RIR ' + c.rir : '', e.lado ? (LADOS[e.lado] || '') : '', c.nota, e.nota].filter(Boolean).join(' · '))}</p>` : ''}
            ${prev ? `<p class="ms-note">Semana pasada: ${esc(prev)}</p>` : ''}</div>`;
        }).join('') : '<div class="ms-vacio" style="margin:0">Sin ejercicios.</div>'}</div>`).join('')}
        ${m.alumno_id ? '<button type="button" class="ms-lnk" id="msv-ant">' + (esAlumno ? 'Mis mesociclos anteriores' : 'Mesociclos anteriores') + '<span>Ver ›</span></button>' : ''}
      </div>`;
      $id('msv-volver').onclick = volver;
      document.querySelectorAll('.ms-tab[data-w]').forEach(b => b.onclick = () => { w = parseInt(b.dataset.w, 10); pintar(); });
      const ant = $id('msv-ant');
      if(ant) ant.onclick = () => anterioresDe(m.alumno_id, () => verSoloLectura(m, volver, w), !esAlumno && puedeEditarDe(m));
    };
    pintar();
    // Avance real (sesiones hechas) y nombre del profesor: se completan sin bloquear la pantalla
    (async () => {
      try{
        if(activo){
          const { count } = await sb.from('sesiones').select('id', { count:'exact', head:true }).eq('alumno_id', m.alumno_id).gte('fecha', m.inicio || '1900-01-01');
          if(count != null) sesiones = count;
        }
        if(esAlumno && m.creado_por){ const r = await nombresDe([m.creado_por]); profe = r[m.creado_por] || null; }
        if($id('msv-volver') && (sesiones != null || profe)) pintar();
      }catch(_e){}
    })();
  }
  const puedeEditarDe = (m) => (typeof esGestor === 'function' && esGestor()) || (profile && m.creado_por === profile.id);

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fechaCorta = (iso) => { const d = new Date(iso + 'T12:00:00'); return d.getDate() + ' ' + MESES[d.getMonth()]; };
  function rangoFechas(m){
    if(!m.inicio) return '';
    const fin = new Date(m.inicio + 'T12:00:00'); fin.setDate(fin.getDate() + m.semanas * 7 - 1);
    const finIso = fin.getFullYear() + '-' + String(fin.getMonth() + 1).padStart(2, '0') + '-' + String(fin.getDate()).padStart(2, '0');
    return fechaCorta(m.inicio) + ' – ' + fechaCorta(finIso);
  }

  async function anterioresDe(alumnoId, volver, puedeEditar){
    root().innerHTML = '<div class="loading">Cargando mesociclos...</div>';
    const { data, error } = await sb.from('mesociclos').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending:false });
    if(error){ toast('No se pudieron cargar'); volver(); return; }
    const ms = (data || []).map(normalizarPlan);
    const refrescar = () => anterioresDe(alumnoId, volver, puedeEditar);
    const estado = (m) => m.estado === 'activo' ? `<span class="ms-ok">● En curso · semana ${m.semana_aplicada || semanaActual(m)}</span>` : '<span class="ms-ok">✓ Completado</span>';
    root().innerHTML = `<div class="ms" style="padding-bottom:30px"><div class="ms-head"><button type="button" class="back-link" id="msa-v">${IC('arrowLeft')} Volver</button></div>
      <h1>Mesociclos anteriores</h1><p class="ms-sub">Todo lo que ya se planificó, para consultarlo o repetirlo.</p>
      ${ms.length ? `<div class="ms-card">${ms.map(m => `<div class="ms-hist"><div class="b"><b>${esc(m.nombre)}</b><small>${[rangoFechas(m), esc(m.semanas + ' sem'), esc(m.plan.dias.length + ' día' + (m.plan.dias.length === 1 ? '' : 's'))].filter(Boolean).join(' · ')}</small>${estado(m)}</div><button type="button" class="ms-chipb" data-ver="${m.id}">Abrir</button></div>`).join('')}</div>
      ${puedeEditar ? '<div class="ms-row2"><button type="button" class="ms-chipb" id="msa-dup">⧉ Guardar como plantilla</button><button type="button" class="ms-chipb" id="msa-rep">↻ Repetir con este alumno</button></div>' : ''}` : emptyKiloHtml('Todavía no hay mesociclos anteriores.', 'espera')}</div>`;
    $id('msa-v').onclick = volver;
    document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => verSoloLectura(ms.find(x => x.id === b.dataset.ver), refrescar));
    const elegir = (titulo, accion) => hoja(`<h3>${esc(titulo)}</h3>${ms.map(m => `<button type="button" class="ms-op" data-id="${m.id}"><span><b>${esc(m.nombre)}</b><small>${[rangoFechas(m), esc(m.semanas + ' sem')].filter(Boolean).join(' · ')}</small></span></button>`).join('')}`, (h, cerrar) => h.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { cerrar(); accion(ms.find(x => x.id === b.dataset.id)); }));
    const bd = $id('msa-dup'); if(bd) bd.onclick = () => elegir('¿Cuál guardar como plantilla?', async (m) => { E = { volver: refrescar }; await duplicarPlantilla(m); });
    const br = $id('msa-rep'); if(br) br.onclick = async () => {
      const al = (await nombresDe([alumnoId]))[alumnoId];
      if(!al){ toast('No se encontró al alumno'); return; }
      elegir('¿Cuál repetir?', (m) => asignar(m, al, () => renderCoachAlumnoDetail(alumnoId)));
    };
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
  // Mesociclo como tercera opción al crear una rutina o plantilla (Fuerza · Funcional · Mesociclo)
  (function(){
    const origHtml = window.fxPlantillaHtml;
    if(typeof origHtml === 'function' && !origHtml.__ms){
      const nuevo = function(){
        const html = origHtml.apply(this, arguments);
        if(!profile || profile.role === 'alumno') return html;
        const tarjeta = `<button type="button" class="fx-tpl ms-tpl" data-plantilla="mesociclo" style="margin-top:14px"><span class="fx-nuevo">NUEVO</span><span class="fx-tpl-ic">📅</span><span class="fx-tpl-txt"><b>Mesociclo</b><small>Planifica varias semanas: ejercicios, series y pesos por semana, con progresión y semanas de descarga.</small></span><span class="fx-tpl-go">›</span></button>`;
        return html.includes('<div class="fx-tip">') ? html.replace('<div class="fx-tip">', tarjeta + '<div class="fx-tip">') : html + tarjeta;
      };
      nuevo.__ms = true; window.fxPlantillaHtml = nuevo;
    }
    const origEd = window.renderRutinaEditor;
    if(typeof origEd === 'function' && !origEd.__ms){
      const ed = function(alumno, prefill, editingId, returnFn, plantilla){
        if(plantilla === 'mesociclo' && alumno){
          const esPlantilla = alumno.id === '__plantilla__';
          const volver = returnFn || (esPlantilla ? renderMisPlantillas : () => renderCoachAlumnoDetail(alumno.id));
          if(!esPlantilla){ try{ rutinaEditorModo = null; }catch(_e){} }
          return disponible().then(ok => {
            if(!ok){ toast('Los mesociclos se están activando. Intenta de nuevo en unos minutos.'); return volver(); }
            pedirDatosIniciales(volver, esPlantilla ? null : alumno);
          });
        }
        return origEd.apply(this, arguments);
      };
      ed.__ms = true; window.renderRutinaEditor = ed;
    }
  })();

  // Plantillas de mesociclo dentro de "Mis plantillas", junto a las demás
  envolver('renderMisPlantillas', async function(){
    const lista0 = $id('pl-lista');
    if(!lista0 || $id('ms-pl-wrap') || !(await disponible())) return;
    const { data, error } = await sb.from('mesociclos').select('*').is('alumno_id', null).order('updated_at', { ascending:false });
    if(error || !$id('pl-lista') || $id('ms-pl-wrap')) return;
    const ms = (data || []).filter(m => m.creado_por === profile.id).map(normalizarPlan);
    if(!ms.length) return;
    const wrap = document.createElement('div'); wrap.id = 'ms-pl-wrap';
    const pintar = () => {
      const term = norm(($id('pl-q') || { value:'' }).value.trim());
      const vis = ms.filter(m => !term || norm(`${m.nombre} ${m.objetivo || ''}`).includes(term));
      wrap.innerHTML = vis.length ? vis.map(m => `<div class="pl-card" data-msid="${m.id}">
          <div class="pl-card-top"><span class="pl-img pl-img-vacia">📅</span>
            <div class="pl-card-txt"><b>${esc(m.nombre)}</b>
              <div class="pl-meta"><span>📅 Mesociclo</span><span>${esc(String(m.semanas))} sem</span><span>${(m.plan.dias || []).length} día${(m.plan.dias || []).length === 1 ? '' : 's'}</span><span>${exTotal(m)} ejercicio${exTotal(m) === 1 ? '' : 's'}</span></div>
              <small>Actualizada el ${esc(typeof formatDateShort === 'function' ? formatDateShort(String(m.updated_at || m.created_at).slice(0, 10)) : '')}${m.objetivo ? ' · ' + esc(m.objetivo) : ''}</small></div></div>
          <div class="pl-card-acciones"><button type="button" class="pl-usar" data-usar="${m.id}">${IC('play')} Usar plantilla</button><button type="button" class="pl-editar" data-editar="${m.id}">${IC('edit')} Editar</button><button type="button" class="pl-mas" data-mas="${m.id}" aria-label="Más opciones">⋯</button></div>
          <div class="pl-menu hidden" id="ms-menu-${m.id}"><button type="button" data-ver="${m.id}">👁 Ver semanas</button><button type="button" data-copiar="${m.id}">⧉ Duplicar plantilla</button><button type="button" class="pl-borrar" data-borrar="${m.id}">🗑 Eliminar</button></div></div>`).join('') : '';
      const l0 = $id('pl-lista'); if(l0) l0.style.display = (vis.length && !l0.querySelector('.pl-card')) ? 'none' : '';
      const por = (id) => ms.find(x => x.id === id);
      wrap.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => asignar(por(b.dataset.usar), null, renderMisPlantillas));
      wrap.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => abrirEditor(clon(por(b.dataset.editar)), renderMisPlantillas, false));
      wrap.querySelectorAll('[data-mas]').forEach(b => b.onclick = () => $id('ms-menu-' + b.dataset.mas).classList.toggle('hidden'));
      wrap.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => verSoloLectura(clon(por(b.dataset.ver)), renderMisPlantillas));
      wrap.querySelectorAll('[data-copiar]').forEach(b => b.onclick = async () => { b.disabled = true; E = { volver: renderMisPlantillas }; await duplicarPlantilla(por(b.dataset.copiar)); });
      wrap.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
        if(b.dataset.confirm !== '1'){
          b.dataset.confirm = '1'; b.textContent = '¿Seguro? Toca otra vez para eliminar';
          setTimeout(() => { if(b.isConnected){ b.dataset.confirm = ''; b.textContent = '🗑 Eliminar'; } }, 3500);
          return;
        }
        b.disabled = true;
        const { error: e2 } = await sb.from('mesociclos').delete().eq('id', b.dataset.borrar);
        if(e2){ toast('No se pudo eliminar'); b.disabled = false; return; }
        toast('Mesociclo eliminado. Los que ya asignaste no cambian.'); renderMisPlantillas();
      });
    };
    lista0.insertAdjacentElement('afterend', wrap);
    pintar();
    const q = $id('pl-q'); if(q) q.addEventListener('input', pintar);
  });
  // "Desde plantilla" en la ficha del alumno: también ofrece los mesociclos
  envolver('elegirPlantillaParaAlumno', async function(alumno){
    const sheet = document.querySelector('.pl-capa .pl-sheet');
    if(!sheet || sheet.querySelector('[data-ms]') || !alumno || !(await disponible())) return;
    const { data } = await sb.from('mesociclos').select('*').is('alumno_id', null).order('updated_at', { ascending:false });
    const ms = (data || []).filter(m => m.creado_por === profile.id).map(normalizarPlan);
    const sh = document.querySelector('.pl-capa .pl-sheet');
    if(!ms.length || !sh || sh.querySelector('[data-ms]')) return;
    const vacio = sh.querySelector('.empty'); if(vacio) vacio.remove();
    ms.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pl-elegir'; b.dataset.ms = m.id;
      b.innerHTML = `<span class="pl-img pl-img-vacia">📅</span><span class="pl-card-txt"><b>${esc(m.nombre)}</b><span class="pl-meta"><span>📅 Mesociclo</span><span>${esc(String(m.semanas))} sem</span><span>${(m.plan.dias || []).length} día${(m.plan.dias || []).length === 1 ? '' : 's'}</span></span></span><span class="red-flecha">›</span>`;
      b.onclick = () => {
        const capa = document.querySelector('.pl-capa'); if(capa) capa.remove(); document.body.classList.remove('pl-abierto');
        asignar(m, alumno, () => renderCoachAlumnoDetail(alumno.id));
      };
      sh.appendChild(b);
    });
  });
  envolver('renderCoachAlumnoDetail', function(alumnoId){ return inyectarDetalle(alumnoId); });
  envolver('renderAlumnoHome', function(){ return inyectarAlumno(); });
  envolver('renderCoachHome', function(){ return autoAvanzarHome(); });

  window.UCMeso = { lista, planNuevo, filasDeSemana, aplicarProgresion, semanaPorFecha, normalizarPlan };
})();
