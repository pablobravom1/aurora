// STC App — "¿Olvidaste tu contraseña?": antes de abrir WhatsApp pide nombre y correo,
// para que el mensaje que recibe el administrador traiga los dos y pueda ubicar al alumno.
// Reemplaza el comportamiento del botón #auth-olvide de app.js sin modificar app.js.
(function(){
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
  .rc-ov{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;padding-left:max(20px, env(safe-area-inset-left, 0px));padding-right:max(20px, env(safe-area-inset-right, 0px));background:rgba(10,10,10,.78);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
  .rc-hoja{width:min(380px,100%);padding:20px 18px 16px;border-radius:18px;border:1px solid rgba(255,255,102,.25);background:linear-gradient(160deg,#252525,#1A1A1A);box-shadow:0 20px 50px rgba(0,0,0,.5);color:#F5F5F5;font-family:Inter,sans-serif}
  .rc-hoja h3{margin:0 0 4px;font:600 20px Oswald,sans-serif;letter-spacing:.02em}
  .rc-hoja p{margin:0 0 12px;font-size:13px;color:#A8A8A8;line-height:1.45}
  .rc-hoja label{display:block;margin:10px 0 5px;font:600 10.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#A8A8A8;text-transform:uppercase}
  .rc-hoja input{width:100%;box-sizing:border-box;margin:0}
  .rc-err{min-height:18px;margin:8px 0 0;font-size:12.5px;color:#FF8A8E}
  .rc-btns{display:flex;gap:8px;margin-top:12px}
  .rc-btns button{flex:1;padding:12px;border-radius:12px;font:700 13.5px Inter,sans-serif;cursor:pointer}
  .rc-no{border:1px solid #333;background:#151515;color:#EEE}
  .rc-si{border:0;background:#25D366;color:#06301a}
  `;
  document.head.appendChild(css);

  function abrir(){
    const correo0 = ((document.getElementById('auth-email') || {}).value || '').trim();
    const ov = document.createElement('div');
    ov.className = 'rc-ov';
    ov.innerHTML = `<div class="rc-hoja" role="dialog" aria-modal="true" aria-labelledby="rc-t">
      <h3 id="rc-t">Recuperar mi clave</h3>
      <p>Escribe tu nombre y el correo con que creaste tu cuenta. Te vamos a contestar por WhatsApp con una clave temporal.</p>
      <label for="rc-nombre">Nombre y apellido</label><input type="text" id="rc-nombre" maxlength="80" autocomplete="name">
      <label for="rc-correo">Correo de tu cuenta</label><input type="email" id="rc-correo" maxlength="120" autocomplete="email" inputmode="email">
      <div class="rc-err" id="rc-err" role="alert"></div>
      <div class="rc-btns"><button type="button" class="rc-no">Cancelar</button><button type="button" class="rc-si">Enviar por WhatsApp</button></div>
    </div>`;
    document.body.appendChild(ov);
    const $ = (s) => ov.querySelector(s);
    $('#rc-correo').value = correo0;
    const cerrar = () => { ov.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if(e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla);
    ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
    $('.rc-no').onclick = cerrar;
    $('.rc-si').onclick = () => {
      const nombre = $('#rc-nombre').value.trim().replace(/\s+/g, ' ');
      const correo = $('#rc-correo').value.trim().toLowerCase();
      if(nombre.split(' ').length < 2){ $('#rc-err').textContent = 'Escribe tu nombre y apellido.'; $('#rc-nombre').focus(); return; }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){ $('#rc-err').textContent = 'Revisa el correo: debe ser como nombre@gmail.com'; $('#rc-correo').focus(); return; }
      const texto = `Hola, olvidé mi clave de STC App.\nNombre: ${nombre}\nCorreo: ${correo}`;
      const numero = typeof WHATSAPP_SOPORTE !== 'undefined' ? WHATSAPP_SOPORTE : '';
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      cerrar();
    };
    setTimeout(() => $('#rc-nombre').focus(), 50);
  }

  // Se adelanta al botón original de app.js (que solo enviaba el correo)
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('#auth-olvide');
    if(!b) return;
    e.preventDefault();
    e.stopPropagation();
    abrir();
  }, true);
})();
