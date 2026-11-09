// STC: pesos canónicos en kg; la preferencia solo cambia presentación/entrada.
(function () {
  'use strict';
  const FACTOR = 0.45359237;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = () => 'stc_unidad_peso_' + (typeof profile !== 'undefined' && profile ? profile.id : 'local');
  let memoria = 'kg';
  function unidad() { try { return localStorage.getItem(key()) === 'lb' ? 'lb' : 'kg'; } catch (_) { return memoria; } }
  function numero(v) { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; }
  const deKg = (kg, u = unidad()) => Number(kg) / (u === 'lb' ? FACTOR : 1);
  const aKg = (v, u = unidad()) => { const n = numero(v); return n == null ? null : Math.round(n * (u === 'lb' ? FACTOR : 1) * 1e8) / 1e8; };
  const valor = (kg, u = unidad()) => Math.round(deKg(kg, u) * 100) / 100;
  const formato = kg => valor(kg).toLocaleString('es-CL', {maximumFractionDigits:2}) + ' ' + unidad();
  const pesoHtml = kg => `<span data-uc-kg="${esc(kg)}">${esc(formato(kg))}</span>`;
  function kgTexto(t, u = 'kg') { const m = String(t == null ? '' : t).trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?$/i); return m ? aKg(m[1], m[2] ? (m[2].toLowerCase().startsWith('lb') ? 'lb' : 'kg') : u) : null; }
  function leerTexto(t) { const n = kgTexto(t, unidad()); return n == null ? String(t || '').trim() : n + ' kg'; }
  function texto(t) { const n = kgTexto(t); return n == null ? String(t || '') : String(valor(n)) + ' ' + unidad(); }
  const textoHtml = t => { const n = kgTexto(t); return n == null ? esc(t) : pesoHtml(n); };
  function selector() { return `<label class="uc-cargas-selector">Cargas <select aria-label="Unidad de las cargas" onchange="UCCargas.cambiar(this.value)"><option value="kg" ${unidad()==='kg'?'selected':''}>Kilogramos · kg</option><option value="lb" ${unidad()==='lb'?'selected':''}>Libras · lb</option></select></label>`; }
  function cambiar(u) {
    if (u !== 'kg' && u !== 'lb') return;
    const anterior = unidad(); if (u === anterior) return;
    // Convertir entradas visibles antes de cambiar la preferencia. No re-renderizar
    // todo el formulario: conserva notas, foco, repeticiones y cambios pendientes.
    document.querySelectorAll('[data-uc-peso-input]').forEach(el => {
      const n = kgTexto(el.value, anterior);
      if (n != null) el.value = el.dataset.ucPesoInput === 'texto' ? String(valor(n,u)) + ' ' + u : String(valor(n,u));
    });
    memoria = u; try { localStorage.setItem(key(), u); } catch (_) {}
    document.querySelectorAll('[data-uc-kg]').forEach(el => { el.textContent = formato(Number(el.dataset.ucKg)); });
    document.querySelectorAll('[data-uc-unidad]').forEach(el => { el.textContent = u.toUpperCase(); });
    document.querySelectorAll('.uc-cargas-selector select').forEach(el => { el.value = u; });
    document.dispatchEvent(new CustomEvent('uc-unidad-peso', {detail:{unidad:u, anterior}}));
  }
  function planValido(plan) {
    return Array.isArray(plan) && plan.length > 0 && plan.length <= 50 && plan.every(s => s && typeof s === 'object' && !Array.isArray(s) && (s.peso_kg === null || (typeof s.peso_kg === 'number' && Number.isFinite(s.peso_kg) && s.peso_kg >= 0 && s.peso_kg <= 10000)) && typeof s.reps === 'string' && s.reps.length <= 30 && /^[1-9]\d*(\s*[-–]\s*[1-9]\d*)?$/.test(s.reps));
  }
  const plan = ex => planValido(ex && ex.series_plan) ? ex.series_plan : null;
  const clonar = p => p ? p.map(s => ({peso_kg:s.peso_kg, reps:s.reps})) : null;
  function resumen(ex) { const p = plan(ex); return p ? p.length + ' series · cargas y repeticiones individuales' : ''; }
  function tabla(ex) { const p = plan(ex); return p ? `<details class="uc-series-tabla"><summary>Ver las ${p.length} series indicadas</summary><ol>${p.map((s,i) => `<li><b>Serie ${i+1}</b><span>${esc(s.reps)} ${ex.unidad_objetivo === 'seg' ? 'seg' : 'reps'}</span><span>${s.peso_kg == null ? 'Libre / sin indicar' : pesoHtml(s.peso_kg)}</span></li>`).join('')}</ol></details>` : ''; }
  function siguiente(ex, cantidad) { const p = plan(ex); return p && cantidad < p.length ? p[cantidad] : null; }
  function boton(d,e,ex) { return `<button type="button" class="uc-series-boton" onclick="UCCargas.editarRutina(${d},${e})">${plan(ex) ? '✎ Editar las '+plan(ex).length+' series' : '＋ Peso y repeticiones por serie'}</button>${tabla(ex)}`; }
  function editarRutina(d,e) {
    const ex = rutinaEditorDias[d].ejercicios[e];
    editar(ex, p => { ex.series_plan=p; if(p) {ex.series_objetivo=String(p.length);ex.reps_objetivo=p[0].reps;ex.peso_objetivo=p[0].peso_kg==null?'':p[0].peso_kg+' kg';} renderRutinaDiasEditor(); });
  }
  function editar(ex, guardar) {
    const previo = document.activeElement;
    const n = Math.max(1,Math.min(50,parseInt(ex.series_objetivo,10)||3));
    let filas = clonar(plan(ex)) || Array.from({length:n}, () => ({peso_kg:kgTexto(ex.peso_objetivo),reps:String(ex.reps_objetivo||'10')}));
    const capa=document.createElement('div'); capa.className='uc-series-capa';
    capa.innerHTML=`<section class="uc-series-modal" role="dialog" aria-modal="true" aria-labelledby="uc-series-titulo"><h2 id="uc-series-titulo">Cada serie, a tu medida</h2><p>${esc(ex.nombre)} · Puedes variar peso y ${ex.unidad_objetivo==='seg'?'segundos':'repeticiones'} en cada serie.</p>${selector()}<div class="uc-series-filas"></div><p class="uc-series-error" role="alert"></p><button type="button" data-add>＋ Agregar otra serie</button><div class="uc-series-acciones"><button type="button" data-uniforme>Usar series iguales</button><button type="button" data-cancelar>Cancelar</button><button type="button" data-guardar class="btn">Guardar series</button></div></section>`;
    document.body.appendChild(capa); const antesOverflow=document.body.style.overflow; document.body.style.overflow='hidden';
    const cerrar=()=>{document.removeEventListener('keydown',teclas);document.body.style.overflow=antesOverflow;capa.remove();if(previo&&previo.isConnected)previo.focus();};
    function pintar() {
      capa.querySelector('.uc-series-filas').innerHTML=filas.map((s,i)=>`<div class="uc-series-fila"><b>${i+1}</b><label>${ex.unidad_objetivo==='seg'?'Segundos':'Reps'}<input data-reps="${i}" maxlength="30" value="${esc(s.reps)}"></label><label>Peso <span data-uc-unidad>${unidad().toUpperCase()}</span><input type="number" inputmode="decimal" min="0" step="any" data-uc-peso-input="numero" data-peso="${i}" value="${s.peso_kg==null?'':valor(s.peso_kg)}" placeholder="Libre"></label><button type="button" data-quitar="${i}" aria-label="Quitar serie ${i+1}" ${filas.length===1?'disabled':''}>×</button></div>`).join('');
      capa.querySelectorAll('[data-reps]').forEach(el=>el.oninput=()=>{filas[Number(el.dataset.reps)].reps=el.value.trim();});
      capa.querySelectorAll('[data-peso]').forEach(el=>el.oninput=()=>{filas[Number(el.dataset.peso)].peso_kg=aKg(el.value);});
      capa.querySelectorAll('[data-quitar]').forEach(el=>el.onclick=()=>{filas.splice(Number(el.dataset.quitar),1);pintar();});
      capa.querySelector('[data-add]').disabled=filas.length>=50;
    }
    function teclas(ev) { if(ev.key==='Escape'){ev.preventDefault();cerrar();} if(ev.key==='Tab'){const lista=[...capa.querySelectorAll('button:not(:disabled),input,select')];const a=lista[0],z=lista[lista.length-1];if(ev.shiftKey&&document.activeElement===a){ev.preventDefault();z.focus();}else if(!ev.shiftKey&&document.activeElement===z){ev.preventDefault();a.focus();}} }
    document.addEventListener('keydown',teclas);
    capa.querySelector('[data-add]').onclick=()=>{if(filas.length<50){filas.push({...filas[filas.length-1]});pintar();const inputs=capa.querySelectorAll('[data-reps]');inputs[inputs.length-1].focus();}};
    capa.querySelector('[data-cancelar]').onclick=cerrar;
    capa.querySelector('[data-uniforme]').onclick=()=>{guardar(null);cerrar();};
    capa.querySelector('[data-guardar]').onclick=()=>{if([...capa.querySelectorAll('input')].some(el=>!el.checkValidity()) || !planValido(filas)){capa.querySelector('.uc-series-error').textContent='Completa las repeticiones de cada serie y usa pesos entre 0 y 10.000 kg.';return;}guardar(clonar(filas));cerrar();};
    pintar(); capa.querySelector('select').focus();
  }
  window.UCCargas={FACTOR,unidad,numero,deKg,aKg,valor,formato,pesoHtml,kgTexto,leerTexto,texto,textoHtml,selector,cambiar,planValido,plan,clonar,resumen,tabla,siguiente,boton,editar,editarRutina};
})();


