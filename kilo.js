// ============================================================
// STC App — Kilo (mascota) y efectos de celebración.
//
// Todo lo visual de Kilo vive en ESTE archivo. Para rediseñarlo basta con
// reemplazar el dibujo dentro de kiloSVG(): el resto de la app solo pide
// estados ("normal", "celebra", "anima", "descanso", "espera") y no sabe
// cómo está dibujado.
//
// API pública (window.UCKilo):
//   UCKilo.svg(estado, tamañoPx)   -> HTML de Kilo en ese estado
//   UCKilo.celebrarPR(ejercicio)   -> destello + corona + sonido (sin Kilo)
//   UCKilo.sonido(tipo)            -> 'pr' | 'serie' | 'mensaje' | 'racha' | 'fin' (respeta el silencio)
//   UCKilo.sonidoActivo() / UCKilo.setSonido(bool)
//   UCKilo.vibrar(ms)              -> solo Android (iPhone lo ignora)
// ============================================================
(function(){
  let uid = 0;

  // Corona (se reutiliza en la animación de PR y en la marca fija de la serie).
  const CORONA_PATH = 'M8 48 4 18l16 12 12-20 12 20 16-12-4 30z';
  function coronaSVG(clase){
    return `<svg class="${clase || ''}" viewBox="0 0 64 64" aria-hidden="true"><path d="${CORONA_PATH}"/></svg>`;
  }

  // ---------- Dibujo de Kilo (versión "atleta") ----------
  // Pesa rusa morada con cintillo, muñequeras y zapatillas lima.
  // Grupos que la CSS prende/apaga según el estado:
  //   .k-bn-*  brazos normales · .k-ba-*  brazos arriba · .k-bf brazos de fuerza (bíceps)
  //   .k-cara-normal · .k-boca · .k-boca-abierta · .k-ojos-cerrados · .k-cara-fuerza
  function kiloSVG(estado, size){
    const id = 'kilo-g' + (++uid);
    const px = size || 120;
    const O = '#07121C', PH = '#8B6CF0', P2 = '#9B7BFF', L = '#CBFF45';
    const limb = (d, w) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${PH}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const mano = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${P2}" stroke="${O}" stroke-width="3.5"/>`;
    const banda = (x, y) => `<rect x="${x - 9}" y="${y - 5}" width="18" height="10" rx="4" fill="${L}" stroke="${O}" stroke-width="2.5"/>`;
    return `<span class="kilo kilo--${estado || 'normal'}" style="--kilo-size:${px}px" role="img" aria-label="Kilo, la mascota de STC App">
<svg viewBox="0 0 240 290" width="${px}" height="${Math.round(px * 1.21)}" aria-hidden="true">
  <defs><radialGradient id="${id}" cx="38%" cy="30%" r="78%"><stop offset="0" stop-color="#CDBBFF"/><stop offset=".55" stop-color="#9B7BFF"/><stop offset="1" stop-color="#6A4BD6"/></radialGradient></defs>
  <ellipse class="kilo-sombra" cx="120" cy="280" rx="62" ry="6" fill="#000" opacity=".32"/>
  <g class="kilo-cuerpo">
    <g class="k-lineas"><path d="M6 70 l-10 -8 M4 86 l-13 0 M234 70 l10 -8 M236 86 l13 0" stroke="${L}" stroke-width="4" stroke-linecap="round"/></g>
    ${limb('M100 226 L98 262', 12)}${limb('M140 226 L142 262', 12)}
    <path d="M78 262 h32 a8 8 0 0 1 0 12 h-36 a8 8 0 0 1 4-12z" fill="${L}" stroke="${O}" stroke-width="3.5"/>
    <path d="M130 262 h32 a8 8 0 0 1 4 12 h-36 a8 8 0 0 1 0-12z" fill="${L}" stroke="${O}" stroke-width="3.5"/>
    <path d="M84 96 C80 44, 160 44, 156 96" fill="none" stroke="${O}" stroke-width="22" stroke-linecap="round"/>
    <path d="M84 96 C80 44, 160 44, 156 96" fill="none" stroke="${PH}" stroke-width="13" stroke-linecap="round"/>
    <g class="k-bn-izq">${limb('M54 158 L36 186 L40 212', 11)}${banda(37, 196)}${mano(40, 216, 12)}</g>
    <g class="k-bn-der">${limb('M186 158 L204 186 L200 212', 11)}${banda(203, 196)}${mano(200, 216, 12)}</g>
    <g class="k-ba-izq">${limb('M56 150 L30 128 L40 90', 11)}${banda(33, 118)}${mano(40, 84, 12)}</g>
    <g class="k-ba-der">${limb('M184 150 L210 128 L200 90', 11)}${banda(207, 118)}${mano(200, 84, 12)}</g>
    <g class="k-bf">${limb('M58 146 L22 140 L20 98', 12)}<ellipse cx="38" cy="132" rx="14" ry="11" fill="${P2}" stroke="${O}" stroke-width="3.5"/>${banda(20, 112)}${mano(20, 92, 13)}${limb('M182 146 L218 140 L220 98', 12)}<ellipse cx="202" cy="132" rx="14" ry="11" fill="${P2}" stroke="${O}" stroke-width="3.5"/>${banda(220, 112)}${mano(220, 92, 13)}</g>
    <path d="M120 80 C172 80 188 124 186 170 C184 212 164 230 120 230 C76 230 56 212 54 170 C52 124 68 80 120 80Z" fill="url(#${id})" stroke="${O}" stroke-width="4"/>
    <path d="M60 112 Q120 96 180 112 L178 126 Q120 110 62 126Z" fill="${L}" stroke="${O}" stroke-width="3"/>
    <ellipse cx="84" cy="173" rx="8" ry="5" fill="#F07FD6" opacity=".6"/><ellipse cx="156" cy="173" rx="8" ry="5" fill="#F07FD6" opacity=".6"/>
    <g class="k-cara-normal">
      <g class="k-ojos">
        <ellipse cx="99" cy="152" rx="11.4" ry="14.2" fill="${O}"/><ellipse cx="141" cy="152" rx="11.4" ry="14.2" fill="${O}"/>
        <g class="kilo-pupilas"><circle cx="102" cy="147" r="4.3" fill="#fff"/><circle cx="144" cy="147" r="4.3" fill="#fff"/></g>
        <ellipse class="kilo-parpado" cx="99" cy="152" rx="13" ry="15.5" fill="#A68BFF"/><ellipse class="kilo-parpado" cx="141" cy="152" rx="13" ry="15.5" fill="#A68BFF"/>
      </g>
      <g class="k-ojos-cerrados"><path d="M87 154 q12 9 24 0M129 154 q12 9 24 0" fill="none" stroke="${O}" stroke-width="4.5" stroke-linecap="round"/></g>
      <path class="k-boca" d="M110.5 175 q9.5 9.5 19 0" fill="none" stroke="${O}" stroke-width="3.8" stroke-linecap="round"/>
      <path class="k-boca-abierta" d="M108.6 173 q11.4 19 22.8 0z" fill="${O}"/>
    </g>
    <g class="k-cara-fuerza">
      <path d="M84 131 L110 140 M156 131 L130 140" stroke="${O}" stroke-width="5.7" stroke-linecap="round"/>
      <path d="M88 154 q11 -9 23 0 q-12 13 -23 0z M152 154 q-11 -9 -23 0 q12 13 23 0z" fill="${O}"/>
      <rect x="105" y="171" width="30" height="12.4" rx="4.8" fill="#fff" stroke="${O}" stroke-width="3.3"/>
      <path d="M105 177 H135 M115 171 V183.4 M126 171 V183.4" stroke="${O}" stroke-width="1.9"/>
      <path d="M173 114 q5.7 9.5 0 13.3 q-5.7 -3.8 0 -13.3z" fill="#71D7FF" stroke="${O}" stroke-width="2"/>
    </g>
    <g class="kilo-corona"><path transform="translate(120 28) scale(.95)" d="M-30 18 -34 -4 -20 6 0 -10 20 6 34 -4 30 18z" fill="#FFD166" stroke="${O}" stroke-width="3" stroke-linejoin="round"/></g>
  </g>
</svg></span>`;
  }

  // ---------- Sonido (generado en el código, sin archivos de audio) ----------
  const KEY_SONIDO = 'uc_sonido';
  function sonidoActivo(){
    try { return localStorage.getItem(KEY_SONIDO) !== 'off'; } catch(e){ return true; }
  }
  function setSonido(on){
    try { localStorage.setItem(KEY_SONIDO, on ? 'on' : 'off'); } catch(e){}
  }
  let ctx = null;
  function tonos(notas, tipo, separacion, duracion, volumen){
    if(!sonidoActivo()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      notas.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        const t0 = t + i * separacion;
        o.type = tipo; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(volumen, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + duracion + 0.05);
      });
    } catch(e){ /* sin audio disponible: no pasa nada */ }
  }
  function sonido(tipo){
    if(tipo === 'pr') tonos([523, 659, 784, 1047], 'triangle', 0.09, 0.35, 0.18);
    else if(tipo === 'serie') tonos([880, 1320], 'sine', 0.07, 0.14, 0.08);
    else if(tipo === 'mensaje') tonos([988, 1319], 'sine', 0.08, 0.18, 0.09);
    else if(tipo === 'racha') tonos([659, 988], 'triangle', 0.1, 0.3, 0.12);
    else if(tipo === 'fin') tonos([392, 523, 659, 784, 1047], 'triangle', 0.1, 0.4, 0.15);
    else if(tipo === 'tic') tonos([1047], 'sine', 0.05, 0.12, 0.10);
    else if(tipo === 'descanso') tonos([784, 1047, 784, 1047, 1319], 'square', 0.14, 0.2, 0.07);
  }
  // El navegador solo deja sonar audio después de un toque del usuario:
  // esto "despierta" el audio sin hacer ruido (se llama al tocar un botón).
  function prepararAudio(){
    if(!sonidoActivo()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if(ctx.state === 'suspended') ctx.resume();
    } catch(e){}
  }
  function vibrar(ms){
    try { if(navigator.vibrate) navigator.vibrate(ms); } catch(e){}
  }
  function menosMovimiento(){
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; }
  }

  // ---------- Celebración de récord personal ----------
  let celebrando = null;
  function celebrarPR(ejercicio){
    if(celebrando){ celebrando.remove(); celebrando = null; }
    const capa = document.createElement('div');
    capa.className = 'pr-celebracion' + (menosMovimiento() ? ' pr-quieta' : '');
    capa.setAttribute('role', 'status');
    capa.setAttribute('aria-live', 'polite');
    let chispas = '';
    for(let i = 0; i < 14; i++){
      const a = (i / 14) * Math.PI * 2;
      const colores = ['#CBFF45', '#FFD166', '#71D7FF', '#9B7BFF'];
      chispas += `<span class="pr-chispa" style="--dx:${Math.round(Math.cos(a) * 150)}px;--dy:${Math.round(Math.sin(a) * 120)}px;background:${colores[i % 4]}"></span>`;
    }
    capa.innerHTML = `
      <div class="pr-destello"></div>
      ${chispas}
      <div class="pr-centro">
        ${coronaSVG('pr-corona-grande')}
        <div class="pr-texto">¡Nuevo récord!</div>
        ${ejercicio ? `<div class="pr-ejercicio"></div>` : ''}
      </div>`;
    if(ejercicio) capa.querySelector('.pr-ejercicio').textContent = ejercicio;
    document.body.appendChild(capa);
    celebrando = capa;
    sonido('pr');
    vibrar([60, 40, 90]);
    setTimeout(() => { capa.classList.add('pr-sale'); }, 1500);
    setTimeout(() => { if(capa.isConnected) capa.remove(); if(celebrando === capa) celebrando = null; }, 1900);
  }

  window.UCKilo = { svg: kiloSVG, corona: coronaSVG, celebrarPR, sonido, sonidoActivo, setSonido, vibrar, prepararAudio };
})();
