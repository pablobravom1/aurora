// STC App — Equipo: fotos/avatares al asignar, gestionar profesores (cambiar nombre, eliminar) y cambiar el propio nombre.
// Se carga DESPUÉS de app.js y se engancha a sus funciones sin modificarlas.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const avatar = (p, cls) => (typeof renderProfileAvatar === 'function' ? renderProfileAvatar(p, cls) : '');
  const toast = (m) => { try{ showToast(m); }catch(_e){} };

  const css = document.createElement('style');
  css.textContent = `
  .eq-ov{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center}
  .eq-hoja{width:100%;max-width:520px;max-height:82vh;overflow:auto;box-sizing:border-box;background:#161616;border:1px solid rgba(247,197,30,.35);border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));color:#FBFBFB}
  @media (min-width:700px){.eq-ov{align-items:center}.eq-hoja{border-radius:18px}}
  .eq-hoja h3{margin:0 0 4px;font:700 17px 'Inter',sans-serif;color:#F7C51E}
  .eq-hoja p{margin:0 0 12px;font:400 14px/1.45 'Inter',sans-serif;color:#E6E6E6}
  .eq-hoja input.eq-buscar{width:100%;box-sizing:border-box;margin:0 0 10px}
  .eq-op{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:9px 10px;margin:0 0 6px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.04);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .eq-op.on{border-color:#F7C51E;background:rgba(247,197,30,.1)}
  .eq-op .profile-avatar{width:42px;height:42px;flex:none}
  .eq-op b{display:block;font:600 15px 'Inter',sans-serif}
  .eq-op small{display:block;color:#AEAEAE;font:400 12px 'Inter',sans-serif}
  .eq-vacio{flex:none;width:42px;height:42px;border-radius:50%;border:2px dashed rgba(255,255,255,.3);display:grid;place-items:center;color:#AEAEAE;font:700 16px 'Inter',sans-serif}
  .eq-btns{display:flex;gap:8px;margin-top:10px}
  .eq-btns button{flex:1;justify-content:center}
  .eq-peligro{background:#C0392B !important;border-color:#C0392B !important;color:#fff !important;font-weight:700}
  .ap-btn{display:inline-flex;align-items:center;gap:8px;flex:1 1 140px;min-width:0;max-width:100%;box-sizing:border-box;padding:5px 10px 5px 6px;border:1px solid var(--line,#333);border-radius:10px;background:rgba(255,255,255,.05);color:inherit;font:inherit;cursor:pointer}
  .ap-btn .profile-avatar{width:30px;height:30px;flex:none}
  .ap-btn .eq-vacio{width:30px;height:30px;font-size:13px}
  .ap-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-size:13px}
  .eq-acciones{display:flex;flex-wrap:wrap;gap:6px;width:100%;margin-top:6px}
  .eq-in{width:100%;box-sizing:border-box;margin:0 0 8px}
  .eq-fila{display:flex;gap:8px}
  .eq-prev{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:13px}
  .eq-prev .profile-avatar{width:42px;height:42px}
  .eq-nombre-card .profile-upload-note{margin:6px 0 10px}
  .eq-prot{padding:16px}
  .eq-prot-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
  .eq-kick{font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#A8A8A8}
  .eq-prot h2{margin:3px 0 0}
  .eq-ring{flex:none;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c) calc(var(--p)*1%),rgba(255,255,255,.09) 0);position:relative}
  .eq-ring::before{content:'';position:absolute;inset:6px;border-radius:50%;background:#171717}
  .eq-ring b{position:relative;font:700 15px 'Oswald',sans-serif;color:#FBFBFB}
  .eq-ring.ok{--c:#65D66E}.eq-ring.mid{--c:#F7C51E}.eq-ring.low{--c:#E5484D}.eq-ring.nada{--c:#555}
  .eq-dons{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}
  .eq-don{display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 6px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);text-align:center}
  .eq-don .eq-ring{width:58px;height:58px}
  .eq-don .eq-ring b{font-size:14px}
  .eq-don span{font:600 11px 'IBM Plex Mono',monospace;letter-spacing:.03em;color:#E6E6E6;line-height:1.25}
  .eq-don small{display:block;font:500 10.5px 'IBM Plex Mono',monospace;color:#A8A8A8}
  .eq-apilada{display:flex;height:12px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.09);margin:2px 0 6px}
  .eq-apilada i{display:block;height:100%}
  .eq-apilada .a{background:#65D66E}.eq-apilada .b{background:#E5484D}
  .eq-leyenda{display:flex;justify-content:space-between;gap:10px;font:500 11.5px 'IBM Plex Mono',monospace;color:#A8A8A8;margin:0 0 6px}
  .eq-leyenda b{color:#FBFBFB}
  .eq-pend-t{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:6px;padding:11px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#F5F5F5;font:600 13px 'IBM Plex Mono',monospace;letter-spacing:.04em;cursor:pointer}
  .eq-pend{margin-top:8px}
  .eq-pend[hidden]{display:none}
  .eq-pa{display:flex;align-items:center;gap:11px;width:100%;box-sizing:border-box;padding:8px 10px;margin:0 0 6px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03);color:inherit;font:inherit;text-align:left;cursor:pointer}
  .eq-pa .profile-avatar{width:36px;height:36px;flex:none}
  .eq-pa b{display:block;font-size:14px;font-weight:600}
  .eq-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
  .eq-chips em{font-style:normal;font:600 10.5px 'IBM Plex Mono',monospace;color:#FF8A8E;background:rgba(229,72,77,.14);border-radius:99px;padding:2px 8px}
  .eq-todo{margin:4px 0 0;color:#65D66E;font-weight:600;font-size:14px}
  .eq-mini{margin-top:5px;font:500 11px 'IBM Plex Mono',monospace;color:#A8A8A8}
  .eq-mini b{color:#FBFBFB}.eq-mini .ok{color:#65D66E}.eq-mini .mid{color:#F7C51E}.eq-mini .low{color:#FF6B70}
  `;
  document.head.appendChild(css);

  // ---------- hoja inferior genérica ----------
  function hoja(html, montar){
    const ov = document.createElement('div');
    ov.className = 'eq-ov';
    ov.innerHTML = `<div class="eq-hoja" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(ov);
    const kd = (e) => { if(e.key === 'Escape') cerrar(); };
    const cerrar = () => { ov.remove(); document.removeEventListener('keydown', kd); };
    document.addEventListener('keydown', kd);
    ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
    montar(ov.querySelector('.eq-hoja'), cerrar);
    return cerrar;
  }

  // Selector con foto/avatar. items: [{id, nombre, sub, persona}]
  function elegir(opts){
    const items = opts.items;
    const norm = (s) => (typeof normalizarTexto === 'function' ? normalizarTexto(s || '') : String(s || '').toLowerCase());
    const fila = (it) => `<button type="button" class="eq-op${it.id === (opts.actual || '') ? ' on' : ''}" data-id="${esc(it.id)}">${it.persona ? avatar(it.persona, 'avatar-chat') : '<span class="eq-vacio">?</span>'}<span><b>${esc(it.nombre)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></button>`;
    hoja(`<h3>${esc(opts.titulo)}</h3>${items.length > 7 ? '<input type="text" class="eq-buscar" placeholder="Buscar por nombre..." autocomplete="off">' : ''}<div class="eq-lista"></div>`, (h, cerrar) => {
      const lista = h.querySelector('.eq-lista');
      const pintar = () => {
        const q = h.querySelector('.eq-buscar') ? norm(h.querySelector('.eq-buscar').value.trim()) : '';
        lista.innerHTML = items.filter(it => !q || it.id === '' || norm(it.nombre).includes(q)).map(fila).join('') || '<p>Nadie coincide con la búsqueda.</p>';
        lista.querySelectorAll('.eq-op').forEach(b => b.onclick = () => { cerrar(); opts.alElegir(b.dataset.id); });
      };
      const inp = h.querySelector('.eq-buscar');
      if(inp) inp.oninput = pintar;
      pintar();
    });
  }

  // ---------- Cumplimiento de protocolos ----------
  const entrevistaHecha = (a) => !!(a.entrevista_fecha || a.entrevista_audio_url || a.entrevista_excepcion);
  function evaluar(a){
    const rutina = !!a.rutinaFecha && !estaVencida(a.rutinaFecha, 30);
    const medicion = !!a.medicionFecha && !estaVencida(a.medicionFecha, 60);
    const entrevista = entrevistaHecha(a);
    return { rutina, medicion, entrevista };
  }
  function resumen(alumnos){
    const n = alumnos.length;
    const ev = alumnos.map(a => ({ a, e: evaluar(a) }));
    const r = ev.filter(x => x.e.rutina).length, m = ev.filter(x => x.e.medicion).length, en = ev.filter(x => x.e.entrevista).length;
    const pct = n ? Math.round((r + m + en) / (n * 3) * 100) : null;
    return { n, r, m, en, pct, ev };
  }
  const claseDe = (p) => p == null ? 'nada' : p >= 80 ? 'ok' : p >= 50 ? 'mid' : 'low';
  async function cargarCumplimiento(profId){
    const { data: al } = await sb.from('profiles').select('*').eq('role', 'alumno').eq('profesor_id', profId).order('nombre');
    const alumnos = al || [];
    if(!alumnos.length) return [];
    const ids = alumnos.map(a => a.id);
    const [rr, mm] = await Promise.all([
      sb.from('rutinas').select('alumno_id,fecha').eq('activa', true).in('alumno_id', ids),
      sb.from('mediciones').select('alumno_id,fecha,tipo').in('alumno_id', ids).order('fecha', { ascending:false })
    ]);
    const rut = {}; (rr.data || []).forEach(x => { rut[x.alumno_id] = x.fecha; });
    const med = {}; (mm.data || []).forEach(x => { if(!med[x.alumno_id]) med[x.alumno_id] = x.fecha; });
    return alumnos.map(a => ({ ...a, rutinaFecha: rut[a.id] || null, medicionFecha: med[a.id] || null }));
  }
  function tarjetaCumplimiento(alumnos){
    const R = resumen(alumnos);
    if(!R.n) return `<div class="card eq-prot"><div class="eq-kick">TUS PROTOCOLOS</div><h2>Cumplimiento</h2><p class="eq-mini" style="font-size:13px">Aún no tienes alumnos asignados.</p></div>`;
    const don = (t, v) => { const p = Math.round(v / R.n * 100); return `<div class="eq-don"><div class="eq-ring ${claseDe(p)}" style="--p:${p}"><b>${p}%</b></div><span>${t}<small>${v} de ${R.n}</small></span></div>`; };
    const pend = R.ev.filter(x => !(x.e.rutina && x.e.medicion && x.e.entrevista));
    return `<div class="card eq-prot">
      <div class="eq-prot-top"><div><div class="eq-kick">TUS PROTOCOLOS</div><h2>Cumplimiento</h2></div><div class="eq-ring ${claseDe(R.pct)}" style="--p:${R.pct}"><b>${R.pct}%</b></div></div>
      <div class="eq-dons">${don('Rutina al día', R.r)}${don('Medición al día', R.m)}${don('Entrevista inicial', R.en)}</div>
      <div class="eq-apilada" title="Alumnos al día en todo vs con pendientes"><i class="a" style="width:${R.n - pend.length ? Math.round((R.n - pend.length) / R.n * 100) : 0}%"></i><i class="b" style="width:${Math.round(pend.length / R.n * 100)}%"></i></div>
      <div class="eq-leyenda"><span><b>${R.n - pend.length}</b> alumno${R.n - pend.length === 1 ? '' : 's'} al día en todo</span><span><b>${pend.length}</b> con pendientes</span></div>
      ${pend.length ? `<button type="button" class="eq-pend-t" aria-expanded="false"><span>Pendientes (${pend.length})</span><span class="eq-fl">▾</span></button>
        <div class="eq-pend" hidden>${pend.map(x => `<button type="button" class="eq-pa" data-id="${esc(x.a.id)}">${avatar(x.a, 'avatar-chat')}<span><b>${esc(x.a.nombre)}</b><span class="eq-chips">${!x.e.rutina ? `<em>${x.a.rutinaFecha ? 'Rutina vencida' : 'Sin rutina'}</em>` : ''}${!x.e.medicion ? `<em>${x.a.medicionFecha ? 'Medición vencida' : 'Sin medición'}</em>` : ''}${!x.e.entrevista ? '<em>Sin entrevista</em>' : ''}</span></span></button>`).join('')}</div>`
        : '<p class="eq-todo">✓ Todos tus alumnos están al día</p>'}
    </div>`;
  }
  function montarTarjeta(card){
    const t = card.querySelector('.eq-pend-t'), l = card.querySelector('.eq-pend');
    if(t && l) t.onclick = () => { l.hidden = !l.hidden; t.setAttribute('aria-expanded', l.hidden ? 'false' : 'true'); t.querySelector('.eq-fl').textContent = l.hidden ? '▾' : '▴'; };
    card.querySelectorAll('.eq-pa').forEach(b => b.onclick = () => window.renderCoachAlumnoDetail(b.dataset.id));
  }
  let _delOk = null;
  async function eliminarDisponible(){
    if(_delOk !== null) return _delOk;
    try{
      const { error } = await sb.rpc('eliminar_profesor', { target_id: '00000000-0000-0000-0000-000000000000' });
      _delOk = !(error && (error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message || '')));
    }catch(_e){ _delOk = false; }
    return _delOk;
  }

  // ---------- 1) Asignar profesor a un alumno (lista de alumnos del administrador) ----------
  // Se engancha mirando la pantalla (no depende del momento en que carga este archivo).
  let profesCache = null;
  async function cargarProfes(){
    if(profesCache) return profesCache;
    try{
      const { data } = await sb.from('profiles').select('id,nombre,avatar_key,foto_perfil_url').eq('role', 'profesor').order('nombre');
      profesCache = data || [];
    }catch(_e){ profesCache = []; }
    return profesCache;
  }
  async function mejorarAsignar(){
    const sels = [...document.querySelectorAll('#coach-alumnos-list .select-asignar-profesor:not([data-eq])')];
    if(!sels.length) return;
    sels.forEach(s => s.dataset.eq = '1');
    const profesores = await cargarProfes();
    sels.forEach(sel => {
      if(!sel.isConnected) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ap-btn';
      const pintar = () => {
        const p = profesores.find(x => x.id === sel.value);
        const nombreSel = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : 'Sin asignar';
        btn.innerHTML = `${p ? avatar(p, 'avatar-chat') : '<span class="eq-vacio">?</span>'}<span class="ap-n">${esc(p ? p.nombre : (sel.value ? nombreSel : 'Sin asignar'))}</span><span aria-hidden="true">▾</span>`;
      };
      sel.style.display = 'none';
      sel.insertAdjacentElement('afterend', btn);
      pintar();
      btn.onclick = (e) => {
        e.stopPropagation();
        const fila = sel.closest('.coach-list-item');
        const alumnoNombre = (fila && fila.querySelector('.coach-name') || {}).textContent || 'el alumno';
        elegir({
          titulo: 'Profesor de ' + alumnoNombre,
          actual: sel.value,
          items: [{ id:'', nombre:'Sin asignar', sub:'El alumno queda sin profesor' }].concat(profesores.map(p => ({ id:p.id, nombre:p.nombre, persona:p }))),
          alElegir: (id) => { if(id === sel.value) return; sel.value = id; pintar(); sel.dispatchEvent(new Event('change')); }
        });
      };
    });
  }
  let _pend = false;
  new MutationObserver(() => {
    if(_pend) return;
    _pend = true;
    requestAnimationFrame(() => { _pend = false; mejorarAsignar(); });
  }).observe(document.body, { childList:true, subtree:true });
  mejorarAsignar();

  // ---------- 2) Gestión de profesores: foto, cambiar nombre, eliminar ----------
  const origGestion = window.renderGestionProfesores;
  if(typeof origGestion === 'function' && !origGestion.__eq){
    const nueva = function(holderId, profesores, alumnos, onCambio){
      const r = origGestion.apply(this, arguments);
      try{
        const holder = document.getElementById(holderId);
        if(!holder) return r;
        holder.querySelectorAll('.btn-copiar-link').forEach(copiar => {
          const p = (profesores || []).find(x => x.id === copiar.dataset.id);
          const row = copiar.closest('.coach-list-item');
          if(!p || !row || row.dataset.eq) return;
          row.dataset.eq = '1';
          row.insertAdjacentHTML('afterbegin', `<span class="coach-list-avatar" style="cursor:default">${avatar(p, 'avatar-list')}</span>`);
          const acc = document.createElement('div');
          acc.className = 'eq-acciones';
          copiar.insertAdjacentElement('beforebegin', acc);
          acc.appendChild(copiar);
          const bNombre = document.createElement('button');
          bNombre.type = 'button'; bNombre.className = 'btn-sm';
          bNombre.innerHTML = `${typeof ICONS !== 'undefined' && ICONS.edit ? ICONS.edit : ''} Cambiar nombre`;
          const bBorrar = document.createElement('button');
          bBorrar.type = 'button'; bBorrar.className = 'btn-sm';
          bBorrar.textContent = 'Eliminar profesor';
          acc.appendChild(bNombre); acc.appendChild(bBorrar);
          bBorrar.hidden = true;
          eliminarDisponible().then(ok => { if(ok) bBorrar.hidden = false; });
          const suyosR = resumen((alumnos || []).filter(a => a.profesor_id === p.id));
          const meta = row.querySelector('.coach-meta');
          if(meta && suyosR.n){
            meta.insertAdjacentHTML('afterend', `<div class="eq-mini">Rutinas <b>${suyosR.r}/${suyosR.n}</b> · Medic. <b>${suyosR.m}/${suyosR.n}</b> · Entrev. <b>${suyosR.en}/${suyosR.n}</b> · <b class="${claseDe(suyosR.pct)}">${suyosR.pct}%</b></div>`);
          }

          bNombre.onclick = () => {
            const texto = row.querySelector('div[style*="flex:1"]');
            if(!texto) return;
            texto.innerHTML = `<input type="text" class="eq-in" maxlength="60" value="${esc(p.nombre)}"><div class="eq-fila"><button type="button" class="btn-sm" data-g>Guardar</button><button type="button" class="btn-sm" data-c>Cancelar</button></div>`;
            const inp = texto.querySelector('input');
            inp.focus(); inp.select();
            const volver = () => window.renderGestionProfesores(holderId, profesores, alumnos, onCambio);
            const guardar = async () => {
              const nuevo = inp.value.trim();
              if(!nuevo){ toast('El nombre no puede quedar vacío'); return; }
              if(nuevo === p.nombre){ volver(); return; }
              const g = texto.querySelector('[data-g]'); g.disabled = true; g.textContent = 'Guardando...';
              const { error } = await sb.from('profiles').update({ nombre: nuevo }).eq('id', p.id);
              if(error){ toast('No se pudo cambiar el nombre: ' + error.message); g.disabled = false; g.textContent = 'Guardar'; return; }
              p.nombre = nuevo;
              toast('Nombre actualizado');
              volver();
            };
            texto.querySelector('[data-g]').onclick = guardar;
            texto.querySelector('[data-c]').onclick = volver;
            inp.onkeydown = (e) => { if(e.key === 'Enter') guardar(); if(e.key === 'Escape') volver(); };
          };

          bBorrar.onclick = () => {
            const suyos = (alumnos || []).filter(a => a.profesor_id === p.id).length;
            hoja(`<h3>¿Eliminar a ${esc(p.nombre)}?</h3>
              <div class="eq-prev">${avatar(p, 'avatar-chat')}<span>${esc(p.nombre)}</span></div>
              <p>Se elimina su cuenta por completo y <b>no se puede deshacer</b>. ${suyos ? `Sus <b>${suyos} alumno${suyos === 1 ? '' : 's'}</b> quedará${suyos === 1 ? '' : 'n'} sin profesor asignado (hay que reasignarlos). ` : 'No tiene alumnos asignados. '}También se borran sus mensajes, sus plantillas de rutina y los comentarios que dejó en sesiones. Las rutinas que creó para alumnos se conservan.</p>
              <p style="color:#AEAEAE;font-size:13px">Si solo quieres que deje de ser profesor pero conserve su cuenta, usa Perfiles y cámbiale el perfil.</p>
              <div class="eq-btns"><button type="button" class="btn-sm" data-no>Cancelar</button><button type="button" class="btn-sm eq-peligro" data-si>Sí, eliminar</button></div>`, (h, cerrar) => {
              h.querySelector('[data-no]').onclick = cerrar;
              const si = h.querySelector('[data-si]');
              si.onclick = async () => {
                si.disabled = true; si.textContent = 'Eliminando...';
                const { error } = await sb.rpc('eliminar_profesor', { target_id: p.id });
                if(error){ toast('No se pudo eliminar: ' + error.message); si.disabled = false; si.textContent = 'Sí, eliminar'; return; }
                cerrar();
                toast('Cuenta de ' + p.nombre + ' eliminada');
                if(onCambio) onCambio();
              };
            });
          };
        });

        // vista previa con foto al elegir quién pasa a ser profesor
        const sel = holder.querySelector('#select-nuevo-profesor');
        if(sel && !sel.dataset.eq){
          sel.dataset.eq = '1';
          const prev = document.createElement('div');
          prev.className = 'eq-prev';
          sel.insertAdjacentElement('afterend', prev);
          sel.onchange = () => {
            const a = (alumnos || []).find(x => x.id === sel.value);
            prev.innerHTML = a ? `${avatar(a, 'avatar-chat')}<span>${esc(a.nombre)}</span>` : '';
          };
        }
      }catch(_e){}
      return r;
    };
    nueva.__eq = true;
    window.renderGestionProfesores = nueva;
  }

  // ---------- 3) Ficha del alumno: foto junto al nombre ----------
  const origDetalle = window.renderCoachAlumnoDetail;
  if(typeof origDetalle === 'function' && !origDetalle.__eq){
    const nueva = async function(alumnoId){
      const r = await origDetalle.apply(this, arguments);
      try{
        const span = document.getElementById('alumno-nombre-texto');
        if(span && span.parentElement && !span.parentElement.querySelector('.profile-avatar')){
          const { data } = await sb.from('profiles').select('nombre,avatar_key,foto_perfil_url').eq('id', alumnoId).maybeSingle();
          const again = document.getElementById('alumno-nombre-texto');
          if(data && again && again.parentElement && !again.parentElement.querySelector('.profile-avatar')) again.parentElement.insertAdjacentHTML('afterbegin', avatar(data, 'avatar-list'));
        }
      }catch(_e){}
      return r;
    };
    nueva.__eq = true;
    window.renderCoachAlumnoDetail = nueva;
  }

  // ---------- 4) Cambiar el propio nombre (profesores y demás equipo) ----------
  const origPerfil = window.renderMiPerfil;
  if(typeof origPerfil === 'function' && !origPerfil.__eq){
    const nueva = async function(){
      const r = await origPerfil.apply(this, arguments);
      try{
        if(!profile || profile.role === 'alumno' || document.getElementById('eq-mi-nombre')) return r;
        const ancla = document.querySelector('.profile-identity-card');
        if(!ancla) return r;
        if(profile.role === 'profesor'){
          const marca = document.createElement('div');
          marca.id = 'eq-prot-holder';
          marca.innerHTML = '<div class="card eq-prot"><div class="eq-kick">TUS PROTOCOLOS</div><h2>Cumplimiento</h2><p class="eq-mini" style="font-size:13px">Calculando...</p></div>';
          const hero = document.querySelector('.profile-editor-hero');
          (hero || ancla).insertAdjacentElement('beforebegin', marca);
          cargarCumplimiento(profile.id).then(als => {
            if(!marca.isConnected) return;
            marca.innerHTML = tarjetaCumplimiento(als);
            montarTarjeta(marca);
          }).catch(() => { if(marca.isConnected) marca.innerHTML = ''; });
        }
        const card = document.createElement('div');
        card.className = 'card eq-nombre-card';
        card.innerHTML = `<label for="eq-mi-nombre">Tu nombre</label>
          <input type="text" id="eq-mi-nombre" maxlength="60" value="${esc(profile.nombre)}" autocomplete="name">
          <div class="profile-upload-note">Así te ven tus alumnos y tu equipo en toda la app.</div>
          <button type="button" class="btn" id="eq-guardar-nombre">Guardar nombre</button>`;
        ancla.insertAdjacentElement('beforebegin', card);
        const inp = card.querySelector('#eq-mi-nombre');
        const btn = card.querySelector('#eq-guardar-nombre');
        const guardar = async () => {
          const nuevo = inp.value.trim();
          if(!nuevo){ toast('El nombre no puede quedar vacío'); return; }
          if(nuevo === profile.nombre){ toast('Ese ya es tu nombre'); return; }
          btn.disabled = true; btn.textContent = 'Guardando...';
          const { error } = await sb.from('profiles').update({ nombre: nuevo }).eq('id', profile.id);
          if(error){ toast('No se pudo cambiar el nombre: ' + error.message); btn.disabled = false; btn.textContent = 'Guardar nombre'; return; }
          await loadProfile();
          toast('Nombre actualizado ✓');
          window.renderMiPerfil();
        };
        btn.onclick = guardar;
        inp.onkeydown = (e) => { if(e.key === 'Enter') guardar(); };
      }catch(_e){}
      return r;
    };
    nueva.__eq = true;
    window.renderMiPerfil = nueva;
  }

  window.UCEquipo = { elegir };
})();
