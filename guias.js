// STC App — Preguntas de la Entrevista inicial (solo para el equipo: profesores, RS, LOC y administradores).
// Muestra las 8 preguntas DENTRO del ítem "Entrevista inicial", justo debajo del botón de grabar,
// para poder leerlas mientras se graba. El alumno NO las ve.
// Se carga DESPUÉS de app.js y se engancha a renderEntrevista sin modificarla.
(function(){
  'use strict';

  const PREGUNTAS = [
    { n:1, t:'¿Qué objetivo específico te gustaría lograr con tu entrenamiento?' },
    { n:2, t:'¿Tienes experiencia entrenando antes?' },
    { n:3, t:'Si entrenaste antes, ¿qué te gustó y qué no te gustó de esa experiencia?' },
    { n:4, t:'¿Tienes alguna lesión o condición que deba considerar?' },
    { n:5, t:'En una escala del 1 al 10, ¿cuánto te gustaría que te exija?', h:'1 = poca exigencia · 10 = máxima exigencia' },
    { n:6, t:'¿Qué cosas no te gustaría que yo haga siendo tu coach?, ¿qué encuentras tú que afectarían tu estancia en STC?' }
  ];
  const FINAL = [
    { n:7, t:'Antes de cerrar, ¿te explicaron cómo funciona el sistema de pagos?', c:'¿Te quedó claro ese funcionamiento?' },
    { n:8, t:'¿Te interesa obtener ahora una sesión nutricional para complementar tu objetivo?' }
  ];

  const css = document.createElement('style');
  css.textContent = `
  .gu-panel{margin:4px 0 14px;border:1px solid rgba(247,197,30,.45);border-radius:14px;background:rgba(247,197,30,.07);overflow:hidden}
  .gu-head{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;box-sizing:border-box;padding:11px 13px;border:0;background:transparent;color:#F7C51E;cursor:pointer;text-align:left;font:inherit}
  .gu-head b{font:700 12px 'Inter',sans-serif;letter-spacing:.09em;text-transform:uppercase}
  .gu-head span{font:600 12px 'Inter',sans-serif;color:#FBFBFB;opacity:.85}
  .gu-body{padding:2px 13px 13px}
  .gu-panel.cerrada .gu-body{display:none}
  .gu-list{display:grid;gap:9px;margin:0;padding:0;list-style:none}
  .gu-q{display:flex;gap:11px;align-items:flex-start}
  .gu-n{flex-shrink:0;width:27px;height:27px;border-radius:8px;background:#F7C51E;color:#111;display:grid;place-items:center;font:700 14px 'Inter',sans-serif}
  .gu-q p{margin:2px 0 0;font:500 15px/1.4 'Inter',sans-serif;color:#FBFBFB}
  .gu-q small{display:block;margin-top:3px;font:400 12px 'Inter',sans-serif;color:#AEAEAE}
  .gu-chip{display:inline-block;margin-top:6px;border:1px solid rgba(247,197,30,.6);border-radius:9px;padding:4px 9px;font:600 12.5px 'Inter',sans-serif;color:#F7C51E}
  .gu-sep{margin:12px 0 9px;display:flex;align-items:center;gap:10px;font:700 11px 'Inter',sans-serif;letter-spacing:.12em;color:#F7C51E}
  .gu-sep::before,.gu-sep::after{content:'';flex:1;height:1px;background:rgba(247,197,30,.3)}
  @media (min-width:900px){
    .gu-list.gu-dos{grid-template-columns:1fr 1fr;gap:11px 22px}
    .gu-q p{font-size:15.5px}
  }
  `;
  document.head.appendChild(css);

  const item = (p) => `<li class="gu-q"><span class="gu-n">${p.n}</span><div><p>${p.t}</p>${p.h ? `<small>${p.h}</small>` : ''}${p.c ? `<span class="gu-chip">${p.c}</span>` : ''}</div></li>`;

  function panelHtml(abierta){
    return `<div class="gu-panel${abierta ? '' : ' cerrada'}">
      <button type="button" class="gu-head" aria-expanded="${abierta ? 'true' : 'false'}"><b>Preguntas de la entrevista</b><span class="gu-estado">${abierta ? 'Ocultar' : 'Ver'}</span></button>
      <div class="gu-body">
        <ol class="gu-list gu-dos" style="padding:0">${PREGUNTAS.map(item).join('')}</ol>
        <div class="gu-sep">BLOQUE FINAL</div>
        <ol class="gu-list gu-dos" style="padding:0">${FINAL.map(item).join('')}</ol>
      </div>
    </div>`;
  }

  const esEquipo = () => !!profile && profile.role !== 'alumno';

  function insertarPanel(holderId){
    if(!esEquipo()) return;
    const holder = document.getElementById(holderId);
    if(!holder || holder.querySelector('.gu-panel')) return;
    const btnGrabar = holder.querySelector('#btn-grabar-entrevista');
    const abierta = !!btnGrabar; // si se puede grabar, las preguntas quedan abiertas
    const tmp = document.createElement('div');
    tmp.innerHTML = panelHtml(abierta);
    const panel = tmp.firstElementChild;
    const head = panel.querySelector('.gu-head');
    head.onclick = () => {
      const cerrada = panel.classList.toggle('cerrada');
      head.setAttribute('aria-expanded', cerrada ? 'false' : 'true');
      head.querySelector('.gu-estado').textContent = cerrada ? 'Ver' : 'Ocultar';
    };
    if(btnGrabar){
      // dentro de la tarjeta de grabación, justo debajo de la fila "Grabar audio aquí"
      const fila = btnGrabar.closest('.row-flex') || btnGrabar.parentElement;
      fila.insertAdjacentElement('afterend', panel);
    } else {
      holder.insertBefore(panel, holder.firstChild);
    }
  }

  const orig = window.renderEntrevista;
  if(typeof orig === 'function' && !orig.__gu){
    const nueva = async function(holderId){
      const r = await orig.apply(this, arguments);
      try{ insertarPanel(holderId); }catch(_e){}
      return r;
    };
    nueva.__gu = true;
    window.renderEntrevista = nueva;
  }
  window.UCGuias = { preguntas: PREGUNTAS.concat(FINAL) };
})();
