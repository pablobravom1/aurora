// STC App — Lista de alumnos en computador (desde 1100px): tabla con foto/avatar, coach, última sesión,
// estado de rutina y medición, filtros rápidos y columnas ordenables. En el celular la lista sigue igual.
// Envuelve renderListaAlumnos de app.js sin modificarlo. Se carga después de ceo.js.
(function(){
  'use strict';
  const MQ = window.matchMedia('(min-width:1100px)');
  const DIA = 864e5;
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
  const IC = (n) => (typeof ICONS !== 'undefined' && ICONS[n]) ? ICONS[n] : '';
  const dias = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DIA) : null;
  const vencida = (iso, vig) => typeof estaVencida === 'function' ? estaVencida(iso, vig) : dias(iso) > vig;
  const fecha = (iso) => iso ? (typeof formatDateShort === 'function' ? formatDateShort(iso) : String(iso).slice(0, 10)) : '';
  const hace = (iso) => { const d = dias(iso); if(d == null) return 'sin sesiones'; if(d <= 0) return 'hoy'; if(d === 1) return 'ayer'; if(d < 30) return 'hace ' + d + ' días'; return fecha(iso); };

  const css = document.createElement('style');
  css.textContent = `
  #app-root #coach-alumnos-list#coach-alumnos-list:has(> .al-wrap){display:block}
  .al-wrap{min-width:0}
  .al-filtros{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
  .al-filtros button{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;border:1px solid #333;background:#141414;color:#DDD;font:600 12.5px Inter,sans-serif;cursor:pointer}
  .al-filtros button em{font-style:normal;font:700 11px 'IBM Plex Mono',monospace;color:#A8A8A8}
  .al-filtros button.on{background:#FFFF66;border-color:#FFFF66;color:#111}
  .al-filtros button.on em{color:#3a3a00}
  .al-tw{border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:linear-gradient(145deg,rgba(34,34,34,.96),rgba(22,22,22,.98))}
  .al-tb{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13.5px}
  .al-tb th{padding:11px 12px;text-align:left;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase;border-bottom:1px solid #2a2a2a;white-space:nowrap}
  .al-tb th button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
  .al-tb th button:focus-visible{outline:2px solid #FFFF66;outline-offset:2px}
  .al-tb th button i{font-style:normal;color:#FFFF66}
  .al-tb td{padding:9px 12px;border-bottom:1px solid #222;vertical-align:middle;color:#E8E8E8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .al-tb tr:last-child td{border-bottom:0}
  .al-tb tbody tr{cursor:pointer;transition:background .12s ease}
  .al-tb tbody tr:hover{background:rgba(255,255,102,.05)}
  .al-al{display:flex;align-items:center;gap:12px;min-width:0}
  .al-al .profile-avatar{flex:none}
  .al-al b{display:block;font-weight:600;color:#FBFBFB;overflow:hidden;text-overflow:ellipsis}
  .al-sub{display:block;font-size:12px;color:#8A8A8A}
  .al-pt{display:inline-block;padding:3px 10px;border-radius:99px;font:700 11.5px Inter,sans-serif;white-space:nowrap}
  .al-pt.v{color:#0d3326;background:#5EE3B6}.al-pt.r{color:#fff;background:#C8414A}.al-pt.n{color:#DDD;background:#2b2b2b}
  .al-tb select{margin:0;width:100%;max-width:100%;padding:6px 8px;font-size:12.5px;border-radius:10px}
  .al-acc{display:flex;gap:6px;justify-content:flex-end;align-items:center}
  .al-ver{color:#FFFF66;font-weight:600;white-space:nowrap}
  .al-acc .icon-action{position:relative}
  .al-pie{margin:8px 4px 0;font-size:12px;color:#8A8A8A}
  `;
  document.head.appendChild(css);

  const S = { filtro:'todos', orden:'nombre', dir:1, ultimo:null };
  const FILTROS = [
    ['todos', 'Todos', () => true],
    ['rutina', 'Rutina vencida o sin rutina', (a) => !a.rutinaFecha || vencida(a.rutinaFecha, 30)],
    ['medicion', 'Medición vencida o sin medición', (a) => !['no_aplica','no_quiso'].includes(a.medicionTipo) && (!a.medicionFecha || vencida(a.medicionFecha, 60))],
    ['inactivo', 'Sin entrenar 10+ días', (a) => { const d = dias(a.ultima); return d == null || d >= 10; }]
  ];
  const estado = (iso, vig, sinTxt, tipo) => {
    if(tipo === 'no_aplica' || tipo === 'no_quiso') return `<span class="al-pt n">${tipo === 'no_aplica' ? 'no aplica' : 'no quiso'}</span>`;
    if(!iso) return `<span class="al-pt r">${sinTxt}</span>`;
    return vencida(iso, vig) ? `<span class="al-pt r" title="${esc(fecha(iso))}">vencida · ${esc(fecha(iso))}</span>` : `<span class="al-pt v" title="${esc(fecha(iso))}">al día · ${esc(fecha(iso))}</span>`;
  };
  const claves = {
    nombre: (a) => String(a.nombre || '').toLowerCase(),
    coach: (a, np) => String(np(a.profesor_id) || 'zzz').toLowerCase(),
    ultima: (a) => a.ultima ? new Date(a.ultima).getTime() : 0,
    rutina: (a) => a.rutinaFecha ? new Date(a.rutinaFecha).getTime() : 0,
    medicion: (a) => a.medicionFecha ? new Date(a.medicionFecha).getTime() : 0
  };

  function tabla(lista, esSuperAdmin, profesores, nombreProfesor, unread){
    const listEl = document.getElementById('coach-alumnos-list');
    const f = FILTROS.find(x => x[0] === S.filtro) || FILTROS[0];
    const vis = lista.filter(f[2]).slice().sort((a, b) => { const ka = claves[S.orden](a, nombreProfesor), kb = claves[S.orden](b, nombreProfesor); return (ka > kb ? 1 : ka < kb ? -1 : 0) * S.dir; });
    const th = (k, t) => `<th scope="col"><button type="button" data-orden="${k}">${t}${S.orden === k ? `<i>${S.dir > 0 ? '▲' : '▼'}</i>` : ''}</button></th>`;
    listEl.innerHTML = `<div class="al-wrap">
      <div class="al-filtros" role="group" aria-label="Filtrar alumnos">${FILTROS.map(([k, t, fn]) => `<button type="button" data-f="${k}" class="${S.filtro === k ? 'on' : ''}">${t} <em>${lista.filter(fn).length}</em></button>`).join('')}</div>
      <div class="al-tw"><table class="al-tb">
        <colgroup><col style="width:30%"><col style="width:${esSuperAdmin ? 17 : 14}%"><col style="width:13%"><col style="width:15%"><col style="width:15%"><col style="width:${esSuperAdmin ? 10 : 13}%"></colgroup>
        <thead><tr>${th('nombre', 'Alumno')}${th('coach', 'Coach')}${th('ultima', 'Última sesión')}${th('rutina', 'Rutina')}${th('medicion', 'Medición')}<th></th></tr></thead>
        <tbody>${vis.length ? vis.map(a => `<tr data-id="${a.id}">
          <td><span class="al-al">${typeof renderProfileAvatar === 'function' ? renderProfileAvatar(a, 'avatar-list') : ''}<span style="min-width:0"><b>${esc(a.nombre)}</b></span></span></td>
          <td>${esSuperAdmin ? `<select class="al-coach" data-alumno="${a.id}" aria-label="Coach de ${esc(a.nombre)}"><option value="">Sin asignar</option>${profesores.map(p => `<option value="${p.id}" ${a.profesor_id === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>` : esc(nombreProfesor(a.profesor_id) || 'Sin asignar')}</td>
          <td>${esc(hace(a.ultima))}</td>
          <td>${estado(a.rutinaFecha, 30, 'sin rutina')}</td>
          <td>${estado(a.medicionFecha, 60, 'sin medición', a.medicionTipo)}</td>
          <td><span class="al-acc">${!esSuperAdmin && a.profesor_id === profile.id ? `<button type="button" class="icon-action teacher-student-chat-action" data-chat="${a.id}" aria-label="Conversar con ${esc(a.nombre)}">${IC('message')}${unread[a.id] ? `<span>${unread[a.id]}</span>` : ''}</button>` : ''}<span class="al-ver">Ver ›</span></span></td>
        </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:#A8A8A8;padding:22px">Ningún alumno con este filtro.</td></tr>`}</tbody>
      </table></div>
      <p class="al-pie">${vis.length} de ${lista.length} alumnos · toca los títulos para ordenar</p>
    </div>`;

    listEl.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.filtro = b.dataset.f; tabla(lista, esSuperAdmin, profesores, nombreProfesor, unread); });
    listEl.querySelectorAll('[data-orden]').forEach(b => b.onclick = () => { const k = b.dataset.orden; S.dir = S.orden === k ? -S.dir : (k === 'nombre' || k === 'coach' ? 1 : -1); S.orden = k; tabla(lista, esSuperAdmin, profesores, nombreProfesor, unread); });
    listEl.querySelectorAll('tbody tr[data-id]').forEach(tr => tr.onclick = (e) => { if(e.target.closest('select, button')) return; renderCoachAlumnoDetail(tr.dataset.id); });
    listEl.querySelectorAll('[data-chat]').forEach(b => b.onclick = (e) => { e.stopPropagation(); renderChat(b.dataset.chat, renderCoachHome); });
    listEl.querySelectorAll('.al-coach').forEach(sel => sel.onchange = async () => {
      const { error } = await sb.from('profiles').update({ profesor_id: sel.value || null }).eq('id', sel.dataset.alumno);
      if(error){ showToast('No se pudo asignar: ' + error.message); return; }
      showToast('Coach asignado');
      renderCoachHome();
    });
  }

  const orig = window.renderListaAlumnos;
  if(typeof orig === 'function' && !orig.__al){
    const nueva = function(lista, esSuperAdmin, profesores, nombreProfesor, totalSinFiltrar, query, emptyMsgHtml, unreadByStudent){
      S.ultimo = arguments;
      if(!MQ.matches || !totalSinFiltrar || !lista || !lista.length) return orig.apply(this, arguments);
      try{ tabla(lista, esSuperAdmin, profesores || [], nombreProfesor, unreadByStudent || {}); }
      catch(err){ console.warn('alumnos-pc', err); return orig.apply(this, arguments); }
    };
    nueva.__al = true;
    window.renderListaAlumnos = nueva;
    // Si la ventana cambia entre celular y computador, la lista se vuelve a dibujar en el formato que corresponde
    MQ.addEventListener('change', () => { if(S.ultimo && document.getElementById('coach-alumnos-list')) nueva.apply(null, S.ultimo); });
  }
})();
