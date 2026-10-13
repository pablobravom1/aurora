// STC App — Guía de la Entrevista inicial (solo para el equipo: profesores, RS, LOC y administradores).
// Agrega un botón "Ver guía de preguntas" dentro del ítem "Entrevista inicial". Al tocarlo se abre la guía
// a pantalla completa; si se está grabando, la grabación sigue corriendo detrás. El alumno NO ve esta guía.
// Se carga DESPUÉS de app.js y se engancha a renderEntrevista sin modificarla.
(function(){
  'use strict';

  const PREGUNTAS = [
    { n:1, ico:'🎯', t:'¿Qué objetivo específico te gustaría lograr con tu entrenamiento?', s:'Nos ayudará a planificar tu entrenamiento ideal.' },
    { n:2, ico:'🏋️', t:'¿Tienes experiencia entrenando antes?', s:'Cuéntanos brevemente tu experiencia.' },
    { n:3, ico:'💬', t:'Si entrenaste antes, ¿qué te gustó y qué no te gustó de esa experiencia?', s:'Queremos aprender de tu experiencia anterior.' },
    { n:4, ico:'❤️', t:'¿Tienes alguna lesión o condición que deba considerar?', s:'Es importante para tu seguridad y resultados.' },
    { n:5, ico:'📈', t:'En una escala del 1 al 10, ¿cuánto te gustaría que te exija?', s:'1 = poca exigencia / 10 = máxima exigencia' },
    { n:6, ico:'👤', t:'¿Qué cosas no te gustaría que yo haga siendo tu coach?, ¿qué encuentras tú que afectarían tu estancia en STC?', s:'Tu opinión nos ayuda a darte la mejor experiencia posible.' }
  ];
  const FINAL = [
    { n:7, ico:'🧾', t:'Antes de cerrar, ¿te explicaron cómo funciona el sistema de pagos?', s:'Por ejemplo, que en el caso del PAT los cobros son automáticos mes a mes y que, si quisieras dar de baja el plan, debes avisar con 30 días de anticipación para evitar el cobro del siguiente mes.', chip:'¿Te quedó claro ese funcionamiento?' },
    { n:8, ico:'🍎', t:'¿Te interesa obtener ahora una sesión nutricional para complementar tu objetivo?', s:'Si tu respuesta es sí, la agendamos en el momento.' }
  ];
  const PASOS = [
    { ico:'🎙️', t:'1. GRABA', d:'Graba la entrevista en audio (o video llamada).' },
    { ico:'📁', t:'2. NOMBRA Y SUBE', d:'Sube el archivo a tu carpeta en Drive con el siguiente nombre:', k:'Entrevista-NombreApellido-Fecha' },
    { ico:'💬', t:'3. ENVÍA A PROTOCOLOS', d:'Envía la información al equipo de Protocolos por WhatsApp oficial para que se registre y haga seguimiento.' },
    { ico:'📊', t:'4. REGISTRA EN EXCEL', d:'Completa la anamnesis en el Excel del microciclo. Este será la base para tu planificación.' }
  ];

  const css = document.createElement('style');
  css.textContent = `
  .gu-btn{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;margin:0 0 12px;padding:13px 14px;border-radius:14px;border:1px solid rgba(247,197,30,.55);background:rgba(247,197,30,.10);color:#F7C51E;text-align:left;cursor:pointer;font:inherit}
  .gu-btn:hover{background:rgba(247,197,30,.16)}
  .gu-btn .gu-ico{flex-shrink:0;width:38px;height:38px;border-radius:11px;background:#F7C51E;color:#111;display:grid;place-items:center;font-size:19px}
  .gu-btn b{display:block;font:600 14.5px 'Inter',sans-serif;color:#FBFBFB}
  .gu-btn small{display:block;margin-top:2px;font:400 12px 'Inter',sans-serif;color:#AEAEAE}
  .gu-ov{position:fixed;inset:0;z-index:9999;background:#0b0b0b;display:flex;flex-direction:column}
  .gu-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 14px 10px;background:#111;border-bottom:1px solid #2a2a2a}
  .gu-bar b{font:600 15px 'Inter',sans-serif;color:#FBFBFB}
  .gu-bar button{border:0;border-radius:10px;background:#F7C51E;color:#111;font:700 13px 'Inter',sans-serif;padding:9px 14px;cursor:pointer}
  .gu-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 12px 28px}
  .gu-doc{max-width:560px;margin:0 auto;font-family:'Inter',sans-serif;color:#111}
  .gu-head{background:#0d0d0d;border-radius:18px;padding:18px 16px 14px;text-align:center;border:1px solid #2a2a2a}
  .gu-logo{display:inline-flex;flex-direction:column;align-items:center;line-height:1}
  .gu-logo i{font:italic 800 34px 'Oswald',Impact,sans-serif;color:#F7C51E;letter-spacing:.02em}
  .gu-logo small{font:600 8.5px 'Inter',sans-serif;letter-spacing:.14em;color:#FBFBFB;margin-top:3px}
  .gu-head h2{margin:12px 0 0;font:700 25px/1.05 'Oswald',Impact,sans-serif;color:#FBFBFB;letter-spacing:.02em;text-transform:uppercase}
  .gu-head h2 span{color:#F7C51E;display:block}
  .gu-lema{margin-top:10px;font:600 10.5px 'Inter',sans-serif;letter-spacing:.1em;color:#FBFBFB;text-transform:uppercase}
  .gu-lema em{font-style:normal;color:#F7C51E;margin:0 4px}
  .gu-banner{margin:10px 0;background:#F7C51E;border-radius:14px;padding:11px 14px;font:600 13px/1.35 'Inter',sans-serif;color:#111}
  .gu-p{display:flex;gap:11px;align-items:flex-start;background:#fff;border-radius:16px;padding:12px;margin-bottom:9px}
  .gu-n{flex-shrink:0;width:36px;height:42px;border-radius:9px;background:#F7C51E;color:#111;display:grid;place-items:center;font:700 24px 'Oswald',Impact,sans-serif}
  .gu-i{flex-shrink:0;width:42px;height:42px;border-radius:50%;background:#111;display:grid;place-items:center;font-size:20px}
  .gu-p b{display:block;font:700 14.5px/1.25 'Inter',sans-serif;color:#111}
  .gu-p small{display:block;margin-top:4px;font:400 12.2px/1.35 'Inter',sans-serif;color:#444}
  .gu-chip{display:inline-block;margin-top:8px;background:#F7C51E;border-radius:10px;padding:6px 10px;font:700 12px 'Inter',sans-serif;color:#111}
  .gu-final{margin:14px 0 10px;text-align:center;font:700 12px 'Inter',sans-serif;letter-spacing:.12em;color:#111}
  .gu-final span{display:inline-block;background:#F7C51E;border-radius:10px;padding:6px 18px}
  .gu-alm{margin-top:14px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:18px;padding:14px 12px}
  .gu-alm h3{margin:0 0 12px;text-align:center;font:700 14px 'Inter',sans-serif;letter-spacing:.06em;color:#F7C51E;text-transform:uppercase}
  .gu-pasos{display:grid;grid-template-columns:1fr 1fr;gap:12px 10px}
  .gu-paso{text-align:center;color:#FBFBFB}
  .gu-paso .gu-pi{width:46px;height:46px;border-radius:50%;background:#1b1b1b;border:1px solid #333;display:grid;place-items:center;font-size:22px;margin:0 auto 6px}
  .gu-paso b{display:block;font:700 11.5px 'Inter',sans-serif;color:#F7C51E;letter-spacing:.04em}
  .gu-paso small{display:block;margin-top:3px;font:400 11px/1.35 'Inter',sans-serif;color:#cfcfcf}
  .gu-paso code{display:block;margin-top:4px;font:700 11px 'Inter',sans-serif;color:#F7C51E;word-break:break-word}
  .gu-ej{margin-top:12px;text-align:center;font:400 11px/1.4 'Inter',sans-serif;color:#cfcfcf;border:1px dashed #6b5a14;border-radius:10px;padding:7px}
  .gu-ej b{color:#F7C51E}
  .gu-rec{margin-top:12px;background:#F7C51E;border-radius:14px;padding:11px 13px;font:600 12px/1.4 'Inter',sans-serif;color:#111;display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap}
  .gu-rec span:last-child{font-weight:700}
  @media (min-width:900px){
  .gu-bar{padding:12px 28px}
  .gu-scroll{padding:24px 32px 40px}
  .gu-doc{max-width:1080px}
  .gu-head{padding:26px 24px 20px}
  .gu-logo i{font-size:50px}
  .gu-logo small{font-size:11px}
  .gu-head h2{font-size:44px}
  .gu-lema{font-size:13px;margin-top:14px}
  .gu-banner{font-size:15px;padding:14px 18px;text-align:center;margin:14px 0}
  .gu-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0}
  .gu-grid .gu-p{margin-bottom:0}
  .gu-p b{font-size:16.5px}
  .gu-p small{font-size:13.5px}
  .gu-final{margin:24px 0 14px;font-size:14px}
  .gu-alm{padding:22px 20px;margin-top:20px}
  .gu-alm h3{font-size:16px}
  .gu-pasos{grid-template-columns:repeat(4,1fr);gap:18px}
  .gu-paso b{font-size:13px}
  .gu-paso small{font-size:12.5px}
  .gu-paso code{font-size:12px}
  .gu-ej{font-size:12.5px}
  .gu-rec{font-size:14px;padding:14px 18px;margin-top:16px}
  .gu-btn{max-width:560px}
  }
  `;
  document.head.appendChild(css);

  const fila = (p) => `<div class="gu-p"><div class="gu-n">${p.n}</div><div class="gu-i" aria-hidden="true">${p.ico}</div><div><b>${p.t}</b><small>${p.s}</small>${p.chip ? `<span class="gu-chip">${p.chip}</span>` : ''}</div></div>`;

  function guiaHtml(){
    return `<div class="gu-doc">
      <div class="gu-head">
        <div class="gu-logo"><i>STC</i><small>SMART TRAINING CENTER</small></div>
        <h2>Entrevista inicial<span>de clientes</span></h2>
        <div class="gu-lema">Conoce<em>•</em>Comprende<em>•</em>Personaliza<em>•</em>Retén</div>
      </div>
      <div class="gu-banner">Conversa abierta, cercana y profesional para conocer al cliente y entregarle la mejor experiencia.</div>
      <div class="gu-grid">${PREGUNTAS.map(fila).join('')}</div>
      <div class="gu-final"><span>BLOQUE FINAL</span></div>
      <div class="gu-grid">${FINAL.map(fila).join('')}</div>
      <div class="gu-alm">
        <h3>¿Cómo se almacena?</h3>
        <div class="gu-pasos">${PASOS.map(p => `<div class="gu-paso"><div class="gu-pi" aria-hidden="true">${p.ico}</div><b>${p.t}</b><small>${p.d}</small>${p.k ? `<code>${p.k}</code>` : ''}</div>`).join('')}</div>
        <div class="gu-ej">Ejemplo de nombre de archivo: <b>Entrevista-Sebastian-Castro-17-09-2025.mp3</b></div>
      </div>
      <div class="gu-rec"><span>💡 RECUERDA: Esta entrevista es clave para conocer, conectar y retener a nuestros clientes.</span><span>Escucha, entiende y guía el cambio.</span></div>
    </div>`;
  }

  function cerrar(){
    const ov = document.getElementById('gu-ov'); if(!ov) return;
    ov.remove(); document.body.style.overflow = ov.dataset.prevOverflow || '';
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e){ if(e.key === 'Escape') cerrar(); }

  function abrir(){
    if(document.getElementById('gu-ov')) return;
    const ov = document.createElement('div');
    ov.id = 'gu-ov'; ov.className = 'gu-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Guía de la entrevista inicial');
    ov.dataset.prevOverflow = document.body.style.overflow || '';
    ov.innerHTML = `<div class="gu-bar"><b>Guía de la entrevista</b><button type="button" id="gu-cerrar">Cerrar</button></div><div class="gu-scroll">${guiaHtml()}</div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    document.getElementById('gu-cerrar').onclick = cerrar;
    document.addEventListener('keydown', onKey);
  }

  const esEquipo = () => !!profile && profile.role !== 'alumno';

  function insertarBoton(holderId, grabando){
    if(!esEquipo()) return;
    const holder = document.getElementById(holderId);
    if(!holder || holder.querySelector('.gu-btn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gu-btn';
    b.innerHTML = `<span class="gu-ico" aria-hidden="true">📋</span><span><b>Ver guía de preguntas</b><small>${grabando ? '8 preguntas para tener a la vista mientras grabas' : '8 preguntas de la entrevista inicial'}</small></span>`;
    b.onclick = abrir;
    holder.insertBefore(b, holder.firstChild);
  }

  const orig = window.renderEntrevista;
  if(typeof orig === 'function' && !orig.__gu){
    const nueva = async function(holderId, alumnoId, audioUrl, fecha, soloLectura, duracionSeg, excepcion){
      const r = await orig.apply(this, arguments);
      try{ insertarBoton(holderId, !soloLectura && !audioUrl && !excepcion); }catch(_e){}
      return r;
    };
    nueva.__gu = true;
    window.renderEntrevista = nueva;
  }
  window.UCGuias = { abrirEntrevista: abrir };
})();
