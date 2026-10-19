// STC App — Buzón de sugerencias.
// 1) En el perfil del alumno, "¿Tienes una sugerencia sobre el servicio? Escríbenos" se ve como una franja
//    con ícono (más visible que un enlace, más discreta que los ítems del perfil).
// 2) En el buzón (inicio de gestión), el administrador y el JSO pueden borrar mensajes.
//    La base de datos solo deja borrar a esos dos perfiles (sql/16_buzon_borrar.sql).
// Reemplaza renderBuzonOpiniones de app.js sin modificar app.js. Se carga después de alumnos-pc.js.
(function(){
  'use strict';
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
  const toast = (m) => { try{ showToast(m); }catch(_e){} };
  const puedeBorrar = () => !!profile && ['super_admin', 'jso'].includes(profile.role);

  const css = document.createElement('style');
  css.textContent = `
  .opinar-link.opinar-link{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;margin:4px 0 18px;padding:10px 14px;border:1px dashed rgba(255,255,102,.45);border-radius:14px;background:rgba(255,255,102,.05);color:#EDEDED;font:600 13px Inter,sans-serif;text-decoration:none;text-align:left;line-height:1.35}
  .opinar-link.opinar-link::before{content:"";flex:none;width:30px;height:30px;border-radius:9px;background:rgba(255,255,0,.14) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFFF66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z'/%3E%3C/svg%3E") center/16px no-repeat}
  .opinar-link.opinar-link::after{content:"›";margin-left:auto;color:#FFFF66;font-size:20px;line-height:1}
  @media (hover:hover){.opinar-link.opinar-link:hover{border-color:rgba(255,255,102,.75);background:rgba(255,255,102,.09)}}
  .opinar-link.opinar-link:focus-visible{outline:2px solid #FFFF66;outline-offset:2px}
  .bz-acc{display:flex;justify-content:flex-end;margin-top:10px}
  .bz-borrar{padding:6px 12px;border-radius:9px;border:1px solid rgba(255,107,114,.45);background:transparent;color:#FF8A8E;font:600 12px Inter,sans-serif;cursor:pointer}
  .bz-borrar.confirmar{background:#C8414A;border-color:#C8414A;color:#fff}
  .bz-borrar:disabled{opacity:.6;cursor:default}
  `;
  document.head.appendChild(css);

  // Misma lista que app.js, más el botón "Borrar" (con doble toque para confirmar)
  async function renderBuzonOpiniones(holderId){
    const holder = document.getElementById(holderId);
    if(!holder) return;
    holder.innerHTML = `<div class="loading">Cargando...</div>`;
    const { data: opiniones, error } = await sb.from('opiniones').select('*, profiles(nombre)').order('created_at', { ascending: false });
    if(error){ holder.innerHTML = `<div class="error-banner">No se pudo cargar el buzón.</div>`; return; }
    const borrar = puedeBorrar();
    holder.innerHTML = (opiniones && opiniones.length)
      ? opiniones.map(o => `
        <div class="session-card" data-op="${esc(o.id)}">
          <div class="session-head"><span>${esc(o.profiles ? o.profiles.nombre : 'Alumno')}</span><span>${esc(formatDateShort(String(o.created_at).slice(0, 10)))}</span></div>
          <div class="session-body"><div class="sub" style="margin-bottom:0;">${esc(o.mensaje)}</div>
            ${borrar ? `<div class="bz-acc"><button type="button" class="bz-borrar" data-borrar="${esc(o.id)}">Borrar</button></div>` : ''}
          </div>
        </div>
      `).join('')
      : `<div class="empty">Todavía no hay mensajes en el buzón.</div>`;
    holder.querySelectorAll('[data-borrar]').forEach(b => {
      let t = null;
      b.onclick = async () => {
        if(!b.classList.contains('confirmar')){
          b.classList.add('confirmar'); b.textContent = '¿Borrar? Toca de nuevo';
          t = setTimeout(() => { b.classList.remove('confirmar'); b.textContent = 'Borrar'; }, 4000);
          return;
        }
        clearTimeout(t); b.disabled = true; b.textContent = 'Borrando...';
        const { error: e2, count } = await sb.from('opiniones').delete({ count: 'exact' }).eq('id', b.dataset.borrar);
        if(e2 || !count){
          toast('No se pudo borrar' + (e2 ? ': ' + e2.message : '. Revisa tus permisos.'));
          b.disabled = false; b.classList.remove('confirmar'); b.textContent = 'Borrar';
          return;
        }
        const card = b.closest('[data-op]'); if(card) card.remove();
        if(!holder.querySelector('[data-op]')) holder.innerHTML = `<div class="empty">Todavía no hay mensajes en el buzón.</div>`;
        toast('Mensaje borrado');
      };
    });
  }
  if(typeof window.renderBuzonOpiniones === 'function' && !window.renderBuzonOpiniones.__bz){
    renderBuzonOpiniones.__bz = true;
    window.renderBuzonOpiniones = renderBuzonOpiniones;
  }
})();
