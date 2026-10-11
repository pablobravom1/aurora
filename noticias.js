// STC App — Noticias STC: muro de comunicaciones (sin comentarios, sin sonido ni vibración).
// Publica quien cumpla puedePublicar() (hoy: solo el super administrador).
// Todos los usuarios ven las noticias vigentes y pueden darles "me gusta".
// Se carga DESPUÉS de app.js y se engancha a las pantallas de inicio sin modificarlas.
(function(){
  'use strict';

  const TIPOS = { noticia:'Noticia', promo:'Promoción', evento:'Evento', aviso:'Aviso', publicidad:'Publicidad' };
  const esc = (s) => escapeHtml(s);
  const puedePublicar = () => !!profile && profile.role === 'super_admin' && profile.es_super === true;

  // ---------- estilos ----------
  const st = document.createElement('style');
  st.textContent = `
  .nw-btn{position:relative;display:grid;place-items:center;width:39px;height:39px;padding:0;border-radius:13px;border:1px solid rgba(255,255,102,.30);background:rgba(255,255,255,.04);color:#FFFF66;cursor:pointer}
  .nw-btn .icon{width:18px;height:18px}
  .nw-btn:hover{background:rgba(255,255,102,.10)}
  .nw-badge{position:absolute;top:-7px;right:-7px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#FFFF00;color:#111;border:2px solid #111;display:grid;place-items:center;font:700 9.5px 'IBM Plex Mono',monospace}
  .nw-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:6px 0 14px}
  .nw-head h1{margin:0}
  .nw-sub{font-size:12.5px;color:var(--chalk-dim);margin-top:3px;display:flex;align-items:center;gap:6px}
  .nw-dot{width:8px;height:8px;border-radius:50%;background:#FFFF00;display:inline-block;flex-shrink:0}
  .nw-nueva{border:0;border-radius:11px;background:#FFFF00;color:#111;font:700 12.5px 'Inter',sans-serif;padding:10px 13px;cursor:pointer;white-space:nowrap}
  .nw-post{background:linear-gradient(145deg,#1A1A1A,var(--surface,#1F1F1F));border:1px solid rgba(255,255,102,.20);border-radius:18px;margin-bottom:12px;overflow:hidden}
  .nw-post.fijada{border-color:rgba(255,184,77,.55)}
  .nw-post.sin-pub{opacity:.78;border-style:dashed}
  .nw-img{width:100%;max-height:230px;object-fit:cover;display:block;background:#222}
  .nw-body{padding:14px 16px 14px}
  .nw-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .nw-chip{display:inline-flex;align-items:center;gap:5px;font:700 10px 'Inter',sans-serif;letter-spacing:.08em;padding:4px 8px;border-radius:7px;text-transform:uppercase}
  .nw-t-noticia{background:rgba(255,255,102,.14);color:#FFFF66}
  .nw-t-promo{background:rgba(94,227,182,.15);color:#5EE3B6}
  .nw-t-evento{background:rgba(255,107,114,.15);color:#FF6B72}
  .nw-t-aviso{background:rgba(255,184,77,.16);color:#FFB84D}
  .nw-t-publicidad{background:rgba(255,255,255,.10);color:#d6d6d6}
  .nw-when{font-size:11.5px;color:var(--chalk-dim)}
  .nw-post h3{font-family:'Oswald',sans-serif;font-weight:600;font-size:19px;letter-spacing:.02em;text-transform:uppercase;margin:9px 0 6px;line-height:1.2}
  .nw-post p{margin:0;font-size:14px;line-height:1.5;color:#dcdcdc;word-break:break-word}
  .nw-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;flex-wrap:wrap}
  .nw-like{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,102,.22);background:transparent;color:var(--chalk-dim);font:500 12.5px 'Inter',sans-serif;cursor:pointer}
  .nw-like svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2}
  .nw-like.on{background:#FFFF00;border-color:#FFFF00;color:#111}
  .nw-like.on svg{fill:#111;stroke:#111}
  .nw-cta{border:0;border-radius:11px;background:#FFFF00;color:#111;font:700 12.5px 'Inter',sans-serif;padding:10px 14px;text-decoration:none;cursor:pointer}
  .nw-adm{display:flex;gap:10px;align-items:center;margin-top:11px;padding-top:10px;border-top:1px solid #2a2a2a;font-size:12px;color:var(--chalk-dim)}
  .nw-adm button{margin-left:auto;border:1px solid rgba(255,255,102,.3);background:transparent;color:#FFFF66;border-radius:9px;padding:6px 11px;font:600 12px 'Inter',sans-serif;cursor:pointer}
  .nw-vacio{text-align:center;color:var(--chalk-dim);padding:38px 10px;font-size:14px}
  .nw-fl{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--chalk-dim);margin:14px 0 6px}
  .nw-in,.nw-ta{width:100%;box-sizing:border-box;background:var(--surface,#1F1F1F);color:var(--chalk,#fff);border:1px solid rgba(255,255,102,.22);border-radius:12px;padding:11px 13px;font:14px 'Inter',sans-serif}
  .nw-ta{min-height:110px;resize:vertical;line-height:1.45}
  .nw-chips{display:flex;gap:8px;flex-wrap:wrap}
  .nw-chips button{padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,102,.22);background:var(--surface,#1F1F1F);color:var(--chalk-dim);font:500 12.5px 'Inter',sans-serif;cursor:pointer}
  .nw-chips button.on{background:#FFFF00;border-color:#FFFF00;color:#111;font-weight:700}
  .nw-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #262626;font-size:14px}
  .nw-tg{position:relative;width:44px;height:25px;border-radius:13px;background:#3a3a3a;border:0;cursor:pointer;flex-shrink:0}
  .nw-tg:after{content:'';position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;transition:left .15s}
  .nw-tg.on{background:#FFFF00}.nw-tg.on:after{left:22px;background:#111}
  .nw-prev{width:100%;max-height:170px;object-fit:cover;border-radius:12px;margin-top:8px;display:block}
  .nw-btns{display:flex;gap:10px;margin:18px 0 8px}
  .nw-btns .btn{flex:1}
  .nw-peligro{background:transparent;border:1px solid rgba(255,107,114,.5);color:#FF6B72;border-radius:12px;padding:11px;width:100%;font:600 13px 'Inter',sans-serif;cursor:pointer;margin-top:6px}
  .nw-sec{background:transparent !important;color:#FFFF66 !important;border:1px solid rgba(255,255,102,.35) !important;box-shadow:none !important}
  .nw-hint{font-size:12px;color:var(--chalk-dim);margin-top:5px;line-height:1.4}
  `;
  document.head.appendChild(st);

  // ---------- utilidades ----------
  const ICONO = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z"/><path d="M19 9h1a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2"/><path d="M8 9h7M8 13h7M8 16h4"/></svg>`;
  const CORAZON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z"/></svg>`;
  const ahora = () => Date.now();
  const esVisible = (n) => n.publicada && new Date(n.publicar_desde).getTime() <= ahora() && (!n.vigente_hasta || new Date(n.vigente_hasta).getTime() > ahora());
  const urlSegura = (u) => /^(https?:\/\/|tel:|mailto:)/i.test(String(u || '').trim());
  const cuando = (iso) => {
    const t = new Date(iso).getTime(); const d = ahora() - t;
    if(d < 0) return 'programada';
    const m = Math.floor(d / 60000);
    if(m < 1) return 'ahora';
    if(m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if(h < 24) return `hace ${h} h`;
    const dias = Math.floor(h / 24);
    if(dias === 1) return 'ayer';
    if(dias < 7) return `hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-CL', { day:'numeric', month:'short' });
  };
  const fechaLarga = (iso) => new Date(iso).toLocaleString('es-CL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  const aInputLocal = (iso) => { if(!iso) return ''; const d = new Date(iso); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  // ---------- contador ----------
  async function contarSinVer(){
    try{
      const [{ data: ns, error: e1 }, { data: vs, error: e2 }] = await Promise.all([
        sb.from('noticias').select('id,publicada,publicar_desde,vigente_hasta').limit(200),
        sb.from('noticias_vistas').select('noticia_id').eq('user_id', profile.id).limit(500)
      ]);
      if(e1 || e2) return 0;
      const vistas = new Set((vs || []).map(v => v.noticia_id));
      return (ns || []).filter(n => esVisible(n) && !vistas.has(n.id)).length;
    }catch(_e){ return 0; }
  }
  const textoBadge = (n) => n > 99 ? '99+' : String(n);

  function pintarBadge(btn, n){
    const viejo = btn.querySelector('.nw-badge'); if(viejo) viejo.remove();
    if(n > 0){
      const b = document.createElement('span'); b.className = 'nw-badge'; b.textContent = textoBadge(n);
      btn.appendChild(b);
    }
    btn.setAttribute('aria-label', n > 0 ? `Noticias STC: ${n} sin ver` : 'Noticias STC');
  }

  async function inyectarBoton(volver){
    if(!profile) return;
    const zona = document.querySelector('#app-root .student-header-actions');
    if(!zona || document.getElementById('nw-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'nw-btn'; btn.className = 'nw-btn'; btn.title = 'Noticias STC';
    btn.setAttribute('aria-label', 'Noticias STC');
    btn.innerHTML = ICONO;
    btn.onclick = () => abrir(volver);
    zona.insertBefore(btn, zona.firstChild);
    const n = await contarSinVer();
    if(document.body.contains(btn)) pintarBadge(btn, n);
  }

  function enganchar(nombre){
    const orig = window[nombre];
    if(typeof orig !== 'function' || orig.__nw) return;
    const nueva = async function(){
      const r = await orig.apply(this, arguments);
      try{ inyectarBoton(() => window[nombre]()); }catch(_e){}
      return r;
    };
    nueva.__nw = true;
    window[nombre] = nueva;
  }

  // ---------- muro ----------
  let vistaActual = null;

  async function abrir(volver){
    const cuerpo = root();
    cuerpo.innerHTML = `<div class="loading">Cargando noticias...</div>`;
    const admin = puedePublicar();
    const [rn, rv, rl] = await Promise.all([
      sb.from('noticias').select('*').order('fijada', { ascending:false }).order('publicar_desde', { ascending:false }).limit(80),
      sb.from('noticias_vistas').select('noticia_id').eq('user_id', profile.id).limit(500),
      sb.from('noticias_likes').select('noticia_id').eq('user_id', profile.id).limit(500)
    ]);
    if(rn.error){
      cuerpo.innerHTML = `<button type="button" class="back-link" id="nw-volver">${ICONS.arrowLeft} Volver</button><div class="card"><div class="empty">No se pudieron cargar las noticias. Revisa tu conexión e inténtalo de nuevo.</div></div>`;
      document.getElementById('nw-volver').onclick = () => (volver ? volver() : renderInicio());
      return;
    }
    let stats = {};
    if(admin){
      const [sv, sl] = await Promise.all([
        sb.from('noticias_vistas').select('noticia_id').limit(5000),
        sb.from('noticias_likes').select('noticia_id').limit(5000)
      ]);
      (sv.data || []).forEach(r => { (stats[r.noticia_id] = stats[r.noticia_id] || { v:0, l:0 }).v++; });
      (sl.data || []).forEach(r => { (stats[r.noticia_id] = stats[r.noticia_id] || { v:0, l:0 }).l++; });
    }
    vistaActual = {
      volver, admin, stats,
      noticias: (rn.data || []).filter(n => admin || esVisible(n)),
      vistas: new Set((rv.data || []).map(r => r.noticia_id)),
      likes: new Set((rl.data || []).map(r => r.noticia_id))
    };
    pintarMuro();
  }

  function tarjeta(n, v){
    const visible = esVisible(n);
    const nuevo = visible && !v.vistas.has(n.id);
    const url = n.boton_url && urlSegura(n.boton_url) ? n.boton_url.trim() : '';
    const like = v.likes.has(n.id);
    let estado = '';
    if(v.admin){
      if(!n.publicada) estado = 'Borrador (nadie la ve)';
      else if(new Date(n.publicar_desde).getTime() > ahora()) estado = `Programada para ${fechaLarga(n.publicar_desde)}`;
      else if(n.vigente_hasta && new Date(n.vigente_hasta).getTime() <= ahora()) estado = 'Vencida (ya no se muestra)';
    }
    const st = v.stats[n.id] || { v:0, l:0 };
    return `<article class="nw-post${n.fijada ? ' fijada' : ''}${visible ? '' : ' sin-pub'}" data-id="${esc(n.id)}" data-nuevo="${nuevo ? 1 : 0}">
      ${n.imagen_url ? `<img class="nw-img" src="${esc(n.imagen_url)}" alt="" loading="lazy">` : ''}
      <div class="nw-body">
        <div class="nw-meta"><span class="nw-chip nw-t-${esc(n.tipo)}">${n.fijada ? '📌 ' : ''}${nuevo ? '<span class="nw-dot" data-dot style="width:6px;height:6px"></span>' : ''}${esc(TIPOS[n.tipo] || 'Noticia')}</span><span class="nw-when">${esc(cuando(n.publicar_desde))}${n.vigente_hasta && visible ? ' · hasta ' + esc(new Date(n.vigente_hasta).toLocaleDateString('es-CL', { day:'numeric', month:'short' })) : ''}</span></div>
        <h3>${esc(n.titulo)}</h3>
        ${n.cuerpo ? `<p>${esc(n.cuerpo).replace(/\n/g, '<br>')}</p>` : ''}
        <div class="nw-foot">
          ${visible ? `<button type="button" class="nw-like${like ? ' on' : ''}" data-like="${esc(n.id)}" aria-pressed="${like}">${CORAZON}<span>Me gusta</span></button>` : '<span></span>'}
          ${url ? `<a class="nw-cta" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(n.boton_texto || 'Ver más')}</a>` : ''}
        </div>
        ${v.admin ? `<div class="nw-adm"><span>${estado ? esc(estado) + ' · ' : ''}👁 ${st.v} · ♥ ${st.l}</span><button type="button" data-edit="${esc(n.id)}">Editar</button></div>` : ''}
      </div></article>`;
  }

  function pintarMuro(){
    const v = vistaActual;
    const sinVer = v.noticias.filter(n => esVisible(n) && !v.vistas.has(n.id)).length;
    root().innerHTML = `
      <button type="button" class="back-link" id="nw-volver">${ICONS.arrowLeft} Volver</button>
      <div class="nw-head">
        <div><h1>Noticias STC</h1><div class="nw-sub" id="nw-sub">${sinVer ? `<span class="nw-dot"></span>${sinVer} sin ver` : 'Estás al día'}</div></div>
        ${v.admin ? `<button type="button" class="nw-nueva" id="nw-nueva">+ Nueva</button>` : ''}
      </div>
      <div id="nw-lista">${v.noticias.length ? v.noticias.map(n => tarjeta(n, v)).join('') : `<div class="nw-vacio">Aún no hay noticias.${v.admin ? '<br>Crea la primera con “+ Nueva”.' : ''}</div>`}</div>`;
    document.getElementById('nw-volver').onclick = () => (v.volver ? v.volver() : renderInicio());
    const nueva = document.getElementById('nw-nueva'); if(nueva) nueva.onclick = () => editor(null);
    document.querySelectorAll('[data-like]').forEach(b => b.onclick = () => alternarLike(b));
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editor(v.noticias.find(n => n.id === b.dataset.edit)));
    vigilarVistas();
  }

  async function alternarLike(btn){
    const v = vistaActual; const id = btn.dataset.like;
    const antes = v.likes.has(id);
    if(antes) v.likes.delete(id); else v.likes.add(id);
    btn.classList.toggle('on', !antes); btn.setAttribute('aria-pressed', String(!antes));
    const r = antes
      ? await sb.from('noticias_likes').delete().eq('noticia_id', id).eq('user_id', profile.id)
      : await sb.from('noticias_likes').insert({ noticia_id: id, user_id: profile.id });
    if(r.error){
      if(antes) v.likes.add(id); else v.likes.delete(id);
      btn.classList.toggle('on', antes); btn.setAttribute('aria-pressed', String(antes));
      showToast('No se pudo guardar tu me gusta');
    }
  }

  // Marca como vistas las noticias que quedan en pantalla (≥55 % por 0,7 s).
  let obs = null, pend = [], tPend = null;
  function marcarVistas(ids){
    const v = vistaActual; if(!v || !ids.length) return;
    ids.forEach(id => v.vistas.add(id));
    pend.push(...ids);
    clearTimeout(tPend);
    tPend = setTimeout(async () => {
      const lote = [...new Set(pend)]; pend = [];
      if(!lote.length) return;
      await sb.from('noticias_vistas').upsert(lote.map(id => ({ noticia_id: id, user_id: profile.id })), { onConflict:'noticia_id,user_id', ignoreDuplicates:true });
    }, 500);
    const sinVer = v.noticias.filter(n => esVisible(n) && !v.vistas.has(n.id)).length;
    const sub = document.getElementById('nw-sub');
    if(sub) sub.innerHTML = sinVer ? `<span class="nw-dot"></span>${sinVer} sin ver` : 'Estás al día';
  }
  function vigilarVistas(){
    if(obs){ obs.disconnect(); obs = null; }
    const nuevos = [...document.querySelectorAll('.nw-post[data-nuevo="1"]')];
    if(!nuevos.length) return;
    if(!('IntersectionObserver' in window)){ marcarVistas(nuevos.map(e => e.dataset.id)); return; }
    const timers = new Map();
    obs = new IntersectionObserver((entradas) => {
      entradas.forEach(en => {
        const el = en.target;
        if(en.isIntersecting){
          if(!timers.has(el)) timers.set(el, setTimeout(() => {
            timers.delete(el); obs && obs.unobserve(el);
            const d = el.querySelector('[data-dot]'); if(d) d.remove();
            el.dataset.nuevo = '0';
            marcarVistas([el.dataset.id]);
          }, 700));
        }else if(timers.has(el)){ clearTimeout(timers.get(el)); timers.delete(el); }
      });
    }, { threshold: 0.55 });
    nuevos.forEach(e => obs.observe(e));
  }

  // ---------- editor (solo quien puede publicar) ----------
  function editor(n){
    if(!puedePublicar()){ showToast('Solo el super administrador puede publicar noticias'); return; }
    if(obs){ obs.disconnect(); obs = null; }
    const d = Object.assign({ id:null, tipo:'noticia', titulo:'', cuerpo:'', imagen_url:'', boton_texto:'', boton_url:'', fijada:false, publicada:false, publicar_desde:null, vigente_hasta:null }, n || {});
    const volverMuro = () => abrir(vistaActual && vistaActual.volver);
    const pintar = () => {
      root().innerHTML = `
        <button type="button" class="back-link" id="nw-cancelar">${ICONS.arrowLeft} Volver</button>
        <h1>${d.id ? 'Editar noticia' : 'Nueva noticia'}</h1>
        <label class="nw-fl">Tipo</label>
        <div class="nw-chips" id="nw-tipos">${Object.keys(TIPOS).map(k => `<button type="button" data-tipo="${k}" class="${d.tipo === k ? 'on' : ''}">${TIPOS[k]}</button>`).join('')}</div>
        ${d.tipo === 'publicidad' ? '<div class="nw-hint">Se mostrará con la etiqueta “Publicidad” para que se note.</div>' : ''}
        <label class="nw-fl" for="nw-titulo">Título</label>
        <input class="nw-in" id="nw-titulo" maxlength="120" value="${esc(d.titulo)}" placeholder="Ej: Llegaron las nuevas máquinas">
        <label class="nw-fl" for="nw-cuerpo">Mensaje (opcional)</label>
        <textarea class="nw-ta" id="nw-cuerpo" maxlength="2000" placeholder="Escribe el detalle...">${esc(d.cuerpo)}</textarea>
        <label class="nw-fl">Imagen (opcional)</label>
        ${d.imagen_url ? `<img class="nw-prev" src="${esc(d.imagen_url)}" alt="">` : ''}
        <div class="nw-btns" style="margin:8px 0 0"><label class="btn nw-sec" style="text-align:center;cursor:pointer;margin:0">${d.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" id="nw-file" accept="image/*" style="display:none"></label>${d.imagen_url ? '<button type="button" class="btn nw-sec" id="nw-quitar-img">Quitar</button>' : ''}</div>
        <label class="nw-fl">Botón (opcional)</label>
        <input class="nw-in" id="nw-btn-texto" maxlength="30" value="${esc(d.boton_texto)}" placeholder="Texto del botón (ej: Ver promo)">
        <input class="nw-in" id="nw-btn-url" style="margin-top:8px" value="${esc(d.boton_url)}" placeholder="Enlace (https://...) o tel:+569...">
        <div class="nw-row" style="margin-top:12px"><span>Fijar arriba</span><button type="button" class="nw-tg${d.fijada ? ' on' : ''}" id="nw-fijar" aria-label="Fijar arriba"></button></div>
        <label class="nw-fl" for="nw-desde">Mostrar desde (vacío = ahora)</label>
        <input class="nw-in" type="datetime-local" id="nw-desde" value="${aInputLocal(d.publicar_desde && new Date(d.publicar_desde).getTime() > ahora() ? d.publicar_desde : '')}">
        <label class="nw-fl" for="nw-hasta">Dejar de mostrar el (opcional)</label>
        <input class="nw-in" type="datetime-local" id="nw-hasta" value="${aInputLocal(d.vigente_hasta)}">
        <div class="nw-btns">
          <button type="button" class="btn nw-sec" id="nw-borrador">Guardar borrador</button>
          <button type="button" class="btn" id="nw-publicar" style="background:#FFFF00;color:#111">Publicar</button>
        </div>
        ${d.id && d.publicada ? '<div class="nw-hint">Esta noticia está publicada. “Guardar borrador” la oculta a los alumnos sin borrarla.</div>' : ''}
        ${d.id ? '<button type="button" class="nw-peligro" id="nw-borrar">Eliminar noticia</button>' : ''}`;
      cablear();
    };
    const leer = () => {
      d.titulo = document.getElementById('nw-titulo').value;
      d.cuerpo = document.getElementById('nw-cuerpo').value;
      d.boton_texto = document.getElementById('nw-btn-texto').value;
      d.boton_url = document.getElementById('nw-btn-url').value;
      d._desde = document.getElementById('nw-desde').value;
      d._hasta = document.getElementById('nw-hasta').value;
    };
    const cablear = () => {
      document.getElementById('nw-cancelar').onclick = volverMuro;
      document.querySelectorAll('#nw-tipos [data-tipo]').forEach(b => b.onclick = () => { leer(); d.tipo = b.dataset.tipo; const keep = { _desde:d._desde, _hasta:d._hasta }; pintar(); document.getElementById('nw-desde').value = keep._desde; document.getElementById('nw-hasta').value = keep._hasta; });
      document.getElementById('nw-fijar').onclick = (e) => { d.fijada = !d.fijada; e.currentTarget.classList.toggle('on', d.fijada); };
      const q = document.getElementById('nw-quitar-img'); if(q) q.onclick = () => { leer(); const k = { a:d._desde, b:d._hasta }; d.imagen_url = ''; pintar(); document.getElementById('nw-desde').value = k.a; document.getElementById('nw-hasta').value = k.b; };
      document.getElementById('nw-file').onchange = async (e) => {
        const f = e.target.files && e.target.files[0]; if(!f) return;
        leer(); const k = { a:d._desde, b:d._hasta };
        showToast('Subiendo imagen...');
        try{ d.imagen_url = await subirImagen(f); }catch(err){ showToast('No se pudo subir la imagen'); return; }
        pintar(); document.getElementById('nw-desde').value = k.a; document.getElementById('nw-hasta').value = k.b;
      };
      document.getElementById('nw-borrador').onclick = () => guardar(false);
      document.getElementById('nw-publicar').onclick = () => guardar(true);
      const del = document.getElementById('nw-borrar');
      if(del) del.onclick = async () => {
        if(!confirm('¿Eliminar esta noticia? No se puede deshacer.')) return;
        const { error } = await sb.from('noticias').delete().eq('id', d.id);
        if(error){ showToast('No se pudo eliminar: ' + error.message); return; }
        showToast('Noticia eliminada'); volverMuro();
      };
    };
    const guardar = async (publicar) => {
      leer();
      const titulo = d.titulo.trim();
      if(!titulo){ showToast('Escribe un título'); return; }
      const url = d.boton_url.trim();
      if(url && !urlSegura(url)){ showToast('El enlace debe empezar con https://, tel: o mailto:'); return; }
      const desde = d._desde ? new Date(d._desde).toISOString() : null;
      const hasta = d._hasta ? new Date(d._hasta).toISOString() : null;
      if(desde && hasta && new Date(hasta) <= new Date(desde)){ showToast('La fecha final debe ser después de la inicial'); return; }
      const fila = {
        tipo: d.tipo, titulo, cuerpo: d.cuerpo.trim(), imagen_url: d.imagen_url || null,
        boton_texto: url ? (d.boton_texto.trim() || 'Ver más') : null, boton_url: url || null,
        fijada: !!d.fijada, publicada: !!publicar,
        publicar_desde: desde || ((d.publicar_desde && new Date(d.publicar_desde).getTime() <= ahora()) ? d.publicar_desde : new Date().toISOString()),
        vigente_hasta: hasta, updated_at: new Date().toISOString()
      };
      document.getElementById('nw-publicar').disabled = true; document.getElementById('nw-borrador').disabled = true;
      const r = d.id ? await sb.from('noticias').update(fila).eq('id', d.id) : await sb.from('noticias').insert(fila);
      if(r.error){
        document.getElementById('nw-publicar').disabled = false; document.getElementById('nw-borrador').disabled = false;
        showToast('No se pudo guardar: ' + r.error.message); return;
      }
      showToast(publicar ? (desde && new Date(desde) > new Date() ? 'Noticia programada' : 'Noticia publicada') : 'Borrador guardado');
      volverMuro();
    };
    pintar();
  }

  // Reduce la imagen (máx. 1280 px, JPEG) y la sube al almacenamiento público "noticias".
  async function subirImagen(file){
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
    if(!blob) throw new Error('imagen');
    const ruta = `${(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))}.jpg`;
    const { error } = await sb.storage.from('noticias').upload(ruta, blob, { contentType:'image/jpeg', cacheControl:'31536000' });
    if(error) throw error;
    return sb.storage.from('noticias').getPublicUrl(ruta).data.publicUrl;
  }

  window.UCNoticias = { abrir, contarSinVer, puedePublicar };
  ['renderAlumnoHome', 'renderCoachHome', 'renderLocHome'].forEach(enganchar);
})();
