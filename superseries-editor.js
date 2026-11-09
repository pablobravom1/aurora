// STC App: superseries prescritas en el programa. No altera otras aplicaciones.
(function(){
 'use strict';
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normal=s=>String(s||'').trim().toLowerCase();
 const idSeguro=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
 function grupos(lista){const out=new Map();(lista||[]).forEach((e,i)=>{if(idSeguro(e.superserie_id)){if(!out.has(e.superserie_id))out.set(e.superserie_id,[]);out.get(e.superserie_id).push({e,i});}});return [...out.entries()].filter(([,v])=>v.length===2&&normal(v[0].e.nombre)!==normal(v[1].e.nombre));}
 function idValido(ex,lista){return grupos(lista).some(([id])=>id===ex.superserie_id)?ex.superserie_id:null;}
 function detalle(ex,lista){const all=grupos(lista),k=all.findIndex(([id])=>id===ex.superserie_id);if(k<0)return null;return{numero:k+1,pareja:all[k][1].find(x=>x.e!==ex)?.e?.nombre||'',id:all[k][0]};}
 function separar(lista,i){const id=lista[i]?.superserie_id;if(id)lista.forEach(e=>{if(e.superserie_id===id)e.superserie_id=null;});}
 function unir(lista,i,j){
  if(!Number.isInteger(i)||!Number.isInteger(j)||i===j||!lista[i]||!lista[j]||!normal(lista[i].nombre)||normal(lista[i].nombre)===normal(lista[j].nombre))throw Error('Elige dos ejercicios diferentes');
  if(idValido(lista[j],lista)&&lista[j].superserie_id!==lista[i].superserie_id)throw Error('El segundo ejercicio ya tiene pareja. Sepáralo primero.');
  separar(lista,i);separar(lista,j);const id='ss-'+crypto.randomUUID();lista[i].superserie_id=id;lista[j].superserie_id=id;return id;
 }
 function etiqueta(ex,lista){const d=detalle(ex,lista);return d?`<div class="stc-super-etq"><b>Superserie ${d.numero}</b><span>con ${esc(d.pareja)}</span></div>`:'';}
 function boton(ex,lista,di,ei){const d=detalle(ex,lista);return `<div class="stc-super-control">${etiqueta(ex,lista)}<button type="button" onclick="STCSuperseries.editarRutina(${di},${ei})">${d?'⇄ Cambiar pareja':'⇄ Unir en superserie'}</button>${d?`<button type="button" class="stc-super-separar" onclick="STCSuperseries.separarRutina(${di},${ei})">Separar</button>`:''}</div>`;}
 function editarRutina(d,e){const lista=rutinaEditorDias[d].ejercicios;elegir(lista,e,()=>renderRutinaDiasEditor());}
 function separarRutina(d,e){separar(rutinaEditorDias[d].ejercicios,e);renderRutinaDiasEditor();}
 function elegir(lista,i,cambio){
  const ex=lista[i];if(!ex)return;
  const opciones=lista.map((e,j)=>({e,j})).filter(x=>x.j!==i&&normal(x.e.nombre)&&normal(x.e.nombre)!==normal(ex.nombre)&&(!idValido(x.e,lista)||x.e.superserie_id===ex.superserie_id));
  if(!opciones.length){showToast('Agrega otro ejercicio sin pareja en este día para unirlos.');return;}
  const anterior=document.activeElement,capa=document.createElement('div');capa.className='uc-series-capa';
  capa.innerHTML=`<section class="uc-series-modal" role="dialog" aria-modal="true" aria-labelledby="stc-super-titulo"><h2 id="stc-super-titulo">Crear superserie</h2><p>Primer ejercicio: <b>${esc(ex.nombre)}</b></p><label for="stc-super-pareja">¿Con qué ejercicio lo unimos?</label><select id="stc-super-pareja">${opciones.map(x=>`<option value="${x.j}" ${x.e.superserie_id&&x.e.superserie_id===ex.superserie_id?'selected':''}>${esc(x.e.nombre)}</option>`).join('')}</select><div class="stc-super-ayuda">Ambos quedarán identificados como pareja en el programa del alumno. Haz uno y después el otro, respetando las cargas y descansos del plan.</div><p role="alert" class="uc-series-error"></p><div class="uc-series-acciones"><button type="button" data-cancelar>Cancelar</button><button type="button" class="btn" data-unir>Unir ejercicios</button></div></section>`;
  if(idValido(ex,lista)){const boton=document.createElement('button');boton.type='button';boton.textContent='Separar esta superserie';boton.dataset.separar='';capa.querySelector('.uc-series-acciones').prepend(boton);}
  const antes=document.body.style.overflow;document.body.appendChild(capa);document.body.style.overflow='hidden';
  const cerrar=()=>{document.removeEventListener('keydown',teclas);document.body.style.overflow=antes;capa.remove();if(anterior?.isConnected)anterior.focus();};
  function teclas(ev){if(ev.key==='Escape'){ev.preventDefault();cerrar();}if(ev.key==='Tab'){const xs=[...capa.querySelectorAll('button,select')],a=xs[0],z=xs[xs.length-1];if(ev.shiftKey&&document.activeElement===a){ev.preventDefault();z.focus();}else if(!ev.shiftKey&&document.activeElement===z){ev.preventDefault();a.focus();}}}
  document.addEventListener('keydown',teclas);capa.querySelector('[data-cancelar]').onclick=cerrar;
  const bSeparar=capa.querySelector('[data-separar]');if(bSeparar)bSeparar.onclick=()=>{separar(lista,i);cambio();cerrar();};
  capa.querySelector('[data-unir]').onclick=()=>{try{unir(lista,i,Number(capa.querySelector('select').value));cambio();cerrar();}catch(e){capa.querySelector('[role=alert]').textContent=e.message;}};
  capa.querySelector('select').focus();
 }
 function resumenDia(dia){const gs=grupos(dia.ejercicios);return gs.length?`<div class="stc-super-resumen">${gs.map(([,par],i)=>`<p><b>Superserie ${i+1}</b> · ${par.map(x=>esc(x.e.nombre)).join(' + ')}</p>`).join('')}</div>`:'';}
 let sincronizando=false;
 async function sincronizarSesion(){
  if(sincronizando||!activeSesionId)return false;
  const candidatos=grupos(activeEjerciciosSugeridos).map(([,par])=>par.map(x=>x.e.nombre));
  const agregados=[];
  candidatos.forEach(par=>{if(!par.some(n=>activeSuperseries.some(p=>p.some(x=>normal(x)===normal(n))))){activeSuperseries.push(par);agregados.push(par);}});
  if(!agregados.length)return false;
  sincronizando=true;
  try{const {error}=await sb.from('sesiones').update({superseries:activeSuperseries}).eq('id',activeSesionId);if(error)throw error;renderDraftExercises();return true;}
  catch(_){activeSuperseries=activeSuperseries.filter(p=>!agregados.includes(p));showToast('No se pudo guardar la superserie del programa. Puedes volver a intentarlo.');return false;}
  finally{sincronizando=false;}
 }
 function serializar(v){const ordenar=x=>Array.isArray(x)?x.map(ordenar):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordenar(x[k])])):x;return JSON.stringify(ordenar(v));}
 window.STCSuperseries={grupos,idValido,detalle,separar,unir,etiqueta,boton,elegir,editarRutina,separarRutina,resumenDia,sincronizarSesion,serializar,ocupado:()=>sincronizando};
})();
