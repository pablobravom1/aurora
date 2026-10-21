/* STC: panel de pruebas recibidas desde Zunara. No usa el módulo antiguo de ventas. */
(function(){
 'use strict';
 const esc=v=>escapeHtml(String(v??''));
 const managers=['super_admin','responsable_sede','jso','ceo','loc'];
 const allowed=()=>profile&&[...managers,'profesor','coach'].includes(profile.role);
 let rows=[],month='',generation=0,mode='calendar',anchor=new Date(),selected='';
 const localMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
 const labels={pending:'Pendiente',contacted:'Contactado',no_answer:'No respondió',attended:'Asistió',no_show:'No asistió',cancelled:'Cancelada'};
 const css=document.createElement('style');css.textContent=`.stc-trial{padding-bottom:30px}.stc-trial h1{font-size:26px}.stc-trial .tr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.tr-kpis>div{padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.tr-kpis strong{display:block;font-size:25px;color:var(--blue)}.tr-kpis small{color:var(--chalk-dim)}.tr-item{padding:18px;margin:12px 0;border:1px solid var(--line);border-left:3px solid var(--blue);border-radius:14px;background:var(--surface)}.tr-item h2{font-size:19px;margin:0 0 8px}.tr-item p{color:var(--chalk-dim);font-size:12px}.tr-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.tr-controls label{flex:1;min-width:120px;font-size:12px}.tr-controls select{margin:5px 0}.tr-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.tr-toolbar input{width:150px;margin:0}.tr-source{font-size:12px;color:var(--chalk-dim);line-height:1.6}@media(max-width:600px){.stc-trial .tr-kpis{grid-template-columns:1fr 1fr}.tr-item{padding:14px}}`;document.head.append(css);
 async function open(){
  if(!allowed())return;
  const seq=++generation;month=month||localMonth();
  root().innerHTML=`<section class="stc-trial" id="stc-trial-panel"><div class="header-actions"><button class="switch-user" id="tr-back">← Volver</button></div><small>COMERCIAL · FUENTE ZUNARA</small><h1>${managers.includes(profile.role)?'Clases de prueba del gimnasio':'Mis clases de prueba'}</h1><p class="tr-source">La asignación la elige el vendedor en Zunara. Contacto y asistencia se guardan por separado. Esta fuente no se suma al Excel.</p><div class="tr-toolbar"><label>Mes <input type="month" id="tr-month" value="${esc(month)}"></label><button class="btn-sm" id="tr-refresh">Actualizar</button><button class="btn-sm" id="tr-today">Solo hoy</button><button class="btn-sm" id="tr-all">Todo el mes</button></div><div id="tr-content" class="loading">Cargando clases…</div>${profile.role==='super_admin'?'<details class="card" style="margin-top:18px"><summary>Conectar con Zunara · administrador</summary><p class="tr-source">Genera en Zunara un código de conexión para STC App y pégalo aquí. No ingreses contraseñas ni secretos.</p><form id="tr-pair"><input name="code" required pattern="[0-9a-fA-F]{12}" maxlength="12" placeholder="Código de 12 caracteres" autocomplete="off"><button class="btn-sm" type="submit">Conectar</button></form><p id="tr-pair-status" role="status"></p></details>':''}</section>`;
  document.querySelector('#tr-back').onclick=()=>{generation++;renderCoachHome();};
  document.querySelector('#tr-refresh').onclick=open;
  const modeBar=document.createElement('div');modeBar.className='tr-toolbar';modeBar.style.marginTop='12px';modeBar.innerHTML='<button class="btn-sm" id="tr-calendar">Vista C · Calendario</button><button class="btn-sm" id="tr-list">Lista</button>';document.querySelector('.tr-toolbar').insertAdjacentElement('afterend',modeBar);
  document.querySelector('#tr-calendar').onclick=()=>{mode='calendar';selected='';open();};document.querySelector('#tr-list').onclick=()=>{mode='list';open();};
  document.querySelector('#tr-month').onchange=e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){month=e.target.value;anchor=new Date(month+'-01T12:00:00');selected='';open();}};
  document.querySelector('#tr-today').onclick=()=>{mode='list';paint(true);};
  document.querySelector('#tr-all').onclick=()=>{mode='list';open();};
  document.querySelector('#tr-pair')?.addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button'),output=document.querySelector('#tr-pair-status');button.disabled=true;output.textContent='Conectando…';try{const r=await sb.functions.invoke('stc-zunara-connect',{body:{code:new FormData(e.target).get('code')}});if(r.error||!r.data?.ok)throw Error(r.data?.error||r.error?.message||'No se pudo conectar');output.textContent='Conexión registrada. El directorio de profesores está en cola de envío.';e.target.reset();}catch(err){output.textContent=err.message;}finally{button.disabled=false;}});
  try{
   const start=mode==='calendar'?window.STCCalendarioPruebas.monday(anchor):new Date(month+'-01T00:00:00'),end=new Date(start);if(mode==='calendar')end.setDate(end.getDate()+7);else end.setMonth(end.getMonth()+1);
   const r=await sb.rpc('stc_trial_list',{range_start:start.toISOString(),range_end:end.toISOString()});
   if(seq!==generation||!document.querySelector('#tr-content'))return;
   if(r.error)throw r.error;rows=r.data||[];paint(false);
  }catch(e){if(seq===generation&&document.querySelector('#tr-content'))document.querySelector('#tr-content').innerHTML=`<div class="error-banner">No se pudieron cargar las clases: ${esc(e.message)}. Si el módulo aún no está instalado, no aparecerán datos ficticios.</div>`;}
 }
 function paint(today){
  const container=document.querySelector('#tr-content');if(!container)return;
  const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date(d));
  const list=mode==='calendar'?rows.filter(t=>t.id===selected):today?rows.filter(t=>day(t.starts_at)===day(new Date())):rows;
  const metrics=mode==='calendar'?rows:list;
  const yes=metrics.filter(t=>t.attendance_status==='attended').length,no=metrics.filter(t=>t.attendance_status==='no_show').length;
  container.className='';container.innerHTML=`<div class="tr-kpis"><div><strong>${metrics.length}</strong><small>Pruebas ${mode==='calendar'?'de la semana':today?'hoy':'del mes'}</small></div><div><strong>${metrics.filter(t=>t.contact_status==='pending').length}</strong><small>Contacto pendiente</small></div><div><strong>${yes}</strong><small>Asistieron</small></div><div><strong>${no}</strong><small>No asistieron</small></div></div><p class="tr-source">No-show: ${yes+no?Math.round(no/(yes+no)*100)+'%':'—'} · solo clases con resultado; excluye pendientes y canceladas.</p>${list.map(t=>{
   const mine=t.professor_id===profile.id&&['profesor','coach'].includes(profile.role);
   const select=(field,values)=>`<select name="${field}" aria-label="${field==='contact'?'Contacto':'Asistencia'} de ${esc(t.person_name)}">${values.map(v=>`<option value="${v}" ${t[field==='contact'?'contact_status':'attendance_status']===v?'selected':''}>${labels[v]}</option>`).join('')}</select>`;
   return `<article class="tr-item"><h2>${esc(t.person_name)}</h2><b>${esc(new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t.starts_at)))}</b><p>${esc(t.site)} · ${esc(t.goal)}</p><p>Profesor: ${esc(t.professor_name||'Asignado en STC')}</p>${t.phone?`<p>Teléfono: ${esc(t.phone)}</p>`:''}<p>Contacto: ${esc(labels[t.contact_status])} · Asistencia: ${esc(labels[t.attendance_status])}</p>${mine?`<form class="tr-controls" data-tr-result="${esc(t.id)}"><label>Contacto${select('contact',['pending','contacted','no_answer'])}</label><label>Asistencia${select('attendance',['pending','attended','no_show','cancelled'])}</label><button class="btn-sm" type="submit">Guardar resultado</button><span role="status"></span></form>`:'<small>Solo lectura · el profesor asignado registra el resultado.</small>'}</article>`;
  }).join('')||(mode==='calendar'&&rows.length?'<p class="tr-source">Selecciona una clase del calendario para ver su ficha.</p>':'<p class="tr-source">No hay clases de prueba para este periodo.</p>')}`;
  if(mode==='calendar'){
   const wrap=document.createElement('div');wrap.innerHTML=window.STCCalendarioPruebas.html(rows,anchor);container.prepend(wrap);
   window.STCCalendarioPruebas.bind({anchor,onDate:d=>{anchor=d;month=localMonthOf(d);selected='';open();},onPick:id=>{selected=id;paint(false);document.querySelector('.tr-item')?.scrollIntoView({behavior:'smooth',block:'nearest'});},onZoom:()=>paint(false)});
  }
  container.querySelectorAll('[data-tr-result]').forEach(form=>form.addEventListener('submit',async e=>{
   e.preventDefault();const t=rows.find(t=>t.id===form.dataset.trResult),button=form.querySelector('button'),output=form.querySelector('[role="status"]'),data=new FormData(form);button.disabled=true;
   try{const r=await sb.rpc('stc_trial_result',{trial:t.id,version_expected:t.source_version,result_expected:t.result_revision,contact:data.get('contact'),attendance:data.get('attendance')});if(r.error)throw r.error;output.textContent='Guardado en STC; pendiente de envío a Zunara.';button.textContent='Guardado';t.contact_status=data.get('contact');t.attendance_status=data.get('attendance');t.result_revision++;}
   catch(err){output.textContent='No guardado: '+err.message;}finally{button.disabled=false;}
  }));
 }
 async function loadSummary(box){
  const m=document.querySelector('#cx-mes')?.value||localMonth();
  box.textContent='Cargando fuente Zunara…';
  try{const r=await sb.from('stc_zunara_commercial_summary').select('*').eq('month',m+'-01').maybeSingle();if(!box.isConnected)return;if(r.error)throw r.error;
   if(!r.data){box.textContent='Fuente Zunara: aún no hay resumen sincronizado para '+m+'. No se reemplazan ni suman los datos del Excel.';return;}
   const t=r.data;box.innerHTML=`<small>FUENTE ZUNARA · ${esc(m)} · SOLO LECTURA</small><h2>Leads y clases de prueba</h2><div class="tr-kpis"><div><strong>${t.leads}</strong><small>Leads ingresadas</small></div><div><strong>${t.trials}</strong><small>Pruebas del mes</small></div><div><strong>${t.attended}</strong><small>Asistieron</small></div><div><strong>${t.no_show}</strong><small>No asistieron</small></div></div><p class="tr-source">Corte: ${esc(new Date(t.source_cutoff).toLocaleString('es-CL'))}. Fuente independiente del Excel; no se suman ambas. ${t.pending_contact} contactos pendientes · ${t.cancelled} canceladas.</p>`;
  }catch{if(box.isConnected)box.textContent='Fuente Zunara aún no disponible. Los indicadores del Excel permanecen intactos.';}
 }
 function mountSummary(){
  if(!profile||!managers.includes(profile.role))return;
  const sources=document.querySelector('#cx-cuerpo .cx-fu');if(!sources||document.querySelector('#stc-zunara-summary'))return;
  const box=document.createElement('article');box.id='stc-zunara-summary';box.className='card stc-trial';box.style.padding='18px';sources.insertAdjacentElement('beforebegin',box);loadSummary(box);
  document.querySelector('#cx-mes')?.addEventListener('change',()=>loadSummary(box));
 }
 function mount(){
  mountSummary();
  if(!allowed()||document.querySelector('#stc-trial-panel')||document.querySelector('#stc-trial-access'))return;
  const ceo=!!document.querySelector('.cx-top');
  const home=ceo?document.querySelector('#stc-zunara-summary'):(document.querySelector('#btn-mi-perfil-coach')||document.querySelector('#loc-metricas'));if(!home)return;
  const b=document.createElement('button');b.id='stc-trial-access';b.className='rl-nav';b.type='button';b.innerHTML='<span class="rl-ico">◷</span><span class="rl-t"><small>Zunara · clases de prueba</small><b>'+ (managers.includes(profile.role)?'Pruebas y seguimiento del gimnasio':'Mis clases de prueba')+'</b><em>Contacto, asistencia y próximos prospectos</em></span>';b.onclick=open;home.insertAdjacentElement(ceo?'beforebegin':'afterend',b);
 }
 const observer=new MutationObserver(mount);observer.observe(root(),{childList:true,subtree:true});mount();
 function localMonthOf(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
 window.STCPruebasZunara={abrir:open};
})();
