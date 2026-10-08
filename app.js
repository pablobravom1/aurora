// ============================================================
// STC App — lógica de la app
// ============================================================
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let session = null;
let profile = null;
let calendarMonthOffset = 0;
let activeSesionId = null;   // sesión que se está registrando ahora mismo (autoguardado)
let activeSesionFecha = null; // fecha elegida para la sesión activa (permite carga retroactiva)
let activeSesionExs = [];    // sets ya guardados de la sesión activa, agrupados por ejercicio
let activeRutinaDias = [];   // días (con sus ejercicios) de la rutina activa del alumno logueado
let activeSesionDia = null;  // día del programa que el alumno eligió entrenar en la sesión activa
let activeUltimaVez = {}; // nombre ejercicio (minúsculas) -> {peso, reps} de la última sesión ANTERIOR a hoy
let ejercicioAbierto = null; // ejercicio desplegado en el registro de hoy (los demás quedan compactos)
let activeStatsPorEjercicio = {}; // nombre ejercicio (minúsculas) -> {max, last} — para sugerir peso y detectar PR al instante
let activeEjerciciosSugeridos = []; // ejercicios del día elegido, para poder re-renderizar los botones de sugerencia
let activeSuperseries = []; // [[nombreA, nombreB], ...] — pares de ejercicios "unidos" en la sesión activa de hoy
let superserieModo = false;    // true mientras se está tocando el 1er/2do ejercicio para unirlos
let superserieEsperando = null; // nombre del primer ejercicio tocado, mientras se espera el segundo toque
let rutinaEditorDias = [];   // bloques de día del editor de rutina (coach)
let rutinaEditorId = null;   // si se está editando una rutina existente en vez de crear una nueva
let rutinaEditorReturn = null; // destino al guardar/cancelar (perfil alumno o detalle del coach)
let progresoChart = null;
let cacheSeriesHistorial = {}; // set.id -> {reps, peso, nota, i, _isPR} — para poder editar una serie ya guardada desde el historial
let historialRefrescar = null; // callback para recargar la lista de historial después de agregar un ejercicio o editar el día de una sesión pasada
let socialRealtimeChannel = null;
let socialRefreshTimer = null;
let sessionExerciseSelection = '';

const root = () => document.getElementById('app-root');

// ---------- BANCO DE EJERCICIOS ----------
// Primera colección visual de STC App. Las referencias son imágenes fijas;
// los videos se podrán activar más adelante agregando una URL de YouTube.
const EXERCISE_BANK = [
  { name:'Press banca', aliases:['press de banca','barbell bench press'], group:'Pecho', image:'press-banca.webp', youtubeUrl:'' },
  { name:'Press pecho en máquina', aliases:['press de pecho en maquina','chest press','machine chest press'], group:'Pecho', image:'press-pecho-maquina.webp', youtubeUrl:'' },
  { name:'Cruce de poleas', aliases:['cruce poleas','cable crossover','crossover'], group:'Pecho', image:'cruce-poleas.webp', youtubeUrl:'' },
  { name:'Press plano con mancuernas', aliases:['press con mancuernas','dumbbell chest press'], group:'Pecho', image:'press-plano-mancuernas.webp', youtubeUrl:'https://youtube.com/shorts/908F5mH2V0c?si=rTQuYgNB-QEoZz-5' },
  { name:'Press inclinado con mancuernas', aliases:['press inclinado mancuernas','incline dumbbell press'], group:'Pecho', image:'press-inclinado-mancuernas.webp', youtubeUrl:'' },
  { name:'Press inclinado con barra', aliases:['press inclinado barra','incline barbell press'], group:'Pecho', image:'press-inclinado-barra.webp', youtubeUrl:'' },
  { name:'Aperturas con mancuernas', aliases:['aperturas pecho','dumbbell fly','fly con mancuernas'], group:'Pecho', image:'aperturas-mancuernas.webp', youtubeUrl:'' },
  { name:'Aperturas en máquina', aliases:['aperturas en maquina','pec deck','peck deck','contractora de pecho','machine chest fly'], group:'Pecho', image:'aperturas-maquina.webp', youtubeUrl:'' },
  { name:'Flexiones de brazos', aliases:['flexiones','lagartijas','push up','push-up'], group:'Pecho', image:'flexiones.webp', youtubeUrl:'' },
  { name:'Extensión tríceps', aliases:['extension de triceps','extensión de tríceps','triceps pushdown','jalon de triceps'], group:'Tríceps', image:'extension-triceps.webp', youtubeUrl:'https://youtube.com/shorts/BRlRvjPGIMM?si=vycbThqacOUQS_Tk' },
  { name:'Press francés', aliases:['press frances','lying triceps extension','extensión de tríceps acostado'], group:'Tríceps', image:'press-frances.webp', youtubeUrl:'' },
  { name:'Fondos en paralelas', aliases:['fondos','dips','parallel bar dips','fondos de triceps'], group:'Tríceps', image:'fondos-paralelas.webp', youtubeUrl:'' },
  { name:'Extensión de tríceps sobre la cabeza', aliases:['extension de triceps sobre la cabeza','extension sobre la cabeza','overhead triceps extension','triceps con mancuerna'], group:'Tríceps', image:'extension-triceps-cabeza.webp', youtubeUrl:'' },
  { name:'Vuelos laterales', aliases:['vuelo lateral','elevaciones laterales','lateral raise'], group:'Hombros', image:'vuelos-laterales.webp', youtubeUrl:'https://youtube.com/shorts/O37pNSL4aFg?si=VxYffD4k1fRBK-ok' },
  { name:'Press militar con barra', aliases:['press militar','overhead press','barbell shoulder press'], group:'Hombros', image:'press-militar-barra.webp', youtubeUrl:'https://youtube.com/shorts/6Rwe-9LjnPM?si=6_NGcINP_fXLgiiG' },
  { name:'Press militar con mancuernas', aliases:['press de hombros con mancuernas','press hombros mancuernas','press militar sentado','press militar sentado con mancuernas','dumbbell shoulder press','seated dumbbell shoulder press'], group:'Hombros', image:'press-militar-mancuernas.png', youtubeUrl:'https://youtube.com/shorts/rxO8QA23ha8?si=UurCtQ8ZiRJhRqNG' },
  { name:'Pájaros con mancuernas', aliases:['pajaros','vuelos posteriores','reverse fly','rear delt fly'], group:'Hombros', image:'pajaros-mancuernas.webp', youtubeUrl:'' },
  { name:'Face pull', aliases:['tiron a la cara','tirón a la cara','face pull con cuerda','jalon a la cara'], group:'Hombros', image:'face-pull.webp', youtubeUrl:'' },
  { name:'Elevaciones frontales', aliases:['elevacion frontal','elevación frontal','front raise'], group:'Hombros', image:'elevaciones-frontales.webp', youtubeUrl:'' },
  { name:'Press Arnold', aliases:['arnold press'], group:'Hombros', image:'press-arnold.webp', youtubeUrl:'' },
  { name:'Sentadilla con barra', aliases:['sentadilla barra','sentadilla libre','barbell squat','back squat'], group:'Piernas', image:'sentadilla-barra.webp', youtubeUrl:'https://youtube.com/shorts/dy6QWGmEQ9k?si=NqprmkhmClboJ1x1' },
  { name:'Sentadilla en Smith', aliases:['sentadilla smith','smith squat','sentadilla en multipower'], group:'Piernas', image:'sentadilla-smith.webp', youtubeUrl:'' },
  { name:'Sentadilla en Smith con banda elástica', aliases:['sentadilla smith con banda','smith squat con banda','banded smith squat','sentadilla en multipower con banda'], group:'Piernas', image:'sentadilla-smith-banda.webp', youtubeUrl:'' },
  { name:'Sentadilla con cajón', aliases:['sentadilla cajon','sentadilla al cajon','box squat','barbell box squat'], group:'Piernas', image:'sentadilla-cajon.webp', youtubeUrl:'' },
  { name:'Sentadilla isométrica', aliases:['sentadilla isometrica','wall sit','sentadilla contra la pared','silla en pared'], group:'Piernas', image:'sentadilla-isometrica.jpg', youtubeUrl:'' },
  { name:'Prensa de piernas', aliases:['prensa piernas','leg press','prensa inclinada','prensa 45 grados'], group:'Piernas', image:'prensa-piernas.webp', youtubeUrl:'' },
  { name:'Extensión de cuádriceps', aliases:['extension de cuadriceps','extensión de piernas','leg extension','machine leg extension'], group:'Piernas', image:'extension-cuadriceps.webp', youtubeUrl:'' },
  { name:'Zancadas con mancuernas', aliases:['zancada','zancadas','estocadas','lunges','dumbbell forward lunge'], group:'Piernas', image:'zancadas.webp', youtubeUrl:'' },
  { name:'Sentadilla búlgara', aliases:['sentadilla bulgara','bulgara','bulgarian split squat','zancada bulgara'], group:'Piernas', image:'sentadilla-bulgara.webp', youtubeUrl:'' },
  { name:'Sentadilla goblet', aliases:['goblet squat','sentadilla con mancuerna','sentadilla copa'], group:'Piernas', image:'sentadilla-goblet.webp', youtubeUrl:'' },
  { name:'Sentadilla sumo con mancuerna', aliases:['sentadilla sumo','sumo squat','dumbbell sumo squat','sentadilla sumo mancuerna'], group:'Piernas', image:'sentadilla-sumo-mancuerna.webp', youtubeUrl:'https://youtube.com/shorts/N8tdyCvTCVc?si=i1_KrCrWyxCX74ge' },
  { name:'Hack squat', aliases:['sentadilla hack','jaca','hack squat machine'], group:'Piernas', image:'hack-squat.webp', youtubeUrl:'' },
  { name:'Elevación de talones', aliases:['elevacion de talones','pantorrillas','gemelos','calf raise','standing calf raise'], group:'Pantorrillas', image:'elevacion-talones.webp', youtubeUrl:'' },
  { name:'Peso muerto', aliases:['deadlift','peso muerto convencional'], group:'Posterior', image:'peso-muerto.webp', youtubeUrl:'' },
  { name:'Peso muerto sumo', aliases:['sumo deadlift','peso muerto estilo sumo'], group:'Posterior', image:'peso-muerto-sumo.webp', youtubeUrl:'' },  { name:'Peso muerto rumano', aliases:['rumano','romanian deadlift','RDL'], group:'Posterior', image:'peso-muerto-rumano.webp', youtubeUrl:'' },
  { name:'Peso muerto con barra hexagonal con salto', aliases:['barra hexagonal con salto','salto con barra hexagonal','trap bar jump','hex bar jump','trap bar jump squat'], group:'Posterior', image:'barra-hexagonal-salto.webp', youtubeUrl:'https://youtube.com/shorts/4q06PF5sOh4?si=pRLyb0-sTJ4LguDk' },
  { name:'Hiperextensiones', aliases:['extensiones lumbares','back extension','banco romano'], group:'Posterior', image:'hiperextensiones.webp', youtubeUrl:'' },
  { name:'Curl femoral sentado', aliases:['flexión femoral sentada','flexion femoral sentado','press femoral sentado','seated leg curl'], group:'Posterior', image:'curl-femoral-sentado.webp', youtubeUrl:'' },
  { name:'Curl femoral acostado', aliases:['curl femoral','flexión femoral en camilla','flexion femoral en camilla','leg curl','femorales en máquina','femorales en maquina','prone leg curl'], group:'Posterior', image:'curl-femoral.webp', youtubeUrl:'https://youtube.com/shorts/phvoOZyrf98?si=O-F0_Q_lKI8zVDLW' },
    { name:'Hip thrust en Smith', aliases:['smith hip thrust','hip thrust multipower','empuje de cadera en smith','puente de glúteo en smith'], group:'Glúteos', image:'hip-thrust-smith.webp', youtubeUrl:'' },
    { name:'Hip thrust', aliases:['empuje de cadera','puente de gluteo con barra','puente de glúteo con barra','barbell hip thrust'], group:'Glúteos', image:'hip-thrust.webp', youtubeUrl:'' },
    { name:'Abducción de cadera', aliases:['abduccion de cadera','abductores','abductores en máquina','abductores en maquina','hip abduction','seated hip abduction'], group:'Glúteos', image:'abduccion-cadera.webp', youtubeUrl:'https://youtube.com/shorts/UiiANdwE-Qk?si=VCY2k4wYR_GtFSzC' },
        { name:'Aducción de cadera', aliases:['aduccion de cadera','aductores','aductores en máquina','aductores en maquina','hip adduction','seated hip adduction'], group:'Piernas', image:'aduccion-cadera.webp', youtubeUrl:'https://youtube.com/shorts/OGI8s6N9iYU?si=D2t-x9Iy63Ve9T7d' },
    { name:'Patada de glúteo en polea', aliases:['patada gluteo','patada de gluteo','glute kickback','cable kickback'], group:'Glúteos', image:'patada-gluteo-polea.webp', youtubeUrl:'https://youtube.com/shorts/UzJUYWN19qg?si=w2wzQTjRsm2X9b6c' },
    { name:'Curl de bíceps con barra', aliases:['curl con barra','barbell curl','curl biceps barra'], group:'Bíceps', image:'curl-biceps-barra.webp', youtubeUrl:'https://youtube.com/shorts/fjjf-Lmb7XA?si=8ECnAAM6vb5iF_Vc' },
  { name:'Curl con mancuernas', aliases:['curl alterno','dumbbell curl','curl de biceps con mancuernas'], group:'Bíceps', image:'curl-mancuernas.webp', youtubeUrl:'https://youtube.com/shorts/PdTbx71_HH0?si=uS-GB1iXjPlS4uma' },
    { name:'Curl martillo', aliases:['martillo','hammer curl','curl de martillo'], group:'Bíceps', image:'curl-martillo.webp', youtubeUrl:'https://youtube.com/shorts/rVi0b8ZzbXI?si=S2BmKNNz27W4Sp3i' },
    { name:'Curl predicador', aliases:['curl scott','preacher curl'], group:'Bíceps', image:'curl-predicador.webp', youtubeUrl:'' },
    { name:'Curl en polea', aliases:['cable curl','curl en polea baja'], group:'Bíceps', image:'curl-polea.webp', youtubeUrl:'https://youtube.com/shorts/OkTGdtsjwig?si=XfASiidxKnFlTW0a' },
    { name:'Plancha', aliases:['plancha abdominal','plank','forearm plank','plancha sobre antebrazos'], group:'Core', image:'plancha.webp', youtubeUrl:'' },
    { name:'Crunch abdominal', aliases:['crunch','abdominales','abdominal corto','floor crunch'], group:'Core', image:'crunch.webp', youtubeUrl:'' },
    { name:'Elevación de piernas colgado', aliases:['elevacion de piernas','elevación piernas','hanging leg raise'], group:'Core', image:'elevacion-piernas.webp', youtubeUrl:'' },
    { name:'Rueda abdominal', aliases:['ab wheel','rodillo abdominal'], group:'Core', image:'rueda-abdominal.webp', youtubeUrl:'' },
  { name:'Remo con mancuerna', aliases:['remo con mancuernas','dumbbell row','remo unilateral'], group:'Espalda', image:'remo-mancuerna.webp', youtubeUrl:'https://youtube.com/shorts/ZjzSSMTrxY0?si=2WA_EbJ0k_t7IRUd' },
  { name:'Remo frontal en polea', aliases:['remo en polea','seated cable row','remo sentado'], group:'Espalda', image:'remo-frontal-polea.webp', youtubeUrl:'https://youtube.com/shorts/4KwdXP-j_Uw?si=VzToHwJCQL_rLgJA' },
  { name:'Pull down', aliases:['pulldown','lat pulldown','jalón al pecho','jalon al pecho'], group:'Espalda', image:'pull-down.webp', youtubeUrl:'' },
  { name:'Dominadas', aliases:['dominada','pull up','pull-up'], group:'Espalda', image:'dominadas.webp', youtubeUrl:'https://youtube.com/shorts/JK5heVfCSy8?si=QaZ1_Ds0wWvk7Mk0' },
  { name:'Remo con barra', aliases:['barbell row','remo inclinado con barra'], group:'Espalda', image:'remo-barra.webp', youtubeUrl:'https://youtube.com/shorts/SLduniTLvzM?si=RwWXN2VJjaVI62Fm' },
  { name:'Remo en máquina', aliases:['machine row','remo sentado en maquina','remo máquina'], group:'Espalda', image:'remo-maquina.webp', youtubeUrl:'https://youtube.com/shorts/CAV10isKw-k?si=z_9fem6VsZriBVEy' },
  { name:'Pullover en polea', aliases:['pullover polea','straight arm pulldown','jalón brazos rectos'], group:'Espalda', image:'pullover-polea.webp', youtubeUrl:'' }
  ,{ name:'Encogimientos con mancuernas', aliases:['trapecio','shrugs','dumbbell shrug'], group:'Espalda', image:'encogimientos.webp', youtubeUrl:'' }
  ,{ name:'Remo T', aliases:['remo en t','t-bar row','landmine row'], group:'Espalda', image:'remo-t.webp', youtubeUrl:'https://youtube.com/shorts/UW5FEr7S_3A?si=NfPHs-lfV3F8FLJy' }
];

function normalizeExerciseName(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function findExerciseBankEntry(name){
  const target = normalizeExerciseName(name);
  if(!target) return null;
  return EXERCISE_BANK.find(item => [item.name, ...(item.aliases || [])].some(alias => normalizeExerciseName(alias) === target)) || null;
}
function exerciseBankSelectOptionsHtml(){
  return [...new Set(EXERCISE_BANK.map(item => item.group))].map(group => `<optgroup label="${escapeHtml(group)}">${EXERCISE_BANK.filter(item => item.group === group).map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}</optgroup>`).join('');
}
function closeExerciseBanks(exceptId){
  document.querySelectorAll('.exercise-bank-dropdown').forEach(panel => {
    if(panel.id !== exceptId) panel.classList.add('hidden');
  });
  document.querySelectorAll('.exercise-bank-select').forEach(button => {
    const panelId = button.getAttribute('aria-controls');
    button.setAttribute('aria-expanded', panelId === exceptId ? 'true' : 'false');
  });
}
function toggleExerciseBank(d, e, event){
  if(event) event.stopPropagation();
  const panelId = `exercise-bank-panel-${d}-${e}`;
  const panel = document.getElementById(panelId);
  if(!panel) return;
  const abrir = panel.classList.contains('hidden');
  closeExerciseBanks(abrir ? panelId : null);
  panel.classList.toggle('hidden', !abrir);
  if(abrir){
    const search = panel.querySelector('.exercise-bank-search');
    // Abrir el listado no debe levantar el teclado del celular. La búsqueda
    // sigue disponible si la persona decide tocarla expresamente.
    if(search){ search.value=''; filterExerciseBank(d, e, ''); }
  }
}
function filterExerciseBank(d, e, value){
  const panel = document.getElementById(`exercise-bank-panel-${d}-${e}`);
  if(!panel) return;
  const term = normalizeExerciseName(value);
  panel.querySelectorAll('.exercise-bank-option').forEach(option => {
    option.classList.toggle('hidden', term && !normalizeExerciseName(option.dataset.search).includes(term));
  });
  panel.querySelectorAll('.exercise-bank-group').forEach(group => {
    const visible = [...group.querySelectorAll('.exercise-bank-option')].some(option => !option.classList.contains('hidden'));
    group.classList.toggle('hidden', !visible);
  });
}
function seleccionarEjercicioBanco(d, e, name, event){
  if(event) event.stopPropagation();
  rutinaEditorDias[d].ejercicios[e].nombre = name;
  const input = document.getElementById(`exercise-bank-input-${d}-${e}`);
  if(input) input.value = name;
  closeExerciseBanks();
}
function exerciseBankSelectorHtml(d, e, value){
  const groups = [...new Set(EXERCISE_BANK.map(item => item.group))];
  const selected = value || '';
  return `<div class="exercise-bank-field" onclick="event.stopPropagation()">
    <div class="exercise-bank-combo">
      <input type="text" class="exercise-bank-direct-input" id="exercise-bank-input-${d}-${e}" value="${escapeHtml(selected)}" placeholder="Escribe o elige un ejercicio" autocomplete="off" oninput="rutinaEditorDias[${d}].ejercicios[${e}].nombre=this.value">
      <button type="button" class="exercise-bank-select exercise-bank-chevron-btn" id="exercise-bank-select-${d}-${e}" aria-label="Abrir banco de ejercicios" aria-haspopup="listbox" aria-expanded="false" aria-controls="exercise-bank-panel-${d}-${e}" onclick="toggleExerciseBank(${d},${e},event)">${ICONS.chevron}</button>
    </div>
    <div class="exercise-bank-dropdown hidden" id="exercise-bank-panel-${d}-${e}">
      <div class="exercise-bank-search-wrap">${ICONS.search}<input class="exercise-bank-search" type="search" placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" oninput="filterExerciseBank(${d},${e},this.value)"></div>
      <div class="exercise-bank-options" role="listbox">
        ${groups.map(group => `<section class="exercise-bank-group"><div class="exercise-bank-group-title">${escapeHtml(group)}</div>${EXERCISE_BANK.filter(item => item.group === group).map(item => {
          const jsName = item.name.replace(/'/g, "\\'");
          const search = [item.name, ...(item.aliases || []), item.group].join(' ');
          return `<button type="button" class="exercise-bank-option" role="option" data-search="${escapeHtml(search)}" onclick="seleccionarEjercicioBanco(${d},${e},'${jsName}',event)"><img src="${escapeHtml(item.image)}" alt=""><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.group)}</small></span>${ICONS.chevronRight}</button>`;
        }).join('')}</section>`).join('')}
      </div>
    </div>
  </div>`;
}

function simpleExerciseBankHtml(prefix, selected){
  const groups = [...new Set(EXERCISE_BANK.map(item => item.group))];
  return `<div class="simple-bank-picker" onclick="event.stopPropagation()">
    <input type="hidden" id="${prefix}-value" value="${escapeHtml(selected || '')}">
    <div class="exercise-bank-combo">
      <input type="text" class="exercise-bank-direct-input" id="${prefix}-text" value="${escapeHtml(selected || '')}" placeholder="Escribe para buscar un ejercicio" autocomplete="off" onfocus="openSimpleExerciseBank('${prefix}',event)" oninput="syncSimpleExerciseText('${prefix}',this.value)">
      <button type="button" class="exercise-bank-select exercise-bank-chevron-btn simple-bank-search-btn" id="${prefix}-select" aria-label="Buscar en el banco de ejercicios" aria-expanded="false" aria-controls="${prefix}-panel" onclick="toggleSimpleExerciseBank('${prefix}',event)">${ICONS.search}<span>Banco</span></button>
    </div>
    <div class="simple-bank-panel hidden" id="${prefix}-panel">
      <div class="simple-bank-title">${ICONS.search}<span><b>Banco de ejercicios</b><small id="${prefix}-bank-help">Toca un ejercicio para elegirlo</small></span></div>
      ${groups.map(group => `<section class="exercise-bank-group"><div class="exercise-bank-group-title">${escapeHtml(group)}</div>${EXERCISE_BANK.filter(item => item.group === group).map(item => {
        const jsName = item.name.replace(/'/g, "\\'");
        const search = [item.name, ...(item.aliases || []), item.group].join(' ');
        return `<div class="exercise-bank-option-row" data-simple-search="${escapeHtml(search)}"><button type="button" class="exercise-bank-option" onclick="selectSimpleExercise('${prefix}','${jsName}',event)"><img src="${escapeHtml(item.image)}" alt=""><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.group)}</small></span>${ICONS.chevronRight}</button>${renderWorkoutVideoIcon(item)}</div>`;
      }).join('')}</section>`).join('')}
      <div class="simple-bank-empty hidden" id="${prefix}-empty"><b>No está en el banco todavía</b><span>Puedes agregarlo igualmente escribiendo el nombre y usando el botón de abajo.</span></div>
    </div>
  </div>`;
}
function syncSimpleExerciseText(prefix, value){
  const hidden = document.getElementById(`${prefix}-value`);
  if(hidden) hidden.value = value;
  if(prefix === 'session-exercise') sessionExerciseSelection = value;
  openSimpleExerciseBank(prefix);
  filterSimpleExerciseBank(prefix, value);
}
function openSimpleExerciseBank(prefix, event){
  if(event) event.stopPropagation();
  const panel = document.getElementById(`${prefix}-panel`);
  const button = document.getElementById(`${prefix}-select`);
  if(!panel || !button) return;
  document.querySelectorAll('.simple-bank-panel').forEach(p => { if(p !== panel) p.classList.add('hidden'); });
  document.querySelectorAll('.simple-bank-picker .exercise-bank-select').forEach(b => { if(b !== button) b.setAttribute('aria-expanded','false'); });
  panel.classList.remove('hidden');
  button.setAttribute('aria-expanded','true');
}
function filterSimpleExerciseBank(prefix, value){
  const panel = document.getElementById(`${prefix}-panel`);
  if(!panel) return;
  const term = normalizeExerciseName(value);
  let visibles = 0;
  panel.querySelectorAll('[data-simple-search]').forEach(row => {
    const coincide = !term || normalizeExerciseName(row.dataset.simpleSearch).includes(term);
    row.classList.toggle('hidden', !coincide);
    if(coincide) visibles++;
  });
  panel.querySelectorAll('.exercise-bank-group').forEach(group => {
    const tieneVisibles = [...group.querySelectorAll('[data-simple-search]')].some(row => !row.classList.contains('hidden'));
    group.classList.toggle('hidden', !tieneVisibles);
  });
  const empty = document.getElementById(`${prefix}-empty`);
  if(empty) empty.classList.toggle('hidden', visibles > 0);
  const help = document.getElementById(`${prefix}-bank-help`);
  if(help) help.textContent = term ? `${visibles} resultado${visibles === 1 ? '' : 's'} · toca uno para elegirlo` : `${EXERCISE_BANK.length} ejercicios · toca uno para elegirlo`;
}
function toggleSimpleExerciseBank(prefix, event){
  if(event) event.stopPropagation();
  const panel = document.getElementById(`${prefix}-panel`);
  const button = document.getElementById(`${prefix}-select`);
  if(!panel || !button) return;
  const abrir = panel.classList.contains('hidden');
  document.querySelectorAll('.simple-bank-panel').forEach(p => { if(p !== panel) p.classList.add('hidden'); });
  document.querySelectorAll('.simple-bank-picker .exercise-bank-select').forEach(b => { if(b !== button) b.setAttribute('aria-expanded','false'); });
  panel.classList.toggle('hidden', !abrir);
  button.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  if(abrir){
    const textInput = document.getElementById(`${prefix}-text`);
    filterSimpleExerciseBank(prefix, textInput ? textInput.value : '');
  }
}
function selectSimpleExercise(prefix, name, event){
  if(event) event.stopPropagation();
  const input = document.getElementById(`${prefix}-value`);
  const textInput = document.getElementById(`${prefix}-text`);
  const button = document.getElementById(`${prefix}-select`);
  const panel = document.getElementById(`${prefix}-panel`);
  if(input) input.value = name;
  if(textInput) textInput.value = name;
  if(button){
    button.setAttribute('aria-expanded','false');
  }
  if(panel) panel.classList.add('hidden');
  if(prefix === 'session-exercise') sessionExerciseSelection = name;
}
document.addEventListener('click', () => closeExerciseBanks());
document.addEventListener('click', () => {
  document.querySelectorAll('.simple-bank-panel').forEach(panel => panel.classList.add('hidden'));
  document.querySelectorAll('.simple-bank-picker .exercise-bank-select').forEach(button => button.setAttribute('aria-expanded','false'));
});
function openExerciseImage(src, name){
  const existing = document.getElementById('exercise-image-viewer');
  if(existing) existing.remove();
  const viewer = document.createElement('div');
  viewer.id = 'exercise-image-viewer';
  viewer.className = 'exercise-image-viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', `Demostración de ${name}`);
  viewer.innerHTML = `<button type="button" class="exercise-image-close" aria-label="Cerrar">×</button><figure><img src="${escapeHtml(src)}" alt="Referencia técnica de ${escapeHtml(name)}"><figcaption>${escapeHtml(name)} · referencia técnica</figcaption></figure>`;
  viewer.onclick = (event) => { if(event.target === viewer || event.target.closest('.exercise-image-close')) viewer.remove(); };
  document.body.appendChild(viewer);
}

// ---------- ICONOGRAFÍA (SVG inline, heredan el color del texto) ----------
const ICONS = {
  bell: `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  inbox: `<svg class="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="M3.5 6.5 12 13l8.5-6.5"></path></svg>`,
  bell: `<svg class="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>`,
  chevron: `<svg class="icon icon-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  chevronRight: `<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  clipboard: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="13" y2="15"></line></svg>`,
  calendar: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  trending: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
  book: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5h6a3.5 3.5 0 0 1 3.5 3.5v13a2.5 2.5 0 0 0-2.5-2.5H2z"></path><path d="M22 4.5h-6a3.5 3.5 0 0 0-3.5 3.5v13a2.5 2.5 0 0 1 2.5-2.5H22z"></path></svg>`,
  logout: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  download: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  plus: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  check: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  arrowLeft: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
  activity: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
  camera: `<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  users: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  link: `<svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
  message: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
  share: `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`,
  search: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  mic: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
  edit: `<svg class="icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 21 12 6 21"></polygon></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18"></rect><rect x="14" y="3" width="5" height="18"></rect></svg>`
  ,youtube: `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"></path></svg>`
};
// Markup del lado derecho de un botón-toggle: texto según estado + flecha que rota.
function toggleStateHtml(closedTxt){
  closedTxt = closedTxt || 'Ver';
  return `<span class="toggle-state"><span class="txt-closed">${closedTxt}</span><span class="txt-open">Ocultar</span>${ICONS.chevron}</span>`;
}
// Abre/cierra una sección colapsable: pone .open en el botón, saca/pone .hidden en el contenedor,
// y dispara una pequeña animación de aparición.
function setToggleOpen(btnId, holderId, abrir){
  const btn = document.getElementById(btnId);
  const holder = document.getElementById(holderId);
  if(!btn || !holder) return;
  btn.classList.toggle('open', abrir);
  holder.classList.toggle('hidden', !abrir);
  if(abrir){
    holder.classList.remove('reveal-in');
    void holder.offsetWidth;
    holder.classList.add('reveal-in');
  }
}
// Conecta un botón-toggle con su contenedor. onOpen (opcional) corre solo al abrir
// (útil para inicializar el gráfico de progreso recién cuando se ve por primera vez).
function wireToggle(btnId, holderId, onOpen){
  const btn = document.getElementById(btnId);
  const holder = document.getElementById(holderId);
  if(!btn || !holder) return;
  btn.onclick = () => {
    const abrir = holder.classList.contains('hidden');
    setToggleOpen(btnId, holderId, abrir);
    if(abrir && onOpen) onOpen();
  };
}
function hideSplash(){
  const el = document.getElementById('splash');
  if(!el) return;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 400);
}

// ---------- HELPERS ----------
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2400);
}
// Marca fija de récord personal (corona). Se usa en la sesión activa y en el historial.
function prPillHtml(){
  const corona = window.UCKilo ? window.UCKilo.corona('pr-corona-mini') : '';
  return `<span class="pill pr pr-corona">${corona}PR</span>`;
}
// Estado vacío con Kilo (la mascota). Si kilo.js no cargó, queda el texto solo.
function emptyKiloHtml(msg, estado, extraStyle){
  const kilo = window.UCKilo ? `<div class="empty-kilo-fig">${window.UCKilo.svg(estado || 'espera', 64)}</div>` : '';
  return `<div class="empty empty-kilo"${extraStyle ? ` style="${extraStyle}"` : ''}>${kilo}<div>${msg}</div></div>`;
}
// Botón para activar/silenciar los sonidos de la app (se recuerda en este celular).
function sonidoBtnHtml(){
  const on = window.UCKilo ? window.UCKilo.sonidoActivo() : true;
  return `<button type="button" class="btn-sm sonido-toggle" id="btn-sonido" aria-pressed="${on}" title="${on ? 'Silenciar sonidos' : 'Activar sonidos'}">${on ? '🔊' : '🔇'}<span class="sr-only">${on ? 'Silenciar sonidos' : 'Activar sonidos'}</span></button>`;
}
function conectarSonidoBtn(){
  const b = document.getElementById('btn-sonido');
  if(!b || !window.UCKilo) return;
  b.onclick = () => {
    const on = !window.UCKilo.sonidoActivo();
    window.UCKilo.setSonido(on);
    b.outerHTML = sonidoBtnHtml();
    conectarSonidoBtn();
    if(on) window.UCKilo.sonido('serie');
    showToast(on ? 'Sonidos activados' : 'Sonidos silenciados');
  };
}
function rutinaCreadaPorAlumno(rutina){
  return !!rutina && rutina.origen === 'alumno';
}
function alumnoPuedeEditarRutina(rutina){
  return false;
}
function routineOriginBadge(rutina, vistaAlumno){
  const propia = rutinaCreadaPorAlumno(rutina);
  const texto = propia
    ? (vistaAlumno ? 'Creada por ti' : 'Creada por el alumno')
    : (vistaAlumno ? 'Indicada por tu profesor' : 'Creada por profesor');
  return `<span class="routine-origin-badge ${propia ? 'is-student' : 'is-coach'}">${propia ? ICONS.edit : ICONS.users} ${texto}</span>`;
}
function escapeHtml(s){
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}
// Fecha de HOY según el reloj del celular (hora de Chile), no en UTC.
// Antes se usaba toISOString(), que está en UTC: después de las 21:00 en Chile
// ya era "mañana" y el entrenamiento quedaba guardado con la fecha del día siguiente.
function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Recuerda en este celular qué sesiones ya se finalizaron (para que el inicio
// muestre "completado" en vez de "sigue en marcha"). No toca la base de datos.
function marcarSesionFinalizada(id){
  try { if(id) localStorage.setItem(`uc_sesion_finalizada_${id}`, '1'); } catch(e){}
}
function sesionFinalizada(id){
  try { return !!id && localStorage.getItem(`uc_sesion_finalizada_${id}`) === '1'; } catch(e){ return false; }
}
function desmarcarSesionFinalizada(id){
  try { if(id) localStorage.removeItem(`uc_sesion_finalizada_${id}`); } catch(e){}
}
// Cambio de día automático: si pasa la medianoche con la app abierta (o el
// alumno vuelve a abrirla otro día), el inicio se vuelve a dibujar para mostrar
// el día nuevo. Solo actúa si el alumno está en la pantalla de inicio, para no
// interrumpir un registro en curso, un chat u otra pantalla.
let ucFechaVista = todayStr();
function revisarCambioDeDia(){
  const hoy = todayStr();
  if(hoy === ucFechaVista) return;
  ucFechaVista = hoy;
  if(typeof profile !== 'undefined' && profile && profile.role === 'alumno' && !activeSesionId && document.getElementById('btn-nueva-sesion')){
    renderAlumnoHome();
  }
}
setInterval(revisarCambioDeDia, 60 * 1000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') revisarCambioDeDia(); });
function formatDate(iso){
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

// ---------- TIPO DE SERIE / LADO (drop set, rest-pause, forzada al fallo, unilateral/bilateral) ----------
// Campos opcionales y aditivos: no reemplazan nada de lo que ya existía (reps/peso/nota).
const TIPO_SERIE_LABELS = { drop_set: 'Drop set', rest_pause: 'Rest-pause', forzada: 'Forzada al fallo' };
const LADO_LABELS = { unilateral: 'Unilateral', bilateral: 'Bilateral', peso_por_lado: 'Peso por lado' };
function selectTipoSerieHtml(id, valorActual, onchangeExpr){
  const v = valorActual || '';
  const onchange = onchangeExpr ? ` onchange="${onchangeExpr.replace(/"/g,'&quot;')}"` : '';
  return `<select id="${id}"${onchange}>
    <option value=""${v===''?' selected':''}>Tipo de serie (opcional)</option>
    <option value="drop_set"${v==='drop_set'?' selected':''}>Drop set</option>
    <option value="rest_pause"${v==='rest_pause'?' selected':''}>Rest-pause</option>
    <option value="forzada"${v==='forzada'?' selected':''}>Forzada al fallo</option>
  </select>`;
}
function selectLadoHtml(id, valorActual, onchangeExpr){
  const v = valorActual || '';
  const onchange = onchangeExpr ? ` onchange="${onchangeExpr.replace(/"/g,'&quot;')}"` : '';
  return `<select id="${id}"${onchange}>
    <option value=""${v===''?' selected':''}>Lado (opcional)</option>
    <option value="unilateral"${v==='unilateral'?' selected':''}>Unilateral</option>
    <option value="bilateral"${v==='bilateral'?' selected':''}>Bilateral</option>
    <option value="peso_por_lado"${v==='peso_por_lado'?' selected':''}>Peso por lado</option>
  </select>`;
}
function renderTipoLadoPills(tipoSerie, lado){
  const tipoPill = tipoSerie && TIPO_SERIE_LABELS[tipoSerie] ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${TIPO_SERIE_LABELS[tipoSerie]}</span>` : '';
  const ladoPill = lado && LADO_LABELS[lado] ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${LADO_LABELS[lado]}</span>` : '';
  return `${tipoPill}${ladoPill}`;
}
function formatDateShort(iso){
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { day:'numeric', month:'short' });
}
function mondayOf(iso){
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0,10);
}
function addDaysStr(iso, days){
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
// Vigencia (solo vista profe/super admin): true si la fecha ya pasó su plazo de días.
function estaVencida(fechaIso, diasVigencia){
  if(!fechaIso) return false;
  return fechaIso < addDaysStr(todayStr(), -diasVigencia);
}
// Línea de estado "Rutina: 12 ago (vencida)" — en rojo si venció. Uso exclusivo de vistas de coach/super admin.
// notaExtra es opcional (ej. "no aplica"/"no quiso") — se agrega entre paréntesis
// junto a la fecha, para las filas de excepción de medición (que sí tienen fecha
// y sí se vencen igual que una medición real, pero no son una medición de verdad).
function renderEstadoVencimiento(label, fechaIso, diasVigencia, sinRegistroTexto, notaExtra){
  if(!fechaIso) return `<span>${escapeHtml(label)}: ${escapeHtml(sinRegistroTexto)}</span>`;
  const vencida = estaVencida(fechaIso, diasVigencia);
  const notaTxt = notaExtra ? ` (${escapeHtml(notaExtra)})` : '';
  const texto = `${escapeHtml(label)}: ${formatDateShort(fechaIso)}${notaTxt}${vencida ? ' (vencida)' : ''}`;
  return vencida ? `<span style="color:var(--red); font-weight:600;">${texto}</span>` : `<span>${texto}</span>`;
}

// Texto corto para mostrar el "tipo" de una fila de medición/excepción.
function notaTipoMedicion(tipo){
  if(tipo === 'no_aplica') return 'no aplica';
  if(tipo === 'no_quiso') return 'no quiso';
  return null;
}

function computeStreak(fechas){
  if(!fechas.length) return 0;
  const weekSet = new Set(fechas.map(mondayOf));
  let streak = 0;
  let cursor = mondayOf(todayStr());
  while(weekSet.has(cursor)){
    streak++;
    cursor = addDaysStr(cursor, -7);
  }
  return streak;
}

// Resumen superior de Progresión. Usa exclusivamente datos que ya están
// guardados en STC App: semanas con sesiones, entrenamientos con series y
// récords detectados al comparar cada marca con el historial anterior.
function calcularResumenProgreso(sesiones, streak){
  const entrenamientos = sesiones || [];
  const series = entrenamientos.flatMap(s => s.sesion_series || []);
  return {
    racha: Number(streak) || 0,
    sesiones: entrenamientos.length,
    records: series.filter(set => set._isPR).length
  };
}

function renderResumenProgresoHtml(resumen){
  const r = resumen || { racha: 0, sesiones: 0, records: 0 };
  return `
    <section class="progress-overview" aria-label="Resumen de tu progreso">
      <div class="progress-overview-heading">
        <span>Tu progreso</span>
        <small>Calculado con tus entrenamientos guardados</small>
      </div>
      <div class="progress-summary-grid">
        <article class="progress-summary-card progress-summary-streak">
          <span class="progress-summary-icon" aria-hidden="true">🔥</span>
          <strong>${r.racha}</strong>
          <b>semana${r.racha === 1 ? '' : 's'}</b>
          <small>Racha actual</small>
        </article>
        <article class="progress-summary-card progress-summary-sessions">
          <span class="progress-summary-icon" aria-hidden="true">🏋️</span>
          <strong>${r.sesiones}</strong>
          <b>sesión${r.sesiones === 1 ? '' : 'es'}</b>
          <small>Entrenamientos</small>
        </article>
        <article class="progress-summary-card progress-summary-records">
          <span class="progress-summary-icon" aria-hidden="true">🏆</span>
          <strong>${r.records}</strong>
          <b>récord${r.records === 1 ? '' : 's'}</b>
          <small>Mejores marcas</small>
        </article>
      </div>
    </section>`;
}

// Marca cuáles series son PR (récord personal), procesando en orden cronológico.
// Recuerda qué series ya guardadas son récord (según markPRs del inicio), para
// que al retomar una sesión de hoy sus récords sigan marcados con la corona
// y aparezcan en el resumen final. Solo memoria; no toca la base de datos.
let mapaPRsPorSerie = {};
function guardarMapaPRs(sesiones){
  mapaPRsPorSerie = {};
  (sesiones || []).forEach(s => (s.sesion_series || []).forEach(set => {
    if(set.id && set._isPR) mapaPRsPorSerie[set.id] = true;
  }));
}
function aplicarMapaPRs(grupos){
  (grupos || []).forEach(g => (g.sets || []).forEach(set => {
    if(set.id && mapaPRsPorSerie[set.id]) set._isPR = true;
  }));
}

function markPRs(sesiones){
  const ordenadas = [...sesiones].sort((a,b)=> new Date(a.fecha) - new Date(b.fecha) || new Date(a.created_at) - new Date(b.created_at));
  const maxPorEjercicio = {};
  ordenadas.forEach(s => {
    const series = (s.sesion_series || []).slice().sort((a,b)=> (a.orden||0)-(b.orden||0));
    series.forEach(set => {
      const base = set.ejercicio_nombre.trim().toLowerCase();
      const porTiempo = esSeg(set.unidad) && !(Number(set.peso) > 0);
      const key = porTiempo ? base + '|seg' : base;
      const valor = porTiempo ? (Number(set.reps) || 0) : (Number(set.peso) || 0);
      const max = maxPorEjercicio[key] || 0;
      set._isPR = valor > max && valor > 0;
      if(valor > max) maxPorEjercicio[key] = valor;
    });
  });
  return sesiones;
}

// Calcula, por ejercicio, el peso máximo histórico (para detectar un récord
// personal al instante) y el último peso registrado (para sugerir un peso
// al agregar ese ejercicio de nuevo) — mismo criterio cronológico que markPRs.
// Para "La vez pasada": el último set con peso de cada ejercicio, mirando
// solo sesiones anteriores a hoy (así no cambia mientras entrenas).
function computeUltimaVez(sesiones, fechaHoy){
  const ordenadas = [...sesiones].filter(s => s.fecha !== fechaHoy)
    .sort((a,b)=> new Date(a.fecha) - new Date(b.fecha) || new Date(a.created_at) - new Date(b.created_at));
  const out = {};
  ordenadas.forEach(s => {
    (s.sesion_series || []).slice().sort((a,b)=> (a.orden||0)-(b.orden||0)).forEach(set => {
      const peso = Number(set.peso) || 0;
      if(peso <= 0 && !set.reps) return;
      out[set.ejercicio_nombre.trim().toLowerCase()] = { peso, reps: set.reps, unidad: set.unidad || 'reps', fecha: s.fecha };
    });
  });
  return out;
}

function computeStatsPorEjercicio(sesiones){
  const ordenadas = [...sesiones].sort((a,b)=> new Date(a.fecha) - new Date(b.fecha) || new Date(a.created_at) - new Date(b.created_at));
  const stats = {};
  ordenadas.forEach(s => {
    const series = (s.sesion_series || []).slice().sort((a,b)=> (a.orden||0)-(b.orden||0));
    series.forEach(set => {
      const base = set.ejercicio_nombre.trim().toLowerCase();
      const porTiempo = esSeg(set.unidad) && !(Number(set.peso) > 0);
      const key = porTiempo ? base + '|seg' : base;
      const peso = porTiempo ? (Number(set.reps) || 0) : (Number(set.peso) || 0);
      if(peso <= 0) return;
      if(!stats[key]) stats[key] = { max: 0, last: 0 };
      if(peso > stats[key].max) stats[key].max = peso;
      stats[key].last = peso;
    });
  });
  return stats;
}

function groupSets(series){
  const groups = [];
  (series || []).slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).forEach(set => {
    let g = groups.find(g => g.nombre.toLowerCase() === set.ejercicio_nombre.toLowerCase());
    if(!g){ g = { nombre: set.ejercicio_nombre, sets: [] }; groups.push(g); }
    g.sets.push(set);
  });
  return groups;
}

// Agrupa los ejercicios de una rutina por día (Día 1 — Empuje, Día 2 — Tracción, etc.)
function groupPorDia(ejercicios){
  const dias = [];
  (ejercicios || []).slice()
    .sort((a,b) => (a.dia_orden||0)-(b.dia_orden||0) || (a.orden||0)-(b.orden||0))
    .forEach(ex => {
      const nombreDia = ex.dia_nombre || 'Rutina';
      let d = dias.find(d => d.nombre === nombreDia);
      if(!d){ d = { nombre: nombreDia, ejercicios: [] }; dias.push(d); }
      d.ejercicios.push(ex);
    });
  return dias;
}
// ============================================================
// RUTINA FUNCIONAL: Circuito · Tabata · EMOM · AMRAP
// ============================================================
// Un día de la rutina puede ser de "fuerza" (series × reps, como siempre) o
// "funcional". La configuración del día funcional (formato, vueltas, tiempos)
// se guarda en la columna rutina_ejercicios.circuito (jsonb), repetida en cada
// ejercicio de ese día. Así hereda exactamente los mismos permisos (RLS) de la
// rutina y no necesita tablas nuevas. Los días de fuerza no la usan (null).
const FX_FORMATOS = {
  circuito: { nombre: 'Circuito', corto: 'Vueltas + descansos', icono: '↻',
    ayuda: 'Una secuencia de ejercicios que se repite por vueltas, con descansos fijos. El más versátil.' },
  tabata: { nombre: 'Tabata', corto: '20 s / 10 s × 8', icono: '⚡',
    ayuda: '20 s a máxima intensidad y 10 s de pausa, 8 veces (4 min). Muy exigente: para alumnos con base.' },
  emom: { nombre: 'EMOM', corto: 'Una tarea cada minuto', icono: '⏱',
    ayuda: 'Al empezar cada minuto haces las reps indicadas y descansas lo que sobre del minuto.' },
  amrap: { nombre: 'AMRAP', corto: 'Máx. vueltas en X min', icono: '🔥',
    ayuda: 'Todas las vueltas posibles en un tiempo fijo. Ideal para medir progreso semana a semana.' }
};
const FX_LIMITES = {
  vueltas: [1, 20], descanso_ej: [0, 600], descanso_vuelta: [0, 900],
  rondas: [1, 40], trabajo: [5, 300], pausa: [0, 300],
  minutos: [1, 90], intervalo: [30, 300]
};

function fxDefaults(formato){
  if(formato === 'tabata') return { v: 1, formato, rondas: 8, trabajo: 20, pausa: 10 };
  if(formato === 'emom') return { v: 1, formato, minutos: 12, intervalo: 60 };
  if(formato === 'amrap') return { v: 1, formato, minutos: 15 };
  return { v: 1, formato: 'circuito', vueltas: 3, descanso_ej: 60, descanso_vuelta: 120 };
}
function fxNormalizar(c){
  if(!c || typeof c !== 'object') return null;
  const formato = FX_FORMATOS[c.formato] ? c.formato : 'circuito';
  const out = fxDefaults(formato);
  Object.keys(out).forEach(k => {
    if(k === 'v' || k === 'formato') return;
    const n = parseInt(c[k], 10);
    const lim = FX_LIMITES[k];
    if(Number.isFinite(n)) out[k] = lim ? Math.min(lim[1], Math.max(lim[0], n)) : n;
  });
  return out;
}
// Configuración funcional de un día (o null si es un día de fuerza)
function fxDeDia(dia){
  if(!dia) return null;
  if(dia.circuito) return fxNormalizar(dia.circuito);
  const ex = (dia.ejercicios || []).find(e => e && e.circuito);
  return ex ? fxNormalizar(ex.circuito) : null;
}
function fxNum(v){ const n = parseInt(String(v == null ? '' : v).replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : 0; }
function fxPesoNum(v){ const m = String(v || '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
function fxTiempo(seg){
  const s = Math.max(0, Math.round(seg));
  if(s < 60) return `${s} s`;
  return s % 60 ? fmtSeg(s) : `${s / 60} min`;
}
// "45 s" o "12 reps" según el formato y la unidad del ejercicio
function fxTrabajoTexto(ex, cfg){
  if(cfg && cfg.formato === 'tabata') return `${cfg.trabajo} s`;
  const val = ex && ex.reps_objetivo;
  if(!val) return esSeg(ex && ex.unidad_objetivo) ? '— s' : '— reps';
  return esSeg(ex.unidad_objetivo) ? `${fxNum(val)} s` : `${val} reps`;
}
// Segundos estimados de trabajo de un ejercicio (reps ≈ 3 s c/u)
function fxSegEjercicio(ex, cfg){
  if(cfg.formato === 'tabata') return cfg.trabajo;
  if(esSeg(ex.unidad_objetivo)) return fxNum(ex.reps_objetivo) || 30;
  return Math.max(15, (fxNum(ex.reps_objetivo) || 10) * 3);
}
function fxDuracionSeg(cfg, ejercicios){
  const exs = (ejercicios || []).filter(e => e && (e.nombre || '').trim());
  if(!cfg) return 0;
  if(cfg.formato === 'tabata') return cfg.rondas * cfg.trabajo + Math.max(0, cfg.rondas - 1) * cfg.pausa;
  if(cfg.formato === 'emom' || cfg.formato === 'amrap') return cfg.minutos * 60;
  if(!exs.length) return 0;
  const porVuelta = exs.reduce((a, e) => a + fxSegEjercicio(e, cfg), 0) + cfg.descanso_ej * (exs.length - 1);
  return cfg.vueltas * porVuelta + Math.max(0, cfg.vueltas - 1) * cfg.descanso_vuelta;
}
function fxDuracionTexto(cfg, ejercicios){
  const s = fxDuracionSeg(cfg, ejercicios);
  if(!s) return '—';
  return `≈ ${Math.max(1, Math.round(s / 60))} min`;
}
function fxResumenTexto(cfg){
  if(!cfg) return '';
  if(cfg.formato === 'tabata') return `${cfg.rondas} rondas · ${cfg.trabajo} s trabajo / ${cfg.pausa} s pausa`;
  if(cfg.formato === 'emom') return `${cfg.minutos} min · ${cfg.intervalo === 60 ? 'cada minuto' : `cada ${fxTiempo(cfg.intervalo)}`} cambias de ejercicio`;
  if(cfg.formato === 'amrap') return `${cfg.minutos} min · todas las vueltas posibles`;
  return `${cfg.vueltas} vuelta${cfg.vueltas === 1 ? '' : 's'} · ${fxTiempo(cfg.descanso_ej)} entre ejercicios · ${fxTiempo(cfg.descanso_vuelta)} entre vueltas`;
}

// Banda que aparece en la vista de la rutina (alumno y profe)
function fxBannerHtml(dia){
  const cfg = fxDeDia(dia);
  if(!cfg) return '';
  const f = FX_FORMATOS[cfg.formato];
  return `<div class="fx-banner"><span class="fx-tag">⚡ Funcional · ${escapeHtml(f.nombre)}</span><span class="fx-banner-txt">${escapeHtml(fxResumenTexto(cfg))}</span><b>${escapeHtml(fxDuracionTexto(cfg, dia.ejercicios))}</b></div>`;
}

// ---------- Elegir plantilla al crear una rutina nueva ----------
function fxPlantillaHtml(){
  return `
    <button type="button" class="fx-tpl" data-plantilla="fuerza">
      <span class="fx-tpl-ic">🏋️</span>
      <span class="fx-tpl-txt"><b>Fuerza</b><small>Series, repeticiones y kilos por ejercicio. La plantilla de siempre.</small></span>
      <span class="fx-tpl-go">›</span>
    </button>
    <div class="fx-tpl fx-tpl-func">
      <span class="fx-nuevo">NUEVO</span>
      <span class="fx-tpl-ic">⚡</span>
      <span class="fx-tpl-txt"><b>Funcional</b><small>Secuencias de ejercicios por vueltas, con tiempos de trabajo y descanso. Ideal para entrenar en casa.</small></span>
    </div>
    <div class="fx-tpl-label">Elige el formato</div>
    <div class="fx-formatos fx-formatos-grandes">
      ${Object.entries(FX_FORMATOS).map(([k, f]) => `
        <button type="button" class="fx-fm" data-plantilla="${k}">
          <b>${f.icono} ${escapeHtml(f.nombre)}</b><span>${escapeHtml(f.corto)}</span><small>${escapeHtml(f.ayuda)}</small>
        </button>`).join('')}
    </div>
    <div class="fx-tip">💡 Puedes mezclar: cada día de la rutina puede ser de fuerza o funcional. Lo cambias arriba de cada día.</div>`;
}

// ---------- Editor de un día funcional ----------
function fxTipoDiaHtml(d){
  const cfg = fxDeDia(rutinaEditorDias[d]);
  return `<div class="fx-tipo-dia" role="group" aria-label="Tipo de día">
    <button type="button" class="${cfg ? '' : 'on'}" onclick="fxCambiarTipoDia(${d}, null)">🏋️ Fuerza</button>
    <button type="button" class="${cfg ? 'on' : ''}" onclick="fxCambiarTipoDia(${d}, '${cfg ? cfg.formato : 'circuito'}')">⚡ Funcional</button>
  </div>`;
}
function fxCfgHtml(d, key, label, tiempo, color){
  const cfg = fxDeDia(rutinaEditorDias[d]);
  const val = cfg[key];
  return `<div class="fx-cf ${color || ''}"><small>${label}</small>
    <div class="fx-cf-f">
      <button type="button" onclick="fxCfgPaso(${d}, '${key}', -1)" aria-label="Menos">−</button>
      <span>${tiempo ? escapeHtml(fmtSeg(val)) : val}</span>
      <button type="button" onclick="fxCfgPaso(${d}, '${key}', 1)" aria-label="Más">+</button>
    </div></div>`;
}
const FX_PASOS = { vueltas: 1, descanso_ej: 15, descanso_vuelta: 15, rondas: 1, trabajo: 5, pausa: 5, minutos: 1, intervalo: 15 };
function fxCfgPaso(d, key, dir){
  const dia = rutinaEditorDias[d];
  const cfg = fxDeDia(dia);
  if(!cfg) return;
  const lim = FX_LIMITES[key];
  cfg[key] = Math.min(lim[1], Math.max(lim[0], (cfg[key] || 0) + dir * (FX_PASOS[key] || 1)));
  dia.circuito = cfg;
  if(window.UCKilo) window.UCKilo.vibrar(8);
  renderRutinaDiasEditor();
}
function fxCambiarTipoDia(d, formato){
  const dia = rutinaEditorDias[d];
  if(!dia) return;
  if(!formato){ dia.circuito = null; dia.ejercicios.forEach(ex => { delete ex.circuito; }); }
  else if(!fxDeDia(dia)) dia.circuito = fxDefaults(formato);
  rutinaExAbierto = null;
  renderRutinaDiasEditor();
}
function fxCambiarFormato(d, formato){
  const dia = rutinaEditorDias[d];
  if(!dia || !FX_FORMATOS[formato]) return;
  dia.circuito = fxDefaults(formato);
  dia.ejercicios.forEach(ex => { delete ex.circuito; });
  renderRutinaDiasEditor();
  showToast(`${FX_FORMATOS[formato].icono} ${FX_FORMATOS[formato].nombre}: ${FX_FORMATOS[formato].corto}`);
}

function fxEditorDiaHtml(d){
  const dia = rutinaEditorDias[d];
  const cfg = fxDeDia(dia);
  const exs = dia.ejercicios;
  const f = cfg.formato;
  let config = '';
  if(f === 'circuito') config = fxCfgHtml(d, 'vueltas', 'VUELTAS', false, 'lima') + fxCfgHtml(d, 'descanso_ej', 'DESCANSO ENTRE EJERC.', true, 'naranja') + fxCfgHtml(d, 'descanso_vuelta', 'DESCANSO ENTRE VUELTAS', true, 'naranja');
  else if(f === 'tabata') config = fxCfgHtml(d, 'rondas', 'RONDAS', false, 'lima') + fxCfgHtml(d, 'trabajo', 'TRABAJO', true, 'lima') + fxCfgHtml(d, 'pausa', 'PAUSA', true, 'naranja');
  else if(f === 'emom') config = fxCfgHtml(d, 'minutos', 'MINUTOS TOTALES', false, 'lima') + fxCfgHtml(d, 'intervalo', 'CADA', true, 'naranja');
  else config = fxCfgHtml(d, 'minutos', 'MINUTOS TOTALES', false, 'lima');

  const pasos = exs.map((row, e) => {
    if(rutinaExAbierto === `${d}-${e}`) return fxTarjetaAbiertaHtml(row, d, e, exs.length, cfg);
    const entry = findExerciseBankEntry(row.nombre);
    const img = entry && entry.image ? `<img src="${escapeHtml(entry.image)}" alt="">` : `<span class="red-img-vacia">${ICONS.clipboard}</span>`;
    const sinTrabajo = f !== 'tabata' && !row.reps_objetivo;
    const extra = f === 'emom' ? `<small class="fx-step-sub">Min ${fxMinutosEmom(e, exs.length, cfg)}</small>` : (row.peso_objetivo ? `<small class="fx-step-sub">${escapeHtml(row.peso_objetivo)}</small>` : '');
    let html = `<div class="fx-step" onclick="abrirTarjetaRutina(${d},${e})">
        <span class="fx-step-n">${e + 1}</span>${img}
        <span class="fx-step-txt"><b>${escapeHtml(row.nombre || 'Ejercicio')}</b>${extra}</span>
        <span class="fx-chip ${esSeg(row.unidad_objetivo) || f === 'tabata' ? '' : 'reps'} ${sinTrabajo ? 'falta' : ''}">${sinTrabajo ? 'Completar' : escapeHtml(fxTrabajoTexto(row, cfg))}</span>
      </div>`;
    if(e < exs.length - 1){
      if(f === 'circuito' && cfg.descanso_ej > 0) html += `<div class="fx-rest">⏱ ${escapeHtml(fmtSeg(cfg.descanso_ej))} descanso</div>`;
      else if(f === 'tabata' && cfg.pausa > 0) html += `<div class="fx-rest">⏱ ${cfg.pausa} s pausa</div>`;
      else html += '<div class="fx-rest fx-rest-0"></div>';
    }
    return html;
  }).join('');

  let pie = '';
  if(exs.length){
    if(f === 'circuito') pie = `↻ Fin de vuelta · ${escapeHtml(fmtSeg(cfg.descanso_vuelta))} descanso · repetir × ${cfg.vueltas}`;
    else if(f === 'tabata') pie = `↻ ${cfg.rondas} rondas rotando los ${exs.length} ejercicio${exs.length === 1 ? '' : 's'} en orden`;
    else if(f === 'emom') pie = `↻ Cada ${escapeHtml(fxTiempo(cfg.intervalo))} pasas al siguiente · ${cfg.minutos} min en total`;
    else pie = `↻ Repite la lista completa todas las veces que puedas en ${cfg.minutos} min`;
  }
  return `
    <div class="fx-formatos">${Object.entries(FX_FORMATOS).map(([k, fm]) => `<button type="button" class="fx-fm ${k === f ? 'on' : ''}" onclick="fxCambiarFormato(${d}, '${k}')"><b>${fm.icono} ${escapeHtml(fm.nombre)}</b><span>${escapeHtml(fm.corto)}</span></button>`).join('')}</div>
    <div class="fx-cfg fx-cfg-${f}">${config}</div>
    ${pasos || `<div class="red-vacio">Este circuito aún no tiene ejercicios.<br>Toca <b>＋ Agregar ejercicio</b> o la lupa 🔍 para buscarlos.</div>`}
    ${pie ? `<div class="fx-round">${pie}</div>` : ''}
    <div class="red-agregar">
      <button type="button" class="red-btn-agregar" onclick="abrirBuscadorRutina(${d})">＋ Agregar ejercicio</button>
      <button type="button" class="red-btn-lupa" onclick="abrirBuscadorRutina(${d})" aria-label="Buscar ejercicio">${ICONS.search}</button>
    </div>
    <div class="fx-tot"><span>${exs.length} ejercicio${exs.length === 1 ? '' : 's'}${f === 'circuito' && exs.length ? ` × ${cfg.vueltas} vuelta${cfg.vueltas === 1 ? '' : 's'}` : ''}</span><span>Duración <b>${escapeHtml(fxDuracionTexto(cfg, exs))}</b></span></div>
    <div class="fx-tip">💡 ${escapeHtml(fxConsejo(f))}</div>`;
}
function fxMinutosEmom(e, n, cfg){
  const total = Math.max(1, Math.round(cfg.minutos * 60 / cfg.intervalo));
  const mins = [];
  for(let k = e; k < total && mins.length < 4; k += n) mins.push(k + 1);
  return mins.join(', ') + (e + n * 4 < total ? '…' : '');
}
function fxConsejo(f){
  if(f === 'tabata') return 'Usa ejercicios simples y seguros a alta velocidad (sentadilla, escaladores, saltos). Evita técnica compleja con carga.';
  if(f === 'emom') return 'Elige reps que tome 30–40 s hacer, así queda descanso dentro del minuto. Si no alcanzas a descansar, baja las reps.';
  if(f === 'amrap') return 'Anota las vueltas al final: la próxima vez el objetivo es hacer al menos una más.';
  return 'Alterna zonas del cuerpo (pierna → empuje → pierna → tracción → core) para descansar un músculo mientras trabaja otro.';
}
function fxTarjetaAbiertaHtml(row, d, e, total, cfg){
  const entry = findExerciseBankEntry(row.nombre);
  const img = entry && entry.image ? `<img src="${escapeHtml(entry.image)}" alt="">` : `<span class="red-img-vacia">${ICONS.clipboard}</span>`;
  const seg = esSeg(row.unidad_objetivo);
  const n = (v) => escapeHtml(String(v || ''));
  const trabajo = cfg.formato === 'tabata'
    ? `<div class="red-st es-seg"><small>TRABAJO</small><div class="fx-fijo">${cfg.trabajo} s</div><span class="fx-mini">Igual para todos en Tabata</span></div>`
    : `<div class="red-st ${seg ? 'es-seg' : ''}"><small>${seg ? 'TRABAJO · SEG' : 'REPS'}</small><div class="red-f">
          <button type="button" onclick="rutinaPaso(${d},${e},'reps_objetivo',-${seg ? 5 : 1})">−</button>
          <input type="text" inputmode="numeric" id="red-reps_objetivo-${d}-${e}" value="${n(row.reps_objetivo)}" placeholder="0" oninput="rutinaEditorDias[${d}].ejercicios[${e}].reps_objetivo=this.value">
          <button type="button" onclick="rutinaPaso(${d},${e},'reps_objetivo',${seg ? 5 : 1})">+</button></div>
          <button type="button" class="unidad-toggle ${seg ? 'es-seg' : ''}" onclick="cambiarUnidadRutina(${d},${e})" title="${seg ? 'Cambiar a repeticiones' : 'Cambiar a tiempo'}">${seg ? '⇄ 🏋️' : '⇄ ⏱'}</button></div>`;
  return `
    <div class="red-card on fx-card">
      <div class="red-top">
        ${img}
        <div class="red-info">
          <b>${escapeHtml(row.nombre || 'Elige un ejercicio')}</b>
          ${entry && entry.group ? `<span class="red-tag">${escapeHtml(entry.group)}</span>` : ''}
          <button type="button" class="red-cambiar" onclick="abrirBuscadorRutina(${d},${e})">${row.nombre ? 'Cambiar ejercicio' : 'Buscar ejercicio'}</button>
        </div>
        <span class="red-orden">
          <button type="button" onclick="event.stopPropagation();moverEjercicioRutina(${d},${e},-1)" ${e === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button type="button" onclick="event.stopPropagation();moverEjercicioRutina(${d},${e},1)" ${e === total - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        </span>
        <button type="button" class="red-x" onclick="quitarEjercicioDeDia(${d},${e})" aria-label="Quitar ejercicio">✕</button>
      </div>
      <div class="red-grid">
        ${trabajo}
        <div class="red-st"><small>PESO</small><div class="red-f red-f-texto">
          <input type="text" id="red-peso_objetivo-${d}-${e}" value="${n(row.peso_objetivo)}" placeholder="Sin peso" oninput="rutinaEditorDias[${d}].ejercicios[${e}].peso_objetivo=this.value"></div></div>
      </div>
      <input type="text" class="fx-nota" placeholder="Nota técnica (opcional): rodillas apoyadas, ritmo lento…" value="${n(row.nota)}" oninput="rutinaEditorDias[${d}].ejercicios[${e}].nota=this.value">
      <button type="button" class="fx-cerrar-card" onclick="rutinaExAbierto=null;renderRutinaDiasEditor()">Listo ✓</button>
    </div>`;
}

// ---------- Tarjeta en el registro del día ----------
function fxSesionCardHtml(dia){
  const cfg = fxDeDia(dia);
  if(!cfg) return '';
  const exs = (dia.ejercicios || []).filter(e => (e.nombre || '').trim());
  if(!exs.length) return '';
  const f = FX_FORMATOS[cfg.formato];
  return `
    <div class="fx-sesion-card">
      <div class="fx-sesion-top"><span class="fx-tag">⚡ ${escapeHtml(f.nombre)}</span><b>${escapeHtml(fxDuracionTexto(cfg, exs))}</b></div>
      <div class="fx-sesion-res">${escapeHtml(fxResumenTexto(cfg))}</div>
      <div class="fx-sesion-lista">${exs.map((e, i) => `<span><i>${i + 1}</i>${escapeHtml(e.nombre)}<em>${escapeHtml(fxTrabajoTexto(e, cfg))}</em></span>`).join('')}</div>
      <button type="button" class="btn fx-btn-iniciar" id="btn-fx-iniciar">▶ Iniciar ${escapeHtml(f.nombre.toLowerCase())} guiado</button>
      <div class="fx-sesion-ayuda">La app cuenta los tiempos, suena y vibra en cada cambio. Cada ejercicio terminado se guarda solo en tu entrenamiento de hoy.</div>
    </div>`;
}
function fxConectarSesionCard(dia){
  const b = document.getElementById('btn-fx-iniciar');
  if(b) b.onclick = () => fxAbrirReproductor(dia);
}

// ============================================================
// REPRODUCTOR (temporizador guiado)
// ============================================================
let fxR = null;

function fxConstruirPasos(cfg, exs){
  const pasos = [{ t: 'prep', dur: 10, next: exs[0] }];
  const n = exs.length;
  if(cfg.formato === 'tabata'){
    for(let r = 1; r <= cfg.rondas; r++){
      pasos.push({ t: 'trabajo', ex: exs[(r - 1) % n], v: r, dur: cfg.trabajo, unidad: 'seg' });
      if(r < cfg.rondas && cfg.pausa > 0) pasos.push({ t: 'descanso', dur: cfg.pausa, next: exs[r % n], v: r });
    }
  } else if(cfg.formato === 'emom'){
    const total = Math.max(1, Math.round(cfg.minutos * 60 / cfg.intervalo));
    for(let k = 0; k < total; k++) pasos.push({ t: 'emom', ex: exs[k % n], v: k + 1, total, dur: cfg.intervalo });
  } else if(cfg.formato === 'amrap'){
    pasos.push({ t: 'amrap', dur: cfg.minutos * 60 });
  } else {
    for(let v = 1; v <= cfg.vueltas; v++){
      exs.forEach((ex, i) => {
        const seg = esSeg(ex.unidad_objetivo);
        pasos.push({ t: 'trabajo', ex, i, v, dur: seg ? (fxNum(ex.reps_objetivo) || 30) : 0, unidad: seg ? 'seg' : 'reps' });
        if(i < n - 1 && cfg.descanso_ej > 0) pasos.push({ t: 'descanso', dur: cfg.descanso_ej, next: exs[i + 1], v });
      });
      if(v < cfg.vueltas && cfg.descanso_vuelta > 0) pasos.push({ t: 'vuelta', dur: cfg.descanso_vuelta, next: exs[0], v });
    }
  }
  return pasos;
}

async function fxAbrirReproductor(dia){
  const cfg = fxDeDia(dia);
  const exs = (dia.ejercicios || []).filter(e => (e.nombre || '').trim());
  if(!cfg || !exs.length || !activeSesionId){ showToast('Primero inicia el entrenamiento de hoy'); return; }
  if(window.UCKilo) window.UCKilo.prepararAudio();
  fxR = {
    cfg, exs, dia: dia.nombre, pasos: fxConstruirPasos(cfg, exs), idx: 0,
    finAt: 0, inicioPaso: 0, pausadoResto: null, intervalo: null, ultimoTic: null,
    inicio: Date.now(), registrados: 0, guardados: 0, pendientes: [], fallidos: [],
    ordenBase: activeSesionExs.reduce((a, g) => a + g.sets.length, 0), rondasAmrap: 0,
    salirArmado: false, wake: null, terminado: false
  };
  const capa = document.createElement('div');
  capa.className = 'fx-player';
  capa.id = 'fx-player';
  document.body.appendChild(capa);
  document.body.classList.add('fx-abierto');
  fxPedirPantallaEncendida();
  document.addEventListener('visibilitychange', fxAlVolver);
  fxIniciarPaso(Date.now());
  fxR.intervalo = setInterval(fxTick, 200);
}

async function fxPedirPantallaEncendida(){
  try { if(navigator.wakeLock && fxR && !fxR.wake) fxR.wake = await navigator.wakeLock.request('screen'); } catch(e){}
}
function fxAlVolver(){
  if(!fxR) return;
  if(document.visibilityState === 'visible'){ if(fxR.wake && fxR.wake.released) fxR.wake = null; fxPedirPantallaEncendida(); fxTick(); }
}

function fxPaso(){ return fxR && fxR.pasos[fxR.idx]; }
function fxIniciarPaso(desde){
  const p = fxPaso();
  if(!p) return;
  fxR.inicioPaso = desde;
  fxR.finAt = p.dur ? desde + p.dur * 1000 : 0;
  fxR.ultimoTic = null;
  fxR.salirArmado = false;
  const atrasado = Date.now() - desde > 1500;
  if(!atrasado && window.UCKilo){
    if(p.t === 'trabajo' || p.t === 'emom' || p.t === 'amrap'){ window.UCKilo.sonido('serie'); window.UCKilo.vibrar([200, 90, 200]); }
    else if(p.t === 'descanso' || p.t === 'vuelta'){ window.UCKilo.sonido('descanso'); window.UCKilo.vibrar(160); }
  }
  fxRender();
}
function fxTick(){
  if(!fxR || fxR.terminado) return;
  if(fxR.pausadoResto != null) return;
  let guard = 0;
  while(fxR && !fxR.terminado && fxR.finAt && Date.now() >= fxR.finAt && guard++ < 500){
    const fin = fxR.finAt;
    fxCompletarPaso(true);
    if(!fxR || fxR.terminado) return;
    fxAvanzar(fin);
  }
  fxActualizarReloj();
}
function fxRestanteMs(){
  if(!fxR) return 0;
  if(fxR.pausadoResto != null) return fxR.pausadoResto;
  return fxR.finAt ? Math.max(0, fxR.finAt - Date.now()) : 0;
}
function fxActualizarReloj(){
  const p = fxPaso();
  if(!p) return;
  const el = document.getElementById('fx-tiempo');
  const ring = document.getElementById('fx-ring-arc');
  if(p.dur){
    const ms = fxRestanteMs();
    const s = Math.ceil(ms / 1000);
    if(el) el.textContent = fmtSeg(s);
    if(ring){ const frac = Math.min(1, Math.max(0, ms / (p.dur * 1000))); ring.style.strokeDashoffset = String(653.5 * (1 - frac)); }
    if(fxR.pausadoResto == null && s <= 3 && s >= 1 && fxR.ultimoTic !== s){
      fxR.ultimoTic = s;
      if(window.UCKilo){ window.UCKilo.sonido('tic'); window.UCKilo.vibrar(40); }
    }
  } else {
    // Ejercicio por repeticiones: cronómetro que sube
    const transcurrido = fxR.pausadoResto != null ? fxR.pausadoResto : Date.now() - fxR.inicioPaso;
    const cr = document.getElementById('fx-crono');
    if(cr) cr.textContent = fmtSeg(Math.floor(transcurrido / 1000));
  }
  const tot = document.getElementById('fx-total');
  if(tot) tot.textContent = fmtSeg(Math.floor((Date.now() - fxR.inicio) / 1000));
}

function fxRegistrar(ex, valor, unidad, nota){
  if(!activeSesionId || !ex) return;
  const pa = fxPaso();
  if(pa && pa.v && pa.t !== 'emom') fxR.vueltaMax = Math.max(fxR.vueltaMax || 0, pa.v);
  const fila = {
    sesion_id: activeSesionId, ejercicio_nombre: ex.nombre, peso: fxPesoNum(ex.peso_objetivo),
    reps: Number(valor) || 0, unidad, nota, orden: fxR.ordenBase + fxR.registrados++
  };
  const prom = sb.from('sesion_series').insert(fila).then(({ error }) => {
    if(error) fxR && fxR.fallidos.push(fila); else if(fxR) fxR.guardados++;
  }, () => { if(fxR) fxR.fallidos.push(fila); });
  fxR.pendientes.push(prom);
}
function fxNotaPaso(p){
  const f = fxR.cfg.formato;
  if(f === 'tabata') return `Tabata · ronda ${p.v}/${fxR.cfg.rondas}`;
  if(f === 'emom') return `EMOM · minuto ${p.v}/${p.total}`;
  return `Circuito · vuelta ${p.v}/${fxR.cfg.vueltas}`;
}
// Guarda lo que se completó en el paso actual
function fxCompletarPaso(){
  const p = fxPaso();
  if(!p) return;
  if(p.t === 'trabajo'){
    if(p.unidad === 'seg'){
      fxRegistrar(p.ex, p.dur, 'seg', fxNotaPaso(p));
    } else {
      fxRegistrar(p.ex, fxNum(p.ex.reps_objetivo), 'reps', fxNotaPaso(p));
    }
  } else if(p.t === 'emom'){
    const seg = esSeg(p.ex.unidad_objetivo);
    fxRegistrar(p.ex, fxNum(p.ex.reps_objetivo), seg ? 'seg' : 'reps', fxNotaPaso(p));
  } else if(p.t === 'amrap'){
    fxGuardarAmrap();
  }
}
function fxGuardarAmrap(){
  const vueltas = fxR.rondasAmrap;
  if(!vueltas) return;
  const filas = [];
  for(let v = 1; v <= vueltas; v++){
    fxR.exs.forEach(ex => {
      filas.push({
        sesion_id: activeSesionId, ejercicio_nombre: ex.nombre, peso: fxPesoNum(ex.peso_objetivo),
        reps: fxNum(ex.reps_objetivo), unidad: esSeg(ex.unidad_objetivo) ? 'seg' : 'reps',
        nota: `AMRAP ${fxR.cfg.minutos} min · vuelta ${v}/${vueltas}`, orden: fxR.ordenBase + fxR.registrados++
      });
    });
  }
  const prom = sb.from('sesion_series').insert(filas).then(({ error }) => {
    if(error) fxR && fxR.fallidos.push(...filas); else if(fxR) fxR.guardados += filas.length;
  }, () => { if(fxR) fxR.fallidos.push(...filas); });
  fxR.pendientes.push(prom);
}
function fxAvanzar(desde){
  fxR.idx++;
  if(fxR.idx >= fxR.pasos.length){ fxTerminar(false); return; }
  fxIniciarPaso(desde || Date.now());
}

// Botones
function fxBotonPrincipal(){
  const p = fxPaso();
  if(!p || !fxR) return;
  if(window.UCKilo) window.UCKilo.prepararAudio();
  if(p.t === 'trabajo' && p.unidad === 'reps'){
    // "Listo": terminó las reps de este ejercicio
    fxCompletarPaso(true);
    fxAvanzar(Date.now());
    return;
  }
  if(p.t === 'amrap'){ fxSumarVuelta(1); return; }
  fxPausar();
}
function fxPausar(){
  if(!fxR) return;
  if(fxR.pausadoResto == null){
    const p = fxPaso();
    fxR.pausadoResto = p && p.dur ? Math.max(0, fxR.finAt - Date.now()) : Date.now() - fxR.inicioPaso;
  } else {
    const p = fxPaso();
    if(p && p.dur) fxR.finAt = Date.now() + fxR.pausadoResto;
    else fxR.inicioPaso = Date.now() - fxR.pausadoResto;
    fxR.pausadoResto = null;
  }
  fxRender();
}
function fxSiguiente(){
  if(!fxR) return;
  const p = fxPaso();
  // Saltar un trabajo por tiempo guarda lo que alcanzó a hacer (si fue algo)
  if(p && p.t === 'trabajo' && p.unidad === 'seg'){
    const hecho = Math.round((p.dur * 1000 - fxRestanteMs()) / 1000);
    if(hecho >= 5) fxRegistrar(p.ex, hecho, 'seg', fxNotaPaso(p));
  }
  if(p && p.t === 'amrap'){ fxCompletarPaso(true); fxTerminar(false); return; }
  fxR.pausadoResto = null;
  fxAvanzar(Date.now());
}
function fxAnterior(){
  if(!fxR) return;
  fxR.pausadoResto = null;
  const p = fxPaso();
  // Si ya pasaron más de 3 s, reinicia el paso; si no, vuelve al anterior
  if(p && Date.now() - fxR.inicioPaso < 3000 && fxR.idx > 0) fxR.idx--;
  fxIniciarPaso(Date.now());
}
function fxSumarVuelta(d){
  if(!fxR) return;
  fxR.rondasAmrap = Math.max(0, fxR.rondasAmrap + d);
  if(d > 0 && window.UCKilo){ window.UCKilo.sonido('serie'); window.UCKilo.vibrar(60); }
  const el = document.getElementById('fx-amrap-n');
  if(el) el.textContent = fxR.rondasAmrap;
}
function fxSalir(){
  if(!fxR) return;
  if(!fxR.salirArmado){
    fxR.salirArmado = true;
    const b = document.getElementById('fx-salir');
    if(b){ b.textContent = '¿Salir? Toca otra vez'; b.classList.add('armado'); }
    setTimeout(() => { if(fxR && fxR.salirArmado){ fxR.salirArmado = false; const bb = document.getElementById('fx-salir'); if(bb){ bb.textContent = '✕ Salir'; bb.classList.remove('armado'); } } }, 3000);
    return;
  }
  const p = fxPaso();
  if(p && p.t === 'amrap') fxGuardarAmrap();
  if(p && p.t === 'trabajo' && p.unidad === 'seg'){
    const hecho = Math.round((p.dur * 1000 - fxRestanteMs()) / 1000);
    if(hecho >= 5) fxRegistrar(p.ex, hecho, 'seg', fxNotaPaso(p));
  }
  fxTerminar(true);
}

async function fxTerminar(parcial){
  if(!fxR || fxR.terminado) return;
  fxR.terminado = true;
  clearInterval(fxR.intervalo);
  const segTotal = Math.round((Date.now() - fxR.inicio) / 1000);
  const capa = document.getElementById('fx-player');
  if(capa) capa.innerHTML = `<div class="fx-guardando"><div class="fx-spin"></div>Guardando tu ${escapeHtml(FX_FORMATOS[fxR.cfg.formato].nombre.toLowerCase())}…</div>`;
  await Promise.all(fxR.pendientes);
  if(fxR.fallidos.length){
    // Un reintento con todo lo que no alcanzó a guardarse
    const { error } = await sb.from('sesion_series').insert(fxR.fallidos);
    if(!error){ fxR.guardados += fxR.fallidos.length; fxR.fallidos = []; }
  }
  try { if(fxR.wake) await fxR.wake.release(); } catch(e){}
  document.removeEventListener('visibilitychange', fxAlVolver);
  // Trae las series reales de la sesión para que el registro quede al día
  const { data } = await sb.from('sesion_series').select('*').eq('sesion_id', activeSesionId);
  if(data){ activeSesionExs = groupSets(data.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0))); aplicarMapaPRs(activeSesionExs); }
  const r = fxR;
  const nombre = FX_FORMATOS[r.cfg.formato].nombre;
  const vueltasHechas = r.cfg.formato === 'amrap' ? r.rondasAmrap
    : r.cfg.formato === 'circuito' ? (r.vueltaMax || 0) : null;
  if(!parcial && window.UCKilo){ window.UCKilo.sonido('fin'); window.UCKilo.vibrar([120, 60, 120, 60, 260]); }
  if(capa) capa.innerHTML = `
    <div class="fx-fin">
      <div class="fx-fin-kilo">${window.UCKilo ? window.UCKilo.svg(parcial ? 'normal' : 'celebra', 120) : '💪'}</div>
      <small class="fx-kicker">${escapeHtml(r.dia || '')}</small>
      <h2>${parcial ? `${escapeHtml(nombre)} guardado` : `¡${escapeHtml(nombre)} completado!`}</h2>
      <div class="fx-fin-stats">
        <div><b>${escapeHtml(fmtSeg(segTotal))}</b><small>TIEMPO</small></div>
        ${vueltasHechas != null ? `<div><b>${vueltasHechas}</b><small>${r.cfg.formato === 'amrap' ? 'VUELTAS AMRAP' : 'VUELTAS'}</small></div>` : ''}
        <div><b>${r.guardados}</b><small>SERIES GUARDADAS</small></div>
      </div>
      ${r.fallidos.length ? `<div class="fx-aviso-error">⚠ ${r.fallidos.length} serie${r.fallidos.length === 1 ? '' : 's'} no se pudo guardar por la conexión. Puedes agregarla${r.fallidos.length === 1 ? '' : 's'} a mano en el registro.</div>` : ''}
      <button type="button" class="btn" id="fx-fin-finalizar">${ICONS.check} Finalizar entrenamiento de hoy</button>
      <button type="button" class="btn-ghost" id="fx-fin-volver">Volver al registro (agregar nota, foto o más ejercicios)</button>
    </div>`;
  const cerrar = () => { const c = document.getElementById('fx-player'); if(c) c.remove(); document.body.classList.remove('fx-abierto'); fxR = null; };
  const fin = document.getElementById('fx-fin-finalizar');
  const volver = document.getElementById('fx-fin-volver');
  if(fin) fin.onclick = () => { cerrar(); renderNuevaSesionForm(); if(activeSesionExs.reduce((a, g) => a + g.sets.length, 0)) finalizarSesion(); };
  if(volver) volver.onclick = () => { cerrar(); renderNuevaSesionForm(); };
}

function fxImgHtml(ex, clase){
  const entry = ex && findExerciseBankEntry(ex.nombre);
  return entry && entry.image ? `<img class="${clase || ''}" src="${escapeHtml(entry.image)}" alt="">` : `<span class="${clase || ''} fx-img-vacia">${ICONS.clipboard}</span>`;
}
function fxRender(){
  const capa = document.getElementById('fx-player');
  const p = fxPaso();
  if(!capa || !p || !fxR) return;
  const r = fxR;
  const cfg = r.cfg;
  const pausado = r.pausadoResto != null;
  const fase = p.t === 'prep' ? 'PREPÁRATE' : p.t === 'descanso' ? 'DESCANSA' : p.t === 'vuelta' ? 'FIN DE VUELTA' : p.t === 'amrap' ? 'AMRAP' : p.t === 'emom' ? 'EMOM' : 'TRABAJA';
  const esDescanso = p.t === 'descanso' || p.t === 'vuelta' || p.t === 'prep';
  let arriba = '';
  if(cfg.formato === 'circuito') arriba = `Vuelta ${p.v || 1} de ${cfg.vueltas}`;
  else if(cfg.formato === 'tabata') arriba = `Ronda ${p.v || 1} de ${cfg.rondas}`;
  else if(cfg.formato === 'emom') arriba = `Minuto ${p.v || 1} de ${(r.pasos[r.pasos.length - 1] || {}).total || cfg.minutos}`;
  else arriba = `AMRAP ${cfg.minutos} min`;
  // Puntos de progreso: ejercicios de la vuelta actual
  const n = r.exs.length;
  const actualI = p.ex ? r.exs.indexOf(p.ex) : (p.next ? r.exs.indexOf(p.next) - 0.5 : -1);
  const puntos = cfg.formato === 'amrap' ? '' : `<div class="fx-dots">${r.exs.map((e, i) => `<i class="${i < actualI ? 'ok' : (i === actualI ? 'on' : '')}"></i>`).join('')}</div>`;
  const reloj = p.dur ? `
    <div class="fx-ring">
      <svg viewBox="0 0 236 236" aria-hidden="true"><circle cx="118" cy="118" r="104" class="fx-ring-bg"/><circle id="fx-ring-arc" cx="118" cy="118" r="104" class="fx-ring-arc" transform="rotate(-90 118 118)"/></svg>
      <div class="fx-ring-in"><small>${pausado ? 'EN PAUSA' : fase}</small><span id="fx-tiempo">${escapeHtml(fmtSeg(Math.ceil(fxRestanteMs() / 1000)))}</span><em>${p.t === 'emom' ? `${escapeHtml(fxTrabajoTexto(p.ex, cfg))} y descansa` : `de ${escapeHtml(fmtSeg(p.dur))}`}</em></div>
    </div>` : `
    <div class="fx-ring fx-ring-reps">
      <div class="fx-ring-in"><small>${pausado ? 'EN PAUSA' : 'HAZ'}</small><span>${escapeHtml(String(p.ex.reps_objetivo || '—'))}</span><em>reps · <b id="fx-crono">0:00</b></em></div>
    </div>`;
  let centro = '';
  if(p.t === 'amrap'){
    centro = `
      <div class="fx-amrap-lista">${r.exs.map((e, i) => `<div>${fxImgHtml(e)}<b>${escapeHtml(e.nombre)}</b><em>${escapeHtml(fxTrabajoTexto(e, cfg))}</em></div>`).join('')}</div>
      <div class="fx-amrap-cont"><button type="button" onclick="fxSumarVuelta(-1)" aria-label="Restar una vuelta">−</button><div><span id="fx-amrap-n">${r.rondasAmrap}</span><small>VUELTAS</small></div></div>`;
  } else if(esDescanso){
    const sig = p.next;
    centro = sig ? `<div class="fx-sig-card"><small>${p.t === 'prep' ? 'EMPIEZAS CON' : 'SIGUIENTE'}</small>${fxImgHtml(sig)}<div><b>${escapeHtml(sig.nombre)}</b><em>${escapeHtml(fxTrabajoTexto(sig, cfg))}${sig.peso_objetivo ? ` · ${escapeHtml(sig.peso_objetivo)}` : ''}</em></div></div>` : '';
  } else {
    const ex = p.ex;
    const sigPaso = r.pasos.slice(r.idx + 1).find(x => x.t !== 'prep');
    const sigTxt = !sigPaso ? '🏁 Último esfuerzo' : (sigPaso.t === 'descanso' || sigPaso.t === 'vuelta') ? `Después: <b class="fx-naranja">${escapeHtml(fmtSeg(sigPaso.dur))} ${sigPaso.t === 'vuelta' ? 'descanso de vuelta' : 'descanso'}</b>${sigPaso.next ? ` → ${escapeHtml(sigPaso.next.nombre)}` : ''}` : `Después: ${escapeHtml(sigPaso.ex ? sigPaso.ex.nombre : '')}`;
    centro = `
      <div class="fx-now">${fxImgHtml(ex)}<div><small class="fx-kicker">Ejercicio ${r.exs.indexOf(ex) + 1} de ${n}</small><b>${escapeHtml(ex.nombre)}</b>${ex.peso_objetivo ? `<em>${escapeHtml(ex.peso_objetivo)}</em>` : ''}${ex.nota ? `<em class="fx-now-nota">📝 ${escapeHtml(ex.nota)}</em>` : ''}</div></div>
      <div class="fx-next">${sigTxt}</div>`;
  }
  const principal = p.t === 'trabajo' && p.unidad === 'reps' ? `<button type="button" class="fx-main" onclick="fxBotonPrincipal()">✓ Listo</button>`
    : p.t === 'amrap' ? `<button type="button" class="fx-main" onclick="fxBotonPrincipal()">+1 vuelta</button>`
    : `<button type="button" class="fx-main" onclick="fxBotonPrincipal()">${pausado ? '▶ Seguir' : '❚❚ Pausa'}</button>`;
  capa.className = `fx-player fase-${esDescanso ? 'descanso' : 'trabajo'}${pausado ? ' pausado' : ''}`;
  capa.innerHTML = `
    <div class="fx-top"><button type="button" class="fx-salir" id="fx-salir" onclick="fxSalir()">✕ Salir</button><span class="fx-kicker">${escapeHtml(arriba)}</span><span class="fx-total">⏱ <b id="fx-total">0:00</b></span></div>
    ${puntos}
    ${reloj}
    ${centro}
    <div class="fx-ctrls">
      <button type="button" onclick="fxAnterior()" aria-label="Volver">⏮</button>
      ${principal}
      <button type="button" onclick="${p.t === 'amrap' ? 'fxSalir()' : 'fxSiguiente()'}" aria-label="${p.t === 'amrap' ? 'Terminar' : 'Saltar'}">${p.t === 'amrap' ? '🏁' : '⏭'}</button>
    </div>
    ${p.t === 'trabajo' && p.unidad === 'reps' ? '<div class="fx-ayuda">Haz las reps a tu ritmo y toca <b>Listo</b>.</div>' : p.t === 'amrap' ? '<div class="fx-ayuda">Toca <b>+1 vuelta</b> cada vez que termines la lista completa.</div>' : `<div class="fx-ayuda">${window.UCKilo && window.UCKilo.sonidoActivo() ? '🔊 Suena y vibra en cada cambio' : '🔇 Sonido apagado · solo vibración'} · pantalla encendida</div>`}`;
  fxActualizarReloj();
}

// ============================================================
// PLANTILLAS REUTILIZABLES + DUPLICAR Y ASIGNAR
// ============================================================
// Tablas plantillas_rutina / plantilla_ejercicios (schema_plantillas_perfil_profe.sql).
// Solo el profesor dueño (y el súper admin) las ve. Asignar usa la función
// asignar_plantilla(): crea una copia independiente por alumno, todo o nada.
let rutinaEditorModo = null;      // null = rutina de alumno · 'plantilla' = plantilla del profe
let plantillaEditorId = null;
const PLANTILLA_FALSO_ALUMNO = { id: '__plantilla__', nombre: '' };

function esRolProfe(){ return profile && ['profesor', 'coach', 'super_admin'].includes(profile.role); }
function plFaltaTabla(error){ return error && (error.code === 'PGRST205' || error.code === '42P01' || /plantilla/i.test(error.message || '')); }

function plResumen(pl){
  const dias = groupPorDia(pl.plantilla_ejercicios || []);
  const nEj = (pl.plantilla_ejercicios || []).length;
  const funcionales = dias.filter(d => fxDeDia(d)).length;
  const tipo = !funcionales ? 'Fuerza' : (funcionales === dias.length ? 'Funcional' : 'Mixta');
  const primera = (pl.plantilla_ejercicios || []).slice().sort((a, b) => (a.dia_orden || 0) - (b.dia_orden || 0) || (a.orden || 0) - (b.orden || 0))[0];
  const entry = primera && findExerciseBankEntry(primera.nombre);
  return { dias, nEj, tipo, imagen: entry && entry.image ? entry.image : '' };
}
function plIconoTipo(tipo){ return tipo === 'Funcional' ? '⚡' : tipo === 'Mixta' ? '🔀' : '🏋️'; }

async function renderMisPlantillas(){
  rutinaEditorModo = null;
  cleanupSocialRealtime();
  root().innerHTML = `<div class="loading">Cargando tus plantillas...</div>`;
  const { data, error } = await sb.from('plantillas_rutina').select('*, plantilla_ejercicios(*)').eq('profesor_id', profile.id).order('updated_at', { ascending: false });
  if(error){
    root().innerHTML = `<button type="button" class="back-link" onclick="renderCoachHome()">${ICONS.arrowLeft} Volver</button>
      <div class="card"><div class="empty">${plFaltaTabla(error) ? 'Las plantillas se están activando. Intenta de nuevo en unos minutos.' : 'No se pudieron cargar tus plantillas. Revisa tu conexión.'}</div></div>`;
    return;
  }
  const plantillas = data || [];
  root().innerHTML = `
    <div class="pl-head">
      <div><button type="button" class="back-link" id="btn-pl-volver">${ICONS.arrowLeft} Volver</button><h1>Mis plantillas</h1></div>
      <button type="button" class="pl-btn-crear" id="btn-pl-crear">${ICONS.plus} Crear plantilla</button>
    </div>
    <div class="pl-search">${ICONS.search}<input type="text" id="pl-q" placeholder="Buscar plantillas…" autocomplete="off"></div>
    <div class="pl-info"><span>i</span>Las plantillas no están asignadas a ningún alumno hasta que tú elijas. Al usarlas, cada alumno recibe su propia copia.</div>
    <div id="pl-lista"></div>`;
  document.getElementById('btn-pl-volver').onclick = renderCoachHome;
  document.getElementById('btn-pl-crear').onclick = () => renderPlantillaEditor(null);
  const lista = document.getElementById('pl-lista');
  const pintar = () => {
    const term = normalizarTexto(document.getElementById('pl-q').value.trim());
    const visibles = plantillas.filter(pl => !term || normalizarTexto(`${pl.nombre} ${pl.objetivo || ''}`).includes(term));
    if(!plantillas.length){
      lista.innerHTML = `${emptyKiloHtml('Todavía no tienes plantillas. Crea una desde cero o guarda como plantilla una rutina que ya armaste para un alumno.', 'espera')}`;
      return;
    }
    if(!visibles.length){ lista.innerHTML = '<div class="empty">No hay plantillas con ese nombre.</div>'; return; }
    lista.innerHTML = visibles.map(pl => {
      const r = plResumen(pl);
      return `
        <div class="pl-card">
          <div class="pl-card-top">
            ${r.imagen ? `<img class="pl-img" src="${escapeHtml(r.imagen)}" alt="">` : `<span class="pl-img pl-img-vacia">${plIconoTipo(r.tipo)}</span>`}
            <div class="pl-card-txt">
              <b>${escapeHtml(pl.nombre)}</b>
              <div class="pl-meta"><span>${plIconoTipo(r.tipo)} ${r.tipo}</span><span>${ICONS.calendar} ${r.dias.length} día${r.dias.length === 1 ? '' : 's'}</span><span>${ICONS.clipboard} ${r.nEj} ejercicio${r.nEj === 1 ? '' : 's'}</span></div>
              <small>Actualizada el ${escapeHtml(formatDateShort(String(pl.updated_at || pl.created_at).slice(0, 10)))}${pl.objetivo ? ` · ${escapeHtml(pl.objetivo)}` : ''}</small>
            </div>
          </div>
          <div class="pl-card-acciones">
            <button type="button" class="pl-usar" data-usar="${pl.id}">${ICONS.play} Usar plantilla</button>
            <button type="button" class="pl-editar" data-editar="${pl.id}">${ICONS.edit} Editar</button>
            <button type="button" class="pl-mas" data-mas="${pl.id}" aria-label="Más opciones">⋯</button>
          </div>
          <div class="pl-menu hidden" id="pl-menu-${pl.id}">
            <button type="button" data-ver="${pl.id}">👁 Ver ejercicios</button>
            <button type="button" data-copiar="${pl.id}">⧉ Duplicar plantilla</button>
            <button type="button" class="pl-borrar" data-borrar="${pl.id}">🗑 Eliminar</button>
          </div>
          <div class="pl-detalle hidden" id="pl-detalle-${pl.id}"></div>
        </div>`;
    }).join('');
    const buscar = id => plantillas.find(p => p.id === id);
    lista.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => abrirAsignarPlantilla(buscar(b.dataset.usar)));
    lista.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => renderPlantillaEditor(buscar(b.dataset.editar)));
    lista.querySelectorAll('[data-mas]').forEach(b => b.onclick = () => document.getElementById(`pl-menu-${b.dataset.mas}`).classList.toggle('hidden'));
    lista.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => {
      const pl = buscar(b.dataset.ver);
      const det = document.getElementById(`pl-detalle-${pl.id}`);
      det.innerHTML = renderRoutineDays(groupPorDia(pl.plantilla_ejercicios || []));
      det.classList.toggle('hidden');
      document.getElementById(`pl-menu-${pl.id}`).classList.add('hidden');
    });
    lista.querySelectorAll('[data-copiar]').forEach(b => b.onclick = async () => {
      const pl = buscar(b.dataset.copiar);
      b.disabled = true;
      const ok = await crearPlantillaDesde(`${pl.nombre} (copia)`.slice(0, 120), pl.objetivo, pl.plantilla_ejercicios || []);
      if(ok){ showToast('Plantilla duplicada ✓'); renderMisPlantillas(); } else b.disabled = false;
    });
    lista.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
      if(b.dataset.confirm !== '1'){
        b.dataset.confirm = '1'; b.textContent = '¿Seguro? Toca otra vez para eliminar';
        setTimeout(() => { if(b.isConnected){ b.dataset.confirm = ''; b.textContent = '🗑 Eliminar'; } }, 3500);
        return;
      }
      b.disabled = true;
      const { error: errDel } = await sb.from('plantillas_rutina').delete().eq('id', b.dataset.borrar);
      if(errDel){ showToast('No se pudo eliminar la plantilla'); b.disabled = false; return; }
      showToast('Plantilla eliminada. Las rutinas que ya asignaste no cambian.');
      renderMisPlantillas();
    });
  };
  document.getElementById('pl-q').oninput = pintar;
  pintar();
}

// Copia filas de ejercicios (de una rutina o de otra plantilla) a una plantilla nueva
function plFilaLimpia(e){
  return {
    nombre: e.nombre, series_objetivo: e.series_objetivo ?? null, reps_objetivo: e.reps_objetivo ?? null,
    descanso_seg: e.descanso_seg ?? null, imagen_url: e.imagen_url ?? null, orden: e.orden ?? null,
    dia_nombre: e.dia_nombre ?? null, dia_orden: e.dia_orden ?? null, peso_objetivo: e.peso_objetivo ?? null,
    nota: e.nota ?? null, tipo_serie_objetivo: e.tipo_serie_objetivo ?? null, lado_objetivo: e.lado_objetivo ?? null,
    unidad_objetivo: e.unidad_objetivo ?? null, circuito: e.circuito ?? null
  };
}
async function crearPlantillaDesde(nombre, objetivo, filas){
  const { data: pl, error } = await sb.from('plantillas_rutina').insert({ profesor_id: profile.id, nombre, objetivo: objetivo || null }).select().single();
  if(error){ showToast(plFaltaTabla(error) ? 'Las plantillas se están activando, intenta en unos minutos' : 'No se pudo crear la plantilla'); return null; }
  if(filas.length){
    const { error: errEj } = await sb.from('plantilla_ejercicios').insert(filas.map(f => ({ ...plFilaLimpia(f), plantilla_id: pl.id })));
    if(errEj){ await sb.from('plantillas_rutina').delete().eq('id', pl.id); showToast('No se pudieron copiar los ejercicios'); return null; }
  }
  return pl;
}
async function guardarRutinaComoPlantilla(rutina, btn){
  if(btn) btn.disabled = true;
  const pl = await crearPlantillaDesde(rutina.nombre, rutina.objetivo, rutina.rutina_ejercicios || []);
  if(btn) btn.disabled = false;
  if(pl) showToast(`Guardada en Mis plantillas: «${rutina.nombre}» ✓`);
}

function renderPlantillaEditor(pl){
  rutinaEditorModo = 'plantilla';
  plantillaEditorId = pl ? pl.id : null;
  const prefill = pl ? rutinaComoPrefill({ nombre: pl.nombre, objetivo: pl.objetivo, rutina_ejercicios: pl.plantilla_ejercicios || [] }) : null;
  renderRutinaEditor(PLANTILLA_FALSO_ALUMNO, prefill, pl ? pl.id : null, renderMisPlantillas);
}

async function guardarPlantilla(){
  const nombre = document.getElementById('rutina-nombre').value.trim();
  const objetivo = document.getElementById('rutina-objetivo').value.trim();
  const { filas, faltaTrabajo } = filasDesdeEditorRutina();
  if(!nombre || !filas.length){ showToast('Ponle un nombre a la plantilla y al menos un ejercicio'); return; }
  if(faltaTrabajo){
    rutinaDiaActivo = faltaTrabajo.d; rutinaExAbierto = `${faltaTrabajo.d}-${faltaTrabajo.e}`; renderRutinaDiasEditor();
    showToast(`Completa los segundos o reps de «${faltaTrabajo.nombre}»`);
    return;
  }
  const btn = document.getElementById('btn-guardar-rutina');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const fallo = (msg) => { showToast(msg); btn.disabled = false; btn.textContent = plantillaEditorId ? 'Guardar cambios' : 'Guardar plantilla'; };
  if(plantillaEditorId){
    const { error: errUpd } = await sb.from('plantillas_rutina').update({ nombre, objetivo: objetivo || null, updated_at: new Date().toISOString() }).eq('id', plantillaEditorId);
    if(errUpd){ fallo('No se pudo actualizar la plantilla'); return; }
    // Primero se agregan los ejercicios nuevos y recién después se borran los
    // antiguos: si se corta internet a la mitad, la plantilla nunca queda vacía.
    const { data: viejos } = await sb.from('plantilla_ejercicios').select('id').eq('plantilla_id', plantillaEditorId);
    const { error: errIns } = await sb.from('plantilla_ejercicios').insert(filas.map(f => ({ ...plFilaLimpia(f), plantilla_id: plantillaEditorId })));
    if(errIns){ fallo('No se pudieron guardar los ejercicios'); return; }
    const ids = (viejos || []).map(v => v.id);
    if(ids.length) await sb.from('plantilla_ejercicios').delete().in('id', ids);
    showToast('Plantilla actualizada ✓');
  } else {
    const pl = await crearPlantillaDesde(nombre, objetivo, filas);
    if(!pl){ btn.disabled = false; btn.textContent = 'Guardar plantilla'; return; }
    showToast('Plantilla creada ✓ · ahora puedes asignarla a tus alumnos');
  }
  rutinaEditorModo = null; plantillaEditorId = null; rutinaEditorId = null;
  rutinaEditorReturn = null;
  renderMisPlantillas();
}

// ---------- Elegir alumnos y asignar ----------
async function cargarMisAlumnosParaAsignar(){
  let q = sb.from('profiles').select('id, nombre, avatar_key, foto_perfil_url, profesor_id').eq('role', 'alumno').order('nombre');
  if(profile.role !== 'super_admin') q = q.eq('profesor_id', profile.id);
  const { data: alumnos } = await q;
  const ids = (alumnos || []).map(a => a.id);
  let activas = [];
  if(ids.length){
    const { data } = await sb.from('rutinas').select('alumno_id, nombre').eq('activa', true).in('alumno_id', ids);
    activas = data || [];
  }
  const activaDe = Object.fromEntries(activas.map(r => [r.alumno_id, r.nombre]));
  return (alumnos || []).map(a => ({ ...a, rutinaActiva: activaDe[a.id] || null }));
}

async function abrirAsignarPlantilla(pl, preseleccion){
  if(!pl) return;
  const r = plResumen(pl);
  const capa = document.createElement('div');
  capa.className = 'pl-capa';
  capa.innerHTML = `<div class="pl-sheet"><div class="red-grab"></div><div class="loading">Cargando alumnos...</div></div>`;
  document.body.appendChild(capa);
  document.body.classList.add('pl-abierto');
  const cerrar = () => { capa.remove(); document.body.classList.remove('pl-abierto'); };
  capa.addEventListener('click', ev => { if(ev.target === capa) cerrar(); });
  const alumnos = await cargarMisAlumnosParaAsignar();
  const elegidos = new Set(preseleccion || []);
  let activar = true;
  const sheet = capa.querySelector('.pl-sheet');
  sheet.innerHTML = `
    <div class="red-grab"></div>
    <div class="pl-sheet-head">
      ${r.imagen ? `<img class="pl-img" src="${escapeHtml(r.imagen)}" alt="">` : `<span class="pl-img pl-img-vacia">${plIconoTipo(r.tipo)}</span>`}
      <div><small class="pl-kicker">USAR PLANTILLA</small><b>${escapeHtml(pl.nombre)}</b><span class="pl-meta"><span>${plIconoTipo(r.tipo)} ${r.tipo}</span><span>${r.dias.length} día${r.dias.length === 1 ? '' : 's'}</span><span>${r.nEj} ejercicios</span></span></div>
      <button type="button" class="pl-x" aria-label="Cerrar">✕</button>
    </div>
    <div class="pl-sheet-sub">Crea una copia de esta plantilla para cada alumno que elijas. Después puedes ajustar la de cada uno sin cambiar las demás.</div>
    ${alumnos.length ? `
      <div class="pl-search pl-search-sm">${ICONS.search}<input type="text" id="pl-alu-q" placeholder="Buscar alumnos…" autocomplete="off"></div>
      <div class="pl-sel-todos"><button type="button" id="pl-todos">Seleccionar todos</button><span id="pl-cuenta"></span></div>
      <div class="pl-alumnos" id="pl-alumnos"></div>
      <div class="pl-opciones">
        <div class="pl-op-titulo">¿Qué pasa con su rutina actual?</div>
        <label class="pl-radio"><input type="radio" name="pl-modo" value="activar" checked><span><b>Reemplazar su rutina actual</b><small>La nueva queda activa y la anterior pasa a "Rutinas anteriores". Le llega un aviso al celular.</small></span></label>
        <label class="pl-radio"><input type="radio" name="pl-modo" value="guardar"><span><b>Guardarla sin activar</b><small>Queda en sus "Rutinas anteriores" para usarla más adelante. Su rutina actual no cambia.</small></span></label>
      </div>
      <div class="pl-aviso hidden" id="pl-aviso"></div>
      <button type="button" class="btn" id="pl-asignar" disabled>Elige al menos un alumno</button>
    ` : `<div class="empty">Todavía no tienes alumnos asignados.</div>`}`;
  sheet.querySelector('.pl-x').onclick = cerrar;
  if(!alumnos.length) return;
  const lista = sheet.querySelector('#pl-alumnos');
  const btn = sheet.querySelector('#pl-asignar');
  const actualizar = () => {
    const n = elegidos.size;
    sheet.querySelector('#pl-cuenta').textContent = n ? `${n} alumno${n === 1 ? '' : 's'} seleccionado${n === 1 ? '' : 's'}` : '';
    btn.disabled = !n;
    btn.innerHTML = n ? `${ICONS.users} Asignar copia a ${n} alumno${n === 1 ? '' : 's'}` : 'Elige al menos un alumno';
    const conRutina = alumnos.filter(a => elegidos.has(a.id) && a.rutinaActiva).length;
    const aviso = sheet.querySelector('#pl-aviso');
    if(n){
      aviso.classList.remove('hidden');
      aviso.innerHTML = ICONS.check + '<span>' + (activar
        ? `Se crearán ${n} copia${n === 1 ? '' : 's'} de «${escapeHtml(pl.nombre)}» y quedarán activas.${conRutina ? ` <b>${conRutina} de ${n}</b> ya tiene${conRutina === 1 ? '' : 'n'} una rutina activa: pasará a sus rutinas anteriores (no se borra).` : ''}`
        : `Se guardarán ${n} copia${n === 1 ? '' : 's'} sin activar. Ninguna rutina actual cambia.`) + '</span>';
    } else aviso.classList.add('hidden');
    sheet.querySelector('#pl-todos').textContent = n === alumnos.length ? 'Quitar todos' : 'Seleccionar todos';
  };
  const pintar = () => {
    const term = normalizarTexto(sheet.querySelector('#pl-alu-q').value.trim());
    lista.innerHTML = alumnos.filter(a => !term || normalizarTexto(a.nombre).includes(term)).map(a => `
      <label class="pl-alumno ${elegidos.has(a.id) ? 'on' : ''}">
        <input type="checkbox" value="${a.id}" ${elegidos.has(a.id) ? 'checked' : ''}>
        <span class="pl-check">${ICONS.check}</span>
        ${renderProfileAvatar(a, 'avatar-list')}
        <span class="pl-alumno-txt"><b>${escapeHtml(a.nombre)}</b><small>${a.rutinaActiva ? `Rutina actual: ${escapeHtml(a.rutinaActiva)}` : 'Sin rutina activa'}</small></span>
      </label>`).join('') || '<div class="empty">Ningún alumno con ese nombre.</div>';
    lista.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = () => {
      if(c.checked) elegidos.add(c.value); else elegidos.delete(c.value);
      c.closest('.pl-alumno').classList.toggle('on', c.checked);
      actualizar();
    });
  };
  sheet.querySelector('#pl-alu-q').oninput = pintar;
  sheet.querySelector('#pl-todos').onclick = () => {
    if(elegidos.size === alumnos.length) elegidos.clear(); else alumnos.forEach(a => elegidos.add(a.id));
    pintar(); actualizar();
  };
  sheet.querySelectorAll('input[name=pl-modo]').forEach(rb => rb.onchange = () => { const sel = sheet.querySelector('input[name=pl-modo]:checked'); activar = !sel || sel.value === 'activar'; actualizar(); });
  btn.onclick = async () => {
    if(!elegidos.size) return;
    btn.disabled = true; btn.textContent = 'Asignando...';
    const { data, error } = await sb.rpc('asignar_plantilla', { p_plantilla: pl.id, p_alumnos: [...elegidos], p_activar: activar });
    if(error){
      btn.disabled = false; actualizar();
      showToast(/no puedes asignar/i.test(error.message || '') ? 'Uno de los alumnos ya no está asignado a ti. No se asignó a nadie.' : 'No se pudo asignar. No se creó ninguna copia; intenta de nuevo.');
      return;
    }
    const creadas = data || [];
    if(activar) creadas.forEach(c => avisarPush({ tipo: 'rutina', rutina_id: c.rutina_id, actualizada: false }));
    if(window.UCKilo){ window.UCKilo.sonido('racha'); window.UCKilo.vibrar([60, 40, 90]); }
    sheet.innerHTML = `
      <div class="pl-listo">
        <div class="pl-listo-kilo">${window.UCKilo ? window.UCKilo.svg('celebra', 110) : '✅'}</div>
        <h2>¡Listo!</h2>
        <p>«${escapeHtml(pl.nombre)}» se ${activar ? 'asignó' : 'guardó'} a <b>${creadas.length} alumno${creadas.length === 1 ? '' : 's'}</b>.${activar ? ' Ya les llegó el aviso al celular (a quienes tienen las notificaciones activadas).' : ''}</p>
        <button type="button" class="btn" id="pl-listo-ok">Entendido</button>
      </div>`;
    sheet.querySelector('#pl-listo-ok').onclick = () => { cerrar(); if(typeof preseleccion !== 'undefined' && preseleccion && preseleccion.length === 1 && plVolverAlumno) plVolverAlumno(); };
  };
  pintar(); actualizar();
}

// Desde la ficha de un alumno: elegir una plantilla y asignársela a él
let plVolverAlumno = null;
async function elegirPlantillaParaAlumno(alumno){
  const { data, error } = await sb.from('plantillas_rutina').select('*, plantilla_ejercicios(*)').eq('profesor_id', profile.id).order('updated_at', { ascending: false });
  if(error){ showToast(plFaltaTabla(error) ? 'Las plantillas se están activando, intenta en unos minutos' : 'No se pudieron cargar tus plantillas'); return; }
  const capa = document.createElement('div');
  capa.className = 'pl-capa';
  document.body.appendChild(capa);
  document.body.classList.add('pl-abierto');
  const cerrar = () => { capa.remove(); document.body.classList.remove('pl-abierto'); };
  capa.addEventListener('click', ev => { if(ev.target === capa) cerrar(); });
  capa.innerHTML = `<div class="pl-sheet">
    <div class="red-grab"></div>
    <div class="pl-sheet-head"><div><small class="pl-kicker">DESDE UNA PLANTILLA</small><b>Rutina para ${escapeHtml(alumno.nombre)}</b></div><button type="button" class="pl-x" aria-label="Cerrar">✕</button></div>
    ${(data || []).length ? (data || []).map(pl => { const r = plResumen(pl); return `
      <button type="button" class="pl-elegir" data-pl="${pl.id}">
        ${r.imagen ? `<img class="pl-img" src="${escapeHtml(r.imagen)}" alt="">` : `<span class="pl-img pl-img-vacia">${plIconoTipo(r.tipo)}</span>`}
        <span class="pl-card-txt"><b>${escapeHtml(pl.nombre)}</b><span class="pl-meta"><span>${plIconoTipo(r.tipo)} ${r.tipo}</span><span>${r.dias.length} día${r.dias.length === 1 ? '' : 's'}</span><span>${r.nEj} ejercicios</span></span></span>
        <span class="red-flecha">›</span>
      </button>`; }).join('') : `<div class="empty">Todavía no tienes plantillas.<br><button type="button" class="btn-sm" id="pl-ir-plantillas" style="margin-top:10px;">Ir a Mis plantillas</button></div>`}
  </div>`;
  capa.querySelector('.pl-x').onclick = cerrar;
  const ir = capa.querySelector('#pl-ir-plantillas');
  if(ir) ir.onclick = () => { cerrar(); renderMisPlantillas(); };
  capa.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => {
    const pl = (data || []).find(p => p.id === b.dataset.pl);
    cerrar();
    plVolverAlumno = () => renderCoachAlumnoDetail(alumno.id);
    abrirAsignarPlantilla(pl, [alumno.id]);
  });
}

// ============================================================
// PERFIL DEL PROFESOR (lo ven sus alumnos)
// ============================================================
const PERFIL_PRO_COLORES = ['#FFD446', '#FFD753', '#FFC91A', '#FFC72C', '#FF8A3D', '#FFA64D'];
const PERFIL_PRO_ESPECIALIDADES = ['Fuerza', 'Hipertrofia', 'Funcional', 'Pérdida de grasa', 'Movilidad', 'Rehabilitación', 'Rendimiento deportivo', 'Adulto mayor', 'Principiantes', 'Entrenamiento en casa'];
const PERFIL_PRO_ICONOS = { 'Fuerza': '🏋️', 'Hipertrofia': '📊', 'Funcional': '⚡', 'Pérdida de grasa': '🔥', 'Movilidad': '🧘', 'Rehabilitación': '🩹', 'Rendimiento deportivo': '🏃', 'Adulto mayor': '🌿', 'Principiantes': '🌱', 'Entrenamiento en casa': '🏠' };

function perfilProDe(p){
  const pp = (p && p.perfil_pro && typeof p.perfil_pro === 'object') ? p.perfil_pro : {};
  return {
    bio: String(pp.bio || '').slice(0, 400),
    especialidades: Array.isArray(pp.especialidades) ? pp.especialidades.filter(e => PERFIL_PRO_ESPECIALIDADES.includes(e)).slice(0, 4) : [],
    anos: Math.max(0, Math.min(60, parseInt(pp.anos, 10) || 0)),
    portada_url: /^https:\/\//.test(pp.portada_url || '') ? pp.portada_url : '',
    color: PERFIL_PRO_COLORES.includes(pp.color) ? pp.color : PERFIL_PRO_COLORES[0]
  };
}
function perfilProCardHtml(p, alumnosCount, opciones){
  const pp = perfilProDe(p);
  const op = opciones || {};
  const rol = p.role === 'super_admin' ? 'Profesor · administrador' : 'Profesor';
  return `
    <section class="pp-card" style="--pp:${pp.color}">
      <div class="pp-portada" style="${pp.portada_url ? `background-image:url('${escapeHtml(pp.portada_url)}')` : ''}">${pp.portada_url ? '' : '<span class="pp-portada-marca">STC APP</span>'}</div>
      <div class="pp-id">
        <div class="pp-avatar">${renderProfileAvatar(p, 'avatar-pp')}</div>
        <div class="pp-nombre"><h2>${escapeHtml(p.nombre || 'Profesor')}</h2><span>${rol}</span></div>
        ${op.editar ? `<button type="button" class="pp-editar" id="btn-pp-editar">${ICONS.edit} Editar perfil</button>` : ''}
      </div>
      ${pp.especialidades.length ? `<div class="pp-chips">${pp.especialidades.map(e => `<span>${PERFIL_PRO_ICONOS[e] || '•'} ${escapeHtml(e)}</span>`).join('')}</div>` : ''}
      ${pp.bio ? `<p class="pp-bio">${escapeHtml(pp.bio)}</p>` : (op.editar ? '<p class="pp-bio pp-bio-vacia">Agrega una descripción para que tus alumnos te conozcan.</p>' : '')}
      <div class="pp-stats">
        <div><span class="pp-ico">${ICONS.users}</span><b>${alumnosCount != null ? alumnosCount : '—'}</b><small>Alumnos</small></div>
        <div><span class="pp-ico">${ICONS.trending}</span><b>${pp.anos ? `${pp.anos} año${pp.anos === 1 ? '' : 's'}` : '—'}</b><small>Experiencia</small></div>
      </div>
    </section>`;
}

// Vista del alumno
async function renderPerfilProfesor(profesorId, volver){
  root().innerHTML = `<div class="loading">Abriendo el perfil de tu profe...</div>`;
  const { data, error } = await sb.rpc('perfil_profesor', { p_id: profesorId });
  const p = data && data[0];
  const volverFn = volver || renderAlumnoHome;
  if(error || !p){
    root().innerHTML = `<button type="button" class="back-link" id="btn-pp-volver">${ICONS.arrowLeft} Volver</button><div class="card"><div class="empty">No se pudo abrir el perfil de tu profesor en este momento.</div></div>`;
    document.getElementById('btn-pp-volver').onclick = volverFn;
    return;
  }
  root().innerHTML = `
    <button type="button" class="back-link" id="btn-pp-volver">${ICONS.arrowLeft} Volver</button>
    <h1 class="pp-titulo">Tu profesor</h1>
    ${perfilProCardHtml(p, p.alumnos)}
    <button type="button" class="btn pp-chat" id="btn-pp-chat">${ICONS.message} Escribirle a ${escapeHtml(String(p.nombre || 'tu profe').split(' ')[0])}</button>`;
  document.getElementById('btn-pp-volver').onclick = volverFn;
  document.getElementById('btn-pp-chat').onclick = () => renderChat(p.id, () => renderPerfilProfesor(profesorId, volver));
}

// Bloque dentro de "Tu perfil" para el profesor (vista previa + edición)
async function montarPerfilProfesional(holderId, abrirEdicion){
  const holder = document.getElementById(holderId);
  if(!holder) return;
  let alumnosCount = null;
  const { data } = await sb.rpc('perfil_profesor', { p_id: profile.id });
  if(data && data[0]) alumnosCount = data[0].alumnos;
  const pintar = (editando) => {
    const pp = perfilProDe(profile);
    holder.innerHTML = `
      <div class="pp-label">ASÍ TE VEN TUS ALUMNOS</div>
      ${perfilProCardHtml(profile, alumnosCount, { editar: !editando })}
      ${editando ? `
        <div class="card pp-form" style="--pp:${pp.color}">
          <label>Foto de portada</label>
          <label class="photo-input-label pp-portada-btn" for="pp-portada-input"><span id="pp-portada-label">${ICONS.camera} ${pp.portada_url ? 'Cambiar portada' : 'Subir portada'}</span><input type="file" id="pp-portada-input" accept="image/jpeg,image/png,image/webp"></label>
          ${pp.portada_url ? '<button type="button" class="link-btn" id="pp-quitar-portada">Quitar portada</button>' : ''}
          <label>Especialidades (hasta 4)</label>
          <div class="pp-esp">${PERFIL_PRO_ESPECIALIDADES.map(e => `<button type="button" class="pp-esp-op ${pp.especialidades.includes(e) ? 'on' : ''}" data-esp="${escapeHtml(e)}">${PERFIL_PRO_ICONOS[e] || ''} ${escapeHtml(e)}</button>`).join('')}</div>
          <label>Sobre ti</label>
          <textarea id="pp-bio" maxlength="400" rows="4" placeholder="Ej: Apasionado del entrenamiento de fuerza. Ayudo a personas a ser más fuertes y constantes con planes simples y efectivos.">${escapeHtml(pp.bio)}</textarea>
          <label>Años de experiencia</label>
          <div class="pp-anos"><button type="button" data-anos="-1">−</button><span id="pp-anos">${pp.anos}</span><button type="button" data-anos="1">+</button></div>
          <label>Color de tu perfil</label>
          <div class="pp-colores">${PERFIL_PRO_COLORES.map(c => `<button type="button" class="pp-color ${c === pp.color ? 'on' : ''}" data-color="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
          <div class="pp-ayuda">Tus alumnos ven este perfil desde su inicio, junto al chat contigo.</div>
          <button type="button" class="btn" id="pp-guardar">${ICONS.check} Guardar perfil</button>
          <button type="button" class="btn-ghost" id="pp-cancelar">Cancelar</button>
        </div>` : ''}`;
    const ed = document.getElementById('btn-pp-editar');
    if(ed) ed.onclick = () => pintar(true);
    if(!editando) return;
    const estado = { ...pp, especialidades: [...pp.especialidades] };
    holder.querySelectorAll('.pp-esp-op').forEach(b => b.onclick = () => {
      const e = b.dataset.esp;
      if(estado.especialidades.includes(e)) estado.especialidades = estado.especialidades.filter(x => x !== e);
      else if(estado.especialidades.length >= 4){ showToast('Elige hasta 4 especialidades'); return; }
      else estado.especialidades.push(e);
      b.classList.toggle('on', estado.especialidades.includes(e));
    });
    holder.querySelectorAll('[data-anos]').forEach(b => b.onclick = () => {
      estado.anos = Math.max(0, Math.min(60, estado.anos + Number(b.dataset.anos)));
      document.getElementById('pp-anos').textContent = estado.anos;
    });
    holder.querySelectorAll('.pp-color').forEach(b => b.onclick = () => {
      estado.color = b.dataset.color;
      holder.querySelectorAll('.pp-color').forEach(x => x.classList.toggle('on', x === b));
      holder.querySelectorAll('.pp-card, .pp-form').forEach(x => x.style.setProperty('--pp', estado.color));
    });
    const quitar = document.getElementById('pp-quitar-portada');
    if(quitar) quitar.onclick = () => { estado.portada_url = ''; holder.querySelector('.pp-portada').style.backgroundImage = ''; quitar.remove(); showToast('La portada se quitará al guardar'); };
    document.getElementById('pp-portada-input').onchange = async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if(!file) return;
      const label = document.getElementById('pp-portada-label');
      label.textContent = 'Subiendo portada...';
      const url = await subirPortadaProfesor(file);
      if(url){ estado.portada_url = url; holder.querySelector('.pp-portada').style.backgroundImage = `url('${url}')`; label.innerHTML = `${ICONS.check} Portada lista · falta guardar`; }
      else label.innerHTML = `${ICONS.camera} Subir portada`;
    };
    document.getElementById('pp-cancelar').onclick = () => pintar(false);
    document.getElementById('pp-guardar').onclick = async (ev) => {
      ev.target.disabled = true;
      const perfil_pro = { bio: document.getElementById('pp-bio').value.trim().slice(0, 400), especialidades: estado.especialidades, anos: estado.anos, portada_url: estado.portada_url || null, color: estado.color };
      const { data: nuevo, error } = await sb.from('profiles').update({ perfil_pro }).eq('id', profile.id).select('*').single();
      if(error){ ev.target.disabled = false; showToast(/perfil_pro/i.test(error.message || '') ? 'El perfil profesional se está activando, intenta en unos minutos' : 'No se pudo guardar tu perfil'); return; }
      profile = nuevo;
      showToast('Perfil guardado ✓ · tus alumnos ya lo ven');
      pintar(false);
    };
  };
  pintar(!!abrirEdicion);
  if(abrirEdicion){ const f = holder.querySelector('.pp-form'); if(f) setTimeout(() => f.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }
}

function recortarPortada(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const W = 1200, H = 480, ratio = W / H;
        let sw = img.naturalWidth, sh = sw / ratio;
        if(sh > img.naturalHeight){ sh = img.naturalHeight; sw = sh * ratio; }
        const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        c.toBlob(b => b ? resolve(b) : reject(new Error('sin imagen')), 'image/jpeg', .8);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function subirPortadaProfesor(file){
  if(!file.type.startsWith('image/')){ showToast('Elige una imagen válida'); return null; }
  if(file.size > 15 * 1024 * 1024){ showToast('La imagen es demasiado pesada'); return null; }
  try{
    const blob = await recortarPortada(file);
    const path = `${profile.id}/portada.jpg`;
    const { error } = await sb.storage.from('profile-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
    if(error) throw error;
    const { data } = sb.storage.from('profile-photos').getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }catch(e){
    console.error(e);
    showToast('No se pudo subir la portada');
    return null;
  }
}

// ---------- SERIES POR TIEMPO (reps ⇄ segundos) ----------
function esSeg(u){ return u === 'seg'; }
function fmtSeg(n){
  const t = Math.max(0, Math.round(Number(n) || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
// "12 reps" o "0:45" según la unidad de la serie
function valorSerieTexto(set){
  return esSeg(set && set.unidad) ? `⏱ ${fmtSeg(set.reps)}` : `${set && set.reps != null ? set.reps : 0} reps`;
}
// Objetivo de la rutina: "3 × 12" o "3 × 45 s ⏱"
function objetivoTexto(o){
  if(!o) return '';
  if(o.circuito) return fxTrabajoTexto(o, fxNormalizar(o.circuito));
  const series = o.series_objetivo || '-';
  if(esSeg(o.unidad_objetivo)) return `${series} × ${o.reps_objetivo ? `${o.reps_objetivo} s` : '-'} ⏱`;
  return `${series} × ${o.reps_objetivo || '-'}`;
}
function renderExMeta(ex){
  const sxr = escapeHtml(objetivoTexto(ex));
  const peso = ex.peso_objetivo ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${escapeHtml(ex.peso_objetivo)}</span>` : '';
  const descanso = ex.descanso_seg && !ex.circuito ? `<span class="routine-rest-pill">⏱ ${Number(ex.descanso_seg)}s descanso</span>` : '';
  const tipoLado = renderTipoLadoPills(ex.tipo_serie_objetivo, ex.lado_objetivo);
  return `<span style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;"><b>${sxr}</b>${peso}${descanso}${tipoLado}</span>`;
}
function renderExNota(ex){
  return ex.nota ? `<div class="ex-nota">📝 ${escapeHtml(ex.nota)}</div>` : '';
}
function getExerciseVideoUrl(ex){
  const bankEntry = findExerciseBankEntry(ex && ex.nombre);
  const raw = ex && (ex.video_url || ex.youtube_url || (bankEntry && bankEntry.youtubeUrl));
  if(!raw) return '';
  try{
    const url = new URL(String(raw));
    return ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(url.hostname) ? url.href : '';
  }catch(_){ return ''; }
}
function renderExerciseVideoButton(ex){
  const url = getExerciseVideoUrl(ex);
  if(!url){
    if(!findExerciseBankEntry(ex && ex.nombre)) return '';
    return `<button type="button" class="exercise-video-btn is-pending" disabled aria-label="Video de técnica de ${escapeHtml(ex.nombre)} próximamente" title="Video de técnica próximamente">${ICONS.youtube}<span>Próximamente</span></button>`;
  }
  return `<a class="exercise-video-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver técnica de ${escapeHtml(ex.nombre)} en YouTube" title="Ver técnica en YouTube">${ICONS.youtube}<span>Técnica</span></a>`;
}
function renderWorkoutVideoIcon(ex){
  const entry = findExerciseBankEntry(ex && (ex.nombre || ex.name));
  const nombre = (ex && (ex.nombre || ex.name)) || (entry && entry.name) || 'este ejercicio';
  const model = { ...(ex || {}), nombre };
  const url = getExerciseVideoUrl(model);
  if(!url){
    if(!entry) return '';
    return `<span class="workout-video-icon is-pending" aria-label="Video de técnica de ${escapeHtml(nombre)} próximamente" title="Video de técnica próximamente">${ICONS.youtube}</span>`;
  }
  return `<a class="workout-video-icon" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" aria-label="Ver técnica de ${escapeHtml(nombre)} en YouTube" title="Ver técnica en YouTube">${ICONS.youtube}</a>`;
}
function renderExerciseThumbnail(ex){
  const entry = findExerciseBankEntry(ex && ex.nombre);
  if(!entry) return '';
  const safeName = escapeHtml(entry.name);
  const jsName = safeName.replace(/'/g, "\\'");
  const jsImage = entry.image.replace(/'/g, "\\'");
  return `<button type="button" class="routine-exercise-thumb" onclick="openExerciseImage('${jsImage}','${jsName}')" aria-label="Ampliar referencia técnica de ${safeName}"><img src="${escapeHtml(entry.image)}" alt="Referencia técnica de ${safeName}" loading="lazy"></button>`;
}
function renderRoutineExercise(ex, index){
  return `
    <div class="routine-exercise-row">
      <div class="routine-exercise-index">${String(index + 1).padStart(2,'0')}</div>
      ${renderExerciseThumbnail(ex)}
      <div class="routine-exercise-content">
        <div class="routine-exercise-head">
          <span class="routine-exercise-name">${escapeHtml(ex.nombre)}</span>
          ${renderExerciseVideoButton(ex)}
        </div>
        <div class="routine-exercise-meta">${renderExMeta(ex)}</div>
        ${renderExNota(ex)}
      </div>
    </div>`;
}
function renderRoutineDays(dias){
  return (dias || []).map((d, dayIndex) => `
    <section class="routine-day routine-day-${dayIndex % 4}">
      <div class="routine-day-header">
        <span class="routine-day-kicker">Día ${dayIndex + 1}</span>
        <span class="routine-day-title">${escapeHtml(d.nombre)}</span>
        <span class="routine-day-count">${d.ejercicios.length} ejercicio${d.ejercicios.length === 1 ? '' : 's'}</span>
      </div>
      ${fxBannerHtml(d)}
      <div class="routine-day-exercises">
        ${d.ejercicios.map((ex, index) => renderRoutineExercise(ex, index)).join('')}
      </div>
    </section>
  `).join('');
}

// ---------- ARRANQUE ----------
function esVistaCoach(role){
  return role === 'coach' || role === 'profesor' || role === 'super_admin';
}

async function boot(){
  const { data } = await sb.auth.getSession();
  session = data.session;
  if(!session){ profile = null; renderAuth(); return; }
  await loadProfile();
  if(!profile){ renderAuth(); return; }
  if(await debeCrearClaveNueva()){ renderCrearClaveNueva(); return; }
  setTimeout(limpiarMediosVencidos, 4000);
  pushSincronizar();
  await renderInicio();
}

// Pantalla inicial después de entrar. Si la app se abrió tocando una
// notificación (?abrir=chat|rutina), va directo a ese chat o a la rutina.
async function renderInicio(){
  const destino = tomarDestinoNotificacionDeUrl();
  if(destino && await abrirDestinoNotificacion(destino)) return;
  if(esVistaCoach(profile.role)) await renderCoachHome();
  else await renderAlumnoHome();
}

async function loadProfile(){
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if(error){
    console.error('No se pudo cargar el perfil del usuario.', error);
    profile = null;
    return { ok: false, reason: 'query_error' };
  }
  if(!data){
    console.error('El usuario autenticado no tiene una fila en profiles.');
    profile = null;
    return { ok: false, reason: 'missing_profile' };
  }
  profile = data;
  return { ok: true };
}

function showProfileLoadError(errBox){
  errBox.textContent = 'Tu cuenta inició sesión, pero su perfil no está disponible. Contacta al administrador para repararlo.';
  errBox.classList.remove('hidden');
}

sb.auth.onAuthStateChange((_event, s) => {
  session = s;
});

// ---------- AUTENTICACIÓN ----------
function renderAuth(mode){
  mode = mode || 'login';
  const isLogin = mode === 'login';
  root().innerHTML = `
    <h1>${isLogin ? '¿Quién eres?' : 'Crear tu cuenta'}</h1>
    <div class="sub">${isLogin ? 'Entra con tu correo y contraseña para ver o registrar tus entrenamientos.' : 'Pídele a tu coach el link de la app y crea tu cuenta con tu correo.'}</div>
    <div class="card">
      ${!isLogin ? `
        <label>Tu nombre</label>
        <input type="text" id="auth-nombre" placeholder="Ej: Marcela Jiménez" autocomplete="name">
      ` : ''}
      <label>Correo</label>
      <input type="email" id="auth-email" placeholder="tucorreo@ejemplo.com" autocomplete="email">
      <label>Contraseña</label>
      <input type="password" id="auth-pass" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
      <button class="btn" id="auth-submit">${isLogin ? 'Entrar' : 'Crear cuenta'}</button>
      <div id="auth-error" class="error-banner hidden" style="margin-top:12px;"></div>
    </div>
    <div class="auth-switch">
      ${isLogin ? '¿No tienes cuenta todavía? ' : '¿Ya tienes cuenta? '}
      <button id="auth-toggle">${isLogin ? 'Crear una' : 'Entrar'}</button>
    </div>
    ${isLogin ? `<div class="auth-switch auth-olvide"><button id="auth-olvide">¿Olvidaste tu contraseña? Escríbenos por WhatsApp</button></div>` : ''}
  `;
  document.getElementById('auth-toggle').onclick = () => renderAuth(isLogin ? 'signup' : 'login');
  const btnOlvide = document.getElementById('auth-olvide');
  if(btnOlvide) btnOlvide.onclick = () => {
    const correo = (document.getElementById('auth-email').value || '').trim();
    const texto = `Hola, olvidé mi clave de STC App. Mi correo es: ${correo || '(escribe aquí tu correo)'}`;
    window.open(`https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };
  document.getElementById('auth-submit').onclick = () => isLogin ? handleLogin() : handleSignup();
}

async function handleLogin(){
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const errBox = document.getElementById('auth-error');
  errBox.classList.add('hidden');
  if(!email || !pass){ showToast('Completa correo y contraseña'); return; }
  const btn = document.getElementById('auth-submit');
  btn.disabled = true; btn.textContent = 'Entrando...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false; btn.textContent = 'Entrar';
  if(error){
    errBox.textContent = 'No se pudo entrar: correo o contraseña incorrectos.';
    errBox.classList.remove('hidden');
    return;
  }
  session = data.session;
  const profileResult = await loadProfile();
  if(!profileResult.ok){
    showProfileLoadError(errBox);
    return;
  }
  if(await debeCrearClaveNueva()){ renderCrearClaveNueva(); return; }
  setTimeout(limpiarMediosVencidos, 4000);
  pushSincronizar();
  await renderInicio();
}

async function handleSignup(){
  const nombre = document.getElementById('auth-nombre').value.trim();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const errBox = document.getElementById('auth-error');
  errBox.classList.add('hidden');
  if(!nombre || !email || !pass){ showToast('Completa todos los campos'); return; }
  if(pass.length < 6){ showToast('La contraseña debe tener al menos 6 caracteres'); return; }
  const btn = document.getElementById('auth-submit');
  btn.disabled = true; btn.textContent = 'Creando...';
  // Si la persona entró con un link de invitación (?ref=<id-del-profesor>),
  // se lo mandamos al signup para que quede asignada automáticamente.
  // Si no hay ref (la forma antigua de crear cuenta), sigue funcionando igual.
  const refProfesor = new URLSearchParams(window.location.search).get('ref') || undefined;
  const { data, error } = await sb.auth.signUp({
    email, password: pass, options: { data: { nombre, profesor_id: refProfesor } }
  });
  btn.disabled = false; btn.textContent = 'Crear cuenta';
  if(error){
    errBox.textContent = 'No se pudo crear la cuenta: ' + error.message;
    errBox.classList.remove('hidden');
    return;
  }
  if(!data.session){
    showToast('Cuenta creada. Revisa tu correo para confirmar.');
    renderAuth('login');
    return;
  }
  session = data.session;
  const profileResult = await loadProfile();
  if(!profileResult.ok){
    showProfileLoadError(errBox);
    return;
  }
  showToast('¡Cuenta creada!');
  if(esVistaCoach(profile.role)) await renderCoachHome(); else await renderAlumnoHome();
}

async function handleLogout(){
  cleanupSocialRealtime();
  descansoDetener();
  await pushQuitarDeEsteCelular();
  await sb.auth.signOut();
  session = null; profile = null;
  renderAuth();
}


// ---------- CLAVE TEMPORAL (recuperación por WhatsApp) ----------
// Si un alumno olvida su clave, escribe al WhatsApp de soporte. El súper
// administrador genera una clave temporal desde la ficha del alumno (función
// generar_clave_temporal en Supabase: solo súper admin y solo cuentas de
// alumno). Al entrar con ella, la app obliga a crear una clave propia.
const WHATSAPP_SOPORTE = '56986697399'; // número que recibe "olvidé mi clave" (sin + ni espacios)

async function debeCrearClaveNueva(){
  if(!profile || profile.role !== 'alumno') return false;
  try {
    const { data, error } = await sb.rpc('clave_temporal_pendiente');
    return !error && data === true;
  } catch(e){ return false; }
}

function renderCrearClaveNueva(){
  root().innerHTML = `
    <h1>Crea tu nueva contraseña</h1>
    <div class="sub">Entraste con una clave temporal. Para seguir, elige tu propia contraseña (mínimo 6 caracteres). Solo tú la vas a conocer.</div>
    <div class="card">
      <label>Nueva contraseña</label>
      <input type="password" id="clave-nueva-1" autocomplete="new-password" placeholder="••••••••">
      <label>Repítela</label>
      <input type="password" id="clave-nueva-2" autocomplete="new-password" placeholder="••••••••">
      <button class="btn" id="btn-guardar-clave-nueva">Guardar mi contraseña</button>
      <div id="clave-nueva-error" class="error-banner hidden" style="margin-top:12px;"></div>
    </div>
    <div class="auth-switch"><button id="btn-clave-nueva-salir">Cerrar sesión</button></div>`;
  document.getElementById('btn-clave-nueva-salir').onclick = handleLogout;
  const errBox = document.getElementById('clave-nueva-error');
  const mostrarError = (m) => { errBox.textContent = m; errBox.classList.remove('hidden'); };
  document.getElementById('btn-guardar-clave-nueva').onclick = async () => {
    errBox.classList.add('hidden');
    const c1 = document.getElementById('clave-nueva-1').value;
    const c2 = document.getElementById('clave-nueva-2').value;
    if(c1.length < 6){ mostrarError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if(c1 !== c2){ mostrarError('Las dos contraseñas no coinciden.'); return; }
    if(/^UC-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c1)){ mostrarError('Elige una contraseña distinta a la clave temporal.'); return; }
    const btn = document.getElementById('btn-guardar-clave-nueva');
    btn.disabled = true; btn.textContent = 'Guardando...';
    const { error } = await sb.auth.updateUser({ password: c1 });
    if(error){
      btn.disabled = false; btn.textContent = 'Guardar mi contraseña';
      mostrarError(/different|distinta|same/i.test(error.message) ? 'Elige una contraseña distinta a la clave temporal.' : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    const { data: listo } = await sb.rpc('marcar_clave_cambiada');
    if(listo !== true){
      btn.disabled = false; btn.textContent = 'Guardar mi contraseña';
      mostrarError('No se pudo confirmar el cambio. Inténtalo de nuevo.');
      return;
    }
    showToast('¡Listo! Tu nueva contraseña quedó guardada 💪');
    if(esVistaCoach(profile.role)) await renderCoachHome(); else await renderAlumnoHome();
  };
}

async function generarClaveTemporalAlumno(alumno, btn){
  btn.disabled = true; btn.textContent = 'Generando...';
  const { data: clave, error } = await sb.rpc('generar_clave_temporal', { target_id: alumno.id });
  btn.disabled = false; btn.textContent = '🔑 Generar clave temporal';
  btn.dataset.confirm = ''; btn.classList.remove('btn-danger-confirm');
  if(error || !clave){ showToast('No se pudo generar: ' + (error ? error.message : 'sin respuesta')); return; }
  const primerNombre = (alumno.nombre || '').split(' ')[0] || '';
  const mensaje = `Hola ${primerNombre} 👋 Tu clave temporal de STC App es: ${clave}\n\nEntra en https://stcapp-zeta.vercel.app con tu correo y esta clave. La app te pedirá crear tu propia contraseña.`;
  const capa = document.createElement('div');
  capa.className = 'logro-celebracion clave-temporal-capa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Clave temporal generada');
  capa.innerHTML = `
    <div class="logro-celebracion-card clave-temporal-card">
      <p class="logro-celebracion-eyebrow">Clave temporal de ${escapeHtml(alumno.nombre || '')}</p>
      <div class="clave-temporal-valor" id="clave-temporal-valor"></div>
      <p class="logro-celebracion-desc">Se muestra <b>una sola vez</b>. La clave anterior ya no funciona. Al entrar, deberá crear su propia contraseña.</p>
      <a class="btn" id="btn-clave-whatsapp" target="_blank" rel="noopener">Enviar por WhatsApp</a>
      <button type="button" class="btn-sm clave-temporal-copiar" id="btn-clave-copiar">Copiar mensaje</button>
      <button type="button" class="link-btn" id="btn-clave-listo" style="display:block; margin:12px auto 0;">Listo</button>
    </div>`;
  capa.querySelector('#clave-temporal-valor').textContent = clave;
  capa.querySelector('#btn-clave-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  document.body.appendChild(capa);
  capa.querySelector('#btn-clave-copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(mensaje); showToast('Mensaje copiado'); }
    catch(e){ showToast('No se pudo copiar; mantén presionada la clave para copiarla'); }
  };
  capa.querySelector('#btn-clave-listo').onclick = () => { capa.classList.add('sale'); setTimeout(() => capa.remove(), 250); };
}

// ============================================================
// VISTA ALUMNO
// ============================================================
async function renderAlumnoHome(){
  cleanupSocialRealtime();
  root().innerHTML = `<div class="loading">Cargando tu historial...</div>`;

  const [{ data: sesiones }, { data: rutina }, { data: historialRutinas }, socialSummary, teacherChat] = await Promise.all([
    sb.from('sesiones').select('*, sesion_series(*)').eq('alumno_id', profile.id).order('fecha', { ascending: false }),
    sb.from('rutinas').select('*, rutina_ejercicios(*)').eq('alumno_id', profile.id).eq('activa', true).maybeSingle(),
    sb.from('rutinas').select('id').eq('alumno_id', profile.id).eq('activa', false),
    getSocialSummary(),
    getTeacherChatSummary()
  ]);

  const todasSesiones = markPRs(sesiones || []);
  guardarMapaPRs(todasSesiones);
  const conSeries = todasSesiones.filter(s => (s.sesion_series || []).length > 0);
  const fechas = conSeries.map(s => s.fecha);
  const streak = computeStreak(fechas);
  activeRutinaDias = (rutina && rutina.rutina_ejercicios) ? groupPorDia(rutina.rutina_ejercicios) : [];
  activeStatsPorEjercicio = computeStatsPorEjercicio(sesiones || []);
  activeUltimaVez = computeUltimaVez(sesiones || [], todayStr());
  const logros = calcularLogros(conSeries, streak);
  const progresoResumen = calcularResumenProgreso(conSeries, streak);
  const sesionHoy = (sesiones || []).find(s => s.fecha === todayStr());
  const hoyCompletado = !!sesionHoy && (!!sesionHoy.finalizada_at || sesionFinalizada(sesionHoy.id));
  const hayEntrenamientoHoy = !!sesionHoy && !hoyCompletado;
  const rutinaPropia = alumnoPuedeEditarRutina(rutina);

  root().innerHTML = `
    <div class="header-actions student-home-header">
      <div class="student-profile-identity">
        <button type="button" class="profile-avatar-button" id="btn-mi-perfil" aria-label="Editar mi foto o avatar">
          ${renderProfileAvatar(profile, 'avatar-home')}
          <span class="avatar-edit-badge">${ICONS.edit}</span>
        </button>
        <div class="student-profile-greeting">
          <h1 style="font-size:20px;">${escapeHtml(profile.nombre)}</h1>
          <div class="sub" style="margin-bottom:3px;">Tu registro de entrenamiento</div>
        </div>
      </div>
      <div class="student-header-actions">
        <button type="button" class="social-icon-only ${(socialSummary.pending + socialSummary.unread) ? 'has-alerts' : ''}" id="btn-social-hub" aria-label="Abrir compañeros de entrenamiento" title="Compañeros de entrenamiento">
          ${ICONS.users}
          ${(socialSummary.pending + socialSummary.unread) ? `<span class="social-notification-badge">${socialSummary.pending + socialSummary.unread}</span>` : ''}
        </button>
        <button class="switch-user" id="btn-logout">${ICONS.logout} Salir</button>
      </div>
    </div>

    ${teacherChat ? `
      <button type="button" class="teacher-chat-card" id="btn-teacher-chat">
        ${renderProfileAvatar(teacherChat,'avatar-chat')}
        <span class="teacher-chat-copy"><small>CONTACTO DIRECTO</small><b>Chat con tu profesor</b><em>${escapeHtml(teacherChat.nombre)}</em></span>
        <span class="teacher-chat-action">${ICONS.message}${teacherChat.unread ? `<strong>${teacherChat.unread}</strong>` : ''}</span>
      </button>
      <button type="button" class="pp-ver-link" id="btn-ver-perfil-profe">${ICONS.users} Conoce el perfil de tu profe ${ICONS.chevronRight}</button>
    ` : `
      <div class="teacher-chat-card is-disabled">
        <span class="teacher-chat-placeholder">${ICONS.message}</span>
        <span class="teacher-chat-copy"><small>CONTACTO DIRECTO</small><b>Chat con tu profesor</b><em>Disponible cuando tengas un profesor asignado</em></span>
      </div>
    `}

    <section class="daily-training-hero ${hayEntrenamientoHoy ? 'has-session' : ''}">
      <div class="daily-training-glow"></div>
      <div class="daily-training-kicker">HOY · REGISTRO DIARIO</div>
      <h2>${hoyCompletado ? '¡Entrenamiento de hoy completado!' : hayEntrenamientoHoy ? 'Tu entrenamiento sigue en marcha' : 'Tu entrenamiento empieza aquí'}</h2>
      <p>${hoyCompletado
        ? 'Buen trabajo. Tu sesión de hoy quedó guardada. Si te faltó algo, puedes agregarlo.'
        : hayEntrenamientoHoy
        ? 'Continúa registrando tus series, pesos y repeticiones de hoy.'
        : (rutina ? 'Elige un día de tu rutina y registra cada avance mientras entrenas.' : 'Empieza una sesión libre y guarda cada serie para medir tu progreso.')}</p>
      <button class="btn daily-training-btn" id="btn-nueva-sesion">${hoyCompletado ? `${ICONS.plus} Agregar algo a hoy` : hayEntrenamientoHoy ? `${ICONS.activity} Continuar entrenamiento` : `${ICONS.plus} Comenzar entrenamiento`}</button>
      <div class="daily-training-note">${ICONS.check} Guardado automático durante toda la sesión</div>
    </section>

    <div id="fb-aviso-holder"></div>
    <div id="push-aviso-holder"></div>

    <div class="streak-row">
      <div class="stat-tile" id="tile-racha"><div class="num">${streak}</div><div class="label">semana${streak===1?'':'s'} seguida${streak===1?'':'s'}</div></div>
      <div class="stat-tile"><div class="num">${conSeries.length}</div><div class="label">sesiones totales</div></div>
    </div>

    <button class="btn-toggle-rutina section-history history-primary" id="btn-toggle-historial">
      <span class="history-primary-copy">
        <span class="toggle-label">${ICONS.book} Entrenamientos guardados</span>
        <small>${conSeries.length
          ? `${conSeries.length} sesión${conSeries.length === 1 ? '' : 'es'} · revisa pesos, series y avances`
          : 'Tu historial aparecerá aquí después de la primera sesión'}</small>
      </span>
      ${toggleStateHtml('Abrir')}
    </button>
    <div class="hidden" id="sesiones-list"></div>


    ${rutina ? `
      <button class="btn-toggle-rutina section-routine" id="btn-toggle-rutina">
        <span class="toggle-label">${ICONS.clipboard} Rutina: ${escapeHtml(rutina.nombre)}</span>
        ${toggleStateHtml()}
      </button>
      <div class="card routine-plan hidden" id="rutina-detail-card">
        <div class="row-flex" style="margin-bottom:6px;">
          <div><h2 style="margin:0 0 7px;">${escapeHtml(rutina.nombre)}</h2>${routineOriginBadge(rutina, true)}</div>
          <button class="btn-sm" id="btn-pdf-rutina">${ICONS.download} Descargar PDF</button>
        </div>
        ${rutina.objetivo ? `<div class="sub" style="margin-bottom:12px;">${escapeHtml(rutina.objetivo)}</div>` : ''}
        ${renderRoutineDays(activeRutinaDias)}
      </div>
    ` : `<div class="card">${emptyKiloHtml('Aún no tienes una rutina activa. Tu profesor te asignará una pronto.', 'espera', 'padding:16px;')}</div>`}

    ${historialRutinas && historialRutinas.length ? `<button class="link-btn" id="btn-ver-mis-rutinas" style="margin-bottom:16px;">Ver rutinas anteriores (${historialRutinas.length}) →</button>` : ''}

    <button class="btn-toggle-rutina section-calendar" id="btn-toggle-calendario">
      <span class="toggle-label">${ICONS.calendar} Calendario</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="calendar-holder"></div>

    ${conSeries.length ? `
      <button class="btn-toggle-rutina section-progress" id="btn-toggle-progreso">
        <span class="toggle-label">${ICONS.trending} Progresión</span>
        ${toggleStateHtml()}
      </button>
      <div class="chart-wrap hidden" id="progreso-wrap">
        ${renderResumenProgresoHtml(progresoResumen)}
        <section class="progress-exercise-picker" aria-label="Banco de ejercicios para ver tu progresión">
          <div class="progress-picker-heading">
            <div>
              <span>Elige un ejercicio</span>
              <small>Busca o explora el banco visual</small>
            </div>
            <button type="button" class="progress-bank-toggle" id="progreso-bank-toggle">Ver banco completo</button>
          </div>
          <label class="progress-search-box">
            <span aria-hidden="true">⌕</span>
            <input id="progreso-search" type="search" placeholder="Buscar ejercicio..." autocomplete="off">
          </label>
          <div class="progress-group-filters" id="progreso-group-filters" aria-label="Filtrar por grupo muscular"></div>
          <div class="progress-bank-grid" id="progreso-bank-grid"></div>
        </section>
        <section class="progress-selected-exercise" id="progreso-selected-exercise"></section>
        <section class="progress-strength-card" id="progreso-strength-card"></section>
        <div class="progress-chart-heading">
          <span>Evolución de carga</span>
          <small>Mejor peso registrado en cada entrenamiento</small>
        </div>
        <div class="progress-chart-frame">
          <canvas id="progreso-canvas"></canvas>
          <div class="progress-chart-empty hidden" id="progreso-chart-empty"></div>
        </div>
      </div>
    ` : ''}

    <button class="btn-toggle-rutina section-measurements" id="btn-toggle-mediciones">
      <span class="toggle-label">${ICONS.activity} Mediciones corporales</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="mediciones-holder"></div>

    <div id="ficha-aviso-holder"></div>
    <div id="ficha-completada-holder"></div>
    <div id="entrevista-objetivos-aviso-holder"></div>
    <div id="entrevista-objetivos-completada-holder"></div>

    <button class="btn-toggle-rutina section-achievements" id="btn-toggle-logros">
      <span class="toggle-label">🏅 Mis logros <span class="logros-conteo">${logros.filter(l => l.ok).length} de ${logros.length}</span></span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="logros-holder">${renderLogrosHtml(logros)}</div>

    <button type="button" class="link-btn opinar-link" id="btn-toggle-opinar">¿Tienes una sugerencia sobre el servicio? Escríbenos</button>
    <div class="hidden" id="opinar-holder"></div>
  `;

  document.getElementById('btn-logout').onclick = handleLogout;
  document.getElementById('btn-mi-perfil').onclick = renderMiPerfil;
  document.getElementById('btn-social-hub').onclick = renderSocialHub;
  if(teacherChat) document.getElementById('btn-teacher-chat').onclick = () => renderChat(teacherChat.id, renderAlumnoHome);
  if(teacherChat) document.getElementById('btn-ver-perfil-profe').onclick = () => renderPerfilProfesor(teacherChat.id, renderAlumnoHome);
  subscribeSocialNotifications(renderAlumnoHome);
  document.getElementById('btn-nueva-sesion').onclick = () => iniciarNuevaSesion(rutina);
  mostrarFichaAlumno();
  mostrarEntrevistaObjetivosAlumno();
  cargarFeedbackAlumno();
  mostrarAvisoPush();
  if(rutina){
    document.getElementById('btn-pdf-rutina').onclick = () => descargarRutinaPDF(rutina, activeRutinaDias);
    wireToggle('btn-toggle-rutina', 'rutina-detail-card');
  }
  if(historialRutinas && historialRutinas.length){
    document.getElementById('btn-ver-mis-rutinas').onclick = () => renderHistorialRutinas(profile, renderAlumnoHome, false);
  }
  wireToggle('btn-toggle-calendario', 'calendar-holder');
  wireToggle('btn-toggle-historial', 'sesiones-list');
  if(conSeries.length){
    let progresoInicializado = false;
    wireToggle('btn-toggle-progreso', 'progreso-wrap', () => {
      if(!progresoInicializado){ setupProgresoChart(conSeries); progresoInicializado = true; }
      else if(progresoChart){ progresoChart.resize(); }
    });
  }
  {
    let medicionesInicializado = false;
    wireToggle('btn-toggle-mediciones', 'mediciones-holder', () => {
      if(!medicionesInicializado){ renderMediciones('mediciones-holder', profile.id); medicionesInicializado = true; }
    });
  }
  wireToggle('btn-toggle-opinar', 'opinar-holder', () => renderOpinionForm('opinar-holder', profile.id));
  wireToggle('btn-toggle-logros', 'logros-holder');
  // Si el profe le mandó una rutina nueva, eso se muestra primero; los logros
  // quedan para la próxima vez que abra el inicio (no se pierden).
  if(!avisarRutinaNueva(rutina)) avisarLogrosNuevos(logros);

  renderCalendar('calendar-holder', fechas);
  renderSesionesList('sesiones-list', conSeries, false, renderAlumnoHome);
  animarRacha(streak);
}

// ---------- LOGROS (medallas) ----------
// Se calculan con lo que la app ya guarda (sesiones, series, récords y racha);
// no se guarda nada nuevo en la base de datos. Cada celular recuerda cuáles ya
// mostró, para celebrar solo los logros nuevos.
function calcularLogros(conSeries, streak){
  const sesiones = conSeries || [];
  const series = sesiones.flatMap(s => s.sesion_series || []);
  const nSesiones = sesiones.length;
  const nPRs = series.filter(x => x._isPR).length;
  const volumen = Math.round(series.reduce((acc, x) => {
    const peso = Number(x.peso) || 0, reps = Number(x.reps) || 0;
    return acc + (!esSeg(x.unidad) && peso > 0 && reps > 0 ? peso * reps : 0);
  }, 0));
  const ejercicios = new Set(series.map(x => normalizeExerciseName(x.ejercicio_nombre))).size;
  const finalizadas = sesiones.filter(s => s.finalizada_at).length;
  const def = [
    { id: 'primer-paso', icono: '🚀', nombre: 'Primer paso', desc: 'Registra tu primer entrenamiento', valor: nSesiones, meta: 1 },
    { id: 'constancia-10', icono: '💪', nombre: 'Constancia', desc: 'Completa 10 entrenamientos', valor: nSesiones, meta: 10 },
    { id: 'constancia-25', icono: '🔥', nombre: 'Imparable', desc: 'Completa 25 entrenamientos', valor: nSesiones, meta: 25 },
    { id: 'constancia-50', icono: '🏆', nombre: 'Leyenda', desc: 'Completa 50 entrenamientos', valor: nSesiones, meta: 50 },
    { id: 'racha-4', icono: '📅', nombre: 'Un mes firme', desc: 'Entrena 4 semanas seguidas', valor: streak, meta: 4 },
    { id: 'racha-8', icono: '⚡', nombre: 'Disciplina total', desc: 'Entrena 8 semanas seguidas', valor: streak, meta: 8 },
    { id: 'record-1', icono: '👑', nombre: 'Primer récord', desc: 'Logra tu primer récord personal', valor: nPRs, meta: 1 },
    { id: 'record-10', icono: '💎', nombre: 'Rompe récords', desc: 'Logra 10 récords personales', valor: nPRs, meta: 10 },
    { id: 'volumen-10k', icono: '🏋️', nombre: '10 toneladas', desc: 'Levanta 10.000 kg en total', valor: volumen, meta: 10000 },
    { id: 'volumen-50k', icono: '🦾', nombre: '50 toneladas', desc: 'Levanta 50.000 kg en total', valor: volumen, meta: 50000 },
    { id: 'variedad-10', icono: '🎯', nombre: 'Explorador', desc: 'Entrena 10 ejercicios distintos', valor: ejercicios, meta: 10 },
    { id: 'cierre-5', icono: '✅', nombre: 'Cierra el día', desc: 'Finaliza 5 entrenamientos', valor: finalizadas, meta: 5 }
  ];
  return def.map(l => ({ ...l, ok: l.valor >= l.meta }));
}
function renderLogrosHtml(logros){
  const fmt = n => Number(n).toLocaleString('es-CL');
  return `<div class="logros-grid">${logros.map(l => `
    <div class="logro ${l.ok ? 'desbloqueado' : 'bloqueado'}" data-logro="${l.id}">
      <span class="logro-icono" aria-hidden="true">${l.icono}</span>
      <b>${escapeHtml(l.nombre)}</b>
      <small>${escapeHtml(l.desc)}</small>
      ${l.ok ? '<span class="logro-estado">¡Logrado!</span>' : `<span class="logro-barra"><i style="width:${Math.min(100, Math.round((l.valor / l.meta) * 100))}%"></i></span><span class="logro-estado">${fmt(Math.min(l.valor, l.meta))} / ${fmt(l.meta)}</span>`}
    </div>`).join('')}</div>`;
}
function avisarLogrosNuevos(logros){
  if(!profile) return;
  const key = `uc_logros_vistos_${profile.id}`;
  let vistos = null;
  try { vistos = JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ vistos = null; }
  const desbloqueados = logros.filter(l => l.ok).map(l => l.id);
  try { localStorage.setItem(key, JSON.stringify(desbloqueados)); } catch(e){}
  // La primera vez en este celular solo se guarda la lista (no se celebra todo de golpe).
  if(!Array.isArray(vistos)) return;
  const nuevos = logros.filter(l => l.ok && !vistos.includes(l.id));
  if(nuevos.length) mostrarLogroNuevo(nuevos[0], nuevos.length - 1);
}
function mostrarLogroNuevo(logro, otros){
  const capa = document.createElement('div');
  capa.className = 'logro-celebracion';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Nuevo logro desbloqueado');
  capa.innerHTML = `
    <div class="logro-celebracion-card">
      <div class="logro-celebracion-kilo">${window.UCKilo ? window.UCKilo.svg('celebra', 96) : ''}</div>
      <p class="logro-celebracion-eyebrow">¡Nuevo logro desbloqueado!</p>
      <div class="logro-celebracion-icono">${logro.icono}</div>
      <h2>${escapeHtml(logro.nombre)}</h2>
      <p class="logro-celebracion-desc">${escapeHtml(logro.desc)}</p>
      ${otros > 0 ? `<p class="logro-celebracion-extra">Y ${otros} logro${otros === 1 ? '' : 's'} más. Míralos en "Mis logros".</p>` : ''}
      <button type="button" class="btn" id="btn-logro-ok">¡Genial!</button>
    </div>`;
  document.body.appendChild(capa);
  if(window.UCKilo){ window.UCKilo.sonido('racha'); window.UCKilo.vibrar([40, 30, 60]); }
  const cerrar = () => { capa.classList.add('sale'); setTimeout(() => capa.remove(), 250); };
  capa.querySelector('#btn-logro-ok').onclick = cerrar;
  capa.addEventListener('click', e => { if(e.target === capa) cerrar(); });
}


// ============================================================
// CONTADOR DE DESCANSO
// ============================================================
// No es parte de la rutina: es una herramienta del registro. El alumno toca
// "Descanso", elige cuántos segundos quiere y la cuenta regresiva corre en
// una barra abajo. Se guarda la HORA DE TÉRMINO (no los segundos que
// faltan), así si bloquea el celular o cambia de app, al volver el tiempo
// está correcto. Mientras corre, se pide que la pantalla no se apague
// (Wake Lock, si el celular lo permite). Todo queda en este celular.
const DESCANSO_KEY_FIN = 'uc_descanso_fin';
const DESCANSO_KEY_TOTAL = 'uc_descanso_total';
const DESCANSO_KEY_ELEGIDO = 'uc_descanso_seg';
const DESCANSO_RAPIDOS = [30, 45, 60, 90, 120, 180];
let descansoIntervalo = null;
let descansoWakeLock = null;
let descansoUltimoTic = null;
let descansoAvisoTimer = null;

function descansoFormato(seg){
  seg = Math.max(0, Math.ceil(seg));
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
}
function descansoLeer(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
function descansoGuardar(key, val){ try { if(val === null) localStorage.removeItem(key); else localStorage.setItem(key, String(val)); } catch(e){} }

function abrirSelectorDescanso(){
  if(window.UCKilo) window.UCKilo.prepararAudio();
  document.querySelector('.descanso-sheet')?.remove();
  let seg = Number(descansoLeer(DESCANSO_KEY_ELEGIDO)) || 90;
  const capa = document.createElement('div');
  capa.className = 'descanso-sheet';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Elegir tiempo de descanso');
  capa.innerHTML = `
    <div class="descanso-sheet-panel">
      <p class="descanso-sheet-titulo">¿Cuánto quieres descansar?</p>
      <div class="descanso-sheet-ajuste">
        <button type="button" class="descanso-ajuste-btn" data-delta="-15" aria-label="Quitar 15 segundos">−15</button>
        <div class="descanso-sheet-tiempo" id="descanso-sheet-tiempo" aria-live="polite"></div>
        <button type="button" class="descanso-ajuste-btn" data-delta="15" aria-label="Sumar 15 segundos">+15</button>
      </div>
      <div class="descanso-rapidos">
        ${DESCANSO_RAPIDOS.map(v => `<button type="button" class="descanso-rapido" data-seg="${v}">${v < 60 ? v + ' s' : descansoFormato(v)}</button>`).join('')}
      </div>
      <button type="button" class="btn" id="btn-iniciar-descanso">⏱ Iniciar descanso</button>
      <button type="button" class="link-btn descanso-sheet-cerrar" id="btn-cerrar-descanso">Cerrar</button>
    </div>`;
  document.body.appendChild(capa);
  const pintar = () => {
    capa.querySelector('#descanso-sheet-tiempo').textContent = descansoFormato(seg);
    capa.querySelectorAll('.descanso-rapido').forEach(b => b.classList.toggle('selected', Number(b.dataset.seg) === seg));
  };
  pintar();
  capa.querySelectorAll('.descanso-ajuste-btn').forEach(b => b.onclick = () => { seg = Math.min(600, Math.max(5, seg + Number(b.dataset.delta))); pintar(); });
  capa.querySelectorAll('.descanso-rapido').forEach(b => b.onclick = () => { seg = Number(b.dataset.seg); pintar(); });
  const cerrar = () => capa.remove();
  capa.querySelector('#btn-cerrar-descanso').onclick = cerrar;
  capa.addEventListener('click', e => { if(e.target === capa) cerrar(); });
  capa.querySelector('#btn-iniciar-descanso').onclick = () => {
    descansoGuardar(DESCANSO_KEY_ELEGIDO, seg);
    cerrar();
    descansoIniciar(seg);
  };
}

function descansoIniciar(seg){
  if(window.UCKilo){ window.UCKilo.prepararAudio(); window.UCKilo.vibrar(30); }
  descansoGuardar(DESCANSO_KEY_FIN, Date.now() + seg * 1000);
  descansoGuardar(DESCANSO_KEY_TOTAL, seg);
  descansoMostrarBarra();
  descansoPedirPantallaEncendida();
}

// Si la app se recargó o se volvió a abrir el registro con un descanso en curso.
function descansoReanudar(){
  const fin = Number(descansoLeer(DESCANSO_KEY_FIN));
  if(!fin) return;
  if(fin - Date.now() < -60000){ descansoDetener(); return; } // terminó hace rato: se descarta
  descansoMostrarBarra();
}

function descansoMostrarBarra(){
  let barra = document.getElementById('descanso-barra');
  if(!barra){
    barra = document.createElement('div');
    barra.id = 'descanso-barra';
    barra.className = 'descanso-barra';
    barra.setAttribute('role', 'timer');
    barra.innerHTML = `
      <svg class="descanso-anillo" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" class="descanso-anillo-fondo"/>
        <circle cx="22" cy="22" r="19" class="descanso-anillo-avance" id="descanso-anillo-avance"/>
      </svg>
      <div class="descanso-barra-texto">
        <span class="descanso-barra-etiqueta" id="descanso-barra-etiqueta">Descansando</span>
        <span class="descanso-barra-tiempo" id="descanso-barra-tiempo">0:00</span>
      </div>
      <div class="descanso-barra-acciones" id="descanso-barra-acciones">
        <button type="button" class="descanso-mini" data-delta="-15" aria-label="Quitar 15 segundos">−15</button>
        <button type="button" class="descanso-mini" data-delta="15" aria-label="Sumar 15 segundos">+15</button>
        <button type="button" class="descanso-mini descanso-saltar" id="btn-saltar-descanso">Saltar</button>
      </div>`;
    document.body.appendChild(barra);
    barra.querySelectorAll('.descanso-mini[data-delta]').forEach(b => b.onclick = () => {
      const fin = Number(descansoLeer(DESCANSO_KEY_FIN));
      const total = Number(descansoLeer(DESCANSO_KEY_TOTAL)) || 60;
      if(!fin) return;
      const delta = Number(b.dataset.delta) * 1000;
      const nuevoFin = Math.max(Date.now() + 1000, fin + delta);
      descansoGuardar(DESCANSO_KEY_FIN, nuevoFin);
      descansoGuardar(DESCANSO_KEY_TOTAL, Math.max(5, total + Number(b.dataset.delta)));
      descansoTick();
    });
    barra.querySelector('#btn-saltar-descanso').onclick = descansoDetener;
  }
  barra.classList.remove('termino', 'sale');
  document.body.classList.add('descanso-activo');
  descansoUltimoTic = null;
  if(descansoIntervalo) clearInterval(descansoIntervalo);
  descansoIntervalo = setInterval(descansoTick, 250);
  descansoTick();
}

function descansoTick(){
  const barra = document.getElementById('descanso-barra');
  const fin = Number(descansoLeer(DESCANSO_KEY_FIN));
  if(!barra || !fin){ descansoDetener(); return; }
  const total = Number(descansoLeer(DESCANSO_KEY_TOTAL)) || 60;
  const restante = (fin - Date.now()) / 1000;
  const avance = barra.querySelector('#descanso-anillo-avance');
  const largo = 2 * Math.PI * 19;
  if(restante > 0){
    barra.querySelector('#descanso-barra-tiempo').textContent = descansoFormato(restante);
    if(avance){ avance.style.strokeDasharray = largo; avance.style.strokeDashoffset = largo * (1 - Math.min(1, restante / total)); }
    const seg = Math.ceil(restante);
    if(seg <= 3 && seg !== descansoUltimoTic && document.visibilityState === 'visible'){
      descansoUltimoTic = seg;
      if(window.UCKilo) window.UCKilo.sonido('tic');
    }
    return;
  }
  descansoTerminar(-restante);
}

function descansoTerminar(haceSeg){
  if(descansoIntervalo){ clearInterval(descansoIntervalo); descansoIntervalo = null; }
  descansoGuardar(DESCANSO_KEY_FIN, null);
  descansoSoltarPantalla();
  const barra = document.getElementById('descanso-barra');
  if(!barra) return;
  barra.classList.add('termino');
  barra.querySelector('#descanso-barra-etiqueta').textContent = haceSeg > 5 ? `Terminó hace ${descansoFormato(haceSeg)}` : 'Descanso terminado';
  barra.querySelector('#descanso-barra-tiempo').textContent = '¡A la siguiente serie!';
  const avance = barra.querySelector('#descanso-anillo-avance');
  if(avance) avance.style.strokeDashoffset = 0;
  barra.querySelector('#descanso-barra-acciones').innerHTML = `<button type="button" class="descanso-mini descanso-saltar" id="btn-ok-descanso">OK</button>`;
  barra.querySelector('#btn-ok-descanso').onclick = descansoDetener;
  if(window.UCKilo){ window.UCKilo.sonido('descanso'); window.UCKilo.vibrar([200, 100, 200, 100, 300]); }
  if(descansoAvisoTimer) clearTimeout(descansoAvisoTimer);
  descansoAvisoTimer = setTimeout(descansoDetener, 8000);
}

function descansoDetener(){
  if(descansoIntervalo){ clearInterval(descansoIntervalo); descansoIntervalo = null; }
  if(descansoAvisoTimer){ clearTimeout(descansoAvisoTimer); descansoAvisoTimer = null; }
  descansoGuardar(DESCANSO_KEY_FIN, null);
  descansoSoltarPantalla();
  document.body.classList.remove('descanso-activo');
  const barra = document.getElementById('descanso-barra');
  if(barra){ barra.classList.add('sale'); setTimeout(() => barra.remove(), 250); }
}

// Pantalla encendida mientras corre el descanso (Android Chrome y iPhone
// con iOS 16.4 o más nuevo). Si el celular no lo permite, no pasa nada.
async function descansoPedirPantallaEncendida(){
  try {
    if('wakeLock' in navigator && document.visibilityState === 'visible' && !descansoWakeLock){
      descansoWakeLock = await navigator.wakeLock.request('screen');
      descansoWakeLock.addEventListener('release', () => { descansoWakeLock = null; });
    }
  } catch(e){ descansoWakeLock = null; }
}
function descansoSoltarPantalla(){
  try { if(descansoWakeLock) descansoWakeLock.release(); } catch(e){}
  descansoWakeLock = null;
}

// Al volver a la app (después de bloquear o cambiar de app) se recalcula al
// instante; si el descanso terminó mientras tanto, se avisa con cuánto hace.
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState !== 'visible') return;
  if(Number(descansoLeer(DESCANSO_KEY_FIN)) && document.getElementById('descanso-barra')){
    descansoTick();
    if(Number(descansoLeer(DESCANSO_KEY_FIN))) descansoPedirPantallaEncendida();
  }
});

// ---------- RUTINA NUEVA (profe → alumno) ----------
// Cuando el profe guarda una rutina, ve un sobre que sale volando y
// "Rutina enviada a <nombre>". El alumno, la primera vez que abre el inicio
// con esa rutina, ve una tarjeta que se da vuelta: "¡Tu profe te preparó una
// rutina nueva!". Se recuerda por celular en localStorage (no toca la base).
function mostrarRutinaEnviada(nombreAlumno, actualizada){
  const capa = document.createElement('div');
  capa.className = 'rutina-enviada';
  capa.setAttribute('role', 'status');
  capa.innerHTML = `
    <div class="rutina-enviada-card">
      <div class="rutina-enviada-escena">
        <div class="rutina-enviada-kilo">${window.UCKilo ? window.UCKilo.svg('anima', 78) : ''}</div>
        <svg class="rutina-enviada-sobre" viewBox="0 0 64 48" aria-hidden="true">
          <rect x="3" y="5" width="58" height="38" rx="6" fill="#FFC72C" stroke="#111111" stroke-width="3"/>
          <path d="M5 9 L32 29 L59 9" fill="none" stroke="#111111" stroke-width="3" stroke-linejoin="round"/>
        </svg>
        <div class="rutina-enviada-check">✓</div>
      </div>
      <p class="rutina-enviada-titulo">${actualizada ? 'Rutina actualizada' : 'Rutina enviada'}</p>
      <p class="rutina-enviada-nombre">a ${escapeHtml(nombreAlumno || 'tu alumno')}</p>
    </div>`;
  document.body.appendChild(capa);
  if(window.UCKilo){ window.UCKilo.sonido('mensaje'); window.UCKilo.vibrar(30); }
  let cerrada = false;
  const cerrar = () => { if(cerrada) return; cerrada = true; capa.classList.add('sale'); setTimeout(() => capa.remove(), 300); };
  capa.addEventListener('click', cerrar);
  setTimeout(cerrar, 2600);
}

function avisarRutinaNueva(rutina){
  if(!profile || profile.role !== 'alumno' || !rutina) return false;
  if(rutina.origen !== 'profesor' && rutina.creada_por === profile.id) return false;
  const key = `uc_rutina_vista_${profile.id}`;
  let anterior = null;
  try { anterior = localStorage.getItem(key); localStorage.setItem(key, String(rutina.id)); } catch(e){ return false; }
  // Primera vez en este celular: solo se anota, para no mostrar como "nueva"
  // una rutina que el alumno ya conocía antes de esta función.
  if(anterior === null || anterior === String(rutina.id)) return false;

  const ejercicios = (rutina.rutina_ejercicios || []);
  const dias = new Set(ejercicios.map(e => e.dia_orden)).size || 1;
  const capa = document.createElement('div');
  capa.className = 'logro-celebracion rutina-nueva';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Rutina nueva de tu profe');
  capa.innerHTML = `
    <div class="rutina-nueva-flip">
      <div class="rutina-nueva-cara rutina-nueva-dorso">
        <svg viewBox="0 0 64 48" aria-hidden="true"><rect x="3" y="5" width="58" height="38" rx="6" fill="#FFC72C" stroke="#111111" stroke-width="3"/><path d="M5 9 L32 29 L59 9" fill="none" stroke="#111111" stroke-width="3" stroke-linejoin="round"/></svg>
      </div>
      <div class="rutina-nueva-cara logro-celebracion-card rutina-nueva-frente">
        <div class="logro-celebracion-kilo">${window.UCKilo ? window.UCKilo.svg('anima', 90) : ''}</div>
        <p class="logro-celebracion-eyebrow">¡Tu profe te preparó una rutina nueva!</p>
        <h2>${escapeHtml(rutina.nombre || 'Rutina nueva')}</h2>
        ${rutina.objetivo ? `<p class="logro-celebracion-desc">${escapeHtml(rutina.objetivo)}</p>` : ''}
        <p class="rutina-nueva-datos">${dias} día${dias === 1 ? '' : 's'} · ${ejercicios.length} ejercicio${ejercicios.length === 1 ? '' : 's'}</p>
        <button type="button" class="btn" id="btn-rutina-nueva-ok">¡Vamos!</button>
      </div>
    </div>`;
  document.body.appendChild(capa);
  if(window.UCKilo){ setTimeout(() => { window.UCKilo.sonido('mensaje'); window.UCKilo.vibrar([30, 40, 30]); }, 650); }
  const cerrar = () => { capa.classList.add('sale'); setTimeout(() => capa.remove(), 250); };
  capa.querySelector('#btn-rutina-nueva-ok').onclick = cerrar;
  capa.addEventListener('click', e => { if(e.target === capa) cerrar(); });
  return true;
}

// Racha: si subió desde la última vez que el alumno la vio, el número salta
// con un sonido; y una vez por visita, los días entrenados del calendario se
// encienden en secuencia. Se guarda en este celular (no toca la base de datos).
function animarRacha(streak){
  try {
    const key = `uc_racha_vista_${profile.id}`;
    const anterior = Number(localStorage.getItem(key));
    const tile = document.getElementById('tile-racha');
    if(tile && Number.isFinite(anterior) && localStorage.getItem(key) !== null && streak > anterior){
      tile.classList.add('racha-sube');
      if(window.UCKilo) window.UCKilo.sonido('racha');
    }
    localStorage.setItem(key, String(streak));
  } catch(e){}
  try {
    if(sessionStorage.getItem('uc_cal_animado')) return;
    sessionStorage.setItem('uc_cal_animado', '1');
  } catch(e){}
  const dias = document.querySelectorAll('#calendar-holder .calendar-day.trained');
  dias.forEach((d, i) => { d.style.setProperty('--i', i); d.classList.add('cal-enciende'); });
}

function renderCalendar(holderId, fechas){
  const set = new Set(fechas);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + calendarMonthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const nombreMes = base.toLocaleDateString('es-CL', { month:'long', year:'numeric' });

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += `<div class="calendar-day empty-cell"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const trained = set.has(iso);
    cells += `<div class="calendar-day ${trained ? 'trained' : ''}" ${trained ? `onclick="irASesion('${iso}')"` : ''}>${d}</div>`;
  }

  document.getElementById(holderId).innerHTML = `
    <div class="calendar">
      <div class="calendar-head">
        <button class="btn-sm" id="cal-prev">←</button>
        <span style="text-transform:capitalize;">${nombreMes}</span>
        <button class="btn-sm" id="cal-next">→</button>
      </div>
      <div class="calendar-grid">
        <div class="dow">L</div><div class="dow">M</div><div class="dow">M</div><div class="dow">J</div><div class="dow">V</div><div class="dow">S</div><div class="dow">D</div>
        ${cells}
      </div>
    </div>
  `;
  document.getElementById('cal-prev').onclick = () => { calendarMonthOffset--; renderCalendar(holderId, fechas); };
  document.getElementById('cal-next').onclick = () => { calendarMonthOffset++; renderCalendar(holderId, fechas); };
}

function irASesion(fecha){
  const el = document.querySelector(`.session-card[data-fecha="${fecha}"]`);
  if(!el) return;
  const holder = el.closest('.hidden');
  if(holder){
    setToggleOpen('btn-toggle-historial', holder.id, true);
  }
  el.scrollIntoView({ behavior:'smooth', block:'center' });
  el.classList.add('highlight');
  setTimeout(()=> el.classList.remove('highlight'), 1600);
}

// Línea de una serie ya guardada, dentro del historial de sesiones.
// El coach la ve de solo lectura. El alumno puede editar reps, peso y
// nota de una serie ya guardada — es su propio registro de entrenamiento,
// así que la decisión es dejarlo abierto: si alguien lo edita mal, solo
// se engaña a sí mismo con su propio historial.
function renderSetLineHistorial(set, i, isCoachView){
  if(isCoachView){
    const pr = set._isPR ? prPillHtml() : '';
    const nota = set.nota ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${escapeHtml(set.nota)}</span>` : '';
    const tipoLado = renderTipoLadoPills(set.tipo_serie, set.lado);
    return `<div class="set-line">S${i+1}: <b>${valorSerieTexto(set)}</b> × <b>${set.peso}kg</b> ${nota} ${tipoLado} ${pr}</div>`;
  }
  cacheSeriesHistorial[set.id] = {
    reps: set.reps, peso: set.peso, unidad: set.unidad || 'reps', nota: set.nota || '',
    tipo_serie: set.tipo_serie || '', lado: set.lado || '',
    i, _isPR: !!set._isPR
  };
  return `<div class="set-line" id="set-line-${set.id}">${lineaSerieVista(set.id)}</div>`;
}

function lineaSerieVista(setId){
  const s = cacheSeriesHistorial[setId];
  if(!s) return '';
  const pr = s._isPR ? prPillHtml() : '';
  const nota = s.nota ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${escapeHtml(s.nota)}</span>` : '';
  const tipoLado = renderTipoLadoPills(s.tipo_serie, s.lado);
  return `
    <span>S${s.i+1}: <b>${valorSerieTexto(s)}</b> × <b>${s.peso}kg</b> ${nota} ${tipoLado} ${pr}</span>
    <button type="button" class="link-btn" onclick="mostrarEditorSerieHistorial('${setId}')">Editar</button>
  `;
}

function mostrarEditorSerieHistorial(setId){
  const holder = document.getElementById(`set-line-${setId}`);
  const s = cacheSeriesHistorial[setId];
  if(!holder || !s) return;
  holder.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; width:100%;">
      <span style="white-space:nowrap;">S${s.i+1}:</span>
      <input type="number" id="edit-reps-${setId}" value="${s.reps}" placeholder="Reps" style="width:60px; margin:0; padding:4px 6px; font-size:11.5px;">
      <span style="white-space:nowrap;">reps ×</span>
      <input type="number" id="edit-peso-${setId}" value="${s.peso}" placeholder="Peso" style="width:60px; margin:0; padding:4px 6px; font-size:11.5px;">
      <span style="white-space:nowrap;">kg</span>
      <input type="text" id="edit-nota-${setId}" value="${escapeHtml(s.nota)}" placeholder="Nota (opcional)" style="flex:1; min-width:110px; margin:0; padding:4px 6px; font-size:11.5px;">
      <button type="button" class="link-btn" onclick="guardarSerieHistorial('${setId}')">Guardar</button>
      <button type="button" class="link-btn" onclick="cancelarEdicionSerieHistorial('${setId}')">Cancelar</button>
    </div>
  `;
  const input = document.getElementById(`edit-reps-${setId}`);
  if(input){ input.focus(); input.select(); }
}

function cancelarEdicionSerieHistorial(setId){
  const holder = document.getElementById(`set-line-${setId}`);
  if(holder) holder.innerHTML = lineaSerieVista(setId);
}

async function guardarSerieHistorial(setId){
  const repsEl = document.getElementById(`edit-reps-${setId}`);
  const pesoEl = document.getElementById(`edit-peso-${setId}`);
  const notaEl = document.getElementById(`edit-nota-${setId}`);
  const reps = repsEl ? repsEl.value : '';
  const peso = pesoEl ? pesoEl.value : '';
  const nota = notaEl ? notaEl.value.trim() : '';
  if(!reps){ showToast('Completa las repeticiones'); return; }

  const { error } = await sb.from('sesion_series').update({ reps, peso: peso || 0, nota: nota || null }).eq('id', setId);
  if(error){ showToast('No se pudo guardar, intenta de nuevo'); return; }

  cacheSeriesHistorial[setId] = { ...cacheSeriesHistorial[setId], reps, peso: peso || 0, nota };
  const holder = document.getElementById(`set-line-${setId}`);
  if(holder) holder.innerHTML = lineaSerieVista(setId);
  showToast('Serie actualizada ✓');
}

// ---------- EDITAR SESIONES PASADAS (alumno): cambiar el día y agregar ejercicios ----------
// Aditivo: además de editar reps/peso/nota de una serie ya guardada (arriba),
// el alumno puede también agregar un ejercicio nuevo a un entrenamiento pasado
// y cambiar el "día" de ese entrenamiento — igual que puede hacerlo en el de hoy.
function mostrarEditorDiaSesion(sesionId, actual){
  const editorHolder = document.getElementById(`dia-editor-${sesionId}`);
  const viewHolder = document.getElementById(`dia-view-${sesionId}`);
  if(!editorHolder) return;
  editorHolder.classList.remove('hidden');
  editorHolder.innerHTML = `
    <div style="display:flex; gap:6px; margin:6px 0; flex-wrap:wrap;">
      <input type="text" id="input-dia-editor-${sesionId}" value="${escapeHtml(actual)}" placeholder="Ej: Día 1 — Empuje" style="flex:1; min-width:140px; margin:0; padding:8px 10px; font-size:12.5px;">
      <button type="button" class="btn-sm" onclick="guardarDiaSesion('${sesionId}')">Guardar</button>
      <button type="button" class="link-btn" onclick="cancelarEditorDiaSesion('${sesionId}')">Cancelar</button>
    </div>
  `;
  if(viewHolder) viewHolder.classList.add('hidden');
  const input = document.getElementById(`input-dia-editor-${sesionId}`);
  if(input){ input.focus(); input.select(); }
}
function cancelarEditorDiaSesion(sesionId){
  const editorHolder = document.getElementById(`dia-editor-${sesionId}`);
  const viewHolder = document.getElementById(`dia-view-${sesionId}`);
  if(editorHolder){ editorHolder.classList.add('hidden'); editorHolder.innerHTML = ''; }
  if(viewHolder) viewHolder.classList.remove('hidden');
}
async function guardarDiaSesion(sesionId){
  const input = document.getElementById(`input-dia-editor-${sesionId}`);
  const val = input ? input.value.trim() : '';
  const { error } = await sb.from('sesiones').update({ dia_nombre: val || null }).eq('id', sesionId);
  if(error){ showToast('No se pudo actualizar el día'); return; }
  showToast('Día actualizado ✓');
  if(historialRefrescar) historialRefrescar();
}

function mostrarFormAgregarEjercicioHistorial(sesionId){
  const formHolder = document.getElementById(`agregar-ex-form-${sesionId}`);
  const viewHolder = document.getElementById(`agregar-ex-view-${sesionId}`);
  if(!formHolder) return;
  formHolder.classList.remove('hidden');
  formHolder.innerHTML = `
    <div class="card" style="margin-top:8px;">
      <label>Nombre del ejercicio</label>
      ${simpleExerciseBankHtml(`hist-ex-nombre-${sesionId}`, '')}
      <div class="set-input-row">
        <div><input type="number" id="hist-ex-reps-${sesionId}" placeholder="Reps" style="margin-bottom:0;"></div>
        <div><input type="number" id="hist-ex-peso-${sesionId}" placeholder="Peso kg" style="margin-bottom:0;"></div>
        <div><button type="button" class="btn-sm" style="width:100%;" onclick="guardarEjercicioHistorial('${sesionId}')">Guardar</button></div>
      </div>
      <input type="text" id="hist-ex-nota-${sesionId}" placeholder="Nota de esta serie (opcional)" style="margin-top:8px; margin-bottom:0;">
      <div style="display:flex; gap:8px; margin-top:8px;">
        <div style="flex:1;">${selectTipoSerieHtml(`hist-ex-tiposerie-${sesionId}`)}</div>
        <div style="flex:1;">${selectLadoHtml(`hist-ex-lado-${sesionId}`)}</div>
      </div>
      <button type="button" class="link-btn" style="margin-top:8px;" onclick="cancelarFormAgregarEjercicioHistorial('${sesionId}')">Cancelar</button>
    </div>
  `;
  if(viewHolder) viewHolder.classList.add('hidden');
}
function cancelarFormAgregarEjercicioHistorial(sesionId){
  const formHolder = document.getElementById(`agregar-ex-form-${sesionId}`);
  const viewHolder = document.getElementById(`agregar-ex-view-${sesionId}`);
  if(formHolder){ formHolder.classList.add('hidden'); formHolder.innerHTML = ''; }
  if(viewHolder) viewHolder.classList.remove('hidden');
}
async function guardarEjercicioHistorial(sesionId){
  const nombreEl = document.getElementById(`hist-ex-nombre-${sesionId}-value`);
  const repsEl = document.getElementById(`hist-ex-reps-${sesionId}`);
  const pesoEl = document.getElementById(`hist-ex-peso-${sesionId}`);
  const notaEl = document.getElementById(`hist-ex-nota-${sesionId}`);
  const tipoSerieEl = document.getElementById(`hist-ex-tiposerie-${sesionId}`);
  const ladoEl = document.getElementById(`hist-ex-lado-${sesionId}`);
  const nombre = nombreEl ? nombreEl.value.trim() : '';
  const reps = repsEl ? repsEl.value : '';
  const peso = pesoEl ? pesoEl.value : '';
  const nota = notaEl ? notaEl.value.trim() : '';
  const tipo_serie = tipoSerieEl ? tipoSerieEl.value : '';
  const lado = ladoEl ? ladoEl.value : '';
  if(!nombre){ showToast('Escribe un ejercicio o elígelo del banco'); return; }
  if(!reps){ showToast('Completa las repeticiones'); return; }

  // El "orden" sigue después de las series que ya existen en esa sesión pasada.
  const { count } = await sb.from('sesion_series').select('id', { count: 'exact', head: true }).eq('sesion_id', sesionId);
  const orden = count || 0;

  const { error } = await sb.from('sesion_series').insert({
    sesion_id: sesionId,
    ejercicio_nombre: nombre,
    peso: peso || 0,
    reps: reps,
    nota: nota || null,
    tipo_serie: tipo_serie || null,
    lado: lado || null,
    orden
  });
  if(error){ showToast('No se pudo agregar el ejercicio, intenta de nuevo'); return; }
  showToast('Ejercicio agregado ✓');
  if(historialRefrescar) historialRefrescar();
}

function renderSesionesList(holderId, sesiones, isCoachView, onDeleted, soloLectura){
  historialRefrescar = onDeleted;
  const holder = document.getElementById(holderId);
  if(!sesiones.length){
    holder.innerHTML = emptyKiloHtml('Aún no hay entrenamientos registrados.', 'anima');
    return;
  }
  holder.innerHTML = sesiones.map(s => {
    const groups = groupSets(s.sesion_series);
    const totalSeries = (s.sesion_series || []).length;
    return `
    <div class="session-card" data-fecha="${s.fecha}" data-sesion="${s.id}">
      <div class="session-head">
        <span>${formatDate(s.fecha)}</span>
        <span style="display:flex; gap:6px; flex-wrap:wrap;">
          ${s.dia_nombre ? `<span class="pill">${escapeHtml(s.dia_nombre)}</span>` : ''}
          <span class="pill">${totalSeries} series</span>
          ${s.finalizada_at ? `<span class="pill pill-completada">✓ Completado</span>` : ''}
        </span>
      </div>
      ${isCoachView && !soloLectura ? `<button type="button" class="fb-hist-btn" onclick="renderResumenProfe('${s.id}', 'detalle')">💬 Reaccionar / comentar este entrenamiento</button>` : ''}
      ${!isCoachView ? `
        <div id="dia-view-${s.id}" style="margin:-2px 0 6px;">
          <button type="button" class="link-btn" onclick="mostrarEditorDiaSesion('${s.id}', '${escapeHtml(s.dia_nombre || '').replace(/'/g,"\\'")}')">${s.dia_nombre ? 'Editar día' : '+ Agregar día'}</button>
        </div>
        <div class="hidden" id="dia-editor-${s.id}"></div>
      ` : ''}
      <div class="session-body">
        ${groups.map(g => `
          <div class="exercise-group">
            <div class="ex-head"><span class="ex-name">${escapeHtml(g.nombre)}</span></div>
            ${g.sets.map((set,i) => renderSetLineHistorial(set, i, isCoachView)).join('')}
          </div>
        `).join('')}
        ${isCoachView
          ? (s.nota_alumno ? `<div class="note-box"><div class="note-label">Nota del alumno</div>${escapeHtml(s.nota_alumno)}</div>` : '')
          : `<div class="note-box" style="margin-top:12px;">
              <div class="note-label">Tu nota</div>
              <textarea id="nota-alumno-${s.id}" placeholder="¿Cómo te sentiste en este entrenamiento?">${escapeHtml(s.nota_alumno || '')}</textarea>
              <button class="btn-sm" onclick="guardarNotaAlumno('${s.id}')">Guardar nota</button>
            </div>`
        }
        ${s.foto_url ? `<img class="session-photo" src="${s.foto_url}" alt="Foto de la sesión">` : ''}
        ${isCoachView && !soloLectura ? `
          <div class="note-box" style="margin-top:12px;">
            <div class="note-label">Nota del coach</div>
            <textarea id="nota-coach-${s.id}" placeholder="Escribe una observación para esta sesión...">${escapeHtml(s.nota_coach || '')}</textarea>
            <button class="btn-sm" onclick="guardarNotaCoach('${s.id}')">Guardar nota</button>
          </div>
        ` : (s.nota_coach ? `<div class="note-box"><div class="note-label">Nota del coach</div>${escapeHtml(s.nota_coach)}</div>` : '')}
        ${!isCoachView ? `
          <div id="agregar-ex-view-${s.id}" style="margin-top:12px;">
            <button type="button" class="btn-ghost" onclick="mostrarFormAgregarEjercicioHistorial('${s.id}')">+ Agregar ejercicio a este entrenamiento</button>
          </div>
          <div class="hidden" id="agregar-ex-form-${s.id}"></div>
        ` : ''}
        ${soloLectura ? '' : `<button class="btn-sm btn-eliminar-sesion" data-id="${s.id}" style="margin-top:12px;">Eliminar sesión</button>`}
      </div>
    </div>
  `;
  }).join('');

  holder.querySelectorAll('.btn-eliminar-sesion').forEach(btn => {
    btn.onclick = () => {
      if(btn.dataset.confirm === '1'){
        eliminarSesion(btn.dataset.id, onDeleted);
      } else {
        btn.dataset.confirm = '1';
        btn.textContent = '¿Seguro? Toca de nuevo para eliminar';
        btn.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btn.isConnected) return;
          btn.dataset.confirm = '';
          btn.textContent = 'Eliminar sesión';
          btn.classList.remove('btn-danger-confirm');
        }, 3000);
      }
    };
  });
}

async function eliminarSesion(id, onDeleted){
  const { error } = await sb.from('sesiones').delete().eq('id', id);
  if(error){ showToast('No se pudo eliminar la sesión'); return; }
  showToast('Sesión eliminada');
  if(onDeleted) onDeleted();
}

// ---------- MEDICIONES CORPORALES (foto del resumen de InBody, con historial) ----------
async function renderMediciones(holderId, alumnoId, soloLectura){
  const holder = document.getElementById(holderId);
  holder.innerHTML = `<div class="loading">Cargando mediciones...</div>`;

  const { data: mediciones } = await sb.from('mediciones').select('*').eq('alumno_id', alumnoId).order('fecha', { ascending: false });

  const listaHtml = (mediciones && mediciones.length)
    ? mediciones.map(m => {
      const nota = notaTipoMedicion(m.tipo);
      const cuerpo = m.tipo === 'medicion'
        ? `<img class="session-photo" src="${m.foto_url}" alt="Medición InBody">`
        : `<div class="empty" style="margin:0;">${m.tipo === 'no_aplica' ? 'No aplica' : 'El alumno no quiso hacerse la medición'}</div>`;
      return `
      <div class="session-card">
        <div class="session-head"><span>${formatDate(m.fecha)}${nota ? ' — ' + escapeHtml(nota) : ''}</span></div>
        <div class="session-body">
          ${cuerpo}
          ${soloLectura ? '' : `<button class="btn-sm btn-eliminar-sesion" data-id="${m.id}" style="margin-top:12px;">Eliminar medición</button>`}
        </div>
      </div>
    `;
    }).join('')
    : `<div class="empty">Aún no hay mediciones registradas.</div>`;

  holder.innerHTML = soloLectura ? listaHtml : `
    <div class="card" style="margin-bottom:16px;">
      <label>Fecha de la medición</label>
      <input type="date" id="input-fecha-medicion" value="${todayStr()}" max="${todayStr()}">
      <label class="photo-input-label" for="input-foto-medicion">
        <span id="medicion-foto-label-text">${ICONS.camera} Sube la foto del resumen de InBody</span>
        <input type="file" id="input-foto-medicion" accept="image/*">
      </label>
      <button class="btn" id="btn-guardar-medicion">${ICONS.plus} Guardar medición</button>
      <div class="sub" style="margin-top:10px; margin-bottom:6px;">¿El alumno no se pudo o no quiso medir esta vez? Igual cuenta como al día por 2 meses, como una medición real:</div>
      <div class="row-flex" style="margin-bottom:0; gap:8px;">
        <button type="button" class="btn-sm" id="btn-medicion-no-aplica" style="flex:1; justify-content:center;">No aplica</button>
        <button type="button" class="btn-sm" id="btn-medicion-no-quiso" style="flex:1; justify-content:center;">No quiso</button>
      </div>
    </div>
    ${listaHtml}
  `;

  if(soloLectura) return;

  document.getElementById('input-foto-medicion').onchange = (e) => {
    const f = e.target.files[0];
    document.getElementById('medicion-foto-label-text').innerHTML = f ? `${ICONS.check} ${escapeHtml(f.name)}` : `${ICONS.camera} Sube la foto del resumen de InBody`;
  };
  document.getElementById('btn-guardar-medicion').onclick = () => guardarMedicion(alumnoId, holderId);
  document.getElementById('btn-medicion-no-aplica').onclick = () => guardarMedicionExcepcion(alumnoId, holderId, 'no_aplica');
  document.getElementById('btn-medicion-no-quiso').onclick = () => guardarMedicionExcepcion(alumnoId, holderId, 'no_quiso');

  holder.querySelectorAll('.btn-eliminar-sesion').forEach(btn => {
    btn.onclick = () => {
      if(btn.dataset.confirm === '1'){
        eliminarMedicion(btn.dataset.id, alumnoId, holderId);
      } else {
        btn.dataset.confirm = '1';
        btn.textContent = '¿Seguro? Toca de nuevo para eliminar';
        btn.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btn.isConnected) return;
          btn.dataset.confirm = '';
          btn.textContent = 'Eliminar medición';
          btn.classList.remove('btn-danger-confirm');
        }, 3000);
      }
    };
  });
}

async function guardarMedicion(alumnoId, holderId){
  const btn = document.getElementById('btn-guardar-medicion');
  const fechaInput = document.getElementById('input-fecha-medicion');
  const fotoInput = document.getElementById('input-foto-medicion');
  const file = fotoInput.files[0];
  if(!file){ showToast('Selecciona la foto del resumen de InBody'); return; }

  btn.disabled = true; btn.textContent = 'Guardando...';
  try{
    const ext = file.name.split('.').pop();
    const path = `${alumnoId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('medicion-fotos').upload(path, file, { upsert: true });
    if(upErr){ showToast('No se pudo subir la foto'); btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar medición`; return; }
    const foto_url = sb.storage.from('medicion-fotos').getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('mediciones').insert({ alumno_id: alumnoId, fecha: fechaInput.value, foto_url });
    if(error){ showToast('No se pudo guardar la medición'); btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar medición`; return; }
    showToast('¡Medición guardada!');
    renderMediciones(holderId, alumnoId);
  }catch(e){
    showToast('Hubo un problema guardando la medición');
    btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar medición`;
  }
}

// Guarda una fila de "no aplica" / "no quiso" en vez de una medición real —
// sin foto, con la fecha elegida en el formulario. Como la vigencia de
// medición se calcula por la fecha del último registro (2 meses), esta fila
// cuenta como "al día" exactamente igual que una medición real, y se vence
// igual que una medición real si pasan más de 2 meses sin marcar nada nuevo.
async function guardarMedicionExcepcion(alumnoId, holderId, tipo){
  const fechaInput = document.getElementById('input-fecha-medicion');
  const btnAplica = document.getElementById('btn-medicion-no-aplica');
  const btnQuiso = document.getElementById('btn-medicion-no-quiso');
  if(btnAplica) btnAplica.disabled = true;
  if(btnQuiso) btnQuiso.disabled = true;
  const { error } = await sb.from('mediciones').insert({ alumno_id: alumnoId, fecha: fechaInput.value, tipo, foto_url: null });
  if(error){
    showToast('No se pudo guardar');
    if(btnAplica) btnAplica.disabled = false;
    if(btnQuiso) btnQuiso.disabled = false;
    return;
  }
  showToast(tipo === 'no_aplica' ? 'Guardado como "No aplica"' : 'Guardado como "No quiso"');
  renderMediciones(holderId, alumnoId);
}

async function eliminarMedicion(id, alumnoId, holderId){
  const { error } = await sb.from('mediciones').delete().eq('id', id);
  if(error){ showToast('No se pudo eliminar la medición'); return; }
  showToast('Medición eliminada');
  renderMediciones(holderId, alumnoId);
}

// ---------- ENTREVISTA INICIAL (audio, solo profe/super admin — no aparece en la vista del alumno) ----------
let entrevistaMediaRecorder = null;
let entrevistaRecStream = null;
let entrevistaRecStart = null;
let entrevistaRecInterval = null;
let entrevistaRecDurationMs = 0;
// Duración real (en segundos) del audio recién grabado con el botón "Grabar
// audio aquí", medida por la propia app con un cronómetro (Date.now()) —
// no depende de la duración que el navegador escriba (o no) dentro del
// archivo .webm. Se guarda en la base de datos junto con el audio para que
// el reproductor siempre muestre el tiempo real. Se limpia a null apenas el
// usuario elige un archivo a mano (nota de voz subida), porque de ese
// archivo no tenemos una medición propia — ver comentarios más abajo.
let entrevistaAudioDuracionSeg = null;

function formatMSS(segs){
  const m = Math.floor(segs/60), s = segs%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

async function iniciarGrabacionEntrevista(){
  const btn = document.getElementById('btn-grabar-entrevista');
  const estado = document.getElementById('entrevista-rec-estado');
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined'){
    showToast('Este navegador no permite grabar audio — usa "Sube el audio" con una nota de voz.');
    return;
  }
  try{
    entrevistaRecStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }catch(e){
    showToast('No se pudo acceder al micrófono — revisa los permisos del navegador.');
    return;
  }
  const chunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  entrevistaMediaRecorder = mimeType ? new MediaRecorder(entrevistaRecStream, { mimeType }) : new MediaRecorder(entrevistaRecStream);
  entrevistaMediaRecorder.ondataavailable = (e) => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  entrevistaMediaRecorder.onstop = () => {
    entrevistaRecStream.getTracks().forEach(t => t.stop());
    entrevistaRecStream = null;
    const blob = new Blob(chunks, { type: entrevistaMediaRecorder.mimeType || 'audio/webm' });
    const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
    const file = new File([blob], `entrevista-${Date.now()}.${ext}`, { type: blob.type });
    // Guardamos la duración medida por nuestro cronómetro ANTES de disparar el
    // "change" del input — el handler de ese evento (definido en renderEntrevista)
    // solo la borra cuando el evento es "de verdad" del usuario (isTrusted),
    // así que este valor sigue disponible cuando se guarde la entrevista.
    entrevistaAudioDuracionSeg = entrevistaRecDurationMs > 0 ? Math.round(entrevistaRecDurationMs / 1000) : null;
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById('input-audio-entrevista');
    if(input){
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
    entrevistaMediaRecorder = null;
  };
  entrevistaRecStart = Date.now();
  entrevistaMediaRecorder.start();
  if(btn){ btn.textContent = '⏹ Detener grabación'; btn.classList.add('btn-danger-confirm'); }
  entrevistaRecInterval = setInterval(() => {
    if(estado) estado.textContent = `🔴 Grabando… ${formatMSS(Math.floor((Date.now() - entrevistaRecStart)/1000))}`;
  }, 500);
}

function detenerGrabacionEntrevista(){
  if(entrevistaRecInterval){ clearInterval(entrevistaRecInterval); entrevistaRecInterval = null; }
  const btn = document.getElementById('btn-grabar-entrevista');
  const estado = document.getElementById('entrevista-rec-estado');
  if(btn){ btn.textContent = `${ICONS.mic} Grabar audio aquí`; btn.classList.remove('btn-danger-confirm'); }
  if(estado) estado.textContent = '';
  if(entrevistaMediaRecorder && entrevistaMediaRecorder.state !== 'inactive'){
    entrevistaRecDurationMs = entrevistaRecStart ? (Date.now() - entrevistaRecStart) : 0;
    entrevistaMediaRecorder.stop();
  }
}

// A partir de la URL pública guardada, reconstruye el path interno del
// archivo dentro del bucket — necesario para poder borrarlo de verdad.
function extraerPathStorage(publicUrl, bucket){
  if(!publicUrl) return null;
  const marker = `/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if(idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

// Markup del reproductor propio de audio (ver comentario junto a
// entrevistaAudioDuracionSeg más arriba: no usamos los controles nativos del
// navegador porque su duración mostrada puede venir mal desde el archivo).
// duracionSeg puede ser null si no la medimos nosotros (ej. nota de voz
// subida a mano) — en ese caso el reproductor intenta usar la duración que
// reporte el propio navegador al cargar el audio, y si tampoco la tiene,
// muestra "--:--" en vez de un número inventado o erróneo.
function htmlReproductorAudio(audioUrl, duracionSeg){
  return `
    <div class="audio-player" data-duracion="${duracionSeg != null ? duracionSeg : ''}">
      <audio preload="metadata" src="${audioUrl}"></audio>
      <button type="button" class="audio-player-play" aria-label="Reproducir">${ICONS.play}</button>
      <div class="audio-player-bar"><div class="audio-player-fill"></div></div>
      <span class="audio-player-time">0:00 / ${duracionSeg != null ? formatMSS(duracionSeg) : '--:--'}</span>
    </div>
  `;
}

// Conecta el <audio> real con los controles propios dibujados por
// htmlReproductorAudio(). Se apoya en el tiempo que reporta el propio
// elemento <audio> (currentTime), que siempre es correcto durante la
// reproducción — lo único que no era confiable era el dato de duración
// TOTAL leído del archivo, por eso ese número se maneja aparte.
function inicializarReproductorAudio(contenedor){
  const cont = contenedor.querySelector('.audio-player');
  if(!cont) return;
  const audio = cont.querySelector('audio');
  const btnPlay = cont.querySelector('.audio-player-play');
  const bar = cont.querySelector('.audio-player-bar');
  const fill = cont.querySelector('.audio-player-fill');
  const timeEl = cont.querySelector('.audio-player-time');
  let total = cont.dataset.duracion ? Number(cont.dataset.duracion) : null;

  const actualizarTexto = () => {
    const actual = formatMSS(Math.floor(audio.currentTime || 0));
    const totalTxt = total != null ? formatMSS(total) : '--:--';
    timeEl.textContent = `${actual} / ${totalTxt}`;
    if(total){
      const pct = Math.max(0, Math.min(1, (audio.currentTime || 0) / total)) * 100;
      fill.style.width = pct + '%';
    }
  };

  audio.addEventListener('loadedmetadata', () => {
    // Solo confiamos en audio.duration cuando no teníamos ya una duración
    // medida por nosotros — para audios grabados en vivo, ese dato del
    // navegador puede ser justamente el que viene mal.
    if(total == null && isFinite(audio.duration) && audio.duration > 0){
      total = Math.round(audio.duration);
    }
    actualizarTexto();
  });
  audio.addEventListener('timeupdate', actualizarTexto);
  audio.addEventListener('play', () => { btnPlay.innerHTML = ICONS.pause; });
  audio.addEventListener('pause', () => { btnPlay.innerHTML = ICONS.play; });
  audio.addEventListener('ended', () => { btnPlay.innerHTML = ICONS.play; });

  btnPlay.onclick = () => { audio.paused ? audio.play() : audio.pause(); };

  const buscarPorPosicion = (clientX) => {
    if(!total) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * total;
    actualizarTexto();
  };
  bar.addEventListener('click', (e) => buscarPorPosicion(e.clientX));
}

// Texto de la tarjeta cuando la entrevista está marcada como excepción
// (no_aplica / no_quiso) en vez de tener un audio real. La entrevista nunca
// vence, así que esta marca cuenta como "al día" para siempre, hasta que un
// profe la deshaga a mano.
function textoExcepcionEntrevista(excepcion){
  return excepcion === 'no_aplica' ? 'No aplica' : 'El alumno no quiso hacer la entrevista';
}

async function renderEntrevista(holderId, alumnoId, audioUrl, fecha, soloLectura, duracionSeg, excepcion){
  const holder = document.getElementById(holderId);
  entrevistaAudioDuracionSeg = null;

  if(soloLectura){
    holder.innerHTML = audioUrl ? `
      <div class="card">
        <div class="sub" style="margin-bottom:8px;">${fecha ? 'Grabada el ' + formatDateShort(fecha) : 'Fecha no registrada'}</div>
        ${htmlReproductorAudio(audioUrl, duracionSeg)}
      </div>
    ` : excepcion ? `
      <div class="card">
        <div class="sub" style="margin-bottom:8px;">${fecha ? 'Marcado el ' + formatDateShort(fecha) : ''}</div>
        <div>${textoExcepcionEntrevista(excepcion)}</div>
      </div>
    ` : `<div class="empty">Todavía no se registró la entrevista inicial.</div>`;
    if(audioUrl) inicializarReproductorAudio(holder);
    return;
  }

  holder.innerHTML = audioUrl ? `
    <div class="card">
      <div class="sub" style="margin-bottom:8px;">${fecha ? 'Grabada el ' + formatDateShort(fecha) : 'Fecha no registrada'}</div>
      ${htmlReproductorAudio(audioUrl, duracionSeg)}
      <button class="btn-sm btn-eliminar-sesion" id="btn-eliminar-entrevista" style="margin-top:12px;">Eliminar entrevista</button>
    </div>
  ` : excepcion ? `
    <div class="card">
      <div class="sub" style="margin-bottom:8px;">${fecha ? 'Marcado el ' + formatDateShort(fecha) : ''}</div>
      <div>${textoExcepcionEntrevista(excepcion)}</div>
      <button class="btn-sm" id="btn-deshacer-excepcion-entrevista" style="margin-top:12px;">Deshacer / grabar entrevista</button>
    </div>
  ` : `
    <div class="card">
      <label>Fecha de la entrevista</label>
      <input type="date" id="input-fecha-entrevista" value="${todayStr()}" max="${todayStr()}">

      <div class="row-flex" style="margin-bottom:10px;">
        <button type="button" class="btn-sm" id="btn-grabar-entrevista">${ICONS.mic} Grabar audio aquí</button>
        <span class="sub" id="entrevista-rec-estado" style="margin-bottom:0;"></span>
      </div>

      <div class="sub" style="margin-top:0;">o, si ya tienes el audio grabado (nota de voz, etc.):</div>
      <label class="photo-input-label" for="input-audio-entrevista">
        <span id="entrevista-audio-label-text">${ICONS.mic} Sube el audio de la entrevista</span>
        <input type="file" id="input-audio-entrevista" accept="audio/*">
      </label>
      <button class="btn" id="btn-guardar-entrevista">${ICONS.plus} Guardar entrevista</button>

      <div class="sub" style="margin-top:10px; margin-bottom:6px;">¿El alumno no se pudo o no quiso hacer la entrevista? Queda marcado como al día para siempre:</div>
      <div class="row-flex" style="margin-bottom:0; gap:8px;">
        <button type="button" class="btn-sm" id="btn-entrevista-no-aplica" style="flex:1; justify-content:center;">No aplica</button>
        <button type="button" class="btn-sm" id="btn-entrevista-no-quiso" style="flex:1; justify-content:center;">No quiso</button>
      </div>
    </div>
  `;

  if(audioUrl){
    inicializarReproductorAudio(holder);
    const btnDel = document.getElementById('btn-eliminar-entrevista');
    btnDel.onclick = () => {
      if(btnDel.dataset.confirm === '1'){
        eliminarEntrevista(alumnoId, holderId, audioUrl);
      } else {
        btnDel.dataset.confirm = '1';
        btnDel.textContent = '¿Seguro? Toca de nuevo para eliminar';
        btnDel.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btnDel.isConnected) return;
          btnDel.dataset.confirm = '';
          btnDel.textContent = 'Eliminar entrevista';
          btnDel.classList.remove('btn-danger-confirm');
        }, 3000);
      }
    };
  } else if(excepcion){
    document.getElementById('btn-deshacer-excepcion-entrevista').onclick = () => quitarExcepcionEntrevista(alumnoId, holderId);
  } else {
    document.getElementById('input-audio-entrevista').onchange = (e) => {
      // Si el evento es "de verdad" del usuario (isTrusted) es porque eligió
      // un archivo a mano — de ese archivo no tenemos una duración medida
      // por nosotros. Si NO es trusted, es el que acabamos de grabar
      // nosotros mismos (ver onstop más arriba), que ya dejó su duración
      // guardada en entrevistaAudioDuracionSeg antes de este evento.
      if(e.isTrusted){ entrevistaAudioDuracionSeg = null; }
      const f = e.target.files[0];
      document.getElementById('entrevista-audio-label-text').innerHTML = f ? `${ICONS.check} ${escapeHtml(f.name)}` : `${ICONS.mic} Sube el audio de la entrevista`;
    };
    document.getElementById('btn-guardar-entrevista').onclick = () => guardarEntrevista(alumnoId, holderId);
    document.getElementById('btn-grabar-entrevista').onclick = () => {
      if(entrevistaMediaRecorder && entrevistaMediaRecorder.state === 'recording'){
        detenerGrabacionEntrevista();
      } else {
        iniciarGrabacionEntrevista();
      }
    };
    document.getElementById('btn-entrevista-no-aplica').onclick = () => marcarExcepcionEntrevista(alumnoId, holderId, 'no_aplica');
    document.getElementById('btn-entrevista-no-quiso').onclick = () => marcarExcepcionEntrevista(alumnoId, holderId, 'no_quiso');
  }
}

// Marca la entrevista como "no aplica"/"no quiso" en vez de grabar un audio
// real. Como la entrevista nunca vence, esto cuenta como "al día" para
// siempre hasta que se deshaga a mano (ver quitarExcepcionEntrevista).
async function marcarExcepcionEntrevista(alumnoId, holderId, tipo){
  const fechaInput = document.getElementById('input-fecha-entrevista');
  const { error } = await sb.from('profiles').update({ entrevista_excepcion: tipo, entrevista_fecha: fechaInput ? fechaInput.value : todayStr() }).eq('id', alumnoId);
  if(error){ showToast('No se pudo guardar'); return; }
  showToast(tipo === 'no_aplica' ? 'Guardado como "No aplica"' : 'Guardado como "No quiso"');
  renderEntrevista(holderId, alumnoId, null, fechaInput ? fechaInput.value : todayStr(), false, null, tipo);
}

// Vuelve al formulario normal de entrevista (grabar/subir audio), por si se
// marcó una excepción por error o el alumno ya está dispuesto a hacerla.
async function quitarExcepcionEntrevista(alumnoId, holderId){
  const { error } = await sb.from('profiles').update({ entrevista_excepcion: null, entrevista_fecha: null }).eq('id', alumnoId);
  if(error){ showToast('No se pudo deshacer'); return; }
  renderEntrevista(holderId, alumnoId, null, null, false, null, null);
}

async function guardarEntrevista(alumnoId, holderId){
  const btn = document.getElementById('btn-guardar-entrevista');
  const fechaInput = document.getElementById('input-fecha-entrevista');
  const audioInput = document.getElementById('input-audio-entrevista');
  const file = audioInput.files[0];
  if(!file){ showToast('Selecciona el archivo de audio'); return; }
  const MAX_BYTES = 60 * 1024 * 1024; // ~60MB — cubre una entrevista larga grabada en vivo (~2h de audio comprimido) o una nota de voz subida a mano
  if(file.size > MAX_BYTES){ showToast('El audio es muy pesado (máx. 60MB).'); return; }

  // Se captura acá, antes de cualquier "await" o de volver a renderizar —
  // renderEntrevista limpia esta variable global cada vez que se llama.
  const duracionSeg = entrevistaAudioDuracionSeg;

  btn.disabled = true; btn.textContent = 'Guardando...';
  try{
    const ext = file.name.split('.').pop();
    const path = `${alumnoId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('entrevistas').upload(path, file, { upsert: true });
    if(upErr){ showToast('No se pudo subir el audio'); btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar entrevista`; return; }
    const entrevista_audio_url = sb.storage.from('entrevistas').getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('profiles').update({ entrevista_audio_url, entrevista_fecha: fechaInput.value, entrevista_audio_duracion_seg: duracionSeg, entrevista_excepcion: null }).eq('id', alumnoId);
    if(error){ showToast('No se pudo guardar la entrevista'); btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar entrevista`; return; }
    showToast('¡Entrevista guardada!');
    renderEntrevista(holderId, alumnoId, entrevista_audio_url, fechaInput.value, false, duracionSeg);
  }catch(e){
    showToast('Hubo un problema guardando la entrevista');
    btn.disabled = false; btn.innerHTML = `${ICONS.plus} Guardar entrevista`;
  }
}

async function eliminarEntrevista(alumnoId, holderId, audioUrl){
  // Primero se limpia la referencia en el perfil del alumno — así la ficha
  // nunca queda apuntando a un audio roto, pase lo que pase con el paso
  // siguiente. Borrar el archivo del storage es un segundo paso, aparte:
  // si por algo falla, el archivo queda huérfano (ocupa espacio) pero no
  // rompe nada visible en la app.
  const { error } = await sb.from('profiles').update({ entrevista_audio_url: null, entrevista_fecha: null, entrevista_audio_duracion_seg: null, entrevista_excepcion: null }).eq('id', alumnoId);
  if(error){ showToast('No se pudo eliminar la entrevista'); return; }

  const path = extraerPathStorage(audioUrl, 'entrevistas');
  if(path){
    try{
      await sb.storage.from('entrevistas').remove([path]);
    }catch(e){
      console.warn('No se pudo borrar el audio del storage (queda huérfano, sin afectar la app):', e);
    }
  }

  showToast('Entrevista eliminada');
  renderEntrevista(holderId, alumnoId, null, null);
}

// ---------- OPINAR SOBRE EL SERVICIO (buzón privado alumno → super admin) ----------
async function renderOpinionForm(holderId, alumnoId){
  const holder = document.getElementById(holderId);
  holder.innerHTML = `<div class="loading">Cargando...</div>`;
  const { data: opiniones } = await sb.from('opiniones').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending: false });
  const listaHtml = (opiniones && opiniones.length)
    ? opiniones.map(o => `
      <div class="session-card">
        <div class="session-head"><span>${formatDate(o.created_at.slice(0,10))}</span></div>
        <div class="session-body"><div class="sub" style="margin-bottom:0;">${escapeHtml(o.mensaje)}</div></div>
      </div>
    `).join('')
    : `<div class="empty">Todavía no has enviado ningún mensaje.</div>`;
  holder.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="sub" style="margin-bottom:12px;">Este mensaje lo lee directamente la administración — tu profesor no lo ve. Úsalo para contarle cómo va el servicio, la infraestructura, o cualquier sugerencia.</div>
      <label>Tu mensaje</label>
      <textarea id="input-opinion" placeholder="Escribe aquí..." rows="4"></textarea>
      <button class="btn" id="btn-enviar-opinion">${ICONS.message} Enviar</button>
    </div>
    ${listaHtml}
  `;
  document.getElementById('btn-enviar-opinion').onclick = () => enviarOpinion(alumnoId, holderId);
}

async function enviarOpinion(alumnoId, holderId){
  const textarea = document.getElementById('input-opinion');
  const mensaje = textarea.value.trim();
  if(!mensaje){ showToast('Escribe un mensaje primero'); return; }
  const btn = document.getElementById('btn-enviar-opinion');
  btn.disabled = true; btn.textContent = 'Enviando...';
  const { error } = await sb.from('opiniones').insert({ alumno_id: alumnoId, mensaje });
  if(error){ showToast('No se pudo enviar: ' + error.message); btn.disabled = false; btn.innerHTML = `${ICONS.message} Enviar`; return; }
  showToast('¡Gracias! Tu mensaje fue enviado.');
  renderOpinionForm(holderId, alumnoId);
}

// ---------- BUZÓN DE SUGERENCIAS (solo super admin) ----------
async function renderBuzonOpiniones(holderId){
  const holder = document.getElementById(holderId);
  holder.innerHTML = `<div class="loading">Cargando...</div>`;
  const { data: opiniones, error } = await sb.from('opiniones').select('*, profiles(nombre)').order('created_at', { ascending: false });
  if(error){ holder.innerHTML = `<div class="error-banner">No se pudo cargar el buzón.</div>`; return; }
  holder.innerHTML = (opiniones && opiniones.length)
    ? opiniones.map(o => `
      <div class="session-card">
        <div class="session-head"><span>${escapeHtml(o.profiles ? o.profiles.nombre : 'Alumno')}</span><span>${formatDateShort(o.created_at.slice(0,10))}</span></div>
        <div class="session-body"><div class="sub" style="margin-bottom:0;">${escapeHtml(o.mensaje)}</div></div>
      </div>
    `).join('')
    : `<div class="empty">Todavía no hay mensajes en el buzón.</div>`;
}

function progresoDatosEjercicio(sesiones, ejercicio){
  const objetivo = findExerciseBankEntry(ejercicio);
  const coincide = nombre => {
    const candidato = findExerciseBankEntry(nombre);
    if(objetivo && candidato) return candidato.name === objetivo.name;
    return normalizeExerciseName(nombre) === normalizeExerciseName(ejercicio);
  };
  const registros = sesiones
    .map(sesion => {
      const series = (sesion.sesion_series || []).filter(serie => coincide(serie.ejercicio_nombre));
      if(!series.length) return null;
      const cargas = series.map(serie => Number(serie.peso) || 0);
      const mejorSerie = series.reduce((mejor, serie) => {
        const peso = Number(serie.peso) || 0;
        const reps = Number(serie.reps || serie.repeticiones) || 0;
        const e1rm = peso > 0 && reps > 0 ? peso * (1 + Math.min(reps, 30) / 30) : peso;
        return !mejor || e1rm > mejor.e1rm ? { peso, reps, e1rm } : mejor;
      }, null);
      return {
        fecha: sesion.fecha,
        peso: Math.max(...cargas),
        e1rm: mejorSerie ? mejorSerie.e1rm : 0
      };
    })
    .filter(Boolean)
    .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  const conCarga = registros.filter(registro => registro.peso > 0);
  const ultimo = conCarga.length ? conCarga[conCarga.length - 1].peso : 0;
  const mejor = conCarga.length ? Math.max(...conCarga.map(registro => registro.peso)) : 0;
  const fuerzaValidos = registros.filter(registro => registro.e1rm > 0);
  const fuerza = fuerzaValidos.length >= 2 && fuerzaValidos[0].e1rm > 0
    ? ((fuerzaValidos[fuerzaValidos.length - 1].e1rm / fuerzaValidos[0].e1rm) - 1) * 100
    : null;
  return { registros, ultimo, mejor, fuerza };
}

function setupProgresoChart(sesiones){
  const bankGrid = document.getElementById('progreso-bank-grid');
  const search = document.getElementById('progreso-search');
  const filters = document.getElementById('progreso-group-filters');
  const toggle = document.getElementById('progreso-bank-toggle');
  const selectedHolder = document.getElementById('progreso-selected-exercise');
  const strengthHolder = document.getElementById('progreso-strength-card');
  const canvas = document.getElementById('progreso-canvas');
  const empty = document.getElementById('progreso-chart-empty');
  if(!bankGrid || !search || !filters || !toggle || !selectedHolder || !strengthHolder || !canvas || !empty) return;

  const historicos = [...new Set(sesiones.flatMap(s => (s.sesion_series || []).map(x => x.ejercicio_nombre).filter(Boolean)))];
  const personalizados = historicos
    .filter(nombre => !findExerciseBankEntry(nombre))
    .map(nombre => ({ name:nombre, aliases:[], group:'Otros', image:'', youtubeUrl:'', custom:true }));
  const catalogo = [...EXERCISE_BANK, ...personalizados];
  const grupos = ['Todos', ...new Set(catalogo.map(item => item.group))];
  let grupoActivo = 'Todos';
  let bancoCompleto = false;
  let seleccionado = historicos[0] || EXERCISE_BANK[0].name;

  const tieneHistorial = item => {
    const objetivo = findExerciseBankEntry(item.name);
    return historicos.some(nombre => {
      const candidato = findExerciseBankEntry(nombre);
      if(objetivo && candidato) return candidato.name === objetivo.name;
      return normalizeExerciseName(nombre) === normalizeExerciseName(item.name);
    });
  };

  const itemSeleccionado = () => findExerciseBankEntry(seleccionado) || catalogo.find(item => normalizeExerciseName(item.name) === normalizeExerciseName(seleccionado)) || catalogo[0];

  const renderFiltros = () => {
    filters.innerHTML = grupos.map(grupo => `<button type="button" class="progress-group-chip ${grupo === grupoActivo ? 'active' : ''}" data-progress-group="${escapeHtml(grupo)}">${escapeHtml(grupo)}</button>`).join('');
    filters.querySelectorAll('[data-progress-group]').forEach(button => {
      button.onclick = () => {
        grupoActivo = button.dataset.progressGroup;
        renderFiltros();
        renderBanco();
      };
    });
  };

  const renderBanco = () => {
    const termino = normalizeExerciseName(search.value);
    let items = catalogo.filter(item => {
      const texto = normalizeExerciseName([item.name, item.group, ...(item.aliases || [])].join(' '));
      return (!termino || texto.includes(termino)) && (grupoActivo === 'Todos' || item.group === grupoActivo);
    });
    items.sort((a,b) => Number(tieneHistorial(b)) - Number(tieneHistorial(a)) || a.name.localeCompare(b.name, 'es'));
    const visibles = bancoCompleto || termino || grupoActivo !== 'Todos' ? items : items.slice(0, 8);
    bankGrid.innerHTML = visibles.length ? visibles.map(item => {
      const historial = tieneHistorial(item);
      const activo = normalizeExerciseName(item.name) === normalizeExerciseName(itemSeleccionado().name);
      return `<button type="button" class="progress-exercise-option ${historial ? 'has-data' : 'no-data'} ${activo ? 'active' : ''}" data-progress-exercise="${escapeHtml(item.name)}">
        <span class="progress-exercise-thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">` : '<span aria-hidden="true">UC</span>'}</span>
        <span class="progress-exercise-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.group)} · ${historial ? 'Con historial' : 'Sin registros'}</small></span>
        <span class="progress-exercise-arrow" aria-hidden="true">›</span>
      </button>`;
    }).join('') : '<div class="progress-bank-empty">No encontramos ejercicios con ese nombre.</div>';
    bankGrid.querySelectorAll('[data-progress-exercise]').forEach(button => {
      button.onclick = () => {
        seleccionado = button.dataset.progressExercise;
        renderBanco();
        renderEjercicio();
      };
    });
    const hayMas = items.length > 8 && !termino && grupoActivo === 'Todos';
    toggle.classList.toggle('hidden', !hayMas);
    toggle.textContent = bancoCompleto ? 'Ver menos' : 'Ver banco completo';
  };

  const dibujarGraficoProgreso = datos => {
    if(progresoChart) progresoChart.destroy();
    if(!datos.registros.length){
      canvas.classList.add('hidden');
      empty.classList.remove('hidden');
      empty.innerHTML = '<strong>Aún no hay datos para graficar</strong><span>Cuando registres este ejercicio, aquí verás su evolución.</span>';
      return;
    }
    canvas.classList.remove('hidden');
    empty.classList.add('hidden');
    const ctx = canvas.getContext('2d');
    const areaFill = ctx.createLinearGradient(0, 0, 0, 230);
    areaFill.addColorStop(0, 'rgba(255,222,112,0.36)');
    areaFill.addColorStop(0.55, 'rgba(255,222,112,0.15)');
    areaFill.addColorStop(1, 'rgba(255,222,112,0)');
    const pointPalette = ['#FFDE70', '#FFDE70', '#5EE3B6', '#FFD166'];
    progresoChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: datos.registros.map(p => formatDateShort(p.fecha)),
        datasets: [{
          label: 'Peso máximo (kg)',
          data: datos.registros.map(p => p.peso),
          borderColor: '#FFDE70',
          backgroundColor: areaFill,
          borderWidth: 3,
          tension: 0.38,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          pointBorderColor: '#131313',
          pointBackgroundColor: datos.registros.map((_, index) => pointPalette[index % pointPalette.length])
        }]
      },
      options: {
        responsive: true,
        interaction: { intersect:false, mode:'index' },
        plugins: {
          legend: { display:false },
          tooltip: { displayColors:false, backgroundColor:'#252525', titleColor:'#FBFBFB', bodyColor:'#BDBDBD', borderColor:'rgba(255,222,112,.35)', borderWidth:1, padding:12, cornerRadius:10 }
        },
        scales: {
          x: { ticks:{ color:'#9C9C9C', font:{ size:11 } }, grid:{ display:false }, border:{ display:false } },
          y: { beginAtZero:true, ticks:{ color:'#9C9C9C', font:{ size:11 }, padding:8 }, grid:{ color:'rgba(156,156,156,.13)' }, border:{ display:false } }
        }
      }
    });
  };

  const renderEjercicio = () => {
    const item = itemSeleccionado();
    seleccionado = item.name;
    const datos = progresoDatosEjercicio(sesiones, item.name);
    selectedHolder.innerHTML = `
      <div class="progress-selected-media">${item.image ? `<img src="${escapeHtml(item.image)}" alt="Referencia de ${escapeHtml(item.name)}">` : '<span aria-hidden="true">UC</span>'}</div>
      <div class="progress-selected-copy">
        <small>Ejercicio seleccionado · ${escapeHtml(item.group)}</small>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="progress-selected-metrics">
          <span><b>${datos.ultimo ? `${datos.ultimo.toLocaleString('es-CL', { maximumFractionDigits:1 })} kg` : '—'}</b><small>Último</small></span>
          <span><b>${datos.mejor ? `${datos.mejor.toLocaleString('es-CL', { maximumFractionDigits:1 })} kg` : '—'}</b><small>Mejor marca</small></span>
          <span><b>${datos.registros.length}</b><small>Sesiones</small></span>
        </div>
      </div>`;
    if(datos.fuerza === null){
      strengthHolder.className = 'progress-strength-card pending';
      strengthHolder.innerHTML = `<span class="progress-strength-icon" aria-hidden="true">↗</span><div><small>FUERZA ESTIMADA</small><strong>Empieza tu comparación</strong><p>Necesitamos al menos dos registros con peso y repeticiones de este ejercicio.</p></div>`;
    } else {
      const sube = datos.fuerza >= 0;
      strengthHolder.className = `progress-strength-card ${sube ? 'positive' : 'negative'}`;
      strengthHolder.innerHTML = `<span class="progress-strength-icon" aria-hidden="true">${sube ? '↗' : '↘'}</span><div><small>FUERZA ESTIMADA</small><strong>${sube ? '+' : ''}${datos.fuerza.toFixed(1)}%</strong><p>${sube ? 'Has aumentado' : 'Ha variado'} tu fuerza estimada desde el primer registro.</p></div>`;
    }
    dibujarGraficoProgreso(datos);
  };

  search.oninput = renderBanco;
  toggle.onclick = () => { bancoCompleto = !bancoCompleto; renderBanco(); };
  renderFiltros();
  renderBanco();
  renderEjercicio();
}

// ---------- NUEVA SESIÓN (con autoguardado) ----------
async function iniciarNuevaSesion(rutina){
  const btn = document.getElementById('btn-nueva-sesion');
  if(btn){ btn.disabled = true; btn.textContent = 'Cargando...'; }
  activeSesionFecha = todayStr();

  // Si el alumno ya tiene una sesión guardada hoy, seguimos sumando ahí
  // en vez de crear una tarjeta nueva por cada ejercicio.
  const { data: existentes } = await sb.from('sesiones')
    .select('*, sesion_series(*)')
    .eq('alumno_id', profile.id)
    .eq('fecha', activeSesionFecha)
    .order('created_at', { ascending: false })
    .limit(1);
  const existente = existentes && existentes[0];

  if(existente){
    activeSesionId = existente.id;
    desmarcarSesionFinalizada(existente.id);
    if(existente.finalizada_at){
      // Se reabre para agregar algo: vuelve a quedar "en marcha" hasta que se finalice otra vez.
      sb.from('sesiones').update({ finalizada_at: null }).eq('id', existente.id).then(() => {}, () => {});
    }
    activeSesionExs = groupSets(existente.sesion_series);
    aplicarMapaPRs(activeSesionExs);
    activeSesionDia = existente.dia_nombre || null;
    activeSuperseries = Array.isArray(existente.superseries) ? existente.superseries : [];
    superserieModo = false; superserieEsperando = null;
    renderNuevaSesionForm();
    return;
  }

  const { data, error } = await sb.from('sesiones').insert({
    alumno_id: profile.id,
    rutina_id: rutina ? rutina.id : null,
    fecha: activeSesionFecha
  }).select().single();
  if(error){ showToast('No se pudo iniciar la sesión'); if(btn){btn.disabled=false; btn.textContent='+ Nueva sesión de hoy';} return; }
  activeSesionId = data.id;
  avisarProfesorEntrenamiento(activeSesionId, 'inicio');
  activeSesionExs = [];
  activeSesionDia = null;
  activeSuperseries = [];
  superserieModo = false; superserieEsperando = null;
  renderNuevaSesionForm();
}

function renderNuevaSesionForm(){
  sessionExerciseSelection = '';
  const diaSeleccionadoObj = activeRutinaDias.find(d => d.nombre === activeSesionDia);
  const ejerciciosSugeridos = diaSeleccionadoObj ? diaSeleccionadoObj.ejercicios : [];
  activeEjerciciosSugeridos = ejerciciosSugeridos;
  if(!ejercicioAbierto && activeSesionExs.length) ejercicioAbierto = activeSesionExs[0].nombre;

  root().innerHTML = `
    <div class="reg-top">
      <label class="reg-fecha-chip" title="Cambiar la fecha del entrenamiento">
        <span id="sesion-fecha-label">${ICONS.calendar} ${escapeHtml(regFechaCorta(activeSesionFecha))}</span>
        <input type="date" id="input-fecha-sesion" value="${activeSesionFecha}" max="${todayStr()}" aria-label="Fecha del entrenamiento">
      </label>
      <div class="reg-top-acciones">
        <span class="reg-descanso-lugar" id="descanso-lugar" aria-hidden="true"></span>
        ${sonidoBtnHtml()}
        <button class="link-btn" id="btn-cancelar-sesion">Cancelar</button>
      </div>
    </div>
    <h1 class="reg-titulo">${regTituloDiaHtml(activeSesionDia)}</h1>
    ${activeRutinaDias.length ? `
      <div class="reg-dia-card ${activeSesionDia ? '' : 'sin-dia'}">
        <button type="button" class="reg-dia-btn" id="btn-toggle-dia">
          <span class="reg-dia-texto">${ICONS.calendar} ${activeSesionDia ? `Día de hoy: <b>${escapeHtml(activeSesionDia)}</b>` : '<b>¿Qué día de tu rutina entrenas hoy?</b>'}
            <small>${activeSesionDia ? 'Toca «Ver días» si quieres entrenar otro día' : `Tu profe te armó ${activeRutinaDias.length} día${activeRutinaDias.length === 1 ? '' : 's'} · elige uno`}</small></span>
          <span class="reg-dia-accion">${activeSesionDia ? 'Ver días' : 'Elegir día'}</span>
        </button>
        <div class="${activeSesionDia ? 'hidden' : ''} reg-dias" id="dia-picker-holder">
          ${activeRutinaDias.map(d => `<button type="button" class="reg-dia-opcion ${activeSesionDia === d.nombre ? 'selected' : ''}" onclick="seleccionarDiaSesion('${escapeHtml(d.nombre).replace(/'/g,"\\'")}')"><b>${escapeHtml(d.nombre)}</b><small>${d.ejercicios.length} ejercicio${d.ejercicios.length === 1 ? '' : 's'}: ${escapeHtml(d.ejercicios.slice(0, 3).map(e => e.nombre).join(', '))}${d.ejercicios.length > 3 ? '…' : ''}</small></button>`).join('')}
        </div>
      </div>
    ` : ''}

    ${fxSesionCardHtml(diaSeleccionadoObj)}
    <div id="progreso-dia"></div>
    <div id="draft-exercises"></div>

    <div class="card reg-agregar">
      <div class="reg-agregar-titulo"><span class="reg-agregar-icono">${ICONS.plus}</span> Agregar ejercicio</div>
      <div class="reg-agregar-sub">Busca en el banco o escribe el tuyo. Puedes armar todo tu entrenamiento desde aquí, con o sin rutina.</div>
      ${simpleExerciseBankHtml('session-exercise', '')}
      <button type="button" class="btn-sm bank-add-confirm reg-agregar-btn" id="btn-agregar-ejercicio">${ICONS.plus} Agregar al entrenamiento</button>
      <div class="exercise-bank-helper">${ICONS.search} ${EXERCISE_BANK.length} ejercicios con guía visual</div>
    </div>

    <div class="card reg-final">
      <label>Nota del día (opcional)</label>
      <textarea id="input-nota-alumno" placeholder="¿Cómo te sentiste hoy?"></textarea>
      <label class="photo-input-label" for="input-foto">
        <span id="foto-label-text">📷 Agregar una foto de la sesión (opcional)</span>
        <input type="file" id="input-foto" accept="image/*">
      </label>
      <button class="btn" id="btn-finalizar-sesion">${ICONS.check} Finalizar entrenamiento de hoy</button>
      <div class="reg-final-ayuda">Tócalo cuando termines todo. Cada serie ya queda guardada apenas la registras.</div>
    </div>

    <button type="button" id="btn-superserie-toggle" class="fab-superserie${superserieModo ? ' active' : ''}" title="Unir dos ejercicios en superserie">${ICONS.link}</button>
    <button type="button" id="btn-descanso" class="fab-descanso fab-movible" title="Descanso · arrástralo para moverlo"><span class="fab-grip" aria-hidden="true">⠿</span><span aria-hidden="true">⏱</span> Descanso</button>
  `;
  hacerBotonArrastrable(document.getElementById('btn-descanso'), 'uc_descanso_pos', abrirSelectorDescanso, document.getElementById('descanso-lugar'));
  descansoReanudar();
  document.getElementById('btn-superserie-toggle').onclick = toggleSuperserieModo;
  document.getElementById('btn-cancelar-sesion').onclick = cancelarSesion;
  conectarSonidoBtn();
  document.getElementById('input-fecha-sesion').onchange = actualizarFechaSesion;
  const btnDia = document.getElementById('btn-toggle-dia');
  if(btnDia) btnDia.onclick = () => document.getElementById('dia-picker-holder').classList.toggle('hidden');
  document.getElementById('btn-agregar-ejercicio').onclick = () => agregarBloqueEjercicio();
  document.getElementById('btn-finalizar-sesion').onclick = finalizarSesion;
  fxConectarSesionCard(diaSeleccionadoObj);
  document.getElementById('input-foto').onchange = (e) => {
    const f = e.target.files[0];
    document.getElementById('foto-label-text').textContent = f ? `✅ ${f.name}` : '📷 Agregar una foto de la sesión (opcional)';
  };
  renderDraftExercises();
}

// Botón flotante que se puede arrastrar con el dedo a cualquier parte de la
// pantalla. Un toque corto lo usa (onTap); si se mueve más de 8 px, se
// arrastra. La posición se recuerda en este celular (localStorage).
function hacerBotonArrastrable(btn, clave, onTap, lugarInicial){
  if(!btn) return;
  // Queda FIJO en su lugar de la página (se va con el scroll como el resto),
  // pero se puede tomar con el dedo y dejar en otro lugar. La posición se
  // guarda relativa al contenedor de la pantalla, en este celular.
  btn.style.position = 'absolute';
  const base = () => {
    const par = btn.offsetParent || document.body;
    const r = par.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: par.clientWidth || window.innerWidth, h: Math.max(par.scrollHeight, par.clientHeight) };
  };
  const aplicar = (pageX, pageY) => {
    const b = base();
    const w = btn.offsetWidth || 120, h = btn.offsetHeight || 38;
    const x = Math.min(Math.max(0, pageX - b.x), Math.max(0, b.w - w));
    const y = Math.min(Math.max(0, pageY - b.y), Math.max(0, b.h - h));
    btn.style.left = x + 'px'; btn.style.top = y + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto';
    return { x, y, w: b.w };
  };
  let guardada = null;
  try { guardada = JSON.parse(localStorage.getItem(clave) || 'null'); } catch(e){}
  if(guardada && typeof guardada.ry !== 'number') guardada = null; // formato antiguo (flotante): se ignora
  requestAnimationFrame(() => {
    const b = base();
    if(guardada) aplicar(b.x + guardada.fx * b.w, b.y + guardada.ry);
    else if(lugarInicial){ const r = lugarInicial.getBoundingClientRect(); aplicar(r.left + window.scrollX, r.top + window.scrollY); }
    if(!guardada){
      btn.classList.add('fab-invita');
      const aviso = document.createElement('span');
      aviso.className = 'fab-aviso'; aviso.textContent = '✋ Puedes moverlo';
      btn.appendChild(aviso);
      setTimeout(() => { aviso.remove(); btn.classList.remove('fab-invita'); }, 4500);
    }
  });
  let inicio = null, movido = false;
  btn.addEventListener('pointerdown', e => {
    const r = btn.getBoundingClientRect();
    inicio = { px: e.pageX, py: e.pageY, x: r.left + window.scrollX, y: r.top + window.scrollY };
    movido = false;
    try { btn.setPointerCapture(e.pointerId); } catch(_){}
  });
  btn.addEventListener('pointermove', e => {
    if(!inicio) return;
    const dx = e.pageX - inicio.px, dy = e.pageY - inicio.py;
    if(!movido && Math.hypot(dx, dy) < 8) return;
    movido = true;
    btn.classList.add('arrastrando');
    btn.classList.remove('fab-invita');
    const av = btn.querySelector('.fab-aviso'); if(av) av.remove();
    aplicar(inicio.x + dx, inicio.y + dy);
    e.preventDefault();
  });
  const soltar = () => {
    if(!inicio) return;
    if(movido){
      const w = base().w || 1;
      try { localStorage.setItem(clave, JSON.stringify({ fx: (parseFloat(btn.style.left) || 0) / w, ry: parseFloat(btn.style.top) || 0 })); } catch(_){}
    }
    btn.classList.remove('arrastrando');
    inicio = null;
  };
  btn.addEventListener('pointerup', soltar);
  btn.addEventListener('pointercancel', soltar);
  btn.addEventListener('click', e => { if(movido){ e.preventDefault(); movido = false; return; } onTap(); });
}

// ---------- Ayudas visuales del registro de hoy ----------
function regFechaCorta(fecha){
  const [y, m, d] = String(fecha || todayStr()).split('-').map(Number);
  const f = new Date(y, (m || 1) - 1, d || 1);
  const dias = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return `${fecha === todayStr() ? 'HOY' : dias[f.getDay()]} ${f.getDate()} ${meses[f.getMonth()]}`;
}
function regTituloDiaHtml(dia){
  if(!dia) return `Entrenamiento <span>de hoy</span>`;
  const par = String(dia).match(/^(.*?)\s*\(\s*(.+?)\s*\)\s*$/);
  if(par && par[1] && par[2]) return `${escapeHtml(par[1])} · <span>${escapeHtml(par[2])}</span>`;
  const m = String(dia).match(/^(.*?)\s*[·—–:-]\s*(.+)$/);
  if(m && m[1] && m[2]) return `${escapeHtml(m[1])} · <span>${escapeHtml(m[2])}</span>`;
  return `<span>${escapeHtml(dia)}</span>`;
}
function regObjetivoDe(nombre){
  return (activeEjerciciosSugeridos || []).find(e => normEx(e.nombre) === normEx(nombre)) || null;
}
function regVolumen(sets){
  return (sets || []).reduce((acc, st) => acc + (esSeg(st.unidad) ? 0 : (Number(st.peso) || 0) * (Number(st.reps) || 0)), 0);
}
function regFormatoKg(n){
  return Math.round(n).toLocaleString('es-CL');
}
function regImagenHtml(nombre, clase){
  const entry = findExerciseBankEntry(nombre);
  if(!entry || !entry.image) return `<span class="${clase} reg-img-vacia">${ICONS.dumbbell || '🏋️'}</span>`;
  return `<img class="${clase}" src="${escapeHtml(entry.image)}" alt="" loading="lazy">`;
}
function regPaso(inputId, delta, decimales){
  const el = document.getElementById(inputId);
  if(!el) return;
  const actual = parseFloat(String(el.value).replace(',', '.')) || 0;
  let nuevo = Math.max(0, actual + delta);
  nuevo = decimales ? Math.round(nuevo * 100) / 100 : Math.round(nuevo);
  el.value = nuevo;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if(window.UCKilo) window.UCKilo.vibrar(8);
}
function abrirEjercicioRegistro(idx){
  const g = activeSesionExs[idx];
  if(!g) return;
  if(superserieModo){ tocarEjercicioParaSuperserie(idx); return; }
  ejercicioAbierto = g.nombre;
  renderDraftExercises();
  const card = document.getElementById(`reg-ex-${idx}`);
  if(card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProgresoDia(){
  const el = document.getElementById('progreso-dia');
  if(!el) return;
  const todos = activeSesionExs.flatMap(g => g.sets);
  const series = todos.length;
  const kg = regVolumen(todos);
  const records = todos.filter(st => st._isPR).length;
  const rutina = activeEjerciciosSugeridos || [];
  let titulo, pct = null, detalle = 'cada serie se guarda sola';
  if(!rutina.length && !activeSesionExs.length){ el.innerHTML = ''; return; }
  if(rutina.length){
    const hechos = rutina.filter(e => activeSesionExs.some(g => normEx(g.nombre) === normEx(e.nombre) && g.sets.length)).length;
    const extras = activeSesionExs.filter(g => g.sets.length && !rutina.some(e => normEx(e.nombre) === normEx(g.nombre))).length;
    titulo = `Llevas ${hechos} de ${rutina.length} ejercicios${extras ? ` <small>+${extras} extra</small>` : ''}`;
    pct = Math.round(hechos / rutina.length * 100);
    detalle = hechos === rutina.length ? '¡Rutina completa! 💪' : 'de tu rutina de hoy';
  } else {
    const n = activeSesionExs.filter(g => g.sets.length).length;
    titulo = n ? `${n} ejercicio${n === 1 ? '' : 's'} hoy` : 'Empieza tu entrenamiento';
  }
  el.innerHTML = `
    <div class="reg-prog">
      <div class="reg-prog-fila"><b>${titulo}</b><small>${detalle}</small></div>
      ${pct != null ? `<div class="reg-barra"><i style="width:${pct}%"></i></div>` : ''}
      <div class="reg-prog-stats"><span><b>${series}</b> serie${series === 1 ? '' : 's'}</span><span><b>${regFormatoKg(kg)}</b> kg</span><span><b>${records}</b> ${records === 1 ? 'récord' : 'récords'} ${records ? '👑' : ''}</span></div>
    </div>`;
}

function renderDraftExercises(){
  const el = document.getElementById('draft-exercises');
  if(!el) return;
  renderProgresoDia();
  const rutina = activeEjerciciosSugeridos || [];
  const pendientes = rutina.filter(e => !activeSesionExs.some(g => normEx(g.nombre) === normEx(e.nombre)));
  if(activeSesionExs.length && !activeSesionExs.some(g => normEx(g.nombre) === normEx(ejercicioAbierto || ''))){
    ejercicioAbierto = activeSesionExs[0].nombre;
  }
  let html = '';
  if(!activeSesionExs.length && !pendientes.length){
    html += `<div class="card">${emptyKiloHtml(activeRutinaDias.length && !activeSesionDia ? 'Elige arriba el día de tu rutina, o agrega un ejercicio del banco.' : '¡Vamos! Agrega tu primer ejercicio y suma tus series.', 'anima', 'padding:14px;')}</div>`;
  }
  html += activeSesionExs.map((ex, idx) => {
    const abierto = normEx(ex.nombre) === normEx(ejercicioAbierto || '');
    const parSuperserie = buscarSuperserieDe(ex.nombre);
    const esEsperando = superserieModo && superserieEsperando && normEx(superserieEsperando) === normEx(ex.nombre);
    const obj = regObjetivoDe(ex.nombre);
    const nObj = obj && Number(obj.series_objetivo) > 0 ? Number(obj.series_objetivo) : 0;
    const hecho = nObj > 0 && ex.sets.length >= nObj;
    const vol = regVolumen(ex.sets);
    const superserieLabelHtml = parSuperserie
      ? `<div class="superserie-label">${ICONS.link} Unido con <b>${escapeHtml(otroDeSuperserie(parSuperserie, ex.nombre))}</b> (superserie) <button type="button" class="link-btn" onclick="event.stopPropagation(); quitarSuperserie('${escapeHtml(ex.nombre).replace(/'/g,"\\'")}')">Desunir</button></div>`
      : '';
    if(!abierto){
      const mejor = ex.sets.reduce((b, st) => (Number(st.peso) || 0) > (Number(b && b.peso) || 0) ? st : b, null);
      const resumen = ex.sets.length
        ? `${ex.sets.length}${nObj ? `/${nObj}` : ''} serie${ex.sets.length === 1 ? '' : 's'} · ${regFormatoKg(vol)} kg${mejor && Number(mejor.peso) ? ` · mejor ${mejor.peso} kg × ${esSeg(mejor.unidad) ? fmtSeg(mejor.reps) : mejor.reps}` : ''}${ex.sets.some(st => st._isPR) ? ' · 👑' : ''}`
        : (nObj ? `Objetivo ${escapeHtml(objetivoTexto(obj))} · toca para registrar` : 'Toca para registrar series');
      return `
      <div class="reg-mini ${hecho ? 'hecho' : ''} ${superserieModo && !parSuperserie ? 'seleccionable' : ''} ${esEsperando ? 'seleccionando' : ''}" id="reg-ex-${idx}" onclick="abrirEjercicioRegistro(${idx})">
        ${regImagenHtml(ex.nombre, 'reg-mini-img')}
        <div class="reg-mini-texto"><b>${escapeHtml(ex.nombre)}</b><small>${resumen}</small>${superserieLabelHtml}</div>
        ${renderWorkoutVideoIcon({ ...(obj || {}), nombre: ex.nombre })}
        <span class="reg-mini-estado">${hecho ? '✓' : '›'}</span>
      </div>`;
    }
    const entry = findExerciseBankEntry(ex.nombre);
    const previo = activeUltimaVez[ex.nombre.trim().toLowerCase()];
    const nPuntos = Math.max(nObj, ex.sets.length);
    const puntos = nPuntos ? `<div class="reg-puntos">${Array.from({ length: nPuntos }, (_, k) => `<i class="${k < ex.sets.length ? 'on' : ''}"></i>`).join('')}</div>` : '';
    const nombreHtml = (superserieModo && !parSuperserie)
      ? `<span class="reg-ex-nombre ex-name-seleccionable${esEsperando ? ' seleccionando' : ''}" onclick="tocarEjercicioParaSuperserie(${idx})" title="Tocar para unir en superserie">${escapeHtml(ex.nombre)}</span>`
      : `<span class="reg-ex-nombre">${escapeHtml(ex.nombre)}</span>`;
    const repsVal = ex.repsSugeridas != null ? ex.repsSugeridas
      : (obj && /^\d+$/.test(String(obj.reps_objetivo || '').trim()) ? String(obj.reps_objetivo).trim()
      : (previo && previo.reps ? previo.reps : ''));
    const pesoVal = ex.pesoSugerido != null ? ex.pesoSugerido : '';
    if(!ex.unidad){
      const ultima = ex.sets.length ? ex.sets[ex.sets.length - 1] : null;
      ex.unidad = ultima && ultima.unidad ? ultima.unidad : ((obj && esSeg(obj.unidad_objetivo)) ? 'seg' : 'reps');
    }
    const porTiempo = esSeg(ex.unidad);
    return `
    <div class="reg-ex activo ${hecho ? 'hecho' : ''}" id="reg-ex-${idx}">
      <div class="reg-ex-top">
        ${entry && entry.image ? `<button type="button" class="reg-ex-img-btn" onclick="openExerciseImage('${entry.image.replace(/'/g, "\\'")}','${escapeHtml(entry.name).replace(/'/g, "\\'")}')" aria-label="Ver la técnica de ${escapeHtml(ex.nombre)}">${regImagenHtml(ex.nombre, 'reg-ex-img')}</button>` : regImagenHtml(ex.nombre, 'reg-ex-img')}
        <div class="reg-ex-info">
          ${nombreHtml}
          <div class="reg-tags">
            ${entry && entry.group ? `<span class="reg-tag">${escapeHtml(entry.group)}</span>` : ''}
            ${obj ? `<span class="reg-tag obj">Objetivo ${escapeHtml(objetivoTexto(obj))}${obj.peso_objetivo ? ` · ${escapeHtml(obj.peso_objetivo)}` : ''}</span>` : `<span class="reg-tag extra">Extra</span>`}
          </div>
          ${previo && (previo.peso || previo.reps) ? `<div class="reg-previo">La vez pasada: <b>${previo.peso ? `${previo.peso} kg × ` : ''}${esSeg(previo.unidad) ? fmtSeg(previo.reps) : escapeHtml(String(previo.reps || '-'))}</b></div>` : ''}
          ${obj && obj.nota ? `<div class="reg-previo">📝 ${escapeHtml(obj.nota)}</div>` : ''}
          ${notaProfeHtml(ex.nombre)}
        </div>
        <div class="reg-ex-actions">
          ${renderWorkoutVideoIcon({ ...(obj || {}), nombre: ex.nombre })}
          <button type="button" class="remove-x reg-quitar" onclick="quitarBloqueEjercicio(${idx}, this)" title="Quitar ejercicio">✕</button>
        </div>
      </div>
      ${superserieLabelHtml}
      ${puntos}
      <div class="reg-sets" id="bloque-sets-${idx}">
        ${ex.sets.map((st, i) => renderSetLine(st, i, idx)).join('')}
      </div>
      <div class="reg-entrada">
        <div class="reg-steppers">
          <div class="reg-step ${porTiempo ? 'es-seg' : ''}"><small>${porTiempo ? 'TIEMPO · SEG' : 'REPS'}</small><div class="reg-step-fila">
            <button type="button" onclick="regPaso('input-reps-${idx}', ${porTiempo ? -5 : -1}, false)" aria-label="${porTiempo ? '5 segundos menos' : 'Una repetición menos'}">−</button>
            <input type="number" inputmode="numeric" id="input-reps-${idx}" value="${escapeHtml(String(repsVal))}" placeholder="0" ${porTiempo ? `oninput="regActualizarSeg(${idx})"` : ''}>
            <button type="button" onclick="regPaso('input-reps-${idx}', ${porTiempo ? 5 : 1}, false)" aria-label="${porTiempo ? '5 segundos más' : 'Una repetición más'}">+</button></div>${porTiempo ? `<em class="reg-seg-ver" id="reg-seg-ver-${idx}">${repsVal ? fmtSeg(repsVal) : '0:00'}</em>` : ''}</div>
          <div class="reg-step"><small>KG</small><div class="reg-step-fila">
            <button type="button" onclick="regPaso('input-peso-${idx}', -2.5, true)" aria-label="2,5 kilos menos">−</button>
            <input type="number" inputmode="decimal" step="0.5" id="input-peso-${idx}" value="${escapeHtml(String(pesoVal))}" placeholder="0">
            <button type="button" onclick="regPaso('input-peso-${idx}', 2.5, true)" aria-label="2,5 kilos más">+</button></div></div>
        </div>
        <button type="button" class="unidad-toggle reg-unidad ${porTiempo ? 'es-seg' : ''}" onclick="regCambiarUnidad(${idx})" title="${porTiempo ? 'Volver a repeticiones y peso' : 'Cambiar a tiempo (planchas, isométricos)'}">${porTiempo ? '⇄ 🏋️ Reps' : '⇄ ⏱ Tiempo'}</button>
        <button type="button" class="btn-sm reg-guardar" id="btn-serie-${idx}" onclick="agregarSetABloque(${idx})">✓ Guardar serie ${ex.sets.length + 1}</button>
        <details class="reg-mas">
          <summary>+ Nota / tipo / lado</summary>
          <input type="text" id="input-nota-${idx}" placeholder="Nota de esta serie: drop set, rest-pause, al fallo..." style="margin-top:8px; margin-bottom:0;">
          <div style="display:flex; gap:8px; margin-top:8px;">
            <div style="flex:1;">${selectTipoSerieHtml(`select-tiposerie-${idx}`)}</div>
            <div style="flex:1;">${selectLadoHtml(`select-lado-${idx}`)}</div>
          </div>
        </details>
      </div>
    </div>`;
  }).join('');
  let htmlPend = '';
  if(pendientes.length){
    htmlPend += `<div class="reg-seccion">${activeSesionExs.length ? 'Te faltan' : `Ejercicios de ${escapeHtml(activeSesionDia || 'tu rutina')}`} · toca uno para empezar</div>` + pendientes.map(e => `
      <button type="button" class="reg-pend" onclick="agregarBloqueEjercicio('${escapeHtml(e.nombre).replace(/'/g,"\\'")}')">
        ${regImagenHtml(e.nombre, 'reg-mini-img')}
        <span class="reg-mini-texto"><b>${escapeHtml(e.nombre)}</b><small>${escapeHtml(objetivoTexto(e))}${e.peso_objetivo ? ` · ${escapeHtml(e.peso_objetivo)}` : ''}</small></span>
        <span class="reg-pend-mas">+</span>
      </button>`).join('') + `<div class="reg-pend-ayuda">Puedes saltarte ejercicios o sumar otros en «Agregar ejercicio».</div>`;
  }
  const tituloHechos = activeSesionExs.length ? `<div class="reg-seccion">Tu entrenamiento de hoy</div>` : '';
  el.innerHTML = htmlPend + tituloHechos + html;
}

// Botones de "ejercicios de tu rutina": muestran el peso objetivo (si lo
// cargó el coach) y se marcan como agregados apenas el ejercicio ya está
// en el entrenamiento de hoy, para saber de un vistazo qué falta.
function renderSugeridosButtonsHtml(lista){
  return (lista || []).map(ex => {
    const yaAgregado = activeSesionExs.some(g => g.nombre.toLowerCase() === ex.nombre.trim().toLowerCase());
    const pesoPill = ex.peso_objetivo ? ` <span class="pill" style="padding:2px 8px; font-size:10px;">${escapeHtml(ex.peso_objetivo)}</span>` : '';
    return `<button type="button" class="btn-sm${yaAgregado ? ' added' : ''}" onclick="agregarBloqueEjercicio('${escapeHtml(ex.nombre).replace(/'/g,"\\'")}')">${yaAgregado ? '✓ ' : ''}${escapeHtml(ex.nombre)}${pesoPill}</button>`;
  }).join('');
}
function actualizarSugeridosHolder(){
  const holder = document.getElementById('sugeridos-holder');
  if(holder) holder.innerHTML = renderSugeridosButtonsHtml(activeEjerciciosSugeridos);
}

// Crea (o enfoca) un bloque de ejercicio dentro del entrenamiento de hoy.
// nombreForzado se usa cuando viene de un botón de sugerencia; si no, toma el input de texto.
function agregarBloqueEjercicio(nombreForzado){
  const input = document.getElementById('session-exercise-value');
  const nombre = (nombreForzado || sessionExerciseSelection || (input ? input.value : '')).trim();
  if(!nombre){ showToast('Escribe un ejercicio o elígelo del banco'); return; }

  const existente = activeSesionExs.find(g => g.nombre.toLowerCase() === nombre.toLowerCase());
  if(input) input.value = '';
  const textInput = document.getElementById('session-exercise-text');
  if(textInput) textInput.value = '';
  sessionExerciseSelection = '';
  if(existente){
    showToast('Ese ejercicio ya está en tu entrenamiento de hoy — sumale series ahí abajo');
    return;
  }

  // Peso sugerido = el último peso real que registró en este ejercicio,
  // para no tener que escribirlo de cero cada vez (se puede ajustar igual).
  const stat = activeStatsPorEjercicio[nombre.toLowerCase()];
  const pesoSugerido = stat && stat.last ? stat.last : null;

  // Se agrega al INICIO (no al final) para que el ejercicio recién
  // seleccionado quede arriba de todo, sin tener que scrollear hacia
  // abajo pasando los ejercicios que ya se agregaron antes hoy.
  activeSesionExs.unshift({ nombre, sets: [], pesoSugerido });
  ejercicioAbierto = nombre;
  renderDraftExercises();
  const nuevo = document.getElementById('reg-ex-0');
  if(nuevo) nuevo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  actualizarSugeridosHolder();
}

async function actualizarFechaSesion(){
  const input = document.getElementById('input-fecha-sesion');
  const val = input.value;
  if(!val) return;

  const { data: choque } = await sb.from('sesiones')
    .select('id, dia_nombre, nota_alumno, nota_coach, foto_url, sesion_series(id)')
    .eq('alumno_id', profile.id)
    .eq('fecha', val)
    .neq('id', activeSesionId);

  // Una sesión "fantasma" es una que quedó abierta (se creó al tocar "Nueva
  // sesión") pero se abandonó sin registrar nada — sin series, sin nota, sin
  // foto. No tiene ningún dato real adentro, así que no debería bloquear la
  // fecha para siempre: la limpiamos sola y dejamos seguir. Si tiene aunque
  // sea un dato real, ahí sí es un entrenamiento guardado de verdad y bloqueamos.
  const candidatos = choque || [];
  const reales = candidatos.filter(s =>
    (s.sesion_series && s.sesion_series.length) || s.dia_nombre || s.nota_alumno || s.nota_coach || s.foto_url
  );
  const fantasmas = candidatos.filter(s => !reales.includes(s));

  if(reales.length){
    showToast('Ya hay un entrenamiento guardado en esa fecha — cancela esta sesión y entra a ese día para seguir sumando ahí.');
    input.value = activeSesionFecha;
    return;
  }

  if(fantasmas.length){
    await sb.from('sesiones').delete().in('id', fantasmas.map(f => f.id));
  }

  activeSesionFecha = val;
  const label = document.getElementById('sesion-fecha-label');
  if(label) label.innerHTML = `${ICONS.calendar} ${escapeHtml(regFechaCorta(val))}`;
  const { error } = await sb.from('sesiones').update({ fecha: val }).eq('id', activeSesionId);
  if(error){ showToast('No se pudo actualizar la fecha'); return; }
  showToast('Fecha actualizada ✓');
}

async function seleccionarDiaSesion(nombre){
  activeSesionDia = nombre;
  await sb.from('sesiones').update({ dia_nombre: nombre }).eq('id', activeSesionId);
  renderNuevaSesionForm();
}

function regCambiarUnidad(idx){
  const g = activeSesionExs[idx];
  if(!g) return;
  g.unidad = esSeg(g.unidad) ? 'reps' : 'seg';
  g.repsSugeridas = null;
  ejercicioAbierto = g.nombre;
  renderDraftExercises();
  showToast(esSeg(g.unidad) ? '⏱ Ahora anotas el tiempo en segundos' : '🏋️ Volviste a repeticiones');
}
function regActualizarSeg(idx){
  const i = document.getElementById(`input-reps-${idx}`);
  const v = document.getElementById(`reg-seg-ver-${idx}`);
  if(i && v) v.textContent = fmtSeg(i.value);
}
function renderSetLine(s, i, idx){
  const nota = s.nota ? `<span class="pill" style="padding:2px 8px; font-size:10.5px;">${escapeHtml(s.nota)}</span>` : '';
  const tipoLado = renderTipoLadoPills(s.tipo_serie, s.lado);
  const pr = s._isPR ? prPillHtml() : '';
  const btnBorrar = (idx != null && s.id) ? `<button type="button" class="remove-x reg-set-x" onclick="eliminarSetIndividual(${idx}, '${s.id}')" title="Quitar esta serie">✕</button>` : '';
  const peso = Number(s.peso) || 0;
  return `<div class="set-line reg-set"><span class="reg-set-num">${i+1}</span><span class="reg-set-val">${esSeg(s.unidad) ? `⏱ ${fmtSeg(s.reps)}` : `${escapeHtml(String(s.reps))}<small>reps</small>`}${peso ? `<small>×</small>${escapeHtml(String(s.peso))}<small>kg</small>` : '<small>· peso corporal</small>'}${nota || tipoLado ? `<span class="reg-set-extra">${nota}${tipoLado}</span>` : ''}</span><span class="reg-set-fin">${pr || '<span class="reg-set-ok">✓</span>'}${btnBorrar}</span></div>`;
}

async function eliminarSetIndividual(idx, setId){
  const grupo = activeSesionExs[idx];
  if(!grupo) return;
  const { error } = await sb.from('sesion_series').delete().eq('id', setId);
  if(error){ showToast('No se pudo quitar la serie'); return; }
  grupo.sets = grupo.sets.filter(s => s.id !== setId);
  renderDraftExercises();
  showToast('Serie quitada');
}

async function agregarSetABloque(idx){
  const grupo = activeSesionExs[idx];
  if(!grupo) return;
  const pesoEl = document.getElementById(`input-peso-${idx}`);
  const repsEl = document.getElementById(`input-reps-${idx}`);
  const notaEl = document.getElementById(`input-nota-${idx}`);
  const tipoSerieEl = document.getElementById(`select-tiposerie-${idx}`);
  const ladoEl = document.getElementById(`select-lado-${idx}`);
  const peso = pesoEl ? pesoEl.value : '';
  const reps = repsEl ? repsEl.value : '';
  const nota = notaEl ? notaEl.value.trim() : '';
  const tipo_serie = tipoSerieEl ? tipoSerieEl.value : '';
  const lado = ladoEl ? ladoEl.value : '';
  const porTiempo = esSeg(grupo.unidad);
  if(!reps){ showToast(porTiempo ? 'Completa el tiempo en segundos' : 'Completa las repeticiones'); return; }

  const btn = document.getElementById(`btn-serie-${idx}`);
  if(btn) btn.disabled = true;
  const orden = activeSesionExs.reduce((acc,g)=>acc+g.sets.length,0);
  const { data, error } = await sb.from('sesion_series').insert({
    sesion_id: activeSesionId,
    ejercicio_nombre: grupo.nombre,
    peso: peso || 0,
    reps: reps,
    unidad: porTiempo ? 'seg' : 'reps',
    nota: nota || null,
    tipo_serie: tipo_serie || null,
    lado: lado || null,
    orden
  }).select().single();
  if(btn) btn.disabled = false;

  if(error){ showToast('No se pudo guardar la serie, intenta de nuevo'); return; }

  // Detecta un récord personal al instante, con el mismo criterio que se
  // usa para marcar los PR en el historial (peso > máximo previo de ese
  // ejercicio). Actualiza también el "último peso" para la próxima sugerencia.
  const tiempoPuro = porTiempo && !(Number(data.peso) > 0);
  const key = grupo.nombre.trim().toLowerCase() + (tiempoPuro ? '|seg' : '');
  const pesoNum = tiempoPuro ? (Number(data.reps) || 0) : (Number(data.peso) || 0);
  if(!activeStatsPorEjercicio[key]) activeStatsPorEjercicio[key] = { max: 0, last: 0 };
  const stat = activeStatsPorEjercicio[key];
  const esPR = pesoNum > 0 && pesoNum > stat.max;
  if(pesoNum > stat.max) stat.max = pesoNum;
  if(pesoNum > 0) stat.last = pesoNum;
  data._isPR = esPR;

  grupo.sets.push(data);
  // La próxima serie parte con los mismos números (se ajustan con − / +).
  grupo.repsSugeridas = reps;
  grupo.pesoSugerido = peso !== '' ? peso : grupo.pesoSugerido;
  ejercicioAbierto = grupo.nombre;
  renderDraftExercises();
  const setsHolder = document.getElementById(`bloque-sets-${idx}`);
  if(setsHolder){
    // Animación de la serie recién guardada (y de su corona si es récord).
    const nueva = setsHolder.lastElementChild;
    if(nueva){ nueva.classList.add('set-nueva'); if(esPR) nueva.classList.add('set-pr-nueva'); }
  }
  const btnNuevo = document.getElementById(`btn-serie-${idx}`);
  if(btnNuevo){
    btnNuevo.classList.add('serie-ok');
    setTimeout(() => btnNuevo.classList.remove('serie-ok'), 900);
  }
  if(window.UCKilo){
    if(esPR) window.UCKilo.celebrarPR(grupo.nombre);
    else { window.UCKilo.sonido('serie'); window.UCKilo.vibrar(25); }
  }
  if(!esPR || !window.UCKilo) showToast(esPR ? `🔥 ¡Nuevo récord en ${grupo.nombre}!` : 'Serie guardada ✓');
}

function quitarBloqueEjercicio(idx, btn){
  const grupo = activeSesionExs[idx];
  if(!grupo) return;
  if(grupo.sets.length && btn && btn.dataset.confirm !== '1'){
    btn.dataset.confirm = '1';
    btn.textContent = '✕✕';
    btn.title = 'Toca de nuevo para quitar este ejercicio y sus series';
    setTimeout(() => {
      if(btn.isConnected){ btn.dataset.confirm = ''; btn.textContent = '✕'; btn.title = 'Quitar ejercicio'; }
    }, 3000);
    return;
  }
  eliminarBloqueEjercicio(idx);
}

async function eliminarBloqueEjercicio(idx){
  const grupo = activeSesionExs[idx];
  if(!grupo) return;
  const ids = grupo.sets.map(s => s.id).filter(Boolean);
  if(ids.length){
    const { error } = await sb.from('sesion_series').delete().in('id', ids);
    if(error){ showToast('No se pudo quitar el ejercicio'); return; }
  }
  activeSesionExs.splice(idx, 1);
  // Si este ejercicio estaba unido en una superserie, esa unión ya no tiene
  // sentido — se quita también para no dejar una etiqueta "Unido con..." apuntando a algo que ya no está.
  const nEliminado = normEx(grupo.nombre);
  const teniaSuperserie = activeSuperseries.some(p => normEx(p[0]) === nEliminado || normEx(p[1]) === nEliminado);
  if(teniaSuperserie){
    activeSuperseries = activeSuperseries.filter(p => normEx(p[0]) !== nEliminado && normEx(p[1]) !== nEliminado);
    await guardarSuperseries();
  }
  renderDraftExercises();
  actualizarSugeridosHolder();
  showToast('Ejercicio quitado');
}

// ---------- SUPERSERIE (unir dos ejercicios del entrenamiento de hoy) ----------
// Aditivo: no reemplaza nada de lo existente. Se guarda en sesiones.superseries
// como una lista de pares [nombreA, nombreB]; solo se muestra el nombre de
// ambos ejercicios unidos, tal como se pidió (simple, sin más detalle).
function normEx(nombre){ return (nombre || '').trim().toLowerCase(); }
function buscarSuperserieDe(nombre){
  const n = normEx(nombre);
  return activeSuperseries.find(p => normEx(p[0]) === n || normEx(p[1]) === n) || null;
}
function otroDeSuperserie(par, nombre){
  const n = normEx(nombre);
  return normEx(par[0]) === n ? par[1] : par[0];
}
async function guardarSuperseries(){
  if(!activeSesionId) return;
  await sb.from('sesiones').update({ superseries: activeSuperseries }).eq('id', activeSesionId);
}
function toggleSuperserieModo(){
  superserieModo = !superserieModo;
  superserieEsperando = null;
  const btn = document.getElementById('btn-superserie-toggle');
  if(btn) btn.classList.toggle('active', superserieModo);
  showToast(superserieModo ? 'Toca dos ejercicios para unirlos en superserie' : 'Modo superserie desactivado');
  renderDraftExercises();
}
async function tocarEjercicioParaSuperserie(idx){
  const grupo = activeSesionExs[idx];
  if(!grupo) return;
  if(buscarSuperserieDe(grupo.nombre)){
    showToast('Ese ejercicio ya está unido a otro — desúnelo primero si quieres cambiarlo');
    return;
  }
  if(!superserieEsperando){
    superserieEsperando = grupo.nombre;
    renderDraftExercises();
    return;
  }
  if(normEx(superserieEsperando) === normEx(grupo.nombre)){
    superserieEsperando = null;
    renderDraftExercises();
    return;
  }
  activeSuperseries.push([superserieEsperando, grupo.nombre]);
  superserieEsperando = null;
  superserieModo = false;
  const btnFab = document.getElementById('btn-superserie-toggle');
  if(btnFab) btnFab.classList.remove('active');
  await guardarSuperseries();
  renderDraftExercises();
  showToast('Ejercicios unidos en superserie ✓');
}
async function quitarSuperserie(nombre){
  const n = normEx(nombre);
  activeSuperseries = activeSuperseries.filter(p => normEx(p[0]) !== n && normEx(p[1]) !== n);
  await guardarSuperseries();
  renderDraftExercises();
  showToast('Superserie deshecha');
}

async function cancelarSesion(){
  const totalSets = activeSesionExs.reduce((acc,g)=>acc+g.sets.length,0);
  if(totalSets === 0 && activeSesionId){
    await sb.from('sesiones').delete().eq('id', activeSesionId);
  }
  activeSesionId = null; activeSesionExs = []; activeSesionDia = null;
  activeSuperseries = []; superserieModo = false; superserieEsperando = null;
  descansoDetener();
  renderAlumnoHome();
}

async function finalizarSesion(){
  const totalSets = activeSesionExs.reduce((acc,g)=>acc+g.sets.length,0);
  if(totalSets === 0){ showToast('Agrega al menos una serie antes de finalizar'); return; }
  const btn = document.getElementById('btn-finalizar-sesion');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const nota = document.getElementById('input-nota-alumno').value.trim();
  const fotoInput = document.getElementById('input-foto');
  let foto_url = null;

  // Si algo falla acá abajo, NO borramos activeSesionId ni el formulario:
  // dejamos todo tal cual (con la nota que escribió) para que pueda tocar
  // "Finalizar" de nuevo sin perder lo que escribió. Sus series ya están
  // guardadas de antes (autoguardado), así que lo único en juego acá es
  // la nota y la foto.
  function reintentar(mensaje){
    showToast(mensaje);
    btn.disabled = false;
    btn.textContent = `${ICONS.check} Finalizar entrenamiento de hoy`;
  }

  try{
    if(fotoInput.files[0]){
      const file = fotoInput.files[0];
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/${activeSesionId}.${ext}`;
      const { error: upErr } = await sb.storage.from('sesion-fotos').upload(path, file, { upsert: true });
      if(!upErr){
        foto_url = sb.storage.from('sesion-fotos').getPublicUrl(path).data.publicUrl;
      }
    }
    let { error } = await sb.from('sesiones').update({ nota_alumno: nota || null, foto_url, finalizada_at: new Date().toISOString() }).eq('id', activeSesionId);
    // Respaldo: si la base todavía no tiene la columna finalizada_at, guarda sin ella.
    if(error && /finalizada_at/i.test(error.message || '')){
      ({ error } = await sb.from('sesiones').update({ nota_alumno: nota || null, foto_url }).eq('id', activeSesionId));
    }
    if(error){
      reintentar('Tus series ya están guardadas, pero no se pudo guardar la nota — toca "Finalizar" de nuevo para reintentar.');
      return;
    }
    showToast('¡Sesión guardada!');
    avisarProfesorEntrenamiento(activeSesionId, 'fin');
  }catch(e){
    reintentar('Tus series ya están guardadas, pero no se pudo guardar la nota — toca "Finalizar" de nuevo para reintentar.');
    return;
  }

  const resumen = calcularResumenSesion(activeSesionExs, activeSesionFecha);
  marcarSesionFinalizada(activeSesionId);
  activeSesionId = null; activeSesionExs = []; activeSesionDia = null;
  activeSuperseries = []; superserieModo = false; superserieEsperando = null;
  renderResumenSesion(resumen);
}


// ============================================================
// COMPARTIR EL ENTRENAMIENTO (imagen para historias / reels / TikTok)
// ============================================================
// La imagen se dibuja en el mismo celular con <canvas> (sin internet, sin
// base de datos). Muestra solo el resumen y los GRUPOS musculares: nunca la
// lista de ejercicios, para no revelar la rutina que armó el profe.
// Después se abre el menú "Compartir" del celular (Web Share API), donde
// la persona elige Instagram, TikTok, WhatsApp, etc. Si el navegador no lo
// permite, se descarga la imagen para subirla a mano.
const COMPARTIR_MARCA = 'STC APP';
const COMPARTIR_SUBMARCA = 'ENTRENA CON NOSOTROS'; // cambiar por el @ de Instagram cuando esté definido
const COMPARTIR_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const COMPARTIR_DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function compartirKiloSvg(){
  if(!window.UCKilo) return null;
  const doc = new DOMParser().parseFromString(window.UCKilo.svg('celebra', 300), 'text/html');
  const svg = doc.querySelector('svg');
  if(!svg) return null;
  // Pose fija: brazos arriba, boca abierta y corona (sin animación).
  ['.k-bn-izq','.k-bn-der','.k-bf','.k-lineas','.k-boca','.k-ojos-cerrados','.k-cara-fuerza','.kilo-parpado','.kilo-sombra']
    .forEach(sel => svg.querySelectorAll(sel).forEach(n => n.remove()));
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(svg);
}

function compartirCargarImagen(src){
  return new Promise((ok, mal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = mal; img.src = src; });
}

// Texto con separación entre letras (letterSpacing no funciona en todos los celulares).
function compartirTextoEspaciado(ctx, texto, xCentro, y, espacio){
  const letras = [...texto];
  const ancho = letras.reduce((a, l) => a + ctx.measureText(l).width, 0) + espacio * (letras.length - 1);
  let x = xCentro - ancho / 2;
  ctx.textAlign = 'left';
  letras.forEach(l => { ctx.fillText(l, x, y); x += ctx.measureText(l).width + espacio; });
  ctx.textAlign = 'center';
}

function compartirAjustar(ctx, texto, fuente, tamano, maxAncho){
  let t = tamano;
  ctx.font = fuente.replace('{t}', t);
  while(ctx.measureText(texto).width > maxAncho && t > 20){ t -= 4; ctx.font = fuente.replace('{t}', t); }
  return t;
}

function compartirCajaRedonda(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function generarImagenCompartir(r){
  const W = 1080, H = 1920, cx = W / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all(['700 100px Oswald', '500 40px Oswald', '500 30px "IBM Plex Mono"'].map(f => document.fonts.load(f)));
  } catch(e){}

  // Fondo
  let g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, '#2C2C2C'); g.addColorStop(0.7, '#111111'); g.addColorStop(1, '#111111');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(cx, 600, 0, cx, 600, 640);
  g.addColorStop(0, 'rgba(255,222,112,.48)'); g.addColorStop(1, 'rgba(255,222,112,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(cx, H, 0, cx, H, 620);
  g.addColorStop(0, 'rgba(255,199,44,.20)'); g.addColorStop(1, 'rgba(255,199,44,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // Fecha
  const [yy, mm, dd] = String(r.fecha).split('-').map(Number);
  const f = new Date(yy, (mm || 1) - 1, dd || 1);
  ctx.font = '500 28px "IBM Plex Mono", monospace'; ctx.fillStyle = '#FFDE70';
  compartirTextoEspaciado(ctx, `${COMPARTIR_DIAS[f.getDay()]} ${f.getDate()} · ${COMPARTIR_MESES[f.getMonth()]}`.toUpperCase(), cx, 250, 7);

  // Título
  ctx.fillStyle = '#FBFBFB';
  compartirAjustar(ctx, 'ENTRENAMIENTO', '700 {t}px Oswald, sans-serif', 124, 920);
  ctx.fillText('ENTRENAMIENTO', cx, 380);
  ctx.fillStyle = '#FFC72C';
  compartirAjustar(ctx, 'COMPLETADO', '700 {t}px Oswald, sans-serif', 124, 920);
  ctx.fillText('COMPLETADO', cx, 500);

  // Kilo celebrando
  const svg = compartirKiloSvg();
  if(svg){
    try {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = await compartirCargarImagen(url);
      const kw = 290, kh = Math.round(kw * 290 / 240);
      ctx.fillStyle = 'rgba(0,0,0,.30)';
      ctx.beginPath(); ctx.ellipse(cx, 560 + kh - 4, 78, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(img, cx - kw / 2, 555, kw, kh);
      URL.revokeObjectURL(url);
    } catch(e){}
  }

  // Número principal: volumen (o series si fue sin peso)
  const conPeso = r.volumen > 0;
  ctx.fillStyle = '#FFC72C';
  ctx.font = '700 190px Oswald, sans-serif';
  ctx.fillText(conPeso ? r.volumen.toLocaleString('es-CL') : String(r.series), cx, 1100);
  ctx.font = '500 30px "IBM Plex Mono", monospace'; ctx.fillStyle = '#AEAEAE';
  compartirTextoEspaciado(ctx, conPeso ? 'KG LEVANTADOS HOY' : (r.series === 1 ? 'SERIE COMPLETADA HOY' : 'SERIES COMPLETADAS HOY'), cx, 1152, 7);

  // Qué entrené (grupos musculares)
  const grupos = r.gruposMusculares || [];
  if(grupos.length){
    ctx.font = '500 26px "IBM Plex Mono", monospace'; ctx.fillStyle = '#AEAEAE';
    compartirTextoEspaciado(ctx, 'HOY ENTRENÉ', cx, 1258, 7);
    const partes = grupos.map(t => t.toUpperCase());
    const tam = compartirAjustar(ctx, partes.join('  ·  '), '700 {t}px Oswald, sans-serif', 64, 900);
    ctx.font = `700 ${tam}px Oswald, sans-serif`;
    const sep = '  ·  ';
    const total = ctx.measureText(partes.join(sep)).width;
    let x = cx - total / 2;
    ctx.textAlign = 'left';
    partes.forEach((p, i) => {
      ctx.fillStyle = '#FBFBFB'; ctx.fillText(p, x, 1335); x += ctx.measureText(p).width;
      if(i < partes.length - 1){ ctx.fillStyle = '#FFDE70'; ctx.fillText(sep, x, 1335); x += ctx.measureText(sep).width; }
    });
    ctx.textAlign = 'center';
  }

  // Cajas: series · ejercicios · récords
  const cajas = [
    { n: String(r.series), t: r.series === 1 ? 'SERIE' : 'SERIES' },
    { n: String(r.ejercicios), t: r.ejercicios === 1 ? 'EJERCICIO' : 'EJERCICIOS' },
    { n: `${r.prs.length} 👑`, t: r.prs.length === 1 ? 'RÉCORD' : 'RÉCORDS', pr: true }
  ];
  const bx = 90, by = 1400, bw = (900 - 40) / 3, bh = 176;
  cajas.forEach((c, i) => {
    const x = bx + i * (bw + 20);
    compartirCajaRedonda(ctx, x, by, bw, bh, 28);
    ctx.fillStyle = c.pr ? 'rgba(255,209,102,.10)' : 'rgba(17,17,17,.55)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = c.pr ? 'rgba(255,209,102,.6)' : 'rgba(255,221,111,.25)'; ctx.stroke();
    ctx.fillStyle = c.pr ? '#FFD166' : '#FBFBFB';
    ctx.font = '700 76px Oswald, sans-serif'; ctx.fillText(c.n, x + bw / 2, by + 96);
    ctx.fillStyle = '#AEAEAE'; ctx.font = '500 22px "IBM Plex Mono", monospace';
    compartirTextoEspaciado(ctx, c.t, x + bw / 2, by + 144, 3);
  });

  // Marca
  ctx.font = '700 40px Oswald, sans-serif';
  const anchoMarca = ctx.measureText(COMPARTIR_MARCA).width + 20;
  const mx = cx - (58 + 18 + anchoMarca) / 2, my = 1640;
  ctx.fillStyle = '#FFC72C';
  ctx.beginPath();
  ctx.moveTo(mx, my + 11.6); ctx.lineTo(mx + 11.6, my); ctx.lineTo(mx + 58, my); ctx.lineTo(mx + 58, my + 46.4);
  ctx.lineTo(mx + 46.4, my + 58); ctx.lineTo(mx, my + 58); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111111'; ctx.font = '700 20px Oswald, sans-serif'; ctx.fillText('UC', mx + 29, my + 37);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FBFBFB'; ctx.font = '700 40px Oswald, sans-serif';
  let lx = mx + 58 + 18;
  [...COMPARTIR_MARCA].forEach(l => { ctx.fillText(l, lx, my + 34); lx += ctx.measureText(l).width + 2.5; });
  ctx.fillStyle = '#AEAEAE'; ctx.font = '500 19px "IBM Plex Mono", monospace';
  lx = mx + 58 + 18;
  [...COMPARTIR_SUBMARCA].forEach(l => { ctx.fillText(l, lx, my + 60); lx += ctx.measureText(l).width + 3.5; });
  ctx.textAlign = 'center';

  return await new Promise(ok => canvas.toBlob(ok, 'image/png'));
}

function conectarCompartirResumen(r){
  const btnC = document.getElementById('btn-resumen-compartir');
  const btnG = document.getElementById('btn-resumen-guardar');
  if(!btnC || !btnG) return;
  // Se prepara la imagen apenas aparece el resumen: así, al tocar
  // "Compartir", el menú se abre al instante (el iPhone exige que se abra
  // justo después del toque).
  const lista = generarImagenCompartir(r).catch(() => null);
  const nombre = `stc-${r.fecha}.png`;
  const guardar = async () => {
    const blob = await lista;
    if(!blob){ showToast('No se pudo crear la imagen'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Imagen guardada. Súbela a tu historia cuando quieras 💪');
  };
  btnG.onclick = guardar;
  btnC.onclick = async () => {
    const blob = await lista;
    if(!blob){ showToast('No se pudo crear la imagen'); return; }
    const archivo = new File([blob], nombre, { type: 'image/png' });
    if(navigator.canShare && navigator.canShare({ files: [archivo] })){
      try {
        await navigator.share({ files: [archivo] });
      } catch(e){
        if(e && e.name === 'AbortError') return; // la persona cerró el menú
        if(e && e.name === 'NotAllowedError'){ showToast('Toca "Compartir" otra vez'); return; }
        guardar();
      }
    } else {
      guardar(); // computador o navegador antiguo: se descarga la imagen
    }
  };
}

// ---------- RESUMEN DE SESIÓN TERMINADA ----------
// Usa solo las series ya guardadas en memoria (no consulta ni escribe en la base).
// Los ejercicios con peso 0 (peso corporal) cuentan como series pero no suman kilos.
// Grupo muscular de un ejercicio: primero el banco; si el profe escribió
// otro nombre, se adivina por palabras clave (el orden importa).
const GRUPOS_POR_PALABRA = [
  ['Pantorrillas', /talon|pantorrilla|gemelo/],
  ['Core', /plancha|crunch|abdom|\bcore\b|rueda|oblicuo|elevacion(es)? de piernas|russian|pallof/],
  ['Posterior', /femoral|peso muerto|rumano|hiperextens|isquio|good morning/],
  ['Glúteos', /hip thrust|glute|abductor|patada|puente/],
  ['Tríceps', /tricep|frances|fondo|press cerrado|copa|rompecraneos/],
  ['Bíceps', /curl|bicep|martillo|predicador/],
  ['Piernas', /sentadilla|prensa|zancada|estocada|cuadricep|squat|bulgara|goblet|pierna|lunge|step ?up|aductor/],
  ['Espalda', /remo|jalon|pull ?down|dominada|espalda|pullover|dorsal|encogimiento|pull ?up|lat /],
  ['Hombros', /militar|hombro|lateral|vuelo|pajaro|face ?pull|arnold|frontal|deltoid|overhead/],
  ['Pecho', /press|banca|pecho|apertura|cruce|flexion|pec ?deck|\bfly|pectoral|push ?up/]
];
function grupoMuscularDe(nombre){
  const banco = findExerciseBankEntry(nombre);
  if(banco && banco.group) return banco.group;
  const n = normalizeExerciseName(nombre);
  if(!n) return null;
  const hit = GRUPOS_POR_PALABRA.find(([, re]) => re.test(n));
  return hit ? hit[0] : null;
}
function calcularResumenSesion(grupos, fecha){
  let series = 0, volumen = 0;
  const prs = [];
  const seriesPorGrupo = {};
  (grupos || []).forEach(g => {
    let tienePR = false;
    (g.sets || []).forEach(s => {
      series++;
      const peso = Number(s.peso) || 0;
      const reps = Number(s.reps) || 0;
      if(!esSeg(s.unidad) && peso > 0 && reps > 0) volumen += peso * reps;
      if(s._isPR) tienePR = true;
    });
    if(tienePR) prs.push(g.nombre);
    // Grupo muscular desde el banco de ejercicios (solo el grupo, nunca el
    // ejercicio: así la imagen para compartir no revela la rutina del profe).
    const grupoM = grupoMuscularDe(g.nombre);
    if(grupoM && (g.sets || []).length){
      seriesPorGrupo[grupoM] = (seriesPorGrupo[grupoM] || 0) + g.sets.length;
    }
  });
  const ejercicios = (grupos || []).filter(g => (g.sets || []).length).length;
  const gruposMusculares = Object.entries(seriesPorGrupo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  return { series, ejercicios, volumen: Math.round(volumen), prs, gruposMusculares, fecha: fecha || todayStr() };
}

function renderResumenSesion(r){
  descansoDetener();
  const kilo = window.UCKilo ? window.UCKilo.svg('celebra', 120) : '';
  let confeti = '';
  const colores = ['#FFC72C', '#FFDE70', '#FFDE70', '#5EE3B6', '#FFD166'];
  for(let i = 0; i < 26; i++){
    confeti += `<span class="resumen-confeti" style="left:${Math.round(Math.random()*96)+2}%; background:${colores[i % 5]}; --d:${(Math.random()*0.6).toFixed(2)}s; --r:${Math.round(Math.random()*540 - 270)}deg"></span>`;
  }
  const prsHtml = r.prs.length ? `
    <div class="resumen-prs">
      <div class="resumen-prs-titulo">${r.prs.length === 1 ? 'Récord de hoy' : `Récords de hoy (${r.prs.length})`}</div>
      <div class="resumen-prs-lista">${r.prs.map(n => `<span class="pill pr pr-corona">${window.UCKilo ? window.UCKilo.corona('pr-corona-mini') : ''}${escapeHtml(n)}</span>`).join('')}</div>
    </div>` : '';
  root().innerHTML = `
    <section class="resumen-sesion" aria-live="polite">
      <div class="resumen-confeti-capa" aria-hidden="true">${confeti}</div>
      <div class="resumen-kilo">${kilo}</div>
      <p class="resumen-eyebrow">Sesión terminada</p>
      <h1 class="resumen-titulo">¡Entrenamiento completado!</h1>
      <div class="resumen-volumen">
        <span class="resumen-volumen-num" id="resumen-volumen-num">${r.volumen.toLocaleString('es-CL')}</span><span class="resumen-volumen-kg">kg</span>
      </div>
      <div class="resumen-volumen-label">Volumen total levantado</div>
      ${(r.gruposMusculares || []).length ? `<div class="resumen-grupos"><span>Hoy entrenaste</span><b>${r.gruposMusculares.map(g => escapeHtml(g)).join(' <i>·</i> ')}</b></div>` : ''}
      <div class="resumen-stats">
        <div><b>${r.series}</b><span>serie${r.series === 1 ? '' : 's'}</span></div>
        <div><b>${r.ejercicios}</b><span>ejercicio${r.ejercicios === 1 ? '' : 's'}</span></div>
        <div><b>${r.prs.length}</b><span>récord${r.prs.length === 1 ? '' : 's'}</span></div>
      </div>
      ${prsHtml}
      <div class="resumen-compartir">
        <button class="btn" id="btn-resumen-compartir">${ICONS.share || '↗'} Compartir mi entrenamiento</button>
        <button type="button" class="btn-sm resumen-guardar" id="btn-resumen-guardar">⬇ Guardar imagen</button>
      </div>
      <button class="link-btn resumen-volver" id="btn-resumen-volver">Volver al inicio</button>
    </section>`;
  window.scrollTo(0, 0);
  document.getElementById('btn-resumen-volver').onclick = () => renderAlumnoHome();
  conectarCompartirResumen(r);
  if(window.UCKilo){ window.UCKilo.sonido('fin'); window.UCKilo.vibrar([40, 30, 60]); }
  // El número sube contando hasta el total (se salta si el celular pide menos movimiento).
  const el = document.getElementById('resumen-volumen-num');
  let quieto = false;
  try { quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
  if(el && r.volumen > 0 && !quieto){
    const t0 = performance.now(), dur = 1300;
    const paso = (now) => {
      if(!el.isConnected) return;
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(r.volumen * (1 - Math.pow(1 - p, 3))).toLocaleString('es-CL');
      if(p < 1) requestAnimationFrame(paso);
    };
    el.textContent = '0';
    requestAnimationFrame(paso);
  }
}

function descargarRutinaPDF(rutina, dias){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('STC App', 14, 18);
  doc.setFontSize(13);
  doc.text(rutina.nombre, 14, 28);
  let y = 36;
  if(rutina.objetivo){
    doc.setFontSize(10);
    doc.text(rutina.objetivo, 14, y);
    y += 8;
  }

  (dias || []).forEach(dia => {
    if(y > 265){ doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(dia.nombre, 14, y);
    doc.setFont(undefined, 'normal');
    y += 8;
    const fxCfgPdf = fxDeDia(dia);
    if(fxCfgPdf){
      doc.setFontSize(10);
      doc.text(`Funcional · ${FX_FORMATOS[fxCfgPdf.formato].nombre}: ${fxResumenTexto(fxCfgPdf)} (${fxDuracionTexto(fxCfgPdf, dia.ejercicios)})`.slice(0, 110), 14, y);
      y += 7;
    }

    doc.setFontSize(10);
    doc.text('Ejercicio', 14, y);
    doc.text('Series', 95, y);
    doc.text('Reps', 116, y);
    doc.text('Peso', 138, y);
    doc.text('Descanso', 168, y);
    y += 5;
    doc.setLineWidth(0.2);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(11);
    dia.ejercicios.forEach(ex => {
      if(y > 280){ doc.addPage(); y = 20; }
      doc.text(String(ex.nombre).slice(0,38), 14, y);
      doc.text(String(ex.series_objetivo || '-'), 95, y);
      doc.text(esSeg(ex.unidad_objetivo) ? `${ex.reps_objetivo || '-'} s` : String(ex.reps_objetivo || '-'), 116, y);
      doc.text(String(ex.peso_objetivo || '-').slice(0,12), 138, y);
      doc.text(ex.descanso_seg ? `${ex.descanso_seg}s` : '-', 168, y);
      y += 6;
      if(ex.nota){
        if(y > 280){ doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text(`Nota: ${String(ex.nota).slice(0,80)}`, 14, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        y += 6;
      }
      y += 2;
    });
    y += 4;
  });

  doc.save(`${rutina.nombre.replace(/\s+/g,'_')}.pdf`);
}

// ---------- HISTORIAL Y DUPLICADO DE RUTINAS ----------
async function renderHistorialRutinas(alumno, volverFn, permitirDuplicar){
  root().innerHTML = `<div class="loading">Cargando rutinas anteriores...</div>`;
  const { data: rutinas } = await sb.from('rutinas')
    .select('*, rutina_ejercicios(*)')
    .eq('alumno_id', alumno.id)
    .eq('activa', false)
    .order('created_at', { ascending: false });

  root().innerHTML = `
    <div class="header-actions">
      <div>
        <h1 style="font-size:20px;">Rutinas anteriores</h1>
        <div class="sub" style="margin-bottom:0;">${escapeHtml(alumno.nombre)}</div>
      </div>
      <button class="switch-user" id="btn-volver-historial">${ICONS.arrowLeft} Volver</button>
    </div>
    <div id="historial-rutinas-list"></div>
  `;
  document.getElementById('btn-volver-historial').onclick = volverFn;

  const listEl = document.getElementById('historial-rutinas-list');
  if(!rutinas || !rutinas.length){
    listEl.innerHTML = emptyKiloHtml('Todavía no hay rutinas anteriores guardadas.', 'espera');
    return;
  }

  listEl.innerHTML = rutinas.map(r => {
    const dias = groupPorDia(r.rutina_ejercicios);
    const puedeDuplicar = permitirDuplicar;
    const puedeEditar = permitirDuplicar || alumnoPuedeEditarRutina(r);
    const puedeEliminar = permitirDuplicar || alumnoPuedeEditarRutina(r);
    return `
    <div class="card routine-plan routine-history-card">
      <div class="row-flex" style="margin-bottom:6px;">
        <div><h2 style="margin:0 0 7px;">${escapeHtml(r.nombre)}</h2>${routineOriginBadge(r, profile.role === 'alumno')}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn-sm" data-pdf-id="${r.id}">${ICONS.download} PDF</button>
          ${puedeEditar ? `<button class="btn-sm" data-edit-id="${r.id}">${ICONS.edit} Editar</button>` : ''}
          ${puedeDuplicar ? `<button class="btn-sm" data-dup-id="${r.id}">Usar como base</button>` : ''}
          ${esRolProfe() ? `<button class="btn-sm" data-pl-id="${r.id}">⧉ Plantilla</button>` : ''}
          ${puedeEliminar ? `<button class="btn-sm" data-del-id="${r.id}">Eliminar</button>` : ''}
        </div>
      </div>
      ${r.objetivo ? `<div class="sub" style="margin-bottom:6px;">${escapeHtml(r.objetivo)}</div>` : ''}
      <div class="sub" style="margin-bottom:10px;">Creada el ${formatDateShort(String(r.created_at).slice(0,10))}</div>
      ${renderRoutineDays(dias)}
    </div>
  `;
  }).join('');

  listEl.querySelectorAll('[data-pdf-id]').forEach(btn => {
    btn.onclick = () => {
      const rutina = rutinas.find(r => r.id === btn.dataset.pdfId);
      descargarRutinaPDF(rutina, groupPorDia(rutina.rutina_ejercicios));
    };
  });

  listEl.querySelectorAll('[data-pl-id]').forEach(btn => {
    btn.onclick = () => guardarRutinaComoPlantilla(rutinas.find(r => r.id === btn.dataset.plId), btn);
  });
  listEl.querySelectorAll('[data-dup-id]').forEach(btn => {
    btn.onclick = () => {
      const rutina = rutinas.find(r => r.id === btn.dataset.dupId);
      duplicarRutinaComoNueva(alumno, rutina, volverFn);
    };
  });
  listEl.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.onclick = () => {
      const rutina = rutinas.find(r => r.id === btn.dataset.editId);
      editarRutinaGuardada(alumno, rutina, () => renderHistorialRutinas(alumno, volverFn, permitirDuplicar));
    };
  });
  listEl.querySelectorAll('[data-del-id]').forEach(btn => {
      btn.onclick = () => {
        if(btn.dataset.confirm === '1'){
          eliminarRutina(btn.dataset.delId, () => renderHistorialRutinas(alumno, volverFn, permitirDuplicar));
        } else {
          btn.dataset.confirm = '1';
          btn.textContent = '¿Seguro?';
          btn.classList.add('btn-danger-confirm');
          setTimeout(() => {
            if(!btn.isConnected) return;
            btn.dataset.confirm = '';
            btn.textContent = 'Eliminar';
            btn.classList.remove('btn-danger-confirm');
          }, 3000);
        }
      };
  });
}

function rutinaComoPrefill(rutina){
  const dias = groupPorDia(rutina.rutina_ejercicios).map(d => ({
    nombre: d.nombre,
    ejercicios: d.ejercicios.map(ex => ({
      nombre: ex.nombre || '',
      series_objetivo: ex.series_objetivo != null ? String(ex.series_objetivo) : '',
      reps_objetivo: ex.reps_objetivo || '',
      unidad_objetivo: ex.unidad_objetivo || 'reps',
      peso_objetivo: ex.peso_objetivo || '',
      nota: ex.nota || '',
      descanso_seg: ex.descanso_seg != null ? String(ex.descanso_seg) : '',
      tipo_serie_objetivo: ex.tipo_serie_objetivo || '',
      lado_objetivo: ex.lado_objetivo || '', circuito: ex.circuito || null
    }))
  }));
  return { nombre: rutina.nombre, objetivo: rutina.objetivo || '', dias };
}

function editarRutinaGuardada(alumno, rutina, volverFn){
  renderRutinaEditor(alumno, rutinaComoPrefill(rutina), rutina.id, volverFn);
}

async function eliminarRutina(id, onDeleted){
  const { error } = await sb.from('rutinas').delete().eq('id', id);
  if(error){ showToast('No se pudo eliminar la rutina'); return; }
  showToast('Rutina eliminada');
  if(onDeleted) onDeleted();
}

function duplicarRutinaComoNueva(alumno, rutinaVieja, volverFn){
  renderRutinaEditor(alumno, rutinaComoPrefill(rutinaVieja), null, volverFn);
}

// ============================================================
// VISTA COACH
// ============================================================
// Quita tildes y pasa a minúsculas, para que buscar "jose" encuentre "José".
function normalizarTexto(txt){
  return (txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function renderCoachHome(){
  cleanupSocialRealtime();
  root().innerHTML = `<div class="loading">Cargando alumnos...</div>`;
  const esSuperAdmin = profile.role === 'super_admin';

  const [{ data: alumnos, error }, profesoresRes] = await Promise.all([
    sb.from('profiles').select('*').eq('role', 'alumno').order('nombre'),
    sb.from('profiles').select('*').eq('role', 'profesor').order('nombre')
  ]);
  if(error){ root().innerHTML = `<div class="error-banner">No se pudo cargar la lista de alumnos.</div>`; return; }
  const profesores = profesoresRes.data || [];
  let unreadByStudent = {};
  let trainingNotificationsUnread = 0;
  if(!esSuperAdmin){
    const [{ data: unreadRows }, trainingUnreadRes] = await Promise.all([
      sb.from('mensajes').select('sender_id').eq('receiver_id', profile.id).is('read_at', null),
      sb.from('notificaciones_entrenamiento').select('id', { count:'exact', head:true })
        .eq('profesor_id', profile.id).is('leida_at', null)
    ]);
    unreadByStudent = (unreadRows || []).reduce((acc,row) => {
      acc[row.sender_id] = (acc[row.sender_id] || 0) + 1;
      return acc;
    }, {});
    trainingNotificationsUnread = trainingUnreadRes.error ? 0 : (trainingUnreadRes.count || 0);
  }

  const conUltima = await Promise.all((alumnos||[]).map(async a => {
    const [{ data }, { data: rutinaActiva }, { data: medData }] = await Promise.all([
      sb.from('sesiones').select('fecha').eq('alumno_id', a.id).order('fecha', { ascending:false }).limit(1),
      sb.from('rutinas').select('fecha').eq('alumno_id', a.id).eq('activa', true).maybeSingle(),
      sb.from('mediciones').select('fecha, tipo').eq('alumno_id', a.id).order('fecha', { ascending:false }).limit(1)
    ]);
    return {
      ...a,
      ultima: data && data[0] ? data[0].fecha : null,
      rutinaFecha: rutinaActiva ? rutinaActiva.fecha : null,
      medicionFecha: medData && medData[0] ? medData[0].fecha : null,
      medicionTipo: medData && medData[0] ? medData[0].tipo : null
    };
  }));

  const totalNoLeidos = Object.values(unreadByStudent).reduce((a, n) => a + n, 0);
  const nombreProfesor = (profesorId) => {
    const p = profesores.find(p => p.id === profesorId);
    return p ? p.nombre : null;
  };

  setTimeout(() => { const b = document.getElementById('btn-mis-plantillas'); if(b) b.onclick = renderMisPlantillas; }, 0);
  root().innerHTML = `
    <div class="header-actions">
      <div class="coach-home-titulo">
        <small>${esSuperAdmin ? 'PANEL DE ADMINISTRACIÓN' : 'PANEL DEL PROFESOR'}</small>
        <b>Hola, ${escapeHtml(String(profile.nombre || 'profe').split(' ')[0])}</b>
      </div>
      <div class="student-header-actions">
        ${!esSuperAdmin ? `<button type="button" class="coach-inbox-btn training-alert-btn" id="btn-alertas-entrenamiento" aria-label="Notificaciones de entrenamiento${trainingNotificationsUnread ? `: ${trainingNotificationsUnread} sin leer` : ''}" title="Actividad de tus alumnos">${ICONS.bell}${trainingNotificationsUnread ? `<strong>${trainingNotificationsUnread > 99 ? '99+' : trainingNotificationsUnread}</strong>` : ''}</button>` : ''}
        ${!esSuperAdmin ? `<button type="button" class="coach-inbox-btn" id="btn-buzon-profesor" aria-label="Buzón de mensajes${totalNoLeidos ? `: ${totalNoLeidos} sin leer` : ''}" title="Buzón de mensajes">${ICONS.inbox}${totalNoLeidos ? `<strong>${totalNoLeidos > 99 ? '99+' : totalNoLeidos}</strong>` : ''}</button>` : ''}
        <button class="switch-user" id="btn-logout">${ICONS.logout} Salir</button>
      </div>
    </div>
    <div class="pp-home" id="btn-mi-perfil-coach" role="button" tabindex="0" aria-label="Ver y editar mi perfil">
      ${perfilProCardHtml(profile, esSuperAdmin ? null : (alumnos || []).filter(a => a.profesor_id === profile.id).length, { editar: true })}
      <div class="pp-home-ayuda">Así te ven tus alumnos · toca para editar</div>
    </div>
    ${!esSuperAdmin ? '<div id="push-aviso-holder"></div>' : ''}
    <button type="button" class="pl-acceso" id="btn-mis-plantillas">
      <span class="pl-acceso-ico">${ICONS.clipboard}</span>
      <span class="pl-acceso-txt"><small>PARA TODOS TUS ALUMNOS</small><b>Mis plantillas</b><em>Crea una vez, asígnala a muchos</em></span>
      <span class="pl-acceso-go">${ICONS.chevronRight}</span>
    </button>
    <div class="card" style="font-size:12.5px; color:var(--chalk-dim);">
      Para que un alumno nuevo entre, compártele el link de la app: te va a pedir crear su cuenta con su correo la primera vez.
    </div>
    ${esSuperAdmin ? `
      <button class="btn-toggle-rutina" id="btn-toggle-profesores">
        <span class="toggle-label">${ICONS.users} Gestión de profesores</span>
        ${toggleStateHtml()}
      </button>
      <div class="hidden" id="profesores-holder"></div>

      <button class="btn-toggle-rutina" id="btn-toggle-buzon">
        <span class="toggle-label">${ICONS.message} Buzón de sugerencias</span>
        ${toggleStateHtml()}
      </button>
      <div class="hidden" id="buzon-holder"></div>

      <button class="btn-toggle-rutina" id="btn-toggle-alumnos">
        <span class="toggle-label">${ICONS.users} Alumnos</span>
        ${toggleStateHtml()}
      </button>
      <div class="hidden" id="alumnos-holder">
        ${conUltima.length ? `
          <div style="position:relative; margin-bottom:14px;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--chalk-dim); display:flex;">${ICONS.search}</span>
            <input type="text" id="input-buscar-alumno" placeholder="Buscar alumno por nombre..." style="padding-left:36px; margin-bottom:0;" autocomplete="off">
          </div>
        ` : ''}
        <div id="coach-alumnos-list"></div>
      </div>
    ` : `
      <div class="row-flex" style="margin-bottom:10px; align-items:center;">
        <div class="sub" style="margin-bottom:0;" id="alumnos-scope-label">Tus alumnos</div>
        ${conUltima.length ? `<button class="btn-sm" id="btn-toggle-scope">${ICONS.users} Ver todos los alumnos</button>` : ''}
      </div>
      ${conUltima.length ? `
        <div style="position:relative; margin-bottom:14px;">
          <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--chalk-dim); display:flex;">${ICONS.search}</span>
          <input type="text" id="input-buscar-alumno" placeholder="Buscar alumno por nombre..." style="padding-left:36px; margin-bottom:0;" autocomplete="off">
        </div>
      ` : ''}
      <div class="card hidden" id="alumnos-scope-note" style="font-size:12.5px; color:var(--chalk-dim); margin-bottom:14px;">
        Estás viendo a todos los alumnos del gimnasio, no solo los tuyos — puedes ver el perfil de cualquiera, por si necesitas cubrir a otro profe, pero solo puedes editar o eliminar cosas en los alumnos asignados a ti.
      </div>
      <div id="coach-alumnos-list"></div>
    `}
  `;
  document.getElementById('btn-logout').onclick = handleLogout;
  const ppHome = document.getElementById('btn-mi-perfil-coach');
  ppHome.onclick = () => renderMiPerfil(true);
  ppHome.onkeydown = e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); renderMiPerfil(true); } };
  const btnBuzon = document.getElementById('btn-buzon-profesor');
  if(btnBuzon) btnBuzon.onclick = renderBuzonProfesor;
  const btnAlertasEntrenamiento = document.getElementById('btn-alertas-entrenamiento');
  if(btnAlertasEntrenamiento) btnAlertasEntrenamiento.onclick = renderNotificacionesEntrenamiento;
  abrirResumenPendiente();

  if(esSuperAdmin){
    wireToggle('btn-toggle-profesores', 'profesores-holder', () => {
      renderGestionProfesores('profesores-holder', profesores, conUltima, renderCoachHome);
    });
    wireToggle('btn-toggle-buzon', 'buzon-holder', () => renderBuzonOpiniones('buzon-holder'));
    wireToggle('btn-toggle-alumnos', 'alumnos-holder');

    const inputBuscar = document.getElementById('input-buscar-alumno');
    if(inputBuscar){
      inputBuscar.oninput = () => {
        const q = normalizarTexto(inputBuscar.value.trim());
        const filtrados = q ? conUltima.filter(a => normalizarTexto(a.nombre).includes(q)) : conUltima;
        renderListaAlumnos(filtrados, esSuperAdmin, profesores, nombreProfesor, conUltima.length, q, null, unreadByStudent);
      };
    }

    renderListaAlumnos(conUltima, esSuperAdmin, profesores, nombreProfesor, conUltima.length, '', null, unreadByStudent);
  } else {
    // Por defecto el profesor solo ve a sus propios alumnos; con el botón puede
    // pasar a ver a todos (modo observador) — el buscador filtra dentro de esa vista.
    const misAlumnos = conUltima.filter(a => a.profesor_id === profile.id);
    let mostrarTodos = false;

    const btnToggleScope = document.getElementById('btn-toggle-scope');
    const notaScope = document.getElementById('alumnos-scope-note');
    const scopeLabel = document.getElementById('alumnos-scope-label');
    const inputBuscar = document.getElementById('input-buscar-alumno');

    const refrescarLista = () => {
      const base = mostrarTodos ? conUltima : misAlumnos;
      const q = inputBuscar ? normalizarTexto(inputBuscar.value.trim()) : '';
      const filtrados = q ? base.filter(a => normalizarTexto(a.nombre).includes(q)) : base;
      const emptyMsg = (!mostrarTodos && !misAlumnos.length && conUltima.length)
        ? 'Todavía no tienes alumnos asignados.<br>Pídele al super admin que te asigne alumnos, o toca "Ver todos los alumnos" para ver el resto.'
        : null;
      renderListaAlumnos(filtrados, esSuperAdmin, profesores, nombreProfesor, base.length, q, emptyMsg, unreadByStudent);
    };

    if(btnToggleScope){
      btnToggleScope.onclick = () => {
        mostrarTodos = !mostrarTodos;
        btnToggleScope.innerHTML = `${ICONS.users} ${mostrarTodos ? 'Ver solo mis alumnos' : 'Ver todos los alumnos'}`;
        scopeLabel.textContent = mostrarTodos ? 'Todos los alumnos' : 'Tus alumnos';
        if(notaScope) notaScope.classList.toggle('hidden', !mostrarTodos);
        if(inputBuscar) inputBuscar.value = '';
        refrescarLista();
      };
    }
    if(inputBuscar){
      inputBuscar.oninput = refrescarLista;
    }

    refrescarLista();
  }
  if(!esSuperAdmin){ subscribeSocialNotifications(renderCoachHome); mostrarAvisoPush(); }
}

function renderListaAlumnos(lista, esSuperAdmin, profesores, nombreProfesor, totalSinFiltrar, query, emptyMsgHtml, unreadByStudent){
  const listEl = document.getElementById('coach-alumnos-list');
  unreadByStudent = unreadByStudent || {};
  if(!totalSinFiltrar){
    listEl.innerHTML = `<div class="empty">${emptyMsgHtml || 'Aún no hay alumnos registrados.<br>Cuando alguien cree su cuenta, va a aparecer aquí.'}</div>`;
    return;
  }
  if(!lista.length){
    listEl.innerHTML = `<div class="empty">No hay ningún alumno que coincida con "${escapeHtml(query)}".</div>`;
    return;
  }
  listEl.innerHTML = lista.map(a => `
    <div class="coach-list-item">
      <span class="coach-list-avatar" onclick="renderCoachAlumnoDetail('${a.id}')">${renderProfileAvatar(a, 'avatar-list')}</span>
      <div style="flex:1; min-width:0; cursor:pointer;" onclick="renderCoachAlumnoDetail('${a.id}')">
        <div class="coach-name">${escapeHtml(a.nombre)}</div>
        <div class="coach-meta">${a.ultima ? 'Última sesión: ' + formatDateShort(a.ultima) : 'Sin sesiones todavía'} · ${nombreProfesor(a.profesor_id) ? escapeHtml(nombreProfesor(a.profesor_id)) : 'Sin profesor asignado'}</div>
        <div class="coach-meta" style="margin-top:2px;">${renderEstadoVencimiento('Rutina', a.rutinaFecha, 30, 'sin rutina activa')} · ${renderEstadoVencimiento('Medición', a.medicionFecha, 60, 'sin mediciones', notaTipoMedicion(a.medicionTipo))}</div>
      </div>
      ${esSuperAdmin ? `
        <select class="select-inline select-asignar-profesor" data-alumno="${a.id}">
          <option value="">Sin asignar</option>
          ${profesores.map(p => `<option value="${p.id}" ${a.profesor_id === p.id ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('')}
        </select>
      ` : ''}
      ${!esSuperAdmin && a.profesor_id === profile.id ? `<button type="button" class="icon-action teacher-student-chat-action" onclick="event.stopPropagation();renderChat('${a.id}',renderCoachHome)" aria-label="Conversar con ${escapeHtml(a.nombre)}">${ICONS.message}${unreadByStudent[a.id] ? `<span>${unreadByStudent[a.id]}</span>` : ''}</button>` : ''}
      <span class="pill" style="cursor:pointer;" onclick="renderCoachAlumnoDetail('${a.id}')">Ver ${ICONS.chevronRight}</span>
    </div>
  `).join('');

  if(esSuperAdmin){
    listEl.querySelectorAll('.select-asignar-profesor').forEach(sel => {
      sel.onclick = (e) => e.stopPropagation();
      sel.onchange = async () => {
        const alumnoId = sel.dataset.alumno;
        const nuevoProfesorId = sel.value || null;
        const { error } = await sb.from('profiles').update({ profesor_id: nuevoProfesorId }).eq('id', alumnoId);
        if(error){ showToast('No se pudo asignar: ' + error.message); return; }
        showToast('Profesor asignado');
        renderCoachHome();
      };
    });
  }
}

async function renderNotificacionesEntrenamiento(){
  cleanupSocialRealtime();
  root().innerHTML = '<div class="loading">Cargando actividad de tus alumnos...</div>';
  const { data, error } = await sb.from('notificaciones_entrenamiento')
    .select('*').eq('profesor_id', profile.id)
    .order('created_at', { ascending:false }).limit(80);
  if(error){ showToast('No se pudieron cargar las notificaciones'); renderCoachHome(); return; }
  const notificaciones = data || [];
  const nuevas = notificaciones.filter(n => !n.leida_at);
  const cuando = iso => new Date(iso).toLocaleString('es-CL', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  root().innerHTML = `
    <button type="button" class="back-link" id="btn-alertas-volver">${ICONS.arrowLeft} Volver</button>
    <div class="training-alerts-head">
      <span class="training-alerts-icon">${ICONS.bell}</span>
      <div><h1>Actividad de tus alumnos</h1><p>${nuevas.length ? `${nuevas.length} novedad${nuevas.length === 1 ? '' : 'es'} desde tu última revisión` : 'Estás al día'}</p></div>
    </div>
    ${notificaciones.length ? `<div class="training-alerts-list">${notificaciones.map(n => `
      <button type="button" class="training-alert-item ${n.leida_at ? '' : 'is-unread'}" data-alumno="${n.alumno_id}" data-sesion="${n.sesion_id}" data-tipo="${n.tipo}">
        <span class="training-alert-state ${n.tipo}">${n.tipo === 'fin' ? ICONS.check : ICONS.activity}</span>
        <span class="training-alert-copy"><b>${escapeHtml(n.alumno_nombre || 'Tu alumno')}</b><small>${n.tipo === 'fin' ? 'Finalizó su entrenamiento · ver resumen' : 'Inició un entrenamiento'}</small></span>
        <span class="training-alert-time">${escapeHtml(cuando(n.created_at))}${n.leida_at ? '' : '<i>NUEVO</i>'}</span>
      </button>`).join('')}</div>` : `<div class="card">${emptyKiloHtml('Aquí aparecerán los avisos cuando tus alumnos inicien o terminen un entrenamiento.', 'espera', 'padding:16px;')}</div>`}
  `;
  document.getElementById('btn-alertas-volver').onclick = renderCoachHome;
  document.querySelectorAll('.training-alert-item').forEach(btn => btn.onclick = () => btn.dataset.tipo === 'fin' && btn.dataset.sesion ? renderResumenProfe(btn.dataset.sesion) : renderCoachAlumnoDetail(btn.dataset.alumno));
  limpiarBadgeApp();
  if(nuevas.length){
    sb.from('notificaciones_entrenamiento').update({ leida_at:new Date().toISOString() })
      .eq('profesor_id', profile.id).is('leida_at', null).then(() => {}, () => {});
  }
  subscribeSocialNotifications(renderNotificacionesEntrenamiento);
}

// ---------- GESTIÓN DE PROFESORES (solo super admin) ----------
function renderGestionProfesores(holderId, profesores, alumnos, onCambio){
  const holder = document.getElementById(holderId);
  const conteos = {};
  (alumnos||[]).forEach(a => { if(a.profesor_id) conteos[a.profesor_id] = (conteos[a.profesor_id] || 0) + 1; });
  const linkBase = `${window.location.origin}${window.location.pathname}`;
  const alumnosSinProfesor = (alumnos||[]).filter(a => a.role !== 'profesor');

  holder.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="row-flex" style="margin-bottom:8px;">
        <label style="margin:0;">Profesores</label>
        <button class="btn-sm" id="btn-pdf-protocolos">${ICONS.download} PDF: alumnos por profesor</button>
      </div>
      ${profesores.length ? profesores.map(p => `
        <div class="coach-list-item" style="cursor:default; align-items:flex-start; margin-bottom:4px;">
          <div style="flex:1; min-width:0;">
            <div class="coach-name">${escapeHtml(p.nombre)}</div>
            <div class="coach-meta">${conteos[p.id] || 0} alumno${(conteos[p.id]||0) === 1 ? '' : 's'} asignado${(conteos[p.id]||0) === 1 ? '' : 's'}</div>
          </div>
          <button class="btn-sm btn-copiar-link" data-id="${p.id}">${ICONS.link} Copiar link</button>
        </div>
        <button class="btn-toggle-rutina" id="btn-toggle-alumnos-profe-${p.id}" style="margin-bottom:14px;">
          <span class="toggle-label">${ICONS.users} Alumnos de ${escapeHtml(p.nombre)}</span>
          ${toggleStateHtml()}
        </button>
        <div class="hidden" id="alumnos-profe-holder-${p.id}" style="margin-bottom:14px;"></div>
      `).join('') : `<div class="empty">Aún no hay profesores.</div>`}
    </div>
    <div class="card">
      <label>Convertir un alumno en profesor</label>
      <select id="select-nuevo-profesor">
        <option value="">Elige un alumno...</option>
        ${alumnosSinProfesor.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`).join('')}
      </select>
      <button class="btn-sm" id="btn-hacer-profesor">${ICONS.users} Hacer profesor</button>
    </div>
  `;

  holder.querySelectorAll('.btn-copiar-link').forEach(btn => {
    btn.onclick = async () => {
      const link = `${linkBase}?ref=${btn.dataset.id}`;
      try {
        await navigator.clipboard.writeText(link);
        showToast('Link copiado');
      } catch(e){
        showToast('No se pudo copiar. Link: ' + link);
      }
    };
  });

  document.getElementById('btn-pdf-protocolos').onclick = async (ev) => {
    const btn = ev.currentTarget;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Generando...';
    try{
      await descargarPDFEstadoProtocolos(profesores, alumnos);
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  };

  profesores.forEach(p => {
    const suyos = (alumnos||[]).filter(a => a.profesor_id === p.id);
    wireToggle(`btn-toggle-alumnos-profe-${p.id}`, `alumnos-profe-holder-${p.id}`, () => {
      renderListaAlumnosProfesor(`alumnos-profe-holder-${p.id}`, p, suyos);
    });
  });

  document.getElementById('btn-hacer-profesor').onclick = async () => {
    const sel = document.getElementById('select-nuevo-profesor');
    const alumnoId = sel.value;
    if(!alumnoId){ showToast('Elige un alumno primero'); return; }
    const { error } = await sb.from('profiles').update({ role: 'profesor', profesor_id: null }).eq('id', alumnoId);
    if(error){ showToast('No se pudo convertir: ' + error.message); return; }
    showToast('Ahora es profesor');
    if(onCambio) onCambio();
  };
}

// Lista de alumnos actuales de un profesor (clickeable a su ficha).
function renderListaAlumnosProfesor(holderId, profesor, alumnosDelProfesor){
  const holder = document.getElementById(holderId);
  if(!alumnosDelProfesor.length){
    holder.innerHTML = `<div class="empty">Este profesor todavía no tiene alumnos asignados.</div>`;
    return;
  }
  holder.innerHTML = `
    <div class="card">
      <label style="margin-bottom:10px; display:block;">${alumnosDelProfesor.length} alumno${alumnosDelProfesor.length === 1 ? '' : 's'}</label>
      ${alumnosDelProfesor.map(a => `
        <div class="set-line" style="cursor:pointer; flex-direction:column; align-items:flex-start; gap:4px; padding:8px 0;" onclick="renderCoachAlumnoDetail('${a.id}')">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <span style="display:flex; align-items:center; gap:10px;">${renderProfileAvatar(a, 'avatar-chat')}${escapeHtml(a.nombre)}</span>
            ${a.ultima ? `<span>${formatDateShort(a.ultima)}</span>` : ''}
          </div>
          <div style="font-size:10.5px;">${renderEstadoVencimiento('Rutina', a.rutinaFecha, 30, 'sin rutina activa')} · ${renderEstadoVencimiento('Medición', a.medicionFecha, 60, 'sin mediciones', notaTipoMedicion(a.medicionTipo))}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- Panel de protocolos en PDF (inspirado en la planilla "PROTOCOLOS [MES]"
// que ya usa STC: profesores en columnas, cada protocolo con su fila de "cuántos
// al día" y su fila de "% al día", más una columna de totales a la derecha —
// pero con los colores institucionales STC en vez de la planilla original. ----------
// Umbral: 90% o más = verde (al día). 85-89% = amarillo (atención). Menos de 85% =
// rojo (bajo el mínimo que activa revisión, igual que en la planilla de Google Sheets).
function pctColorProtocolo(pct){
  if(pct === null || pct === undefined) return '#9CA39A';
  if(pct >= 90) return '#4CAF6D';
  if(pct >= 85) return '#FFC72C';
  return '#E5484D';
}

function hexToRgb(hex){
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Tarjeta con un número grande (vector, no imagen — nítida en cualquier zoom/impresión).
function dibujarTarjetaStat(doc, x, y, w, h, label, pct, ok, total, unidadTxt){
  const rgb = hexToRgb(pctColorProtocolo(pct));
  const cx = x + w / 2;

  doc.setDrawColor(210, 210, 205);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(x, y, w, 1.3, 'F');

  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(18);
  const pctTxt = (pct === null || pct === undefined) ? 's/d' : `${Math.round(pct)}%`;
  doc.text(pctTxt, cx, y + 12.5, { align: 'center' });

  doc.setTextColor(26, 29, 28);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8.5);
  doc.text(label, cx, y + 19, { align: 'center' });

  doc.setFont(undefined, 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 120, 120);
  const countTxt = (!total) ? 'sin alumnos' : `${ok}/${total} ${unidadTxt || 'alumnos al día'}`;
  doc.text(countTxt, cx, y + 24, { align: 'center' });
  doc.setTextColor(26, 29, 28);
}

// Fila de grilla genérica: primera columna = etiqueta, columnas del medio = un
// valor por profesor, última columna = total general (con su propio color de fondo).
function filaGrid(doc, x, y, colWidths, celdas, opts){
  opts = opts || {};
  const rowH = opts.rowH || 7;

  let cx = x;
  colWidths.forEach((w, i) => {
    const isLast = i === colWidths.length - 1;
    const bg = (isLast && opts.totalColBg) ? opts.totalColBg : opts.bgColor;
    if(bg){
      const rgb = hexToRgb(bg);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(cx, y, w, rowH, 'F');
    }
    cx += w;
  });

  // Bordes de celda tipo planilla Excel — una línea gris fina alrededor de cada celda.
  doc.setDrawColor(176, 176, 168);
  doc.setLineWidth(0.15);
  cx = x;
  colWidths.forEach((w) => {
    doc.rect(cx, y, w, rowH, 'S');
    cx += w;
  });

  cx = x;
  colWidths.forEach((w, i) => {
    const val = celdas[i] || {};
    const fontSize = val.fontSize || 7.2;
    doc.setFont(undefined, val.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const rgb = hexToRgb(val.color || opts.textColor || '#0C100D');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    const align = val.align || (i === 0 ? 'left' : 'center');
    let text = val.text != null ? String(val.text) : '';
    while(doc.getTextWidth(text) > w - 2.5 && text.length > 1){
      text = text.slice(0, -2) + '…';
    }
    const tx = align === 'left' ? cx + 2 : cx + w / 2;
    doc.text(text, tx, y + rowH / 2 + 1, { align });
    cx += w;
  });

  doc.setTextColor(26, 29, 28);
  doc.setFont(undefined, 'normal');
  return y + rowH;
}

// Barra amarilla de sección (ej. "RUTINA — vigente a 30 días"), ancho completo de la grilla.
function barraSeccion(doc, x, y, wTotal, texto){
  doc.setFillColor(255, 199, 44);
  doc.rect(x, y, wTotal, 6.5, 'F');
  doc.setTextColor(26, 29, 28);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text(texto, x + 3, y + 4.5);
  doc.setFont(undefined, 'normal');
  return y + 6.5;
}

// Línea de detalle de un alumno (macrociclo / medición) — devuelve el nuevo y.
function lineaAlumnoPDF(doc, a, x, y){
  doc.setFontSize(10.5);
  doc.setFont(undefined, 'bold');
  doc.text(a.nombre, x, y);
  doc.setFont(undefined, 'normal');
  y += 5.5;

  doc.setFontSize(9);
  const notaMedicion = notaTipoMedicion(a.medicionTipo);
  const rutinaTxt = a.rutinaFecha ? `Macrociclo: ${formatDateShort(a.rutinaFecha)}${a.rutinaOk ? '' : ' (VENCIDA)'}` : 'Macrociclo: sin macrociclo activo';
  const medicionTxt = a.medicionFecha ? `Medición: ${formatDateShort(a.medicionFecha)}${notaMedicion ? ' (' + notaMedicion + ')' : ''}${a.medicionOk ? '' : ' (VENCIDA)'}` : 'Medición: sin mediciones';
  doc.text(`   ${rutinaTxt}   ·   ${medicionTxt}`, x, y);
  return y + 7;
}

// PDF de estado de protocolos — panel general (profesores en columnas, como la
// planilla "PROTOCOLOS [MES]" de STC) + detalle alumno por alumno debajo.
// "Al día" = rutina vigente (≤30 días) + medición vigente (≤60 días).
// Columnas ordenadas de menor a mayor % general,
// para que el profesor que más necesita atención aparezca primero (a la izquierda).
async function descargarPDFEstadoProtocolos(profesores, alumnos){
  if(!alumnos || !alumnos.length){ showToast('No hay alumnos registrados todavía'); return; }

  const alumnosConEstado = alumnos.map(a => ({
    ...a,
    rutinaOk: !!a.rutinaFecha && !estaVencida(a.rutinaFecha, 30),
    medicionOk: !!a.medicionFecha && !estaVencida(a.medicionFecha, 60)
  }));

  const statsPorProfesor = profesores
    .map(p => {
      const suyos = alumnosConEstado.filter(a => a.profesor_id === p.id);
      const n = suyos.length;
      const rutinaOkN = suyos.filter(a => a.rutinaOk).length;
      const medicionOkN = suyos.filter(a => a.medicionOk).length;
      return {
        profesor: p,
        alumnos: suyos,
        n,
        rutinaOkN, medicionOkN,
        pctRutina: n ? rutinaOkN / n * 100 : null,
        pctMedicion: n ? medicionOkN / n * 100 : null,
        pctTotal: n ? (rutinaOkN + medicionOkN) / (n * 2) * 100 : null
      };
    })
    .sort((a, b) => {
      if(a.pctTotal === null && b.pctTotal === null) return a.profesor.nombre.localeCompare(b.profesor.nombre);
      if(a.pctTotal === null) return 1;
      if(b.pctTotal === null) return -1;
      return a.pctTotal - b.pctTotal;
    });

  const sinAsignar = alumnosConEstado.filter(a => !a.profesor_id);

  const universoTotal = statsPorProfesor.reduce((acc, s) => acc + s.n, 0);
  const granRutinaOk = statsPorProfesor.reduce((acc, s) => acc + s.rutinaOkN, 0);
  const granMedicionOk = statsPorProfesor.reduce((acc, s) => acc + s.medicionOkN, 0);
  const pctGranRutina = universoTotal ? granRutinaOk / universoTotal * 100 : null;
  const pctGranMedicion = universoTotal ? granMedicionOk / universoTotal * 100 : null;
  const pctGranTotal = universoTotal ? (granRutinaOk + granMedicionOk) / (universoTotal * 2) * 100 : null;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageW = 297, pageH = 210, marginX = 12, contentW = pageW - marginX * 2;

  function encabezadoBanda(subtitulo){
    doc.setFillColor(26, 29, 28);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setFillColor(255, 199, 44);
    doc.rect(0, 0, 4, 24, 'F');
    doc.setTextColor(255, 199, 44);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('STC App', marginX, 13);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(subtitulo, marginX, 19.5);
    doc.setTextColor(26, 29, 28);
  }

  function tituloSeccion(texto, y){
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(texto, marginX, y);
    doc.setFont(undefined, 'normal');
    y += 3;
    doc.setFillColor(255, 199, 44);
    doc.rect(marginX, y, 18, 1, 'F');
    return y + 7;
  }

  encabezadoBanda('Estado de protocolos — panel general');
  doc.setFontSize(8.3);
  doc.setTextColor(110, 110, 110);
  doc.text(`Generado el ${formatDateShort(todayStr())}  ·  Macrociclo vence a 30 días  ·  Medición vence a 2 meses  ·  Verde 90% o más  ·  Amarillo 85-89%  ·  Rojo bajo 85%`, marginX, 30);
  doc.setTextColor(26, 29, 28);

  let y = 38;

  // ---- estado general: universo + 3 tarjetas ----
  y = tituloSeccion('Estado general de protocolos', y);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  let universoTxt = `Universo: ${universoTotal} alumno${universoTotal === 1 ? '' : 's'} con profesor asignado`;
  if(sinAsignar.length) universoTxt += `  ·  ${sinAsignar.length} sin profesor asignado (no incluido en este cálculo)`;
  doc.text(universoTxt, marginX, y);
  doc.setTextColor(26, 29, 28);
  y += 6;

  const cardGap = 4;
  const cardW = (contentW - cardGap * 2) / 3;
  const cardH = 26;
  dibujarTarjetaStat(doc, marginX, y, cardW, cardH, 'Macrociclo vigente', pctGranRutina, granRutinaOk, universoTotal);
  dibujarTarjetaStat(doc, marginX + (cardW + cardGap), y, cardW, cardH, 'Medición vigente', pctGranMedicion, granMedicionOk, universoTotal);
  dibujarTarjetaStat(doc, marginX + (cardW + cardGap) * 2, y, cardW, cardH, 'TOTAL GENERAL', pctGranTotal, granRutinaOk + granMedicionOk, universoTotal * 2, 'protocolos al día (de 2 c/u)');
  y += cardH + 10;

  // ---- panel por profesor: profesores en columnas, cada protocolo con su bloque ----
  if(statsPorProfesor.length){
    y = tituloSeccion('Detalle por profesor', y);

    const labelW = 40, totalW = 24;
    const nCoaches = statsPorProfesor.length;
    const coachW = (contentW - labelW - totalW) / nCoaches;
    const colWidths = [labelW, ...statsPorProfesor.map(() => coachW), totalW];
    const wTotalGrid = colWidths.reduce((a, w) => a + w, 0);
    const primerNombre = (nombre) => (nombre || '').trim().split(/\s+/)[0].toUpperCase();

    y = filaGrid(doc, marginX, y, colWidths, [
      { text: 'PROFESOR', align: 'left', bold: true },
      ...statsPorProfesor.map(s => ({ text: primerNombre(s.profesor.nombre), bold: true })),
      { text: 'TOTAL', bold: true }
    ], { rowH: 8, bgColor: '#0C100D', textColor: '#FFC72C' });

    y = filaGrid(doc, marginX, y, colWidths, [
      { text: 'Alumnos', align: 'left', bold: true },
      ...statsPorProfesor.map(s => ({ text: String(s.n) })),
      { text: String(universoTotal), bold: true }
    ], { rowH: 7, bgColor: '#F5F4F0', totalColBg: '#FFE9A8' });

    y = filaGrid(doc, marginX, y, colWidths, [
      { text: '% General', align: 'left', bold: true },
      ...statsPorProfesor.map(s => ({ text: s.pctTotal === null ? 's/d' : `${Math.round(s.pctTotal)}%`, color: pctColorProtocolo(s.pctTotal), bold: true })),
      { text: pctGranTotal === null ? 's/d' : `${Math.round(pctGranTotal)}%`, color: pctColorProtocolo(pctGranTotal), bold: true }
    ], { rowH: 7.5, bgColor: '#FBF3D9', totalColBg: '#FFE9A8' });
    doc.setDrawColor(220, 220, 214);
    doc.line(marginX, y, marginX + wTotalGrid, y);
    y += 3;

    const bloques = [
      { titulo: 'MACROCICLO — vigente a 30 días', okKey: 'rutinaOkN', pctKey: 'pctRutina', granOk: granRutinaOk, pctGran: pctGranRutina },
      { titulo: 'MEDICIÓN — vigente a 2 meses', okKey: 'medicionOkN', pctKey: 'pctMedicion', granOk: granMedicionOk, pctGran: pctGranMedicion }
    ];

    bloques.forEach(b => {
      if(y + 25 > pageH - 12){ doc.addPage(); y = 16; }
      y = barraSeccion(doc, marginX, y, wTotalGrid, b.titulo);

      y = filaGrid(doc, marginX, y, colWidths, [
        { text: 'Alumnos al día', align: 'left' },
        ...statsPorProfesor.map(s => ({ text: s.n ? `${s[b.okKey]}/${s.n}` : 's/d' })),
        { text: `${b.granOk}/${universoTotal}`, bold: true }
      ], { rowH: 7, bgColor: '#FFFFFF', totalColBg: '#FFF3CE' });

      y = filaGrid(doc, marginX, y, colWidths, [
        { text: '% al día', align: 'left', bold: true },
        ...statsPorProfesor.map(s => ({ text: s[b.pctKey] === null ? 's/d' : `${Math.round(s[b.pctKey])}%`, color: pctColorProtocolo(s[b.pctKey]), bold: true })),
        { text: b.pctGran === null ? 's/d' : `${Math.round(b.pctGran)}%`, color: pctColorProtocolo(b.pctGran), bold: true }
      ], { rowH: 7.5, bgColor: '#FBF3D9', totalColBg: '#FFE9A8' });

      doc.setDrawColor(220, 220, 214);
      doc.line(marginX, y, marginX + wTotalGrid, y);
      y += 3;
    });

    y += 2;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 105, 15);
    doc.text('Nota: todo % general bajo 85% queda marcado en rojo y activa revisión del protocolo con el profesor a cargo.', marginX, y);
    doc.setTextColor(26, 29, 28);
    y += 10;
  }

  // ---- detalle alumno por alumno, por profesor ----
  const conAlumnos = statsPorProfesor.filter(s => s.n > 0);
  for(const s of conAlumnos){
    if(y > pageH - 55){ doc.addPage(); y = 16; }
    y = tituloSeccion(`${s.profesor.nombre} (${s.n} alumno${s.n === 1 ? '' : 's'})`, y);

    [...s.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(a => {
      if(y > pageH - 20){ doc.addPage(); y = 16; }
      y = lineaAlumnoPDF(doc, a, marginX, y);
    });
    y += 5;
  }

  if(sinAsignar.length){
    if(y > pageH - 40){ doc.addPage(); y = 16; }
    y = tituloSeccion(`Sin profesor asignado (${sinAsignar.length})`, y);

    [...sinAsignar].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(a => {
      if(y > pageH - 20){ doc.addPage(); y = 16; }
      y = lineaAlumnoPDF(doc, a, marginX, y);
    });
  }

  doc.save(`Estado_protocolos_${todayStr()}.pdf`);
}

async function renderCoachAlumnoDetail(alumnoId){
  root().innerHTML = `<div class="loading">Cargando...</div>`;
  const [{ data: alumno }, { data: sesiones }, { data: rutina }, { data: historial }, { data: medicionesUltima }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', alumnoId).single(),
    sb.from('sesiones').select('*, sesion_series(*)').eq('alumno_id', alumnoId).order('fecha', { ascending:false }),
    sb.from('rutinas').select('*, rutina_ejercicios(*)').eq('alumno_id', alumnoId).eq('activa', true).maybeSingle(),
    sb.from('rutinas').select('id').eq('alumno_id', alumnoId).eq('activa', false),
    sb.from('mediciones').select('fecha, tipo').eq('alumno_id', alumnoId).order('fecha', { ascending:false }).limit(1)
  ]);

  const todasSesiones = markPRs(sesiones || []);
  const conSeries = todasSesiones.filter(s => (s.sesion_series||[]).length > 0);
  const fechas = conSeries.map(s => s.fecha);
  const diasRutina = (rutina && rutina.rutina_ejercicios) ? groupPorDia(rutina.rutina_ejercicios) : [];
  const medicionFecha = medicionesUltima && medicionesUltima[0] ? medicionesUltima[0].fecha : null;
  const medicionTipo = medicionesUltima && medicionesUltima[0] ? medicionesUltima[0].tipo : null;
  const rutinaVencida = rutina ? estaVencida(rutina.fecha, 30) : false;
  // Modo observador: un profesor que no es el asignado a este alumno puede entrar a mirar
  // (por ejemplo si el profe titular faltó), pero no puede crear, editar ni eliminar nada.
  const soloObservador = profile.role === 'profesor' && alumno.profesor_id !== profile.id;
  const esSuperAdmin = profile.role === 'super_admin';

  root().innerHTML = `
    <div class="header-actions">
      <div style="flex:1; min-width:0;">
        <div id="alumno-nombre-holder">
          <h1 style="font-size:20px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span id="alumno-nombre-texto">${escapeHtml(alumno.nombre)}</span>
            ${esSuperAdmin ? `<button class="btn-sm" id="btn-editar-nombre-alumno" style="font-size:11px; padding:3px 8px;">${ICONS.edit} Editar nombre</button>` : ''}
          </h1>
        </div>
        <div class="sub" style="margin-bottom:0;">Registro de entrenamiento</div>
      </div>
      <button class="switch-user" id="btn-volver">${ICONS.arrowLeft} Volver</button>
    </div>

    ${soloObservador ? `
      <div class="card" style="font-size:12.5px; border-color:var(--orange); color:var(--chalk);">
        ${ICONS.activity} Estás viendo este alumno en modo observador (no está asignado a ti) — puedes ver todo, pero no editar ni eliminar nada.
      </div>
    ` : ''}

    <div class="card" style="font-size:12.5px;">
      <div>${renderEstadoVencimiento('Última rutina', rutina ? rutina.fecha : null, 30, 'sin rutina activa')}</div>
      <div style="margin-top:4px;">${renderEstadoVencimiento('Última medición', medicionFecha, 60, 'sin mediciones registradas', notaTipoMedicion(medicionTipo))}</div>
    </div>

    ${rutina ? `
      <button class="btn-toggle-rutina section-routine" id="btn-toggle-rutina">
        <span class="toggle-label" style="${rutinaVencida ? 'color:var(--red);' : ''}">${ICONS.clipboard} Rutina: ${escapeHtml(rutina.nombre)}${rutinaVencida ? ' (vencida)' : ''}</span>
        ${toggleStateHtml()}
      </button>
    ` : `
      <div class="card">
        <div class="row-flex" style="margin-bottom:0;">
          <h2 style="margin:0;">Sin rutina activa</h2>
          ${soloObservador ? '' : '<div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;"><button class="btn-sm" id="btn-desde-plantilla">📋 Desde plantilla</button><button class="btn-sm" id="btn-nueva-rutina">+ Crear rutina</button></div>'}
        </div>
      </div>
    `}
    ${historial && historial.length ? `<button class="link-btn" id="btn-ver-historial-rutinas" style="margin-bottom:16px;">Ver rutinas anteriores (${historial.length}) →</button>` : ''}
    ${rutina ? `
      <div class="card routine-plan hidden" id="rutina-detail-card">
        <div class="row-flex" style="margin-bottom:6px;">
          <div>
            <h2 style="margin:0 0 7px; ${rutinaVencida ? 'color:var(--red);' : ''}">${escapeHtml(rutina.nombre)}${rutinaVencida ? ' (vencida)' : ''}</h2>
            ${routineOriginBadge(rutina, false)}
          </div>
          ${soloObservador ? '' : `
            <div style="display:flex; gap:6px;">
              <button class="btn-sm" id="btn-editar-rutina">Editar</button>
              <button class="btn-sm" id="btn-nueva-rutina">Crear nueva rutina</button>
            </div>
          `}
        </div>
        ${soloObservador ? '' : `<div class="pl-rutina-acciones"><button class="btn-sm" id="btn-desde-plantilla">📋 Cambiar por una plantilla</button><button class="btn-sm" id="btn-rutina-a-plantilla">⧉ Guardar como plantilla</button></div>`}
        ${rutina.objetivo ? `<div class="sub" style="margin-bottom:8px;">${escapeHtml(rutina.objetivo)}</div>` : ''}
        ${renderRoutineDays(diasRutina)}
        ${soloObservador ? '' : '<button class="btn-sm btn-eliminar-sesion" id="btn-eliminar-rutina" style="margin-top:12px;">Eliminar rutina</button>'}
      </div>
    ` : ''}

    <button class="btn-toggle-rutina section-measurements" id="btn-toggle-mediciones">
      <span class="toggle-label">${ICONS.activity} Mediciones corporales</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="mediciones-holder"></div>

    <button class="btn-toggle-rutina section-intake" id="btn-toggle-ficha">
      <span class="toggle-label">${ICONS.clipboard} Ficha de ingreso</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden ficha-wrap" id="ficha-wrap">
      <div id="ficha-holder"></div>
    </div>

    <button class="btn-toggle-rutina section-goals" id="btn-toggle-entrevista-objetivos">
      <span class="toggle-label">${ICONS.trending} Entrevista de objetivos</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden ficha-wrap" id="entrevista-objetivos-wrap">
      <div id="entrevista-objetivos-holder"></div>
    </div>

    <button class="btn-toggle-rutina section-calendar" id="btn-toggle-calendario">
      <span class="toggle-label">${ICONS.calendar} Calendario</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="calendar-holder"></div>

    <button class="btn-toggle-rutina section-history" id="btn-toggle-historial">
      <span class="toggle-label">${ICONS.book} Historial de sesiones</span>
      ${toggleStateHtml()}
    </button>
    <div class="hidden" id="sesiones-list"></div>

    ${profile.role === 'super_admin' && alumno.role === 'alumno' ? `
      <button class="btn-sm btn-clave-temporal" id="btn-clave-temporal" style="margin-top:16px; width:100%; justify-content:center;">🔑 Generar clave temporal</button>
    ` : ''}
    ${profile.role === 'super_admin' ? `
      <button class="btn-sm btn-eliminar-sesion" id="btn-eliminar-alumno" style="margin-top:10px; width:100%; justify-content:center;">Eliminar alumno</button>
    ` : ''}
  `;
  document.getElementById('btn-volver').onclick = renderCoachHome;
  if(esSuperAdmin){
    const btnEditarNombre = document.getElementById('btn-editar-nombre-alumno');
    if(btnEditarNombre){
      btnEditarNombre.onclick = () => {
        document.getElementById('alumno-nombre-holder').innerHTML = `
          <div class="row-flex" style="gap:8px; align-items:center; flex-wrap:wrap;">
            <input type="text" id="input-editar-nombre-alumno" value="${escapeHtml(alumno.nombre)}" style="margin-bottom:0; flex:1; min-width:160px;">
            <button class="btn-sm" id="btn-guardar-nombre-alumno">Guardar</button>
            <button class="btn-sm" id="btn-cancelar-nombre-alumno">Cancelar</button>
          </div>
        `;
        const input = document.getElementById('input-editar-nombre-alumno');
        input.focus();
        input.select();
        document.getElementById('btn-cancelar-nombre-alumno').onclick = () => renderCoachAlumnoDetail(alumnoId);
        const guardarNombreAlumno = async () => {
          const nuevoNombre = input.value.trim();
          if(!nuevoNombre){ showToast('El nombre no puede quedar vacío'); return; }
          if(nuevoNombre === alumno.nombre){ renderCoachAlumnoDetail(alumnoId); return; }
          const btnGuardar = document.getElementById('btn-guardar-nombre-alumno');
          btnGuardar.disabled = true; btnGuardar.textContent = 'Guardando...';
          const { error } = await sb.from('profiles').update({ nombre: nuevoNombre }).eq('id', alumnoId);
          if(error){ showToast('No se pudo actualizar el nombre: ' + error.message); btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar'; return; }
          showToast('Nombre actualizado');
          renderCoachAlumnoDetail(alumnoId);
        };
        document.getElementById('btn-guardar-nombre-alumno').onclick = guardarNombreAlumno;
        input.onkeydown = (e) => { if(e.key === 'Enter') guardarNombreAlumno(); };
      };
    }
  }
  const btnNuevaRutina = document.getElementById('btn-nueva-rutina');
  if(btnNuevaRutina) btnNuevaRutina.onclick = () => renderRutinaEditor(alumno);
  const btnDesdePlantilla = document.getElementById('btn-desde-plantilla');
  if(btnDesdePlantilla) btnDesdePlantilla.onclick = () => elegirPlantillaParaAlumno(alumno);
  const btnAPlantilla = document.getElementById('btn-rutina-a-plantilla');
  if(btnAPlantilla && rutina) btnAPlantilla.onclick = () => guardarRutinaComoPlantilla(rutina, btnAPlantilla);
  if(rutina){
    wireToggle('btn-toggle-rutina', 'rutina-detail-card');
  }
  {
    let medicionesInicializado = false;
    wireToggle('btn-toggle-mediciones', 'mediciones-holder', () => {
      if(!medicionesInicializado){ renderMediciones('mediciones-holder', alumnoId, soloObservador); medicionesInicializado = true; }
    });
  }
  {
    let fichaInicializada = false;
    wireToggle('btn-toggle-ficha', 'ficha-wrap', () => {
      if(!fichaInicializada){ renderFichaProfe('ficha-holder', alumnoId, soloObservador); fichaInicializada = true; }
    });
  }
  {
    let entrevistaObjetivosInicializada = false;
    wireToggle('btn-toggle-entrevista-objetivos', 'entrevista-objetivos-wrap', () => {
      if(!entrevistaObjetivosInicializada){
        renderEntrevistaObjetivosProfe('entrevista-objetivos-holder', alumnoId, soloObservador);
        entrevistaObjetivosInicializada = true;
      }
    });
  }
  wireToggle('btn-toggle-calendario', 'calendar-holder');
  wireToggle('btn-toggle-historial', 'sesiones-list');
  renderCalendar('calendar-holder', fechas);
  if(rutina && !soloObservador){
    document.getElementById('btn-editar-rutina').onclick = () => {
      const dias = diasRutina.map(d => ({
        nombre: d.nombre,
        ejercicios: d.ejercicios.map(ex => ({
          nombre: ex.nombre || '',
          series_objetivo: ex.series_objetivo != null ? String(ex.series_objetivo) : '',
          reps_objetivo: ex.reps_objetivo || '',
          unidad_objetivo: ex.unidad_objetivo || 'reps',
          peso_objetivo: ex.peso_objetivo || '',
          nota: ex.nota || '',
          descanso_seg: ex.descanso_seg != null ? String(ex.descanso_seg) : '',
          tipo_serie_objetivo: ex.tipo_serie_objetivo || '',
          lado_objetivo: ex.lado_objetivo || '', circuito: ex.circuito || null
        }))
      }));
      renderRutinaEditor(alumno, { nombre: rutina.nombre, objetivo: rutina.objetivo || '', dias }, rutina.id);
    };
  }
  if(historial && historial.length){
    document.getElementById('btn-ver-historial-rutinas').onclick = () => renderHistorialRutinas(alumno, () => renderCoachAlumnoDetail(alumnoId), !soloObservador);
  }
  if(rutina && !soloObservador){
    const btnDelRutina = document.getElementById('btn-eliminar-rutina');
    btnDelRutina.onclick = () => {
      if(btnDelRutina.dataset.confirm === '1'){
        eliminarRutina(rutina.id, () => renderCoachAlumnoDetail(alumnoId));
      } else {
        btnDelRutina.dataset.confirm = '1';
        btnDelRutina.textContent = '¿Seguro? Toca de nuevo para eliminar';
        btnDelRutina.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btnDelRutina.isConnected) return;
          btnDelRutina.dataset.confirm = '';
          btnDelRutina.textContent = 'Eliminar rutina';
          btnDelRutina.classList.remove('btn-danger-confirm');
        }, 3000);
      }
    };
  }
  renderSesionesList('sesiones-list', conSeries, true, () => renderCoachAlumnoDetail(alumnoId), soloObservador);

  const btnClaveTemp = document.getElementById('btn-clave-temporal');
  if(btnClaveTemp){
    btnClaveTemp.onclick = () => {
      if(btnClaveTemp.dataset.confirm === '1'){
        generarClaveTemporalAlumno(alumno, btnClaveTemp);
      } else {
        btnClaveTemp.dataset.confirm = '1';
        btnClaveTemp.textContent = `¿Seguro? La clave actual de ${(alumno.nombre || '').split(' ')[0]} dejará de funcionar. Toca de nuevo`;
        btnClaveTemp.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btnClaveTemp.isConnected || btnClaveTemp.disabled) return;
          btnClaveTemp.dataset.confirm = '';
          btnClaveTemp.textContent = '🔑 Generar clave temporal';
          btnClaveTemp.classList.remove('btn-danger-confirm');
        }, 4000);
      }
    };
  }

  if(profile.role === 'super_admin'){
    const btnElimAlumno = document.getElementById('btn-eliminar-alumno');
    btnElimAlumno.onclick = () => {
      if(btnElimAlumno.dataset.confirm === '1'){
        eliminarAlumno(alumnoId, alumno.nombre, btnElimAlumno);
      } else {
        btnElimAlumno.dataset.confirm = '1';
        btnElimAlumno.textContent = '¿Seguro? Toca de nuevo para eliminar';
        btnElimAlumno.classList.add('btn-danger-confirm');
        setTimeout(() => {
          if(!btnElimAlumno.isConnected) return;
          btnElimAlumno.dataset.confirm = '';
          btnElimAlumno.textContent = 'Eliminar alumno';
          btnElimAlumno.classList.remove('btn-danger-confirm');
        }, 3000);
      }
    };
  }
}

async function eliminarAlumno(alumnoId, nombre, btn){
  btn.disabled = true; btn.textContent = 'Eliminando...';
  const { error } = await sb.rpc('eliminar_alumno', { target_id: alumnoId });
  if(error){
    showToast('No se pudo eliminar: ' + error.message);
    btn.disabled = false; btn.textContent = 'Eliminar alumno';
    btn.classList.remove('btn-danger-confirm');
    return;
  }
  showToast(`Cuenta de ${nombre} eliminada`);
  renderCoachHome();
}

async function guardarNotaCoach(sesionId){
  const val = document.getElementById(`nota-coach-${sesionId}`).value.trim();
  const { error } = await sb.from('sesiones').update({ nota_coach: val || null }).eq('id', sesionId);
  if(error){ showToast('No se pudo guardar la nota'); return; }
  showToast('Nota guardada ✓');
}

async function guardarNotaAlumno(sesionId){
  const val = document.getElementById(`nota-alumno-${sesionId}`).value.trim();
  const { error } = await sb.from('sesiones').update({ nota_alumno: val || null }).eq('id', sesionId);
  if(error){ showToast('No se pudo guardar la nota'); return; }
  showToast('Nota guardada ✓');
}

function renderRutinaEditor(alumno, prefill, editingRutinaId, returnFn, plantilla){
  if(!alumno || alumno.id !== PLANTILLA_FALSO_ALUMNO.id) rutinaEditorModo = null;
  const esPlantilla = rutinaEditorModo === 'plantilla';
  rutinaEditorId = editingRutinaId || null;
  const esAlumnoEditando = profile.role === 'alumno' && alumno.id === profile.id;
  rutinaEditorReturn = returnFn || (esAlumnoEditando ? renderAlumnoHome : () => renderCoachAlumnoDetail(alumno.id));
  // Rutina nueva desde cero: primero se elige la plantilla (fuerza o funcional)
  if(!prefill && !editingRutinaId && !plantilla){
    const volverA = rutinaEditorReturn;
    root().innerHTML = `
      <div class="header-actions">
        <div>
          <h1 style="font-size:20px;">${esPlantilla ? 'Nueva plantilla' : esAlumnoEditando ? 'Crear mi rutina' : `Nueva rutina — ${escapeHtml(alumno.nombre)}`}</h1>
          <div class="sub" style="margin-bottom:0;">¿Qué tipo de ${esPlantilla ? 'plantilla' : 'rutina'} vas a armar?</div>
        </div>
        <button class="switch-user" id="btn-cancelar-rutina">Cancelar</button>
      </div>
      <div class="fx-plantillas">${fxPlantillaHtml()}</div>`;
    document.getElementById('btn-cancelar-rutina').onclick = volverA;
    root().querySelectorAll('[data-plantilla]').forEach(b => b.onclick = () => renderRutinaEditor(alumno, null, null, volverA, b.dataset.plantilla));
    return;
  }
  rutinaEditorDias = (prefill && prefill.dias && prefill.dias.length)
    ? prefill.dias.map(d => ({ nombre: d.nombre, ejercicios: d.ejercicios.map(ex => ({...ex})), circuito: fxDeDia(d) }))
    : [{ nombre: 'Día 1', ejercicios: [], circuito: plantilla && FX_FORMATOS[plantilla] ? fxDefaults(plantilla) : null }];
  rutinaEditorDias.forEach(di => { di.ejercicios = di.ejercicios.filter(r => (r.nombre || '').trim()); });
  rutinaDiaActivo = 0;
  rutinaExAbierto = null;

  const titulo = esPlantilla ? (rutinaEditorId ? 'Editar plantilla' : 'Nueva plantilla') : esAlumnoEditando
    ? (rutinaEditorId ? 'Editar mi rutina' : (prefill ? 'Crear desde una rutina' : 'Crear mi rutina'))
    : (rutinaEditorId ? 'Editar rutina' : (prefill ? 'Duplicar rutina' : 'Nueva rutina'));
  const subtitulo = esPlantilla ? 'Las plantillas no se asignan a ningún alumno hasta que tú lo elijas. Puedes armar hasta 5 días.' : esAlumnoEditando
    ? (rutinaEditorId
      ? 'Esta rutina fue creada por ti. Cambia los días, ejercicios y objetivos que necesites.'
      : 'Arma hasta 5 días y elige ejercicios del banco visual. Al guardarla quedará como tu rutina activa.')
    : (rutinaEditorId
      ? 'Estás editando la rutina activa del alumno: los cambios se guardan sobre esta misma rutina.'
      : 'Esta va a quedar como la rutina activa del alumno. Puedes armar hasta 5 días distintos (ej: Empuje, Tracción, Piernas).');

  root().innerHTML = `
    <div class="header-actions">
      <div>
        <h1 style="font-size:20px;">${titulo}${esAlumnoEditando || esPlantilla ? '' : ` — ${escapeHtml(alumno.nombre)}`}</h1>
        <div class="sub" style="margin-bottom:0;">${subtitulo}</div>
      </div>
      <button class="switch-user" id="btn-cancelar-rutina">Cancelar</button>
    </div>

    ${esAlumnoEditando ? `<div class="student-editor-banner">${ICONS.edit}<span><b>Diseñada por ti</b><br>Tu profesor podrá verla y ayudarte a mejorarla, pero seguirá identificada como una rutina personal.</span></div>` : ''}

    <div class="card">
      <label>Nombre del programa</label>
      <input type="text" id="rutina-nombre" placeholder="${esPlantilla ? 'Ej: Hipertrofia 4 días' : 'Ej: Hipertrofia — Fase 1'}" value="${escapeHtml(prefill ? prefill.nombre : '')}">
      <label>Objetivo (opcional)</label>
      <input type="text" id="rutina-objetivo" placeholder="Ej: Hipertrofia tren superior" value="${escapeHtml(prefill ? prefill.objetivo : '')}">
    </div>

    <div id="rutina-dias-holder"></div>
    <button class="btn" id="btn-guardar-rutina" style="margin-top:16px;">${rutinaEditorId ? 'Guardar cambios' : (esPlantilla ? 'Guardar plantilla' : 'Guardar rutina')}</button>
  `;
  document.getElementById('btn-cancelar-rutina').onclick = rutinaEditorReturn;
  document.getElementById('btn-guardar-rutina').onclick = () => esPlantilla ? guardarPlantilla() : guardarRutina(alumno);
  renderRutinaDiasEditor();
}

let rutinaDiaActivo = 0;
let rutinaExAbierto = null;
function renderRutinaDiasEditor(){
  const holder = document.getElementById('rutina-dias-holder');
  if(!holder) return;
  if(rutinaDiaActivo >= rutinaEditorDias.length) rutinaDiaActivo = Math.max(0, rutinaEditorDias.length - 1);
  const d = rutinaDiaActivo;
  const dia = rutinaEditorDias[d];
  const tabs = `<div class="red-tabs">${rutinaEditorDias.map((di, i) => `<button type="button" class="red-tab ${i === d ? 'on' : ''}" onclick="rutinaIrADia(${i})">${fxDeDia(di) ? '⚡ ' : ''}${escapeHtml(di.nombre || `Día ${i + 1}`)}<span>${di.ejercicios.filter(r => (r.nombre || '').trim()).length}</span></button>`).join('')}${rutinaEditorDias.length < 5 ? `<button type="button" class="red-tab add" onclick="agregarDiaRutina()">＋ Día</button>` : ''}</div>`;
  const cabecera = `
    <div class="red-dia-head">
      <input type="text" class="red-dia-nombre" value="${escapeHtml(dia.nombre)}" oninput="rutinaEditorDias[${d}].nombre=this.value" onchange="renderRutinaDiasEditor()" placeholder="Ej: Día 1 — Empuje">
      ${rutinaEditorDias.length > 1 ? `<button type="button" class="red-quitar-dia" onclick="quitarDiaRutina(${d})">Quitar día</button>` : ''}
    </div>`;
  if(fxDeDia(dia)){
    holder.innerHTML = `
    ${tabs}
    <div class="red-dia fx-dia">
      ${cabecera}
      ${fxTipoDiaHtml(d)}
      ${fxEditorDiaHtml(d)}
    </div>`;
    return;
  }
  const filas = dia.ejercicios.map((row, e) => redTarjetaHtml(row, d, e, dia.ejercicios.length)).join('');
  holder.innerHTML = `
    ${tabs}
    <div class="red-dia">
      ${cabecera}
      ${fxTipoDiaHtml(d)}
      ${filas || `<div class="red-vacio">Este día aún no tiene ejercicios.<br>Toca <b>＋ Agregar ejercicio</b> o la lupa 🔍 para buscarlos.</div>`}
      <div class="red-agregar">
        <button type="button" class="red-btn-agregar" onclick="abrirBuscadorRutina(${d})">＋ Agregar ejercicio</button>
        <button type="button" class="red-btn-lupa" onclick="abrirBuscadorRutina(${d})" aria-label="Buscar ejercicio">${ICONS.search}</button>
      </div>
    </div>`;
}

function redTarjetaHtml(row, d, e, total){
  const entry = findExerciseBankEntry(row.nombre);
  const img = entry && entry.image
    ? `<img src="${escapeHtml(entry.image)}" alt="">`
    : `<span class="red-img-vacia">${ICONS.clipboard}</span>`;
  const abierto = rutinaExAbierto === `${d}-${e}`;
  const seg = esSeg(row.unidad_objetivo);
  const orden = `
    <span class="red-orden">
      <button type="button" onclick="event.stopPropagation();moverEjercicioRutina(${d},${e},-1)" ${e === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
      <button type="button" onclick="event.stopPropagation();moverEjercicioRutina(${d},${e},1)" ${e === total - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
    </span>`;
  if(!abierto){
    const partes = [];
    if(row.series_objetivo || row.reps_objetivo) partes.push(objetivoTexto(row));
    if(row.peso_objetivo) partes.push(row.peso_objetivo);
    if(row.descanso_seg) partes.push(`${row.descanso_seg} s`);
    return `
      <div class="red-card mini" onclick="abrirTarjetaRutina(${d},${e})">
        ${img}
        <div class="red-info"><b>${escapeHtml(row.nombre || 'Ejercicio sin nombre')}</b><small>${escapeHtml(partes.join(' · ') || 'Toca para completar')}</small></div>
        ${orden}
        <span class="red-flecha">›</span>
      </div>`;
  }
  const paso = seg ? 5 : 1;
  const n = (v) => escapeHtml(String(v || ''));
  return `
    <div class="red-card on">
      <div class="red-top">
        ${img}
        <div class="red-info">
          <b>${escapeHtml(row.nombre || 'Elige un ejercicio')}</b>
          ${entry && entry.group ? `<span class="red-tag">${escapeHtml(entry.group)}</span>` : ''}
          <button type="button" class="red-cambiar" onclick="abrirBuscadorRutina(${d},${e})">${row.nombre ? 'Cambiar ejercicio' : 'Buscar ejercicio'}</button>
        </div>
        ${orden}
        <button type="button" class="red-x" onclick="quitarEjercicioDeDia(${d},${e})" aria-label="Quitar ejercicio">✕</button>
      </div>
      <div class="red-grid">
        <div class="red-st"><small>SERIES</small><div class="red-f">
          <button type="button" onclick="rutinaPaso(${d},${e},'series_objetivo',-1)">−</button>
          <input type="number" inputmode="numeric" id="red-series_objetivo-${d}-${e}" value="${n(row.series_objetivo)}" placeholder="0" oninput="rutinaEditorDias[${d}].ejercicios[${e}].series_objetivo=this.value">
          <button type="button" onclick="rutinaPaso(${d},${e},'series_objetivo',1)">+</button></div></div>
        <div class="red-st ${seg ? 'es-seg' : ''}"><small>${seg ? 'TIEMPO · SEG' : 'REPS'}</small><div class="red-f">
          <button type="button" onclick="rutinaPaso(${d},${e},'reps_objetivo',-${paso})">−</button>
          <input type="text" inputmode="${seg ? 'numeric' : 'text'}" id="red-reps_objetivo-${d}-${e}" value="${n(row.reps_objetivo)}" placeholder="0" oninput="rutinaEditorDias[${d}].ejercicios[${e}].reps_objetivo=this.value">
          <button type="button" onclick="rutinaPaso(${d},${e},'reps_objetivo',${paso})">+</button></div>
          <button type="button" class="unidad-toggle ${seg ? 'es-seg' : ''}" onclick="cambiarUnidadRutina(${d},${e})" title="${seg ? 'Cambiar a repeticiones' : 'Cambiar a tiempo'}">${seg ? '⇄ 🏋️' : '⇄ ⏱'}</button></div>
        <div class="red-st"><small>PESO</small><div class="red-f red-f-texto">
          <input type="text" id="red-peso_objetivo-${d}-${e}" value="${n(row.peso_objetivo)}" placeholder="0 kg" oninput="rutinaEditorDias[${d}].ejercicios[${e}].peso_objetivo=this.value"></div></div>
        <div class="red-st"><small>DESCANSO · SEG</small><div class="red-f">
          <button type="button" onclick="rutinaPaso(${d},${e},'descanso_seg',-15)">−</button>
          <input type="number" inputmode="numeric" id="red-descanso_seg-${d}-${e}" value="${n(row.descanso_seg)}" placeholder="0" oninput="rutinaEditorDias[${d}].ejercicios[${e}].descanso_seg=this.value">
          <button type="button" onclick="rutinaPaso(${d},${e},'descanso_seg',15)">+</button></div></div>
      </div>
      <details class="red-mas" ${row.nota || row.tipo_serie_objetivo || row.lado_objetivo ? 'open' : ''}>
        <summary>+ Nota / tipo / lado</summary>
        <input type="text" placeholder="Nota técnica: última serie al fallo, drop set..." value="${n(row.nota)}" oninput="rutinaEditorDias[${d}].ejercicios[${e}].nota=this.value">
        <div class="red-tipolado">
          <div>${selectTipoSerieHtml(`rutina-tiposerie-${d}-${e}`, row.tipo_serie_objetivo, `rutinaEditorDias[${d}].ejercicios[${e}].tipo_serie_objetivo=this.value`)}</div>
          <div>${selectLadoHtml(`rutina-lado-${d}-${e}`, row.lado_objetivo, `rutinaEditorDias[${d}].ejercicios[${e}].lado_objetivo=this.value`)}</div>
        </div>
      </details>
    </div>`;
}

function rutinaIrADia(i){ rutinaDiaActivo = i; rutinaExAbierto = null; renderRutinaDiasEditor(); }
function abrirTarjetaRutina(d, e){ rutinaExAbierto = `${d}-${e}`; renderRutinaDiasEditor(); }
function agregarDiaRutina(){
  if(rutinaEditorDias.length >= 5){ showToast('Máximo 5 días por programa'); return; }
  rutinaEditorDias.push({ nombre: `Día ${rutinaEditorDias.length + 1}`, ejercicios: [] });
  rutinaDiaActivo = rutinaEditorDias.length - 1;
  rutinaExAbierto = null;
  renderRutinaDiasEditor();
}
function rutinaPaso(d, e, campo, delta){
  const row = rutinaEditorDias[d] && rutinaEditorDias[d].ejercicios[e];
  if(!row) return;
  const actual = parseInt(String(row[campo] || '').replace(/[^\d]/g, ''), 10) || 0;
  const nuevo = Math.max(0, actual + delta);
  row[campo] = nuevo ? String(nuevo) : '';
  const inp = document.getElementById(`red-${campo}-${d}-${e}`);
  if(inp) inp.value = row[campo];
  if(window.UCKilo) window.UCKilo.vibrar(8);
}
function moverEjercicioRutina(d, e, dir){
  const lista = rutinaEditorDias[d].ejercicios;
  const j = e + dir;
  if(j < 0 || j >= lista.length) return;
  [lista[e], lista[j]] = [lista[j], lista[e]];
  if(rutinaExAbierto === `${d}-${e}`) rutinaExAbierto = `${d}-${j}`;
  else if(rutinaExAbierto === `${d}-${j}`) rutinaExAbierto = `${d}-${e}`;
  renderRutinaDiasEditor();
}
function cambiarUnidadRutina(d, e){
  const row = rutinaEditorDias[d] && rutinaEditorDias[d].ejercicios[e];
  if(!row) return;
  row.unidad_objetivo = esSeg(row.unidad_objetivo) ? 'reps' : 'seg';
  renderRutinaDiasEditor();
  showToast(esSeg(row.unidad_objetivo) ? '⏱ Este ejercicio va por tiempo (segundos)' : '🏋️ Este ejercicio va por repeticiones');
}

// ---------- Buscador de ejercicios del editor de rutina ----------
function abrirBuscadorRutina(d, reemplazarE){
  const reemplazo = typeof reemplazarE === 'number';
  const capa = document.createElement('div');
  capa.className = 'red-buscador';
  capa.innerHTML = `
    <div class="red-sheet">
      <div class="red-grab"></div>
      <div class="red-sheet-head"><span>${reemplazo ? 'Cambiar ejercicio' : `Agregar a ${escapeHtml(rutinaEditorDias[d].nombre || `Día ${d + 1}`)}`}</span><button type="button" class="red-listo">Listo</button></div>
      <div class="red-search">${ICONS.search}<input type="text" enterkeyhint="search" id="red-q" placeholder="Busca por nombre o músculo…" autocomplete="off"><button type="button" class="red-q-x" aria-label="Borrar">✕</button></div>
      <div class="red-res" id="red-res"></div>
    </div>`;
  document.body.appendChild(capa);
  const q = capa.querySelector('#red-q');
  const res = capa.querySelector('#red-res');
  const cerrar = () => { capa.remove(); rutinaExAbierto = rutinaExAbierto; renderRutinaDiasEditor(); };
  capa.querySelector('.red-listo').onclick = cerrar;
  capa.addEventListener('click', ev => { if(ev.target === capa) cerrar(); });
  capa.querySelector('.red-q-x').onclick = () => { q.value = ''; pintar(); q.focus(); };
  const enDia = () => new Set(rutinaEditorDias[d].ejercicios.map(r => normalizeExerciseName(r.nombre)).filter(Boolean));
  const resaltar = (txt, term) => {
    if(!term) return escapeHtml(txt);
    const i = normalizeExerciseName(txt).indexOf(term);
    if(i < 0) return escapeHtml(txt);
    return escapeHtml(txt.slice(0, i)) + `<mark>${escapeHtml(txt.slice(i, i + term.length))}</mark>` + escapeHtml(txt.slice(i + term.length));
  };
  const elegir = (nombre) => {
    if(reemplazo){
      rutinaEditorDias[d].ejercicios[reemplazarE].nombre = nombre;
      rutinaExAbierto = `${d}-${reemplazarE}`;
      capa.remove();
      renderRutinaDiasEditor();
      return;
    }
    const lista = rutinaEditorDias[d].ejercicios;
    const ya = lista.findIndex(r => normalizeExerciseName(r.nombre) === normalizeExerciseName(nombre));
    if(ya >= 0){
      lista.splice(ya, 1);
      showToast(`Quitado: ${nombre}`);
    } else {
      // Llega en blanco (sin series, reps ni descanso) y se abre al tiro para completarlo
      const cfgDia = fxDeDia(rutinaEditorDias[d]);
      const porTiempo = /plancha|isometric|wall sit|colgad/.test(normalizeExerciseName(nombre)) || (cfgDia && cfgDia.formato === 'circuito');
      lista.push({ nombre, series_objetivo: '', reps_objetivo: '', unidad_objetivo: porTiempo ? 'seg' : 'reps', peso_objetivo: '', nota: '', descanso_seg: '', tipo_serie_objetivo: '', lado_objetivo: '' });
      if(window.UCKilo) window.UCKilo.vibrar(12);
      rutinaExAbierto = `${d}-${lista.length - 1}`;
      capa.remove();
      renderRutinaDiasEditor();
      const card = document.querySelector('.red-card.on');
      if(card){
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const primero = document.getElementById(`red-series_objetivo-${d}-${lista.length - 1}`);
        if(primero) setTimeout(() => primero.focus({ preventScroll: true }), 350);
      }
      showToast(cfgDia ? `Agregado: ${nombre} · completa el trabajo (${cfgDia.formato === 'tabata' ? 'peso opcional' : 'segundos o reps'})` : `Agregado: ${nombre} · completa series, reps y peso`);
      return;
    }
    pintar();
  };
  const filaHtml = (item, term, dentro) => `
    <button type="button" class="red-item" data-nombre="${escapeHtml(item.name)}">
      <img src="${escapeHtml(item.image)}" alt="">
      <span class="red-item-txt"><b>${resaltar(item.name, term)}</b><small>${escapeHtml(item.group)}</small></span>
      <span class="red-item-mas ${dentro ? 'ok' : ''}">${dentro ? '✓' : '＋'}</span>
    </button>`;
  const pintar = () => {
    const term = normalizeExerciseName(q.value);
    const dentro = enDia();
    let html = '';
    if(term){
      const hits = EXERCISE_BANK.filter(it => [it.name, ...(it.aliases || []), it.group].some(t => normalizeExerciseName(t).includes(term)));
      html += `<div class="red-hint">${hits.length} resultado${hits.length === 1 ? '' : 's'}</div>`;
      html += hits.map(it => filaHtml(it, term, dentro.has(normalizeExerciseName(it.name)))).join('');
      if(!EXERCISE_BANK.some(it => normalizeExerciseName(it.name) === term)){
        html += `<div class="red-hint">¿No está? Agrégalo igual</div>
          <button type="button" class="red-item red-nuevo" data-nombre="${escapeHtml(q.value.trim())}"><span class="red-nuevo-ico">✎</span><span class="red-item-txt"><b>Usar “${escapeHtml(q.value.trim())}”</b><small>Ejercicio escrito por ti</small></span><span class="red-item-mas">＋</span></button>`;
      }
    } else {
      const recientes = [...new Set(rutinaEditorDias.flatMap(di => di.ejercicios.map(r => r.nombre)).filter(Boolean))].filter(nm => !dentro.has(normalizeExerciseName(nm))).slice(0, 8);
      if(recientes.length && !reemplazo){
        html += `<div class="red-hint">Usados en esta rutina</div><div class="red-chips">${recientes.map(nm => `<button type="button" class="red-chip" data-nombre="${escapeHtml(nm)}">${escapeHtml(nm)}</button>`).join('')}</div>`;
      }
      const grupos = [...new Set(EXERCISE_BANK.map(it => it.group))];
      html += grupos.map(g => `<div class="red-grupo">${escapeHtml(g)}</div>` + EXERCISE_BANK.filter(it => it.group === g).map(it => filaHtml(it, '', dentro.has(normalizeExerciseName(it.name)))).join('')).join('');
    }
    res.innerHTML = html;
    res.querySelectorAll('[data-nombre]').forEach(b => b.onclick = () => { if(b.dataset.nombre) elegir(b.dataset.nombre); });
  };
  q.oninput = pintar;
  pintar();
  setTimeout(() => q.focus(), 60);
}

function agregarEjercicioADia(d){
  abrirBuscadorRutina(d);
}

function quitarEjercicioDeDia(d, e){
  rutinaEditorDias[d].ejercicios.splice(e, 1);
  rutinaExAbierto = null;
  renderRutinaDiasEditor();
}

function quitarDiaRutina(d){
  rutinaEditorDias.splice(d, 1);
  rutinaExAbierto = null;
  if(rutinaDiaActivo >= rutinaEditorDias.length) rutinaDiaActivo = rutinaEditorDias.length - 1;
  renderRutinaDiasEditor();
}

// Convierte lo que hay en el editor en filas para guardar (rutina o plantilla)
function filasDesdeEditorRutina(){
  const filas = [];
  let faltaTrabajo = null;
  rutinaEditorDias.forEach((dia, di) => {
    const nombreDia = (dia.nombre || '').trim() || `Día ${di+1}`;
    const cfg = fxDeDia(dia);
    dia.ejercicios.filter(r => r.nombre.trim()).forEach((r, ei) => {
      if(cfg){
        // Día funcional: la configuración del día viaja en cada ejercicio
        if(cfg.formato !== 'tabata' && !fxNum(r.reps_objetivo) && !faltaTrabajo) faltaTrabajo = { d: di, e: ei, nombre: r.nombre };
        filas.push({
          nombre: r.nombre.trim(),
          series_objetivo: cfg.formato === 'circuito' ? cfg.vueltas : null,
          reps_objetivo: cfg.formato === 'tabata' ? String(cfg.trabajo) : (String(fxNum(r.reps_objetivo) || '') || null),
          unidad_objetivo: cfg.formato === 'tabata' || esSeg(r.unidad_objetivo) ? 'seg' : 'reps',
          peso_objetivo: (r.peso_objetivo || '').trim() || null,
          nota: (r.nota || '').trim() || null,
          descanso_seg: cfg.formato === 'circuito' ? (cfg.descanso_ej || null) : null,
          tipo_serie_objetivo: null,
          lado_objetivo: null,
          dia_nombre: nombreDia,
          dia_orden: di,
          orden: ei,
          circuito: cfg
        });
        return;
      }
      filas.push({
        nombre: r.nombre.trim(),
        series_objetivo: r.series_objetivo ? Number(r.series_objetivo) : null,
        reps_objetivo: r.reps_objetivo || null,
        unidad_objetivo: esSeg(r.unidad_objetivo) ? 'seg' : 'reps',
        peso_objetivo: (r.peso_objetivo || '').trim() || null,
        nota: (r.nota || '').trim() || null,
        descanso_seg: r.descanso_seg ? Number(r.descanso_seg) : null,
        tipo_serie_objetivo: (r.tipo_serie_objetivo || '').trim() || null,
        lado_objetivo: (r.lado_objetivo || '').trim() || null,
        dia_nombre: nombreDia,
        dia_orden: di,
        orden: ei
      });
    });
  });
  return { filas, faltaTrabajo };
}

async function guardarRutina(alumno){
  if(rutinaEditorModo === 'plantilla') return guardarPlantilla();
  const nombre = document.getElementById('rutina-nombre').value.trim();
  const objetivo = document.getElementById('rutina-objetivo').value.trim();
  const { filas, faltaTrabajo } = filasDesdeEditorRutina();

  if(!nombre || !filas.length){ showToast('Ponle un nombre al programa y al menos un ejercicio en algún día'); return; }
  if(faltaTrabajo){
    rutinaDiaActivo = faltaTrabajo.d; rutinaExAbierto = `${faltaTrabajo.d}-${faltaTrabajo.e}`; renderRutinaDiasEditor();
    showToast(`Completa los segundos o reps de «${faltaTrabajo.nombre}»`);
    return;
  }

  const btn = document.getElementById('btn-guardar-rutina');
  btn.disabled = true; btn.textContent = 'Guardando...';

  if(rutinaEditorId){
    const { error: errUpd } = await sb.from('rutinas')
      .update({ nombre, objetivo: objetivo || null })
      .eq('id', rutinaEditorId);
    if(errUpd){ showToast('No se pudo actualizar la rutina'); btn.disabled=false; btn.textContent='Guardar cambios'; return; }

    await sb.from('rutina_ejercicios').delete().eq('rutina_id', rutinaEditorId);
    const { error: errIns } = await sb.from('rutina_ejercicios').insert(filas.map(f => ({ ...f, rutina_id: rutinaEditorId })));
    if(errIns){ showToast(/circuito/i.test(errIns.message || '') ? 'Falta activar las rutinas funcionales en la base de datos' : 'No se pudieron guardar los ejercicios'); btn.disabled=false; btn.textContent='Guardar cambios'; return; }

    if(profile.role !== 'alumno' && alumno.id !== profile.id){
      mostrarRutinaEnviada(alumno.nombre, true);
      avisarPush({ tipo:'rutina', rutina_id: rutinaEditorId, actualizada: true });
    }
    else showToast('¡Rutina actualizada!');
    rutinaEditorId = null;
    const volver = rutinaEditorReturn;
    rutinaEditorReturn = null;
    volver();
    return;
  }

  const { data: rutina, error } = await sb.from('rutinas').insert({
    alumno_id: alumno.id, nombre, objetivo: objetivo || null, activa: false, fecha: todayStr(),
    origen: profile.role === 'alumno' ? 'alumno' : 'profesor',
    creada_por: profile.id
  }).select().single();

  if(error){ showToast('No se pudo crear la rutina'); btn.disabled=false; btn.textContent='Guardar rutina'; return; }

  const { error: ejerciciosError } = await sb.from('rutina_ejercicios').insert(filas.map(f => ({ ...f, rutina_id: rutina.id })));
  if(ejerciciosError){
    await sb.from('rutinas').delete().eq('id', rutina.id);
    showToast(/circuito/i.test(ejerciciosError.message || '') ? 'Falta activar las rutinas funcionales en la base de datos' : 'No se pudieron guardar los ejercicios');
    btn.disabled=false; btn.textContent='Guardar rutina';
    return;
  }

  // La rutina actual se archiva solamente después de que la nueva quedó completa.
  // Así, un error de red nunca deja al alumno sin su planificación anterior.
  let activarError = null;
  if(profile.role === 'alumno'){
    const resultado = await sb.rpc('activar_rutina_propia', { target_rutina_id: rutina.id });
    activarError = resultado.error;
  } else {
    const { error: desactivarError } = await sb.from('rutinas')
      .update({ activa: false })
      .eq('alumno_id', alumno.id)
      .eq('activa', true)
      .neq('id', rutina.id);
    if(desactivarError){
      await sb.from('rutinas').delete().eq('id', rutina.id);
      showToast('No se pudo activar la nueva rutina');
      btn.disabled=false; btn.textContent='Guardar rutina';
      return;
    }
    const resultado = await sb.from('rutinas').update({ activa: true }).eq('id', rutina.id);
    activarError = resultado.error;
  }
  if(activarError){
    showToast('La rutina se guardó, pero no pudo activarse');
    btn.disabled=false; btn.textContent='Guardar rutina';
    return;
  }

  if(profile.role !== 'alumno' && alumno.id !== profile.id){
    mostrarRutinaEnviada(alumno.nombre, false);
    avisarPush({ tipo:'rutina', rutina_id: rutina.id, actualizada: false });
  }
  else showToast('¡Rutina guardada!');
  const volver = rutinaEditorReturn;
  rutinaEditorReturn = null;
  volver();
}

// ============================================================
// PERFIL SOCIAL, COMPAÑEROS Y CHAT
// ============================================================
function cleanupSocialRealtime(){
  if(socialRefreshTimer){ clearTimeout(socialRefreshTimer); socialRefreshTimer = null; }
  if(socialRealtimeChannel){
    try{ sb.removeChannel(socialRealtimeChannel); }catch(_){ }
    socialRealtimeChannel = null;
  }
}

function subscribeSocialNotifications(refreshFn){
  if(!profile || !profile.id) return;
  const scheduleRefresh = () => {
    if(socialRefreshTimer) clearTimeout(socialRefreshTimer);
    socialRefreshTimer = setTimeout(() => {
      socialRefreshTimer = null;
      showToast('Tienes una novedad en tus mensajes');
      if(window.UCKilo){ window.UCKilo.sonido('mensaje'); window.UCKilo.vibrar([200, 100, 200]); }
      refreshFn();
    }, 350);
  };
  const channel = sb.channel(`social-alerts-${profile.id}-${Date.now()}`)
    .on('postgres_changes', {event:'INSERT',schema:'public',table:'mensajes',filter:`receiver_id=eq.${profile.id}`}, scheduleRefresh)
    .on('postgres_changes', {event:'INSERT',schema:'public',table:'amistades',filter:`receptor_id=eq.${profile.id}`}, scheduleRefresh)
    .on('postgres_changes', {event:'UPDATE',schema:'public',table:'amistades',filter:`solicitante_id=eq.${profile.id}`}, scheduleRefresh);
  if(profile.role === 'profesor'){
    channel.on('postgres_changes', {event:'INSERT',schema:'public',table:'notificaciones_entrenamiento',filter:`profesor_id=eq.${profile.id}`}, payload => {
      if(socialRefreshTimer) clearTimeout(socialRefreshTimer);
      socialRefreshTimer = setTimeout(() => {
        socialRefreshTimer = null;
        const n = payload && payload.new;
        showToast(n && n.tipo === 'fin' ? 'Un alumno finalizó su entrenamiento' : 'Un alumno inició su entrenamiento');
        if(window.UCKilo) window.UCKilo.sonido('mensaje');
        refreshFn();
      }, 350);
    });
  }
  socialRealtimeChannel = channel.subscribe();
}

function avatarNumber(person){
  const match = String((person && person.avatar_key) || 'avatar-1').match(/(\d+)/);
  return Math.max(1, Math.min(10, match ? Number(match[1]) : 1));
}

const CHARACTER_AVATARS = {};

const ORIGINAL_AVATARS = {
  'avatar-original-01': { image:'avatar-original-01.webp', label:'Estilo glam urbano' },
  'avatar-original-02': { image:'avatar-original-02.webp', label:'Rizos neón' },
  'avatar-original-03': { image:'avatar-original-03.webp', label:'Bob violeta' },
  'avatar-original-04': { image:'avatar-original-04.webp', label:'Retro pelirroja' },
  'avatar-original-05': { image:'avatar-original-05.webp', label:'Anime deportivo' },
  'avatar-original-06': { image:'avatar-original-06.webp', label:'Energía plateada' },
  'avatar-original-07': { image:'avatar-original-07.webp', label:'Héroe urbano' },
  'avatar-original-08': { image:'avatar-original-08.webp', label:'Aventura violeta' },
  'avatar-original-09': { image:'avatar-original-09.webp', label:'Retro inteligente' },
  'avatar-original-10': { image:'avatar-original-10.webp', label:'Fuerza serena' }
};

function puedeUsarAvataresPersonajes(person){
  return false;
}

function avatarKey(person){
  return String((person && person.avatar_key) || 'avatar-1');
}

function renderProfileAvatar(person, sizeClass){
  const classes = `profile-avatar ${sizeClass || ''}`.trim();
  if(person && person.foto_perfil_url){
    return `<span class="${classes} has-photo"><img src="${escapeHtml(person.foto_perfil_url)}" alt="Foto de perfil de ${escapeHtml(person.nombre || '')}"></span>`;
  }
  const original = ORIGINAL_AVATARS[avatarKey(person)];
  if(original){
    return `<span class="${classes} character-avatar"><img src="${escapeHtml(original.image)}" alt="${escapeHtml(original.label)}"></span>`;
  }
  const character = CHARACTER_AVATARS[avatarKey(person)];
  if(character){
    return `<span class="${classes} character-avatar"><img src="${escapeHtml(character.image)}" alt="${escapeHtml(character.label)}"></span>`;
  }
  return `<span class="${classes}"><span class="avatar-sprite avatar-pos-${avatarNumber(person)}"></span></span>`;
}

async function getSocialSummary(){
  const summary = { friends:0, pending:0, unread:0 };
  try{
    const [friends, requests] = await Promise.all([
      sb.rpc('mis_companeros'),
      sb.rpc('mis_solicitudes_companeros')
    ]);
    if(!friends.error) summary.friends = (friends.data || []).length;
    if(!requests.error) summary.pending = (requests.data || []).filter(r => r.direccion === 'recibida').length;
    const friendIds = (friends.data || []).map(row => row.id);
    if(friendIds.length){
      const unread = await sb.from('mensajes').select('id', { count:'exact', head:true })
        .eq('receiver_id', profile.id).in('sender_id', friendIds).is('read_at', null);
      if(!unread.error) summary.unread = unread.count || 0;
    }
  }catch(_){ }
  return summary;
}

async function getTeacherChatSummary(){
  if(!profile || profile.role !== 'alumno' || !profile.profesor_id) return null;
  try{
    const [{ data: rows, error }, unread] = await Promise.all([
      sb.rpc('obtener_contacto_chat', { target_id:profile.profesor_id }),
      sb.from('mensajes').select('id', { count:'exact', head:true })
        .eq('sender_id', profile.profesor_id).eq('receiver_id', profile.id).is('read_at', null)
    ]);
    const teacher = rows && rows[0];
    if(error || !teacher) return null;
    return { ...teacher, unread:unread.error ? 0 : (unread.count || 0) };
  }catch(_){ return null; }
}

async function renderMiPerfil(abrirEdicion){
  cleanupSocialRealtime();
  root().innerHTML = `<div class="loading">Abriendo tu perfil...</div>`;
  await loadProfile();
  const puedeVerPersonajes = puedeUsarAvataresPersonajes(profile);
  const totalAvatares = 20 + (puedeVerPersonajes ? Object.keys(CHARACTER_AVATARS).length : 0);
  root().innerHTML = `
    <div class="row-flex page-heading">
      <div><button type="button" class="back-link" id="btn-volver-perfil">${ICONS.arrowLeft} Volver</button><h1>Tu perfil</h1></div>
    </div>
    ${esRolProfe() ? '<div id="perfil-pro-holder" class="perfil-pro-holder"></div>' : ''}
    <section class="profile-editor-hero">
      ${renderProfileAvatar(profile, 'avatar-profile-large')}
      <div><div class="profile-editor-kicker">TU IDENTIDAD EN STC APP</div><h2>${escapeHtml(profile.nombre)}</h2><p>Usa tu foto o elige un avatar.</p></div>
    </section>
    <div class="card profile-identity-card">
      <div class="profile-photo-priority">
        <div class="profile-photo-preview">${renderProfileAvatar(profile, 'avatar-profile-upload')}</div>
        <div class="profile-photo-copy"><b>Usar mi propia foto</b><small>Es la opción principal para que tus compañeros te reconozcan fácilmente.</small></div>
        <label class="photo-input-label profile-photo-upload primary-photo-action" for="input-profile-photo">
          <span id="profile-photo-label">${ICONS.camera} Elegir una foto</span>
          <input type="file" id="input-profile-photo" accept="image/jpeg,image/png,image/webp">
        </label>
      </div>
      <div class="profile-upload-note priority-note">La verás al instante; se recorta y comprime automáticamente.</div>
      <div class="profile-choice-divider"><span>O ELIGE UN AVATAR</span></div>
      <label>${totalAvatares} opciones: clásicos y originales${puedeVerPersonajes ? ' · colección especial para profesores actuales' : ''}</label>
      <div class="avatar-choice-grid">
        ${Array.from({length:10}, (_,i) => {
          const key = `avatar-${i+1}`;
          const selected = avatarKey(profile) === key && !profile.foto_perfil_url;
          return `<button type="button" class="avatar-choice ${selected ? 'selected' : ''}" data-avatar="${key}" aria-label="Elegir avatar ${i+1}">${renderProfileAvatar({avatar_key:key,nombre:`Avatar ${i+1}`}, 'avatar-choice-size')}<span>${selected ? '✓' : ''}</span></button>`;
        }).join('')}
        ${Object.entries(ORIGINAL_AVATARS).map(([key,item]) => {
          const selected = avatarKey(profile) === key && !profile.foto_perfil_url;
          return `<button type="button" class="avatar-choice character-choice ${selected ? 'selected' : ''}" data-avatar="${key}" aria-label="Elegir ${escapeHtml(item.label)}" title="${escapeHtml(item.label)}">${renderProfileAvatar({avatar_key:key,nombre:item.label}, 'avatar-choice-size')}<span>${selected ? '✓' : ''}</span></button>`;
        }).join('')}
        ${puedeVerPersonajes ? Object.entries(CHARACTER_AVATARS).map(([key,item]) => {
          const selected = avatarKey(profile) === key && !profile.foto_perfil_url;
          return `<button type="button" class="avatar-choice character-choice ${selected ? 'selected' : ''}" data-avatar="${key}" aria-label="Elegir ${escapeHtml(item.label)}" title="${escapeHtml(item.label)}">${renderProfileAvatar({avatar_key:key,nombre:item.label}, 'avatar-choice-size')}<span>${selected ? '✓' : ''}</span></button>`;
        }).join('') : ''}
      </div>
    </div>
    ${profile.role === 'alumno' ? `<div class="card">
      <label>Tu identificador de búsqueda</label>
      <div class="username-field"><span>@</span><input id="profile-username" value="${escapeHtml(profile.username || '')}" maxlength="24" autocomplete="off"></div>
      <div class="profile-upload-note"><b>¿Qué significa?</b> Es un apodo único para encontrarte sin mostrar tu correo. Puedes cambiarlo por algo fácil, por ejemplo: <b>pablo.bravo</b>.</div>
      <label>Una frase sobre ti (opcional)</label>
      <textarea id="profile-bio" maxlength="160" placeholder="Ej: entrenando para ser más fuerte cada semana">${escapeHtml(profile.bio || '')}</textarea>
      <label class="privacy-switch"><input type="checkbox" id="profile-share-history" ${profile.compartir_historial !== false ? 'checked' : ''}><span><b>Compartir mis entrenamientos</b><small>Solo los compañeros que tú aceptes podrán ver tu historial, rutinas y fotos. Nunca podrán editarlo.</small></span></label>
      <button type="button" class="btn" id="btn-save-profile">Guardar perfil</button>
    </div>` : '<div class="profile-upload-note" style="text-align:center;">Tu foto o avatar también aparecerá en los chats con tus alumnos.</div>'}
    ${profile.role !== 'super_admin' ? '<div class="card push-perfil-card" id="push-perfil-holder"></div>' : ''}`;

  const volverPerfil = esVistaCoach(profile.role) ? renderCoachHome : renderAlumnoHome;
  document.getElementById('btn-volver-perfil').onclick = volverPerfil;
  document.querySelectorAll('.avatar-choice').forEach(btn => btn.onclick = () => selectProfileAvatar(btn.dataset.avatar));
  document.getElementById('input-profile-photo').onchange = e => uploadProfilePhoto(e.target.files && e.target.files[0]);
  if(document.getElementById('btn-save-profile')) document.getElementById('btn-save-profile').onclick = saveProfileDetails;
  renderPushPerfil();
  if(esRolProfe()) montarPerfilProfesional('perfil-pro-holder', abrirEdicion === true);
}

async function selectProfileAvatar(avatarKey){
  if(CHARACTER_AVATARS[avatarKey] && !puedeUsarAvataresPersonajes(profile)){
    showToast('Este avatar está reservado para profesores autorizados');
    return;
  }
  const { data, error } = await sb.from('profiles').update({ avatar_key:avatarKey, foto_perfil_url:null }).eq('id', profile.id).select('*').single();
  if(error){ showToast('No se pudo cambiar el avatar'); return; }
  profile = data;
  showToast('Avatar actualizado ✓');
  renderMiPerfil();
}

function resizeProfilePhoto(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 640;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 640, 640);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto')), 'image/jpeg', .82);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadProfilePhoto(file){
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Elige una imagen válida'); return; }
  if(file.size > 12 * 1024 * 1024){ showToast('La foto es demasiado pesada'); return; }
  const label = document.getElementById('profile-photo-label');
  if(label) label.textContent = 'Preparando foto...';
  try{
    const blob = await resizeProfilePhoto(file);
    const path = `${profile.id}/avatar.jpg`;
    const { error: uploadError } = await sb.storage.from('profile-photos').upload(path, blob, { contentType:'image/jpeg', upsert:true, cacheControl:'3600' });
    if(uploadError) throw uploadError;
    const { data: publicData } = sb.storage.from('profile-photos').getPublicUrl(path);
    const url = `${publicData.publicUrl}?v=${Date.now()}`;
    const { data, error } = await sb.from('profiles').update({ foto_perfil_url:url }).eq('id', profile.id).select('*').single();
    if(error) throw error;
    profile = data;
    showToast('Foto de perfil actualizada ✓');
    renderMiPerfil();
  }catch(error){
    console.error(error);
    if(label) label.innerHTML = `${ICONS.camera} Elegir una foto`;
    showToast('No se pudo subir la foto');
  }
}

async function saveProfileDetails(){
  const username = document.getElementById('profile-username').value.trim().replace(/^@/, '').toLowerCase();
  const bio = document.getElementById('profile-bio').value.trim();
  const compartir_historial = document.getElementById('profile-share-history').checked;
  if(!/^[a-z0-9._-]{3,24}$/.test(username)){
    showToast('El usuario debe tener 3 a 24 letras, números, punto, guion o guion bajo'); return;
  }
  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const { data, error } = await sb.from('profiles').update({ username, bio:bio || null, compartir_historial }).eq('id', profile.id).select('*').single();
  if(error){
    btn.disabled = false; btn.textContent = 'Guardar perfil';
    showToast(error.code === '23505' ? 'Ese nombre de usuario ya está ocupado' : 'No se pudo guardar el perfil');
    return;
  }
  profile = data;
  showToast('Perfil guardado ✓');
  if(esVistaCoach(profile.role)) renderCoachHome(); else renderAlumnoHome();
}

async function renderSocialHub(){
  cleanupSocialRealtime();
  root().innerHTML = `<div class="loading">Buscando a tus compañeros...</div>`;
  const [friendsResult, requestsResult, unreadResult] = await Promise.all([
    sb.rpc('mis_companeros'),
    sb.rpc('mis_solicitudes_companeros'),
    sb.from('mensajes').select('sender_id').eq('receiver_id', profile.id).is('read_at', null)
  ]);
  if(friendsResult.error || requestsResult.error){
    root().innerHTML = `<button type="button" class="back-link" onclick="renderAlumnoHome()">${ICONS.arrowLeft} Volver</button><div class="card"><div class="empty">La comunidad todavía se está activando. Intenta nuevamente en unos minutos.</div></div>`;
    return;
  }
  const friends = friendsResult.data || [];
  const requests = requestsResult.data || [];
  const received = requests.filter(r => r.direccion === 'recibida');
  const sent = requests.filter(r => r.direccion === 'enviada');
  const friendIds = new Set(friends.map(friend => friend.id));
  const unreadByFriend = (unreadResult.data || []).filter(row => friendIds.has(row.sender_id)).reduce((acc,row) => { acc[row.sender_id] = (acc[row.sender_id] || 0) + 1; return acc; }, {});
  root().innerHTML = `
    <div class="row-flex page-heading"><div><button type="button" class="back-link" id="btn-social-back">${ICONS.arrowLeft} Volver</button><h1>Compañeros</h1><div class="sub">Tu comunidad de entrenamiento</div></div>${renderProfileAvatar(profile,'avatar-header-small')}</div>
    <section class="social-search-card">
      <div class="social-search-title">${ICONS.search}<div><b>Encuentra un compañero</b><small>Busca por nombre o por su @usuario. Tu correo siempre permanece privado.</small></div></div>
      <div class="social-search-row"><input id="social-search-input" placeholder="Nombre o @usuario" autocomplete="off"><button type="button" class="btn-sm" id="btn-social-search">Buscar</button></div>
      <div id="social-search-results"></div>
    </section>
    ${received.length ? `<section class="social-section social-alert-panel"><div class="social-alert-heading"><span class="social-alert-icon">${ICONS.users}</span><div><h2>Solicitudes de amistad <span>${received.length}</span></h2><p>Estas personas quieren ser tus compañeros. Tú decides a quién aceptar.</p></div></div>${received.map(r => renderRequestCard(r, true)).join('')}</section>` : ''}
    ${sent.length ? `<section class="social-section"><h2>Solicitudes enviadas</h2>${sent.map(r => renderRequestCard(r, false)).join('')}</section>` : ''}
    <section class="social-section"><h2>Mis compañeros <span>${friends.length}</span></h2>
      ${friends.length ? friends.map(friend => renderFriendCard(friend, unreadByFriend[friend.id] || 0)).join('') : `<div class="empty social-empty">Todavía no tienes compañeros. Busca a otro alumno y envíale una solicitud.</div>`}
    </section>`;
  document.getElementById('btn-social-back').onclick = renderAlumnoHome;
  document.getElementById('btn-social-search').onclick = searchSocialUsers;
  document.getElementById('social-search-input').onkeydown = e => { if(e.key === 'Enter') searchSocialUsers(); };
  subscribeSocialNotifications(renderSocialHub);
}

function renderRequestCard(row, received){
  return `<div class="social-person-card">
    ${renderProfileAvatar(row,'avatar-list')}
    <div class="social-person-copy"><b>${escapeHtml(row.nombre)}</b><small>Usuario: @${escapeHtml(row.username || '')}</small></div>
    <div class="social-card-actions">${received
      ? `<button type="button" class="btn-sm" onclick="answerFriendRequest('${row.solicitud_id}',true)">Aceptar</button><button type="button" class="btn-ghost compact" onclick="answerFriendRequest('${row.solicitud_id}',false)">Rechazar</button>`
      : '<span class="request-pending">Pendiente</span>'}</div>
  </div>`;
}

function renderFriendCard(friend, unreadCount){
  return `<div class="social-person-card is-friend">
    ${renderProfileAvatar(friend,'avatar-list')}
    <button type="button" class="social-person-copy social-person-link" onclick="renderFriendProfile('${friend.id}')"><b>${escapeHtml(friend.nombre)}</b><small>Usuario: @${escapeHtml(friend.username || '')} · ${friend.amigos || 0} compañero${Number(friend.amigos) === 1 ? '' : 's'}</small>${unreadCount ? `<em>${unreadCount} mensaje${unreadCount === 1 ? '' : 's'} sin leer</em>` : ''}</button>
    <div class="social-card-actions"><button type="button" class="icon-action friend-chat-action" onclick="renderChat('${friend.id}',renderSocialHub)" aria-label="Conversar con ${escapeHtml(friend.nombre)}">${ICONS.message}${unreadCount ? `<span>${unreadCount}</span>` : ''}</button>${ICONS.chevronRight}</div>
  </div>`;
}

async function searchSocialUsers(){
  const input = document.getElementById('social-search-input');
  const holder = document.getElementById('social-search-results');
  const term = input.value.trim();
  if(term.length < 2){ showToast('Escribe al menos 2 letras'); return; }
  holder.innerHTML = '<div class="loading compact-loading">Buscando...</div>';
  const { data, error } = await sb.rpc('buscar_companeros', { search_text:term });
  if(error){ holder.innerHTML = '<div class="empty">No se pudo buscar ahora.</div>'; return; }
  holder.innerHTML = (data || []).length ? data.map(person => {
    let action = `<button type="button" class="btn-sm" onclick="sendFriendRequest('${person.id}')">Agregar</button>`;
    if(person.estado === 'aceptada') action = `<button type="button" class="btn-ghost compact" onclick="renderFriendProfile('${person.id}')">Ver perfil</button>`;
    if(person.estado === 'pendiente') action = `<span class="request-pending">${person.yo_solicite ? 'Solicitud enviada' : 'Te envió una solicitud'}</span>`;
    return `<div class="social-person-card search-result">${renderProfileAvatar(person,'avatar-list')}<div class="social-person-copy"><b>${escapeHtml(person.nombre)}</b><small>Usuario: @${escapeHtml(person.username || '')}</small></div><div class="social-card-actions">${action}</div></div>`;
  }).join('') : '<div class="empty">No encontramos alumnos con ese nombre.</div>';
}

async function sendFriendRequest(targetId){
  const { error } = await sb.rpc('enviar_solicitud_companero', { target_id:targetId });
  if(error){ showToast('No se pudo enviar la solicitud'); return; }
  showToast('Solicitud enviada ✓');
  renderSocialHub();
}
async function answerFriendRequest(requestId, accept){
  const { data, error } = await sb.rpc('responder_solicitud_companero', { solicitud_id:requestId, aceptar:accept });
  if(error || !data){ showToast('No se pudo responder la solicitud'); return; }
  showToast(accept ? 'Ahora son compañeros ✓' : 'Solicitud rechazada');
  renderSocialHub();
}

async function renderFriendProfile(friendId){
  cleanupSocialRealtime();
  root().innerHTML = '<div class="loading">Abriendo perfil...</div>';
  const { data: rows, error } = await sb.rpc('obtener_perfil_companero', { target_id:friendId });
  const friend = rows && rows[0];
  if(error || !friend){ showToast('Este perfil ya no está disponible'); renderSocialHub(); return; }
  let sesiones = [], rutinasPropias = [];
  if(friend.compartir_historial){
    const [sessionsResult, routinesResult] = await Promise.all([
      sb.from('sesiones').select('*, sesion_series(*)').eq('alumno_id', friendId).order('fecha', {ascending:false}).limit(20),
      sb.from('rutinas').select('*, rutina_ejercicios(*)')
        .eq('alumno_id', friendId)
        .eq('origen', 'alumno')
        .eq('creada_por', friendId)
        .order('fecha', {ascending:false})
        .limit(10)
    ]);
    if(!sessionsResult.error) sesiones = markPRs(sessionsResult.data || []);
    if(!routinesResult.error) rutinasPropias = routinesResult.data || [];
  }
  root().innerHTML = `
    <button type="button" class="back-link" id="btn-friend-back">${ICONS.arrowLeft} Compañeros</button>
    <section class="friend-profile-hero">
      ${renderProfileAvatar(friend,'avatar-profile-large')}
      <div><h1>${escapeHtml(friend.nombre)}</h1><div class="friend-username">Usuario: @${escapeHtml(friend.username || '')}</div><div class="friend-count">${ICONS.users} ${friend.amigos || 0} compañero${Number(friend.amigos) === 1 ? '' : 's'}</div></div>
      <button type="button" class="btn-sm" id="btn-chat-friend">${ICONS.message} Mensaje</button>
    </section>
    ${friend.bio ? `<div class="card friend-bio">${escapeHtml(friend.bio)}</div>` : ''}
    ${!friend.compartir_historial ? `<div class="card privacy-closed">🔒 ${escapeHtml(friend.nombre.split(' ')[0])} mantiene sus entrenamientos privados.</div>` : `
      <button type="button" class="btn-toggle-rutina section-history history-primary" id="btn-friend-history"><span class="history-primary-copy"><span class="toggle-label">${ICONS.book} Entrenamientos</span><small>${sesiones.length === 1 ? '1 sesión reciente' : `${sesiones.length} sesiones recientes`} · solo lectura</small></span>${toggleStateHtml('Abrir')}</button>
      <div class="hidden" id="friend-history-holder">${renderFriendSessions(sesiones)}</div>
      ${rutinasPropias.length ? `<button type="button" class="btn-toggle-rutina section-routine" id="btn-friend-routine"><span class="toggle-label">${ICONS.clipboard} Rutinas personales (${rutinasPropias.length})</span>${toggleStateHtml()}</button><div class="hidden" id="friend-routine-holder">${renderFriendOwnRoutines(rutinasPropias, friend)}</div>` : `<div class="card privacy-closed">${escapeHtml(friend.nombre.split(' ')[0])} todavía no ha creado rutinas personales para compartir.</div>`}
    `}
    <div class="friend-safety-actions"><button type="button" class="link-btn danger-text" id="btn-remove-friend">Eliminar compañero</button><button type="button" class="link-btn danger-text" id="btn-block-friend">Bloquear</button></div>`;
  document.getElementById('btn-friend-back').onclick = renderSocialHub;
  document.getElementById('btn-chat-friend').onclick = () => renderChat(friendId, renderSocialHub);
  if(document.getElementById('btn-friend-history')) wireToggle('btn-friend-history','friend-history-holder');
  if(document.getElementById('btn-friend-routine')) wireToggle('btn-friend-routine','friend-routine-holder');
  document.getElementById('btn-remove-friend').onclick = () => removeFriend(friendId, false);
  document.getElementById('btn-block-friend').onclick = () => removeFriend(friendId, true);
}

function renderFriendOwnRoutines(routines, friend){
  return routines.map(rutina => `<article class="card routine-plan readonly-shared-routine">
    <div class="row-flex" style="margin-bottom:8px;"><div><h2 style="margin:0 0 6px;">${escapeHtml(rutina.nombre)}</h2><span class="origin-badge alumno">Creada por ${escapeHtml(friend.nombre.split(' ')[0])}</span></div><span class="pill">Solo lectura</span></div>
    ${rutina.objetivo ? `<div class="sub" style="margin-bottom:12px;">${escapeHtml(rutina.objetivo)}</div>` : ''}
    ${renderRoutineDays(groupPorDia(rutina.rutina_ejercicios || []))}
  </article>`).join('');
}

function renderFriendSessions(sessions){
  if(!sessions.length) return '<div class="empty">Todavía no tiene entrenamientos compartidos.</div>';
  return sessions.map(s => {
    const groups = groupSets(s.sesion_series || []);
    return `<article class="session-card readonly-session"><div class="session-head"><span>${formatDate(s.fecha)}</span><span class="pill">${(s.sesion_series || []).length} series</span></div><div class="session-body">
      ${groups.map(g => `<div class="exercise-group"><div class="ex-head"><span class="ex-name">${escapeHtml(g.nombre)}</span></div>${g.sets.map((set,i) => `<div class="set-line"><span>Serie ${i+1}</span><b>${escapeHtml(valorSerieTexto(set))} · ${escapeHtml(set.peso || 0)} kg</b></div>`).join('')}</div>`).join('')}
      ${s.foto_url ? `<img class="session-photo" src="${escapeHtml(s.foto_url)}" alt="Foto compartida del entrenamiento">` : ''}
    </div></article>`;
  }).join('');
}

async function removeFriend(friendId, block){
  const fn = block ? 'bloquear_companero' : 'eliminar_companero';
  const { error } = await sb.rpc(fn, { target_id:friendId });
  if(error){ showToast('No se pudo realizar la acción'); return; }
  showToast(block ? 'Perfil bloqueado' : 'Compañero eliminado');
  renderSocialHub();
}

// ---------- BUZÓN DE MENSAJES DEL PROFESOR ----------
// Junta en un solo lugar las conversaciones con sus alumnos asignados:
// primero las que tienen mensajes sin leer, después las más recientes.
// Solo lee datos que el profesor ya puede ver (sus propios mensajes y sus alumnos).
async function renderBuzonProfesor(){
  cleanupSocialRealtime();
  root().innerHTML = '<div class="loading">Abriendo buzón...</div>';
  const [{ data: alumnos, error: errAlumnos }, { data: mensajes, error: errMensajes }] = await Promise.all([
    sb.from('profiles').select('*').eq('role', 'alumno').eq('profesor_id', profile.id).order('nombre'),
    sb.from('mensajes').select('id, sender_id, receiver_id, contenido, created_at, read_at')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false }).limit(500)
  ]);
  if(errAlumnos || errMensajes){ showToast('No se pudo abrir el buzón'); renderCoachHome(); return; }
  const porAlumno = {};
  (alumnos || []).forEach(a => { porAlumno[a.id] = { alumno: a, ultimo: null, sinLeer: 0 }; });
  (mensajes || []).forEach(m => {
    const otroId = m.sender_id === profile.id ? m.receiver_id : m.sender_id;
    const c = porAlumno[otroId];
    if(!c) return; // solo conversaciones con sus alumnos asignados
    if(!c.ultimo) c.ultimo = m;
    if(m.receiver_id === profile.id && !m.read_at) c.sinLeer++;
  });
  const convs = Object.values(porAlumno).sort((a, b) => {
    if((b.sinLeer > 0) !== (a.sinLeer > 0)) return b.sinLeer > 0 ? 1 : -1;
    const ta = a.ultimo ? new Date(a.ultimo.created_at).getTime() : 0;
    const tb = b.ultimo ? new Date(b.ultimo.created_at).getTime() : 0;
    if(tb !== ta) return tb - ta;
    return (a.alumno.nombre || '').localeCompare(b.alumno.nombre || '');
  });
  const totalSinLeer = convs.reduce((acc, c) => acc + c.sinLeer, 0);
  const cuando = (iso) => {
    const d = new Date(iso);
    const hoy = todayStr();
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if(fecha === hoy) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    if(fecha === addDaysStr(hoy, -1)) return 'Ayer';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };
  root().innerHTML = `
    <button type="button" class="back-link" id="btn-buzon-volver">${ICONS.arrowLeft} Volver</button>
    <div class="buzon-head">
      <span class="buzon-head-icon">${ICONS.inbox}</span>
      <div><h1 style="font-size:20px; margin:0;">Buzón de mensajes</h1>
      <div class="sub" style="margin:2px 0 0;">${totalSinLeer ? `${totalSinLeer} mensaje${totalSinLeer === 1 ? '' : 's'} sin leer` : 'Estás al día con tus alumnos'}</div></div>
    </div>
    ${convs.length ? `<div class="buzon-lista">${convs.map(c => `
      <button type="button" class="buzon-item ${c.sinLeer ? 'tiene-nuevos' : ''}" data-id="${c.alumno.id}">
        ${renderProfileAvatar(c.alumno, 'avatar-chat')}
        <span class="buzon-texto">
          <b>${escapeHtml(c.alumno.nombre || 'Alumno')}</b>
          <small>${c.ultimo ? `${c.ultimo.sender_id === profile.id ? 'Tú: ' : ''}${escapeHtml(c.ultimo.contenido.length > 70 ? c.ultimo.contenido.slice(0, 70) + '…' : c.ultimo.contenido)}` : 'Sin mensajes todavía · toca para escribirle'}</small>
        </span>
        <span class="buzon-meta">${c.ultimo ? `<time>${cuando(c.ultimo.created_at)}</time>` : ''}${c.sinLeer ? `<strong>${c.sinLeer}</strong>` : ''}</span>
      </button>`).join('')}</div>`
      : `<div class="card">${emptyKiloHtml('Todavía no tienes alumnos asignados. Cuando te asignen alumnos, sus conversaciones van a aparecer aquí.', 'espera', 'padding:16px;')}</div>`}
  `;
  document.getElementById('btn-buzon-volver').onclick = renderCoachHome;
  document.querySelectorAll('.buzon-item').forEach(btn => {
    btn.onclick = () => renderChat(btn.dataset.id, renderBuzonProfesor);
  });
  subscribeSocialNotifications(renderBuzonProfesor);
}

// Qué burbuja animar la próxima vez que se dibuje el chat: 'theirs' (llegó un
// mensaje) o 'mine' (lo acabas de enviar).
let chatAnimarUltimo = null;
async function renderChat(contactId, returnView){
  cleanupSocialRealtime();
  root().innerHTML = '<div class="loading">Abriendo conversación...</div>';
  const volver = typeof returnView === 'function' ? returnView : (profile.role === 'alumno' ? renderAlumnoHome : renderCoachHome);
  const { data: rows, error: profileError } = await sb.rpc('obtener_contacto_chat', { target_id:contactId });
  const contact = rows && rows[0];
  if(profileError || !contact){ showToast('Esta conversación no está disponible'); volver(); return; }
  await sb.rpc('marcar_mensajes_leidos', { companero_id:contactId });
  const { data: messages, error } = await sb.from('mensajes').select('*')
    .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${profile.id})`)
    .order('created_at', {ascending:true}).limit(250);
  if(error){ showToast('No se pudo abrir el chat'); volver(); return; }
  const esChatProfesional = contact.tipo_relacion === 'profesor_alumno';
  const relationLabel = esChatProfesional ? (contact.role === 'profesor' ? 'Tu profesor' : 'Tu alumno') : `Usuario: @${escapeHtml(contact.username || '')}`;
  root().innerHTML = `
    <div class="chat-shell">
      <header class="chat-header"><button type="button" class="back-link" id="btn-chat-back">${ICONS.arrowLeft}</button>${renderProfileAvatar(contact,'avatar-chat')}<div><b>${escapeHtml(contact.nombre)}</b><small>${relationLabel}</small></div></header>
      <div class="chat-safety-note">${esChatProfesional ? 'Canal privado entre profesor y alumno. Nadie más puede leer ni modificar esta conversación.' : 'Solo ustedes pueden ver esta conversación. Puedes bloquear o eliminar al compañero desde su perfil.'}</div>
      <div class="chat-messages" id="chat-messages">${renderChatMessages(messages || [])}</div>
      <form class="chat-compose ${esChatProfesional ? (profile.role === 'alumno' ? 'con-medios con-video' : 'con-medios') : ''}" id="chat-compose">
        ${esChatProfesional ? `<button type="button" class="chat-media-btn" id="btn-chat-audio" aria-label="Grabar mensaje de voz">${ICONS.mic}</button>` : ''}
        ${esChatProfesional && profile.role === 'alumno' ? `<button type="button" class="chat-media-btn" id="btn-chat-video" aria-label="Grabar video de técnica">${ICONS.camera}</button>` : ''}
        <textarea id="chat-input" maxlength="2000" rows="1" placeholder="Escribe un mensaje..."></textarea><button type="submit" aria-label="Enviar mensaje">${ICONS.arrowLeft}</button>
      </form>
    </div>`;
  document.getElementById('btn-chat-back').onclick = volver;
  document.getElementById('chat-compose').onsubmit = e => { e.preventDefault(); sendChatMessage(contactId, volver); };
  const btnAudio = document.getElementById('btn-chat-audio');
  if(btnAudio) btnAudio.onclick = () => iniciarGrabacionAudio(contactId, volver);
  const btnVideo = document.getElementById('btn-chat-video');
  if(btnVideo) btnVideo.onclick = () => abrirGrabadorVideo(contactId, volver);
  conectarMediosChat(contactId, volver);
  limpiarMediosVencidos();
  scrollChatToBottom();
  if(chatAnimarUltimo){
    const burbujas = document.querySelectorAll(`#chat-messages .chat-bubble.${chatAnimarUltimo}`);
    const ultima = burbujas[burbujas.length - 1];
    if(ultima) ultima.classList.add('chat-nueva');
    if(chatAnimarUltimo === 'theirs' && window.UCKilo){ window.UCKilo.sonido('mensaje'); window.UCKilo.vibrar([200, 100, 200]); }
    chatAnimarUltimo = null;
  }
  socialRealtimeChannel = sb.channel(`chat-${profile.id}-${contactId}`).on('postgres_changes', {event:'INSERT',schema:'public',table:'mensajes',filter:`receiver_id=eq.${profile.id}`}, payload => {
    if(payload.new.sender_id === contactId){ chatAnimarUltimo = 'theirs'; renderChat(contactId, volver); }
  }).subscribe();
}

function renderChatMessages(messages){
  if(!messages.length) return '<div class="chat-empty">Todavía no hay mensajes. Puedes empezar saludando 👋</div>';
  return messages.map(m => `<div class="chat-bubble ${m.sender_id === profile.id ? 'mine' : 'theirs'}${m.tipo === 'audio' || m.tipo === 'video' ? ' chat-media' : ''}">${chatContenidoHtml(m)}<time>${new Date(m.created_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join('');
}
function scrollChatToBottom(){
  const holder = document.getElementById('chat-messages');
  if(holder) holder.scrollTop = holder.scrollHeight;
}
async function sendChatMessage(contactId, returnView){
  const input = document.getElementById('chat-input');
  const contenido = input.value.trim();
  if(!contenido) return;
  input.disabled = true;
  const { data: enviado, error } = await sb.from('mensajes').insert({ sender_id:profile.id, receiver_id:contactId, contenido }).select('id').single();
  if(error){ input.disabled=false; showToast('No se pudo enviar'); return; }
  avisarPush({ tipo:'mensaje', mensaje_id: enviado.id });
  chatAnimarUltimo = 'mine';
  renderChat(contactId, returnView);
}


// ---------- MENSAJES DE VOZ Y VIDEOS DE TÉCNICA (chat profesor ↔ alumno) ----------
// Voz: profe y alumno. Duran 7 días y después se borran.
// Video: solo alumno → su profe. Máximo 45 s, el profe lo ve máximo 2 veces
// y se borra al completar las vistas o a las 24 h.
// Los archivos van a buckets privados de Supabase (chat-audios / chat-videos);
// la base fija el vencimiento y valida quién puede enviar (schema_chat_audios.sql
// y schema_chat_videos.sql). La app borra lo vencido al abrir el chat o la app.
const AUDIO_MAX_SEG = 60;
const VIDEO_MAX_SEG = 45;
const VIDEO_MAX_BYTES = 15 * 1024 * 1024;

function elegirMimeGrabacion(tipos){
  if(!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for(const t of tipos){ try { if(MediaRecorder.isTypeSupported(t)) return t; } catch(e){} }
  return '';
}
function extensionDeMime(mime, esVideo){
  const base = (mime || '').split(';')[0];
  if(base.includes('mp4')) return esVideo ? 'mp4' : 'm4a';
  if(base.includes('ogg')) return 'ogg';
  if(base.includes('quicktime')) return 'mov';
  return 'webm';
}
function formatoSeg(seg){
  seg = Math.max(0, Math.round(seg || 0));
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
}
function idAleatorio(){
  try { return crypto.randomUUID(); } catch(e){ return Date.now().toString(36) + Math.random().toString(36).slice(2); }
}

function chatContenidoHtml(m){
  const mio = m.sender_id === profile.id;
  if(m.tipo === 'audio'){
    const vencido = m.audio_borrado || (m.expira_at && new Date(m.expira_at) < new Date());
    if(vencido || !m.audio_path) return `<span class="chat-media-vencido">🎤 Mensaje de voz · ya no disponible</span>`;
    const dias = Math.max(1, Math.ceil((new Date(m.expira_at) - new Date()) / 86400000));
    return `<span class="chat-audio"><button type="button" class="chat-audio-play" data-audio-id="${m.id}" data-path="${escapeHtml(m.audio_path)}" aria-label="Reproducir mensaje de voz">${ICONS.play}</button>
      <span class="chat-audio-info"><b>Mensaje de voz</b><small>${formatoSeg(m.audio_duracion_seg)} · se borra en ${dias} día${dias === 1 ? '' : 's'}</small></span></span>`;
  }
  if(m.tipo === 'video'){
    const vistas = m.video_vistas || 0;
    const vencido = m.video_borrado || vistas >= 2 || (m.expira_at && new Date(m.expira_at) < new Date());
    if(vencido) return `<span class="chat-media-vencido">🎥 Video de técnica · ${vistas >= 2 ? 'visto 2/2' : 'vencido'} · ya no disponible</span>`;
    const horas = Math.max(1, Math.ceil((new Date(m.expira_at) - new Date()) / 3600000));
    if(mio) return `<span class="chat-video-info">🎥 <b>Video de técnica</b><small>${formatoSeg(m.video_duracion_seg)} · el profe lo vio ${vistas}/2 · se borra en ${horas} h</small></span>`;
    return `<button type="button" class="chat-video-ver" data-video-id="${m.id}">▶ Ver video de técnica</button>
      <small class="chat-video-quedan">${formatoSeg(m.video_duracion_seg)} · puedes verlo ${2 - vistas} ${2 - vistas === 1 ? 'vez' : 'veces'} más · se borra en ${horas} h</small>`;
  }
  return `<span>${escapeHtml(m.contenido)}</span>`;
}

// Reproducción de audios y apertura de videos dentro del chat
let chatAudioActual = null;
function conectarMediosChat(contactId, volver){
  if(chatAudioActual){ try { chatAudioActual.audio.pause(); } catch(e){} chatAudioActual = null; }
  document.querySelectorAll('.chat-audio-play').forEach(btn => {
    btn.onclick = async () => {
      if(chatAudioActual && chatAudioActual.btn === btn){
        if(chatAudioActual.audio.paused){ chatAudioActual.audio.play(); btn.classList.add('sonando'); }
        else { chatAudioActual.audio.pause(); btn.classList.remove('sonando'); }
        return;
      }
      if(chatAudioActual){ chatAudioActual.audio.pause(); chatAudioActual.btn.classList.remove('sonando'); }
      btn.disabled = true;
      const { data, error } = await sb.storage.from('chat-audios').createSignedUrl(btn.dataset.path, 600);
      btn.disabled = false;
      if(error || !data){ showToast('Este mensaje de voz ya no está disponible'); return; }
      const audio = new Audio(data.signedUrl);
      chatAudioActual = { audio, btn };
      btn.classList.add('sonando');
      audio.onended = () => { btn.classList.remove('sonando'); chatAudioActual = null; };
      audio.onerror = () => { btn.classList.remove('sonando'); chatAudioActual = null; showToast('No se pudo reproducir en este celular'); };
      audio.play().catch(() => { btn.classList.remove('sonando'); showToast('Toca de nuevo para escuchar'); });
    };
  });
  document.querySelectorAll('.chat-video-ver').forEach(btn => {
    btn.onclick = () => verVideoTecnica(btn.dataset.videoId, contactId, volver, btn);
  });
}

async function subirMedioYEnviar({ bucket, blob, mime, esVideo, contactId, duracion, volver }){
  const ext = extensionDeMime(mime, esVideo);
  const path = `${profile.id}/${contactId}/${idAleatorio()}.${ext}`;
  const contentType = (mime || blob.type || (esVideo ? 'video/webm' : 'audio/webm')).split(';')[0];
  const { error: errSubida } = await sb.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if(errSubida){ showToast('No se pudo subir: ' + (errSubida.message || 'revisa tu conexión')); return false; }
  const fila = esVideo
    ? { sender_id: profile.id, receiver_id: contactId, contenido: '🎥 Video de técnica', tipo: 'video', video_path: path, video_duracion_seg: Math.max(1, Math.round(duracion)) }
    : { sender_id: profile.id, receiver_id: contactId, contenido: '🎤 Mensaje de voz', tipo: 'audio', audio_path: path, audio_duracion_seg: Math.max(1, Math.round(duracion)) };
  const { data: enviado, error } = await sb.from('mensajes').insert(fila).select('id').single();
  if(error){
    try { await sb.storage.from(bucket).remove([path]); } catch(e){}
    showToast('No se pudo enviar: ' + error.message);
    return false;
  }
  avisarPush({ tipo:'mensaje', mensaje_id: enviado.id });
  chatAnimarUltimo = 'mine';
  renderChat(contactId, volver);
  return true;
}

// ----- Grabación de voz -----
async function iniciarGrabacionAudio(contactId, volver){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
    showToast('Este celular no permite grabar audio desde la app'); return;
  }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch(e){ showToast('Permite el acceso al micrófono para enviar mensajes de voz'); return; }
  const mime = elegirMimeGrabacion(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']);
  let rec;
  try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); }
  catch(e){ stream.getTracks().forEach(t => t.stop()); showToast('No se pudo iniciar la grabación'); return; }
  const partes = [];
  const inicio = Date.now();
  let cancelado = false, enviarAlParar = false;
  const compose = document.getElementById('chat-compose');
  const barra = document.createElement('div');
  barra.className = 'chat-grabando';
  barra.innerHTML = `<span class="chat-grabando-punto"></span><span class="chat-grabando-tiempo" id="chat-grabando-tiempo">0:00</span><small>máx. ${formatoSeg(AUDIO_MAX_SEG)}</small>
    <button type="button" class="chat-grabando-cancelar" id="btn-audio-cancelar">Cancelar</button>
    <button type="button" class="chat-grabando-enviar" id="btn-audio-enviar">Enviar</button>`;
  compose.style.display = 'none';
  compose.parentNode.insertBefore(barra, compose.nextSibling);
  const reloj = setInterval(() => {
    const seg = (Date.now() - inicio) / 1000;
    const t = document.getElementById('chat-grabando-tiempo');
    if(t) t.textContent = formatoSeg(seg);
    if(seg >= AUDIO_MAX_SEG && rec.state === 'recording'){ enviarAlParar = true; rec.stop(); }
  }, 250);
  const terminar = () => { clearInterval(reloj); stream.getTracks().forEach(t => t.stop()); };
  rec.ondataavailable = e => { if(e.data && e.data.size) partes.push(e.data); };
  rec.onstop = async () => {
    terminar();
    const duracion = (Date.now() - inicio) / 1000;
    if(cancelado || !enviarAlParar){ barra.remove(); compose.style.display = ''; return; }
    if(duracion < 1){ barra.remove(); compose.style.display = ''; showToast('El audio fue muy corto'); return; }
    barra.innerHTML = `<span class="chat-grabando-tiempo">Enviando mensaje de voz…</span>`;
    const blob = new Blob(partes, { type: rec.mimeType || mime || 'audio/webm' });
    const ok = await subirMedioYEnviar({ bucket: 'chat-audios', blob, mime: rec.mimeType || mime, esVideo: false, contactId, duracion, volver });
    if(!ok){ barra.remove(); compose.style.display = ''; }
  };
  barra.querySelector('#btn-audio-cancelar').onclick = () => { cancelado = true; if(rec.state === 'recording') rec.stop(); else { terminar(); barra.remove(); compose.style.display = ''; } };
  barra.querySelector('#btn-audio-enviar').onclick = () => { enviarAlParar = true; if(rec.state === 'recording') rec.stop(); };
  rec.start(500);
  if(window.UCKilo) window.UCKilo.vibrar(20);
}

// ----- Grabación de video de técnica (alumno) -----
async function abrirGrabadorVideo(contactId, volver){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
    showToast('Este celular no permite grabar video desde la app'); return;
  }
  const ayudaInicial = 'Apoya el celular y grábate de lado, con el cuerpo completo. Tu profe podrá verlo 2 veces y se borra en 24 h.';
  const capa = document.createElement('div');
  capa.className = 'video-grabador';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Grabar video de técnica');
  capa.innerHTML = `
    <div class="video-grabador-top">
      <button type="button" class="video-grabador-x" id="vg-cerrar" aria-label="Cerrar">✕</button>
      <span>Video de técnica · máx. ${VIDEO_MAX_SEG} s</span>
      <button type="button" class="video-grabador-x" id="vg-girar" aria-label="Cambiar cámara">⟲</button>
    </div>
    <video id="vg-vista" playsinline muted autoplay></video>
    <div class="video-grabador-tiempo" id="vg-tiempo">${formatoSeg(VIDEO_MAX_SEG)}</div>
    <div class="video-grabador-ayuda" id="vg-ayuda">${ayudaInicial}</div>
    <div class="video-grabador-acciones" id="vg-acciones">
      <button type="button" class="video-grabador-rec" id="vg-rec" aria-label="Empezar a grabar"></button>
    </div>`;
  document.body.appendChild(capa);
  const vista = capa.querySelector('#vg-vista');
  let camara = 'environment', stream = null, rec = null, partes = [], inicio = 0, reloj = null, blobFinal = null, mimeFinal = '', duracionFinal = 0, urlPrevia = null, cerrado = false;
  const pararStream = () => { if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } };
  const cerrar = () => {
    cerrado = true;
    if(reloj) clearInterval(reloj);
    try { if(rec && rec.state === 'recording'){ rec.onstop = null; rec.stop(); } } catch(e){}
    pararStream();
    if(urlPrevia) URL.revokeObjectURL(urlPrevia);
    capa.remove();
  };
  const abrirCamara = async () => {
    pararStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: camara }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        audio: true
      });
      if(cerrado){ pararStream(); return; }
      vista.srcObject = stream; vista.muted = true; vista.controls = false;
      vista.classList.toggle('espejo', camara === 'user');
      await vista.play().catch(() => {});
    } catch(e){ showToast('Permite el acceso a la cámara para grabar tu técnica'); cerrar(); }
  };
  const resetAcciones = () => {
    capa.querySelector('#vg-tiempo').textContent = formatoSeg(VIDEO_MAX_SEG);
    capa.querySelector('#vg-ayuda').textContent = ayudaInicial;
    capa.querySelector('#vg-acciones').innerHTML = `<button type="button" class="video-grabador-rec" id="vg-rec" aria-label="Empezar a grabar"></button>`;
    capa.querySelector('#vg-rec').onclick = alternarGrabacion;
  };
  const mostrarRevision = () => {
    urlPrevia = URL.createObjectURL(blobFinal);
    vista.srcObject = null; vista.src = urlPrevia; vista.muted = false; vista.controls = true; vista.classList.remove('espejo');
    const mb = (blobFinal.size / 1048576).toFixed(1);
    capa.querySelector('#vg-ayuda').textContent = `Revisa tu video (${formatoSeg(duracionFinal)} · ${mb} MB). Si se ve bien, envíaselo a tu profe.`;
    capa.querySelector('#vg-acciones').innerHTML = `<button type="button" class="btn-sm" id="vg-repetir">Repetir</button><button type="button" class="btn" id="vg-enviar">Enviar al profe</button>`;
    capa.querySelector('#vg-repetir').onclick = async () => {
      if(urlPrevia){ URL.revokeObjectURL(urlPrevia); urlPrevia = null; }
      vista.removeAttribute('src'); vista.load();
      resetAcciones();
      await abrirCamara();
    };
    capa.querySelector('#vg-enviar').onclick = async () => {
      if(blobFinal.size > VIDEO_MAX_BYTES){ showToast('El video quedó muy pesado. Graba uno más corto (menos de 30 s).'); return; }
      const b = capa.querySelector('#vg-enviar'); b.disabled = true; b.textContent = 'Enviando…';
      capa.querySelector('#vg-repetir').disabled = true;
      const ok = await subirMedioYEnviar({ bucket: 'chat-videos', blob: blobFinal, mime: mimeFinal, esVideo: true, contactId, duracion: duracionFinal, volver });
      if(ok){ showToast('Video enviado a tu profe 🎥'); cerrar(); }
      else { b.disabled = false; b.textContent = 'Enviar al profe'; capa.querySelector('#vg-repetir').disabled = false; }
    };
  };
  function alternarGrabacion(){
    const btn = capa.querySelector('#vg-rec');
    if(rec && rec.state === 'recording'){ rec.stop(); return; }
    if(!stream) return;
    mimeFinal = elegirMimeGrabacion(['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']);
    try { rec = new MediaRecorder(stream, mimeFinal ? { mimeType: mimeFinal, videoBitsPerSecond: 650000, audioBitsPerSecond: 32000 } : { videoBitsPerSecond: 650000, audioBitsPerSecond: 32000 }); }
    catch(e){ showToast('No se pudo iniciar la grabación'); return; }
    partes = [];
    rec.ondataavailable = e => { if(e.data && e.data.size) partes.push(e.data); };
    rec.onstop = () => {
      clearInterval(reloj); reloj = null;
      duracionFinal = Math.min(VIDEO_MAX_SEG, (Date.now() - inicio) / 1000);
      mimeFinal = rec.mimeType || mimeFinal || 'video/webm';
      blobFinal = new Blob(partes, { type: mimeFinal });
      pararStream();
      if(duracionFinal < 2){ showToast('El video fue muy corto'); resetAcciones(); abrirCamara(); return; }
      mostrarRevision();
    };
    inicio = Date.now();
    rec.start(1000);
    btn.classList.add('grabando');
    btn.setAttribute('aria-label', 'Detener grabación');
    capa.querySelector('#vg-ayuda').textContent = 'Grabando… toca de nuevo para terminar.';
    reloj = setInterval(() => {
      const quedan = VIDEO_MAX_SEG - (Date.now() - inicio) / 1000;
      capa.querySelector('#vg-tiempo').textContent = formatoSeg(Math.max(0, quedan));
      if(quedan <= 0 && rec && rec.state === 'recording') rec.stop();
    }, 250);
  }
  capa.querySelector('#vg-cerrar').onclick = cerrar;
  capa.querySelector('#vg-girar').onclick = () => {
    if(rec && rec.state === 'recording') return;
    if(blobFinal && urlPrevia) return;
    camara = camara === 'environment' ? 'user' : 'environment';
    abrirCamara();
  };
  capa.querySelector('#vg-rec').onclick = alternarGrabacion;
  await abrirCamara();
}

// ----- El profe ve el video (máx. 2 veces) -----
async function verVideoTecnica(mensajeId, contactId, volver, btn){
  if(btn){ btn.disabled = true; btn.textContent = 'Abriendo…'; }
  const { data, error } = await sb.rpc('ver_video_tecnica', { mensaje_id: mensajeId });
  const fila = data && data[0];
  if(error || !fila || !fila.video_path){
    showToast('Este video ya no está disponible');
    renderChat(contactId, volver);
    return;
  }
  const { data: firmado, error: errUrl } = await sb.storage.from('chat-videos').createSignedUrl(fila.video_path, 300);
  if(errUrl || !firmado){ showToast('No se pudo abrir el video'); renderChat(contactId, volver); return; }
  const capa = document.createElement('div');
  capa.className = 'video-grabador video-visor';
  capa.innerHTML = `
    <div class="video-grabador-top">
      <button type="button" class="video-grabador-x" id="vv-cerrar" aria-label="Cerrar">✕</button>
      <span>Video de técnica · vista ${fila.vistas} de 2</span><span></span>
    </div>
    <video id="vv-video" playsinline controls autoplay></video>
    <div class="video-grabador-ayuda">${fila.ultima ? 'Esta es la última vez: al cerrar, el video se borra.' : 'Te queda 1 vista más. Se borra en 24 h aunque no lo vuelvas a ver.'}</div>`;
  document.body.appendChild(capa);
  const v = capa.querySelector('#vv-video');
  v.src = firmado.signedUrl;
  v.play().catch(() => {});
  capa.querySelector('#vv-cerrar').onclick = async () => {
    v.pause(); v.removeAttribute('src'); v.load();
    capa.remove();
    if(fila.ultima){
      try {
        await sb.storage.from('chat-videos').remove([fila.video_path]);
        await sb.rpc('marcar_medios_borrados', { ids: [mensajeId] });
      } catch(e){}
    }
    renderChat(contactId, volver);
  };
}

// ----- Limpieza de audios y videos vencidos (máx. 1 vez cada 10 min por celular) -----
async function limpiarMediosVencidos(){
  if(!profile) return;
  try {
    const ultima = Number(sessionStorage.getItem('uc_limpieza_medios') || 0);
    if(Date.now() - ultima < 10 * 60 * 1000) return;
    sessionStorage.setItem('uc_limpieza_medios', String(Date.now()));
  } catch(e){}
  try {
    const { data, error } = await sb.rpc('mis_medios_vencidos');
    if(error || !data || !data.length) return;
    const porBucket = {};
    data.forEach(f => { if(f.ruta){ (porBucket[f.bucket] = porBucket[f.bucket] || []).push(f.ruta); } });
    for(const [bucket, rutas] of Object.entries(porBucket)){
      await sb.storage.from(bucket).remove(rutas);
    }
    await sb.rpc('marcar_medios_borrados', { ids: data.map(f => f.id) });
  } catch(e){ /* se reintenta la próxima vez */ }
}

// ---------- FICHA DE INGRESO ----------
// Tabla fichas_ingreso (schema_ficha_ingreso.sql). Solo la ven el alumno,
// su profesor asignado y el súper admin (RLS).
const FICHA_PREGUNTAS = [
  { sec: 'Tu experiencia' },
  { k: 'experiencia', t: '¿Cuánto tiempo llevas entrenando?', op: ['Nunca he entrenado', 'Menos de 6 meses', 'Entre 6 meses y 2 años', 'Más de 2 años'] },
  { k: 'objetivo', t: '¿Cuál es tu objetivo principal?', op: ['Bajar grasa', 'Ganar músculo', 'Fuerza', 'Salud y bienestar', 'Rendimiento deportivo', 'Otro'] },
  { k: 'dias', t: '¿Cuántos días a la semana puedes entrenar?', op: ['1 a 2', '3', '4', '5 o más'] },
  { k: 'tecnica', t: '¿Conoces la técnica de los ejercicios básicos (sentadilla, press, remo)?', op: ['Sí, bien', 'Más o menos', 'No'] },
  { sec: 'Tu día a día' },
  { k: 'trabajo', t: 'Tu trabajo o estudio es principalmente…', op: ['Sentado', 'De pie', 'Físico / cargando peso'] },
  { k: 'sueno', t: '¿Cuántas horas duermes normalmente?', op: ['Menos de 6', '6 a 7', '7 a 8', 'Más de 8'] },
  { k: 'estres', t: '¿Cómo está tu nivel de estrés?', op: ['Bajo', 'Medio', 'Alto'] },
  { k: 'otra_actividad', t: '¿Haces otro deporte o actividad física? ¿Cuál?', txt: true },
  { sec: 'Tu salud' },
  { k: 'q1', t: '¿Algún médico te ha dicho que tienes un problema al corazón o presión alta?', sn: true },
  { k: 'q2', t: '¿Sientes dolor en el pecho en reposo, en tu día a día o al hacer ejercicio?', sn: true },
  { k: 'q3', t: '¿En los últimos 12 meses has perdido el equilibrio por mareo o has perdido el conocimiento?', sn: true },
  { k: 'q4', t: '¿Te han diagnosticado otra enfermedad crónica?', sn: true },
  { k: 'q5', t: '¿Tomas medicamentos recetados para alguna enfermedad crónica?', sn: true },
  { k: 'q6', t: '¿Tienes algún problema de huesos, articulaciones o músculos que pueda empeorar con el ejercicio?', sn: true },
  { k: 'q7', t: '¿Algún médico te ha dicho que solo hagas actividad física con supervisión médica?', sn: true },
  { k: 'lesiones', t: 'Lesiones, cirugías o dolores que tu profe deba conocer', txt: true },
  { k: 'extra', t: '¿Algo más que quieras contarle a tu profe?', txt: true }
];
const FICHA_SALUD = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];

function fichaAlertas(resp){
  return FICHA_SALUD.filter(k => (resp || {})[k] === 'Sí');
}

async function cargarFicha(alumnoId){
  const { data, error } = await sb.from('fichas_ingreso').select('*').eq('alumno_id', alumnoId).maybeSingle();
  if(error) console.warn('ficha', error.message);
  return data || null;
}

// Formulario (lo usan el alumno y el profe). paraAlumnoId = dueño de la ficha.
function abrirFormularioFicha(paraAlumnoId, respuestasPrevias, alGuardar){
  const resp = { ...(respuestasPrevias || {}) };
  const esProfe = paraAlumnoId !== profile.id;
  const ov = document.createElement('div');
  ov.className = 'ficha-overlay';
  ov.innerHTML = `
    <div class="ficha-panel">
      <div class="ficha-head">
        <div><small>${esProfe ? 'COMPLETANDO CON TU ALUMNO' : 'OPCIONAL · 3 MINUTOS'}</small><h2>Ficha de ingreso</h2></div>
        <button type="button" class="ficha-cerrar" aria-label="Cerrar">✕</button>
      </div>
      <p class="ficha-privado">🔒 Solo ${esProfe ? 'el alumno, tú' : 'tú, tu profe'} y la administración pueden ver esta ficha.</p>
      ${FICHA_PREGUNTAS.map(p => {
        if(p.sec) return `<h3 class="ficha-sec">${escapeHtml(p.sec)}</h3>`;
        const ops = p.sn ? ['No', 'Sí'] : p.op;
        return `<div class="ficha-q${p.sn ? ' ficha-q-salud' : ''}"><label>${escapeHtml(p.t)}${p.sn ? ' <b class="ficha-req">*</b>' : ''}</label>
          ${p.txt
            ? `<textarea data-k="${p.k}" rows="2" maxlength="600">${escapeHtml(resp[p.k] || '')}</textarea>`
            : `<div class="ficha-ops">${ops.map(o => `<button type="button" class="ficha-op${resp[p.k] === o ? ' sel' : ''}${p.sn && o === 'Sí' ? ' si' : ''}" data-k="${p.k}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div>`}
        </div>`;
      }).join('')}
      <div class="ficha-aviso-medico">Si respondes <b>Sí</b> en alguna pregunta de salud, tu profe te recomendará una evaluación médica antes de subir la intensidad.</div>
      <button type="button" class="btn" id="btn-guardar-ficha">${ICONS.check} Guardar ficha</button>
    </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('.ficha-cerrar').onclick = cerrar;
  ov.querySelectorAll('.ficha-op').forEach(b => b.onclick = () => {
    resp[b.dataset.k] = b.dataset.v;
    ov.querySelectorAll(`.ficha-op[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle('sel', x === b));
  });
  ov.querySelector('#btn-guardar-ficha').onclick = async (e) => {
    ov.querySelectorAll('textarea[data-k]').forEach(t => { resp[t.dataset.k] = t.value.trim(); });
    const falta = FICHA_SALUD.find(k => !resp[k]);
    if(falta){
      showToast('Responde las 7 preguntas de salud (Sí o No)');
      const el = ov.querySelector(`.ficha-op[data-k="${falta}"]`);
      if(el) el.closest('.ficha-q').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    e.target.disabled = true;
    const { error } = await sb.from('fichas_ingreso').upsert({ alumno_id: paraAlumnoId, respuestas: resp, completada_at: new Date().toISOString() }, { onConflict: 'alumno_id' });
    e.target.disabled = false;
    if(error){ showToast('No se pudo guardar la ficha: ' + error.message); return; }
    showToast('Ficha guardada ✓');
    cerrar();
    if(alGuardar) alGuardar();
  };
}

// Vista de lectura para el alumno. Evita que entre directamente al modo de
// edición cada vez que solo quiere consultar sus respuestas.
function abrirVistaFichaAlumno(ficha){
  if(!ficha || !ficha.completada_at){
    abrirFormularioFicha(profile.id, (ficha && ficha.respuestas) || {}, mostrarFichaAlumno);
    return;
  }
  const resp = ficha.respuestas || {};
  const alertas = fichaAlertas(resp);
  const ov = document.createElement('div');
  ov.className = 'ficha-overlay';
  ov.innerHTML = `
    <div class="ficha-panel ficha-panel-lectura">
      <div class="ficha-head">
        <div><small>MI INFORMACIÓN</small><h2>Mi ficha de ingreso</h2></div>
        <button type="button" class="ficha-cerrar" aria-label="Cerrar">✕</button>
      </div>
      <p class="ficha-privado">🔒 Solo tú, tu profe y la administración pueden ver esta ficha.</p>
      <div class="ficha-vista-fecha">${ICONS.check} Completada el ${formatDateShort(ficha.completada_at.slice(0,10))}</div>
      ${alertas.length ? `<div class="ficha-alerta">Tienes ${alertas.length} respuesta${alertas.length === 1 ? '' : 's'} de salud marcada${alertas.length === 1 ? '' : 's'} como <b>Sí</b>. Coméntalas con tu profesor.</div>` : ''}
      <dl class="ficha-respuestas ficha-respuestas-alumno">
        ${FICHA_PREGUNTAS.map(p => {
          if(p.sec) return `<h3 class="ficha-sec">${escapeHtml(p.sec)}</h3>`;
          const v = resp[p.k];
          if(!v) return '';
          return `<div class="ficha-respuesta-item"><dt>${escapeHtml(p.t)}</dt><dd class="${p.sn && v === 'Sí' ? 'ficha-si' : ''}">${escapeHtml(v)}</dd></div>`;
        }).join('')}
      </dl>
      <button type="button" class="btn ficha-editar-alumno" id="btn-editar-ficha-alumno">${ICONS.edit} Editar ficha</button>
    </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('.ficha-cerrar').onclick = cerrar;
  ov.querySelector('#btn-editar-ficha-alumno').onclick = () => {
    cerrar();
    abrirFormularioFicha(profile.id, resp, mostrarFichaAlumno);
  };
}

// Acceso permanente en el inicio del alumno. Cambia su mensaje según si está
// pendiente, fue solicitada por el profesor o ya está completada.
async function mostrarFichaAlumno(){
  const holder = document.getElementById('ficha-aviso-holder');
  const completadaHolder = document.getElementById('ficha-completada-holder');
  if(!holder || !completadaHolder) return;
  const ficha = await cargarFicha(profile.id);
  const completada = !!(ficha && ficha.completada_at);
  const solicitada = !!(ficha && ficha.solicitada_at && !completada);
  if(completada){
    holder.innerHTML = '';
    completadaHolder.innerHTML = `
      <button type="button" class="btn-toggle-rutina section-intake ficha-completada-row" id="btn-abrir-ficha">
        <span class="toggle-label">${ICONS.clipboard} Ficha de ingreso <small>Completada · ${formatDateShort(ficha.completada_at.slice(0,10))}</small></span>
        ${toggleStateHtml('Ver')}
      </button>`;
    document.getElementById('btn-abrir-ficha').onclick = () => abrirVistaFichaAlumno(ficha);
    return;
  }
  completadaHolder.innerHTML = '';
  const kicker = completada ? 'FICHA COMPLETADA' : solicitada ? 'TU PROFESOR TE LA PIDIÓ' : 'TU PUNTO DE PARTIDA';
  const titulo = completada ? 'Revisa o actualiza tu ficha' : 'Completa tu ficha de ingreso';
  const detalle = completada
    ? `Actualizada el ${formatDateShort(ficha.completada_at.slice(0,10))} · solo tú y tu profesor pueden verla`
    : '3 minutos · ayuda a personalizar tu entrenamiento';
  holder.innerHTML = `
    <button type="button" class="ficha-aviso-card ${completada ? 'is-complete' : ''}" id="btn-abrir-ficha">
      <span class="ficha-aviso-icon">${ICONS.clipboard}</span>
      <span class="ficha-aviso-copy"><small>${kicker}</small><b>${titulo}</b><em>${detalle}</em></span>
      <span class="ficha-aviso-go">${ICONS.chevronRight}</span>
    </button>`;
  document.getElementById('btn-abrir-ficha').onclick = () => abrirFormularioFicha(profile.id, (ficha && ficha.respuestas) || {}, mostrarFichaAlumno);
}

// Vista del profesor dentro del alumno
async function renderFichaProfe(holderId, alumnoId, soloLectura){
  const holder = document.getElementById(holderId);
  if(!holder) return;
  holder.innerHTML = '<div class="empty">Cargando ficha…</div>';
  const ficha = await cargarFicha(alumnoId);
  const resp = (ficha && ficha.respuestas) || {};
  const recargar = () => renderFichaProfe(holderId, alumnoId, soloLectura);
  let html = '';
  if(ficha && ficha.completada_at){
    const alertas = fichaAlertas(resp);
    html += alertas.length
      ? `<div class="ficha-alerta">⚠ Respondió <b>Sí</b> en ${alertas.length} pregunta${alertas.length === 1 ? '' : 's'} de salud. Recomienda una evaluación médica antes de subir la intensidad.</div>`
      : `<div class="ficha-ok">${ICONS.check} Sin alertas de salud</div>`;
    html += `<div class="sub">Completada el ${formatDateShort(ficha.completada_at.slice(0, 10))}</div><dl class="ficha-respuestas">`;
    FICHA_PREGUNTAS.forEach(p => {
      if(p.sec){ html += `<h3 class="ficha-sec">${escapeHtml(p.sec)}</h3>`; return; }
      const v = resp[p.k];
      if(!v) return;
      html += `<dt>${escapeHtml(p.t)}</dt><dd class="${p.sn && v === 'Sí' ? 'ficha-si' : ''}">${escapeHtml(v)}</dd>`;
    });
    html += '</dl>';
    if(!soloLectura) html += `<button type="button" class="btn-sm" id="btn-ficha-editar">${ICONS.edit} Editar ficha</button>`;
  } else {
    html += ficha && ficha.solicitada_at
      ? `<div class="ficha-pendiente">⏳ Se la pediste el ${formatDateShort(ficha.solicitada_at.slice(0, 10))}. Tu alumno aún no la completa.</div>`
      : `<div class="empty">Opcional. Pídele al alumno que la complete desde su app o llénala tú con él.</div>`;
    if(!soloLectura){
      html += `<div class="ficha-acciones">
        ${ficha && ficha.solicitada_at ? '' : `<button type="button" class="btn-sm" id="btn-ficha-pedir">${ICONS.message} Pedir al alumno</button>`}
        <button type="button" class="btn-sm" id="btn-ficha-llenar">${ICONS.edit} Llenarla yo ahora</button>
      </div>`;
    }
  }
  holder.innerHTML = html;
  const pedir = document.getElementById('btn-ficha-pedir');
  if(pedir) pedir.onclick = async () => {
    pedir.disabled = true;
    const { error } = await sb.from('fichas_ingreso').upsert({ alumno_id: alumnoId, solicitada_at: new Date().toISOString(), solicitada_por: profile.id }, { onConflict: 'alumno_id' });
    if(error){ pedir.disabled = false; showToast('No se pudo pedir: ' + error.message); return; }
    showToast('Listo: le aparecerá a tu alumno en su inicio');
    recargar();
  };
  const llenar = document.getElementById('btn-ficha-llenar') || document.getElementById('btn-ficha-editar');
  if(llenar) llenar.onclick = () => abrirFormularioFicha(alumnoId, resp, recargar);
}

// ---------- ENTREVISTA DE OBJETIVOS ----------
// Separada de la ficha de ingreso/anamnesis: aquí solo se guardan metas,
// disponibilidad y preferencias para que el profesor pueda diseñar la rutina.
const OBJETIVO_PRINCIPAL_OPCIONES = [
  'Ganar masa muscular', 'Bajar grasa', 'Aumentar fuerza',
  'Mejorar salud y energía', 'Rendimiento deportivo', 'Retomar el entrenamiento'
];
const OBJETIVO_DIAS_OPCIONES = ['2 días', '3 días', '4 días', '5 días', '6 días'];
const OBJETIVO_DURACION_OPCIONES = ['30–40 min', '45–60 min', '60–75 min', 'Más de 75 min'];
const OBJETIVO_INTENSIDAD_OPCIONES = ['Baja · progresiva', 'Media · desafiante', 'Alta · muy exigente'];

async function cargarEntrevistaObjetivos(alumnoId){
  const ficha = await cargarFicha(alumnoId);
  const bloque = ficha && ficha.respuestas && ficha.respuestas.entrevista_objetivos;
  return bloque || null;
}

// La entrevista vive como un bloque independiente dentro del JSON privado de
// fichas_ingreso. Así comparte exactamente los mismos permisos de la anamnesis
// sin mezclar sus respuestas ni requerir otra tabla.
async function guardarEntrevistaObjetivos(alumnoId, cambios){
  const ficha = await cargarFicha(alumnoId);
  const respuestasFicha = { ...((ficha && ficha.respuestas) || {}) };
  respuestasFicha.entrevista_objetivos = {
    ...(respuestasFicha.entrevista_objetivos || {}),
    ...cambios
  };
  return sb.from('fichas_ingreso').upsert({ alumno_id: alumnoId, respuestas: respuestasFicha }, { onConflict: 'alumno_id' });
}

function objetivoOpcionesHtml(clave, opciones, resp){
  return `<div class="objetivos-ops">${opciones.map(o => `
    <button type="button" class="objetivos-op${resp[clave] === o ? ' sel' : ''}" data-k="${clave}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>
  `).join('')}</div>`;
}

function abrirFormularioEntrevistaObjetivos(alumnoId, respuestasPrevias, alGuardar){
  const resp = { ...(respuestasPrevias || {}) };
  const esProfe = alumnoId !== profile.id;
  const ov = document.createElement('div');
  ov.className = 'ficha-overlay objetivos-overlay';
  ov.innerHTML = `
    <div class="ficha-panel objetivos-panel">
      <div class="ficha-head objetivos-head">
        <div><small>${esProfe ? 'PLANIFICANDO CON TU ALUMNO' : 'TU PLAN PARTE AQUÍ · 4 MINUTOS'}</small><h2>Entrevista de objetivos</h2></div>
        <button type="button" class="ficha-cerrar" aria-label="Cerrar">✕</button>
      </div>
      <p class="ficha-privado">🎯 Esta información orienta la rutina. La anamnesis y las lesiones se mantienen en tu ficha de ingreso.</p>

      <section class="objetivos-q">
        <span class="objetivos-num">01</span><div class="objetivos-q-body">
          <label>¿Cuál es tu objetivo principal?</label>
          ${objetivoOpcionesHtml('objetivo_principal', OBJETIVO_PRINCIPAL_OPCIONES, resp)}
          <input type="text" data-k="objetivo_principal_otro" maxlength="120" placeholder="Otro objetivo (opcional)" value="${escapeHtml(resp.objetivo_principal_otro || '')}">
        </div>
      </section>
      <section class="objetivos-q">
        <span class="objetivos-num">02</span><div class="objetivos-q-body">
          <label>¿Tienes un objetivo secundario?</label>
          <textarea data-k="objetivo_secundario" rows="2" maxlength="400" placeholder="Ejemplo: ganar músculo sin perder movilidad, mejorar postura o prepararme para una carrera.">${escapeHtml(resp.objetivo_secundario || '')}</textarea>
        </div>
      </section>
      <section class="objetivos-q">
        <span class="objetivos-num">03</span><div class="objetivos-q-body">
          <label>¿Qué te gustaría conseguir en los próximos 3 a 6 meses?</label>
          <textarea data-k="meta_mediano" rows="3" maxlength="500" placeholder="Mientras más concreto, mejor: kilos, repeticiones, constancia, energía, una prenda, una prueba deportiva…">${escapeHtml(resp.meta_mediano || '')}</textarea>
        </div>
      </section>
      <section class="objetivos-q">
        <span class="objetivos-num">04</span><div class="objetivos-q-body">
          <label>¿Cómo te gustaría verte o sentirte en un año?</label>
          <textarea data-k="meta_largo" rows="3" maxlength="500" placeholder="Tu visión a largo plazo ayuda a que la rutina tenga una dirección clara.">${escapeHtml(resp.meta_largo || '')}</textarea>
        </div>
      </section>
      <section class="objetivos-q">
        <span class="objetivos-num">05</span><div class="objetivos-q-body">
          <label>¿Cuántos días y cuánto tiempo real puedes entrenar?</label>
          <small class="objetivos-subpregunta">DÍAS POR SEMANA</small>
          ${objetivoOpcionesHtml('dias_semana', OBJETIVO_DIAS_OPCIONES, resp)}
          <small class="objetivos-subpregunta">DURACIÓN POR SESIÓN</small>
          ${objetivoOpcionesHtml('duracion_sesion', OBJETIVO_DURACION_OPCIONES, resp)}
        </div>
      </section>
      <section class="objetivos-q">
        <span class="objetivos-num">06</span><div class="objetivos-q-body">
          <label>¿Cómo quieres que se sienta tu entrenamiento?</label>
          ${objetivoOpcionesHtml('intensidad', OBJETIVO_INTENSIDAD_OPCIONES, resp)}
          <textarea data-k="disfruta" rows="2" maxlength="400" placeholder="Ejercicios o formas de entrenar que disfrutas">${escapeHtml(resp.disfruta || '')}</textarea>
          <textarea data-k="evita" rows="2" maxlength="400" placeholder="Ejercicios que no te gustan o prefieres evitar (no lesiones)">${escapeHtml(resp.evita || '')}</textarea>
          <textarea data-k="equipo" rows="2" maxlength="400" placeholder="Dónde entrenas y qué equipo tienes disponible">${escapeHtml(resp.equipo || '')}</textarea>
        </div>
      </section>
      <div class="objetivos-final">Tu profesor podrá ajustar estas respuestas contigo y usarlas como guía al crear o actualizar tu rutina.</div>
      <button type="button" class="btn objetivos-guardar" id="btn-guardar-entrevista-objetivos">${ICONS.check} Guardar entrevista</button>
    </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('.ficha-cerrar').onclick = cerrar;
  ov.querySelectorAll('.objetivos-op').forEach(b => b.onclick = () => {
    resp[b.dataset.k] = b.dataset.v;
    if(b.dataset.k === 'objetivo_principal'){
      resp.objetivo_principal_otro = '';
      const otro = ov.querySelector('[data-k="objetivo_principal_otro"]');
      if(otro) otro.value = '';
    }
    ov.querySelectorAll(`.objetivos-op[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle('sel', x === b));
  });
  ov.querySelector('#btn-guardar-entrevista-objetivos').onclick = async (e) => {
    ov.querySelectorAll('input[data-k], textarea[data-k]').forEach(el => { resp[el.dataset.k] = el.value.trim(); });
    if(resp.objetivo_principal_otro) resp.objetivo_principal = resp.objetivo_principal_otro;
    const requeridos = [
      ['objetivo_principal', 'Elige tu objetivo principal'],
      ['meta_mediano', 'Cuéntanos tu meta para los próximos meses'],
      ['meta_largo', 'Cuéntanos tu meta a largo plazo'],
      ['dias_semana', 'Elige cuántos días puedes entrenar'],
      ['duracion_sesion', 'Elige cuánto dura una sesión'],
      ['intensidad', 'Elige la exigencia que prefieres']
    ];
    const falta = requeridos.find(([k]) => !resp[k]);
    if(falta){ showToast(falta[1]); return; }
    e.target.disabled = true;
    const { error } = await guardarEntrevistaObjetivos(alumnoId, { respuestas: resp, completada_at: new Date().toISOString() });
    e.target.disabled = false;
    if(error){ showToast('No se pudo guardar la entrevista: ' + error.message); return; }
    showToast('Entrevista guardada ✓');
    cerrar();
    if(alGuardar) alGuardar();
  };
}

const ENTREVISTA_OBJETIVOS_RESUMEN = [
  ['objetivo_principal', 'Objetivo principal'], ['objetivo_secundario', 'Objetivo secundario'],
  ['meta_mediano', 'Meta a 3–6 meses'], ['meta_largo', 'Meta a un año'],
  ['dias_semana', 'Frecuencia semanal'], ['duracion_sesion', 'Tiempo por sesión'],
  ['intensidad', 'Exigencia preferida'], ['disfruta', 'Le gusta entrenar'],
  ['evita', 'Prefiere evitar'], ['equipo', 'Lugar y equipamiento']
];

function abrirVistaEntrevistaObjetivos(ficha, alumnoId, alGuardar, soloLectura){
  const resp = (ficha && ficha.respuestas) || {};
  const ov = document.createElement('div');
  ov.className = 'ficha-overlay objetivos-overlay';
  ov.innerHTML = `<div class="ficha-panel objetivos-panel objetivos-lectura">
    <div class="ficha-head objetivos-head"><div><small>MAPA DE ENTRENAMIENTO</small><h2>Entrevista de objetivos</h2></div><button type="button" class="ficha-cerrar" aria-label="Cerrar">✕</button></div>
    <div class="objetivos-destacado"><small>OBJETIVO PRINCIPAL</small><strong>${escapeHtml(resp.objetivo_principal || 'Sin definir')}</strong><span>${escapeHtml(resp.dias_semana || '')}${resp.duracion_sesion ? ` · ${escapeHtml(resp.duracion_sesion)}` : ''}${resp.intensidad ? ` · ${escapeHtml(resp.intensidad)}` : ''}</span></div>
    <dl class="ficha-respuestas objetivos-respuestas">${ENTREVISTA_OBJETIVOS_RESUMEN.slice(1).map(([k, t]) => resp[k] ? `<div class="ficha-respuesta-item"><dt>${escapeHtml(t)}</dt><dd>${escapeHtml(resp[k])}</dd></div>` : '').join('')}</dl>
    ${soloLectura ? '' : `<button type="button" class="btn" id="btn-editar-entrevista-objetivos">${ICONS.edit} Editar entrevista</button>`}
  </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('.ficha-cerrar').onclick = cerrar;
  const editar = ov.querySelector('#btn-editar-entrevista-objetivos');
  if(editar) editar.onclick = () => { cerrar(); abrirFormularioEntrevistaObjetivos(alumnoId, resp, alGuardar); };
}

async function mostrarEntrevistaObjetivosAlumno(){
  const aviso = document.getElementById('entrevista-objetivos-aviso-holder');
  const completadaHolder = document.getElementById('entrevista-objetivos-completada-holder');
  if(!aviso || !completadaHolder) return;
  const entrevista = await cargarEntrevistaObjetivos(profile.id);
  const completada = !!(entrevista && entrevista.completada_at);
  const solicitada = !!(entrevista && entrevista.solicitada_at && !completada);
  if(completada){
    aviso.innerHTML = '';
    completadaHolder.innerHTML = `<button type="button" class="btn-toggle-rutina section-goals ficha-completada-row" id="btn-abrir-entrevista-objetivos"><span class="toggle-label">${ICONS.trending} Entrevista de objetivos <small>${escapeHtml((entrevista.respuestas || {}).objetivo_principal || 'Completada')}</small></span>${toggleStateHtml('Ver')}</button>`;
    document.getElementById('btn-abrir-entrevista-objetivos').onclick = () => abrirVistaEntrevistaObjetivos(entrevista, profile.id, mostrarEntrevistaObjetivosAlumno, false);
    return;
  }
  completadaHolder.innerHTML = '';
  aviso.innerHTML = `<button type="button" class="objetivos-aviso-card" id="btn-abrir-entrevista-objetivos"><span class="objetivos-aviso-icon">${ICONS.trending}</span><span class="ficha-aviso-copy"><small>${solicitada ? 'TU PROFESOR NECESITA CONOCERTE' : 'DEFINE TU NORTE'}</small><b>Entrevista de objetivos</b><em>Metas, frecuencia y estilo de entrenamiento · 4 minutos</em></span><span class="ficha-aviso-go">${ICONS.chevronRight}</span></button>`;
  document.getElementById('btn-abrir-entrevista-objetivos').onclick = () => abrirFormularioEntrevistaObjetivos(profile.id, (entrevista && entrevista.respuestas) || {}, mostrarEntrevistaObjetivosAlumno);
}

async function renderEntrevistaObjetivosProfe(holderId, alumnoId, soloLectura){
  const holder = document.getElementById(holderId);
  if(!holder) return;
  holder.innerHTML = '<div class="empty">Cargando objetivos…</div>';
  const entrevista = await cargarEntrevistaObjetivos(alumnoId);
  const resp = (entrevista && entrevista.respuestas) || {};
  const recargar = () => renderEntrevistaObjetivosProfe(holderId, alumnoId, soloLectura);
  if(entrevista && entrevista.completada_at){
    holder.innerHTML = `<div class="objetivos-destacado"><small>OBJETIVO PRINCIPAL</small><strong>${escapeHtml(resp.objetivo_principal || 'Sin definir')}</strong><span>${escapeHtml(resp.dias_semana || '')}${resp.duracion_sesion ? ` · ${escapeHtml(resp.duracion_sesion)}` : ''}${resp.intensidad ? ` · ${escapeHtml(resp.intensidad)}` : ''}</span></div><div class="sub">Actualizada el ${formatDateShort(entrevista.completada_at.slice(0, 10))}</div><dl class="ficha-respuestas objetivos-respuestas">${ENTREVISTA_OBJETIVOS_RESUMEN.slice(1).map(([k, t]) => resp[k] ? `<div class="ficha-respuesta-item"><dt>${escapeHtml(t)}</dt><dd>${escapeHtml(resp[k])}</dd></div>` : '').join('')}</dl>${soloLectura ? '' : `<button type="button" class="btn-sm" id="btn-objetivos-editar">${ICONS.edit} Ajustar con el alumno</button>`}`;
  } else {
    holder.innerHTML = `${entrevista && entrevista.solicitada_at ? `<div class="ficha-pendiente">⏳ Se la pediste el ${formatDateShort(entrevista.solicitada_at.slice(0, 10))}. Aún no la completa.</div>` : '<div class="empty">Todavía no hay objetivos definidos. Pídele al alumno que responda o complétala con él.</div>'}${soloLectura ? '' : `<div class="ficha-acciones">${entrevista && entrevista.solicitada_at ? '' : `<button type="button" class="btn-sm" id="btn-objetivos-pedir">${ICONS.message} Pedir al alumno</button>`}<button type="button" class="btn-sm" id="btn-objetivos-llenar">${ICONS.edit} Completar ahora</button></div>`}`;
  }
  const pedir = document.getElementById('btn-objetivos-pedir');
  if(pedir) pedir.onclick = async () => {
    pedir.disabled = true;
    const { error } = await guardarEntrevistaObjetivos(alumnoId, { solicitada_at: new Date().toISOString(), solicitada_por: profile.id });
    if(error){ pedir.disabled = false; showToast('No se pudo pedir: ' + error.message); return; }
    showToast('Listo: le aparecerá al alumno en su inicio');
    recargar();
  };
  const abrir = document.getElementById('btn-objetivos-llenar') || document.getElementById('btn-objetivos-editar');
  if(abrir) abrir.onclick = () => abrirFormularioEntrevistaObjetivos(alumnoId, resp, recargar);
}

// ---------- AVISOS PUSH AL PROFESOR + RESUMEN DEL ENTRENAMIENTO ----------
let resumenPendienteId = (() => {
  try { return new URLSearchParams(location.search).get('resumen'); } catch(e){ return null; }
})();

function limpiarBadgeApp(){
  try { if(navigator.clearAppBadge) navigator.clearAppBadge(); } catch(e){}
}

// La app del alumno pide al servidor que avise a su profesor al iniciar y
// finalizar. El servidor valida que la sesión pertenezca al alumno logueado.
async function avisarProfesorEntrenamiento(sesionId, tipo){
  try {
    const { data, error } = await sb.functions.invoke('push-entrenamiento', {
      body: { sesion_id: sesionId, tipo: tipo === 'inicio' ? 'inicio' : 'fin' }
    });
    if(error) console.error('No se pudo enviar el aviso de entrenamiento', error);
    else if(data && data.enviados === 0) console.warn('Aviso sin destinatario push', data);
  } catch(e){ console.error('Falló el aviso de entrenamiento', e); }
}

function abrirResumenPendiente(){
  if(!resumenPendienteId) return;
  const id = resumenPendienteId; resumenPendienteId = null;
  try { history.replaceState(null, '', location.pathname); } catch(e){}
  renderResumenProfe(id);
}

// Resumen del entrenamiento para el profesor (desde el aviso)
async function renderResumenProfe(sesionId, volver){
  const esAlumnoVista = profile.role === 'alumno';
  cleanupSocialRealtime();
  limpiarBadgeApp();
  root().innerHTML = '<div class="loading">Cargando el entrenamiento...</div>';
  const { data: sesion } = await sb.from('sesiones').select('*, sesion_series(*)').eq('id', sesionId).maybeSingle();
  if(!sesion){ showToast('No se encontró ese entrenamiento'); renderCoachHome(); return; }
  const [{ data: historial }, { data: alumno }] = await Promise.all([
    sb.from('sesiones').select('id, fecha, created_at, sesion_series(*)').eq('alumno_id', sesion.alumno_id),
    sb.from('profiles').select('id, nombre').eq('id', sesion.alumno_id).maybeSingle()
  ]);
  const conPRs = markPRs(historial || []);
  const esta = conPRs.find(s => s.id === sesion.id) || sesion;
  const grupos = groupSets(esta.sesion_series || []);
  const r = calcularResumenSesion(grupos, sesion.fecha);
  const nombre = (alumno && alumno.nombre) || 'Tu alumno';
  const fechaTxt = new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  root().innerHTML = `
    <button type="button" class="back-link" id="btn-resumen-profe-volver">${ICONS.arrowLeft} Volver</button>
    <section class="resumen-profe">
      <p class="resumen-eyebrow">${esAlumnoVista ? 'Tu entrenamiento' : 'Entrenamiento terminado'}</p>
      <h1 class="resumen-profe-nombre">${escapeHtml(nombre)}</h1>
      <div class="sub" style="text-transform:capitalize;">${escapeHtml(fechaTxt)}</div>
      ${r.gruposMusculares.length ? `<div class="resumen-grupos"><span>Entrenó</span><b>${r.gruposMusculares.map(g => escapeHtml(g)).join(' <i>·</i> ')}</b></div>` : ''}
      <div class="resumen-stats resumen-profe-stats">
        <div><b>${r.volumen.toLocaleString('es-CL')}</b><span>kg</span></div>
        <div><b>${r.series}</b><span>serie${r.series === 1 ? '' : 's'}</span></div>
        <div><b>${r.ejercicios}</b><span>ejercicio${r.ejercicios === 1 ? '' : 's'}</span></div>
        <div><b>${r.prs.length}</b><span>récord${r.prs.length === 1 ? '' : 's'}</span></div>
      </div>
      <div id="fb-panel"></div>
      <div class="resumen-profe-ejercicios">
        ${grupos.map(g => `
          <div class="resumen-profe-ej" data-ej="${escapeHtml(g.nombre)}">
            <div class="resumen-profe-ej-nombre">${g.sets.some(s => s._isPR) ? '👑 ' : ''}${escapeHtml(g.nombre)}</div>
            <div class="resumen-profe-sets">${g.sets.map((s, i) => `<span class="${s._isPR ? 'es-pr' : ''}" data-serie="${s.id}" data-pr="${s._isPR ? 1 : 0}">${i + 1}. ${Number(s.peso) ? `${Number(s.peso).toLocaleString('es-CL')} kg × ` : ''}${esSeg(s.unidad) ? `⏱ ${fmtSeg(s.reps)}` : (s.reps || 0)}</span>`).join('')}</div>
            ${g.sets.filter(s => s.nota).map(s => `<div class="resumen-profe-nota">“${escapeHtml(s.nota)}”</div>`).join('')}
            <div class="fb-ej"></div>
          </div>`).join('')}
      </div>
      ${sesion.nota_alumno ? `<div class="resumen-profe-bloque"><small>NOTA DEL ALUMNO</small><p>${escapeHtml(sesion.nota_alumno)}</p></div>` : ''}
      ${sesion.foto_url ? `<img class="resumen-profe-foto" src="${escapeHtml(sesion.foto_url)}" alt="Foto del entrenamiento" loading="lazy">` : ''}
      <div class="resumen-profe-imagen" id="resumen-profe-imagen"><div class="empty">Preparando la imagen…</div></div>
      ${esAlumnoVista ? '' : `<button type="button" class="btn" id="btn-resumen-profe-perfil">${ICONS.users} Ver perfil de ${escapeHtml(nombre.split(' ')[0])}</button>`}
    </section>`;
  window.scrollTo(0, 0);
  document.getElementById('btn-resumen-profe-volver').onclick = () => {
    if(fbRec) try { fbRec.stop(); } catch(e){}
    if(typeof volver === 'function') return volver();
    if(volver === 'detalle') return renderCoachAlumnoDetail(sesion.alumno_id);
    return esAlumnoVista ? renderAlumnoHome() : renderNotificacionesEntrenamiento();
  };
  const btnPerfilResumen = document.getElementById('btn-resumen-profe-perfil');
  if(btnPerfilResumen) btnPerfilResumen.onclick = () => renderCoachAlumnoDetail(sesion.alumno_id);
  montarFeedback(sesion, esAlumnoVista);
  try {
    const blob = await generarImagenCompartir(r);
    const holder = document.getElementById('resumen-profe-imagen');
    if(holder && blob) holder.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Imagen del resumen">`;
  } catch(e){
    const holder = document.getElementById('resumen-profe-imagen');
    if(holder) holder.innerHTML = '';
  }
}

// ---------- REACCIONES Y COMENTARIOS DEL PROFE SOBRE UN ENTRENAMIENTO ----------
// Tabla sesion_feedback + bucket privado feedback-voz (schema_feedback_profe.sql).
// La nota de voz se escucha UNA vez: al reproducirla se borra del servidor.
const FB_EMOJIS = ['🔥', '💪', '👏', '👑', '😮', '❤️'];
const FB_FRASES = ['¡Buen trabajo!', 'Excelente técnica', 'Vas subiendo 📈', 'Sigue así 💪', 'Descansa bien hoy', 'Súbele peso la próxima'];
let fbEstado = null;
let fbRec = null;
let notasProfePorEjercicio = {};

function fbHora(iso){
  return new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function montarFeedback(sesion, esAlumno){
  fbEstado = { sesion, items: [], esAlumno };
  await fbRecargar();
  if(esAlumno) sb.rpc('marcar_feedback_visto', { p_sesion: sesion.id }).then(() => {}, () => {});
}

async function fbRecargar(){
  if(!fbEstado) return;
  const { data, error } = await sb.from('sesion_feedback').select('*').eq('sesion_id', fbEstado.sesion.id).order('created_at');
  if(error){ console.warn('feedback', error.message); }
  fbEstado.items = data || [];
  // El profe limpia del servidor las notas de voz que el alumno ya escuchó
  if(!fbEstado.esAlumno){
    const restos = fbEstado.items.filter(i => i.tipo === 'voz' && i.audio_borrado && i.audio_path).map(i => i.audio_path);
    if(restos.length) sb.storage.from('feedback-voz').remove(restos).then(() => {}, () => {});
  }
  fbPintar();
}

async function fbInsertar(campos){
  const s = fbEstado.sesion;
  const { error } = await sb.from('sesion_feedback').insert({ sesion_id: s.id, alumno_id: s.alumno_id, profesor_id: profile.id, ...campos });
  if(error){ showToast('No se pudo enviar: ' + error.message); return false; }
  showToast('Enviado a tu alumno ✓');
  await fbRecargar();
  return true;
}

function fbItemHtml(i){
  const esAlumno = fbEstado.esAlumno;
  const borrar = !esAlumno ? `<button type="button" class="fb-borrar" data-id="${i.id}" aria-label="Borrar">✕</button>` : '';
  if(i.tipo === 'voz'){
    if(esAlumno){
      return i.audio_borrado
        ? `<div class="fb-item fb-voz">🎤 Nota de voz · ya la escuchaste</div>`
        : `<div class="fb-item fb-voz"><button type="button" class="btn-sm fb-escuchar" data-id="${i.id}">▶ Escuchar nota de voz</button><small>Se borra apenas la escuches (solo 1 vez)</small></div>`;
    }
    return `<div class="fb-item fb-voz">🎤 Nota de voz (${i.audio_duracion_seg || 1}s) · ${i.escuchado_at ? 'escuchada ✓' : 'aún no la escucha'}<time>${fbHora(i.created_at)}</time>${borrar}</div>`;
  }
  return `<div class="fb-item">💬 ${escapeHtml(i.texto || '')}<time>${fbHora(i.created_at)}</time>${borrar}</div>`;
}

function fbPintar(){
  if(!fbEstado) return;
  const { items, esAlumno } = fbEstado;
  const panel = document.getElementById('fb-panel');
  if(!panel) return;
  const reaccion = items.find(i => i.tipo === 'reaccion');
  const generales = items.filter(i => i.tipo === 'comentario' || i.tipo === 'voz');
  if(esAlumno){
    panel.innerHTML = (reaccion || generales.length) ? `
      <div class="fb-card fb-card-alumno">
        <div class="fb-titulo">💬 Lo que te dijo tu profe</div>
        ${reaccion ? `<div class="fb-reaccion-grande">${reaccion.emoji}</div>` : ''}
        ${generales.map(fbItemHtml).join('')}
      </div>` : '';
  } else {
    panel.innerHTML = `
      <div class="fb-card">
        <div class="fb-titulo">Reacciona a este entrenamiento</div>
        <div class="fb-emojis">${FB_EMOJIS.map(e => `<button type="button" class="fb-emoji ${reaccion && reaccion.emoji === e ? 'sel' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
        <div class="fb-frases">${FB_FRASES.map(f => `<button type="button" class="fb-frase" data-frase="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('')}</div>
        <textarea id="fb-texto" rows="2" maxlength="600" placeholder="Escribe un comentario para tu alumno…"></textarea>
        <div class="fb-escribir-btns">
          <button type="button" class="btn-sm" id="fb-voz">${ICONS.mic} Nota de voz</button>
          <button type="button" class="btn-sm fb-enviar" id="fb-enviar">Enviar comentario</button>
        </div>
        <div class="sub" id="fb-voz-estado" style="margin:6px 0 0;"></div>
        ${generales.length ? `<div class="fb-lista">${generales.map(fbItemHtml).join('')}</div>` : ''}
        <div class="fb-ayuda">Tip: toca una serie para dejarle una nota. En los récords 👑 puedes dar ❤️.</div>
      </div>`;
  }

  // Notas por ejercicio / serie y "me gusta" en los récords
  document.querySelectorAll('.resumen-profe-ej[data-ej]').forEach(el => {
    const nombre = el.dataset.ej;
    const series = [...el.querySelectorAll('[data-serie]')];
    const notas = items.filter(i => i.tipo === 'nota_ejercicio' && i.ejercicio_nombre === nombre);
    const holder = el.querySelector('.fb-ej');
    if(holder){
      holder.innerHTML = notas.map(n => {
        const idx = n.serie_id ? series.findIndex(x => x.dataset.serie === n.serie_id) : -1;
        return `<div class="fb-nota-ej">📝 ${idx >= 0 ? `<b>Serie ${idx + 1}:</b> ` : ''}${escapeHtml(n.texto || '')}${!esAlumno ? ` <button type="button" class="fb-borrar" data-id="${n.id}" aria-label="Borrar">✕</button>` : ''}</div>`;
      }).join('') + (!esAlumno ? `<button type="button" class="fb-nota-btn">📝 Nota a este ejercicio</button>` : '');
      const btnNota = holder.querySelector('.fb-nota-btn');
      if(btnNota) btnNota.onclick = () => fbPedirNota(nombre, null, el);
    }
    series.forEach(sp => {
      const like = items.find(i => i.tipo === 'like_record' && i.serie_id === sp.dataset.serie);
      const previo = sp.querySelector('.fb-like');
      if(previo) previo.remove();
      if(sp.dataset.pr === '1' && (like || !esAlumno)){
        sp.insertAdjacentHTML('beforeend', `<button type="button" class="fb-like ${like ? 'on' : ''}" ${esAlumno ? 'disabled' : ''} aria-label="Me gusta el récord">${like ? '❤️' : '🤍'}</button>`);
        const b = sp.querySelector('.fb-like');
        if(!esAlumno) b.onclick = async (ev) => {
          ev.stopPropagation();
          b.disabled = true;
          if(like){
            await sb.from('sesion_feedback').delete().eq('id', like.id);
            await fbRecargar();
          } else {
            await fbInsertar({ tipo: 'like_record', serie_id: sp.dataset.serie, ejercicio_nombre: nombre });
          }
        };
      }
      if(!esAlumno){
        sp.classList.add('fb-tocable');
        sp.onclick = () => fbPedirNota(nombre, sp.dataset.serie, el);
      }
    });
  });

  // Botones generales
  panel.querySelectorAll('.fb-emoji').forEach(b => b.onclick = async () => {
    const actual = fbEstado.items.find(i => i.tipo === 'reaccion');
    if(actual) await sb.from('sesion_feedback').delete().eq('id', actual.id);
    if(actual && actual.emoji === b.dataset.emoji){ await fbRecargar(); return; }
    await fbInsertar({ tipo: 'reaccion', emoji: b.dataset.emoji });
  });
  panel.querySelectorAll('.fb-frase').forEach(b => b.onclick = () => fbInsertar({ tipo: 'comentario', texto: b.dataset.frase }));
  const enviar = document.getElementById('fb-enviar');
  if(enviar) enviar.onclick = async () => {
    const t = document.getElementById('fb-texto').value.trim();
    if(!t){ showToast('Escribe algo primero'); return; }
    enviar.disabled = true;
    await fbInsertar({ tipo: 'comentario', texto: t });
  };
  const voz = document.getElementById('fb-voz');
  if(voz) voz.onclick = fbToggleVoz;
  document.querySelectorAll('.fb-borrar').forEach(b => b.onclick = async (ev) => {
    ev.stopPropagation();
    const item = fbEstado.items.find(i => i.id === b.dataset.id);
    if(!item) return;
    if(item.tipo === 'voz' && item.audio_path) await sb.storage.from('feedback-voz').remove([item.audio_path]);
    await sb.from('sesion_feedback').delete().eq('id', item.id);
    await fbRecargar();
  });
  document.querySelectorAll('.fb-escuchar').forEach(b => b.onclick = () => fbEscucharVoz(b.dataset.id, b));
}

function fbPedirNota(nombre, serieId, el){
  const previo = el.querySelector('.fb-nota-form');
  if(previo) previo.remove();
  const series = [...el.querySelectorAll('[data-serie]')];
  const idx = serieId ? series.findIndex(x => x.dataset.serie === serieId) + 1 : 0;
  el.querySelector('.fb-ej').insertAdjacentHTML('beforeend', `
    <div class="fb-nota-form">
      <input type="text" maxlength="300" placeholder="${idx ? `Nota para la serie ${idx}` : 'Nota para este ejercicio'} (ej: baja más lento)">
      <button type="button" class="btn-sm">Guardar</button>
    </div>`);
  const f = el.querySelector('.fb-nota-form');
  const inp = f.querySelector('input');
  inp.focus();
  f.querySelector('button').onclick = async () => {
    const t = inp.value.trim();
    if(!t) return;
    await fbInsertar({ tipo: 'nota_ejercicio', texto: t, ejercicio_nombre: nombre, serie_id: serieId || null });
  };
}

async function fbToggleVoz(){
  const btn = document.getElementById('fb-voz');
  const est = document.getElementById('fb-voz-estado');
  if(fbRec){ fbRec.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch(e){ showToast('No se pudo usar el micrófono'); return; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }) : new MediaRecorder(stream);
  const chunks = [];
  const t0 = Date.now();
  rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
  const timer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    if(est) est.textContent = `🔴 Grabando… ${s}s de 60 · toca "Detener y enviar"`;
    if(s >= 60 && rec.state !== 'inactive') rec.stop();
  }, 400);
  rec.onstop = async () => {
    clearInterval(timer);
    stream.getTracks().forEach(t => t.stop());
    fbRec = null;
    if(btn) btn.innerHTML = `${ICONS.mic} Nota de voz`;
    const dur = Math.max(1, Math.round((Date.now() - t0) / 1000));
    const tipo = (rec.mimeType || 'audio/webm').split(';')[0];
    const blob = new Blob(chunks, { type: tipo });
    if(blob.size < 500){ if(est) est.textContent = ''; return; }
    if(est) est.textContent = 'Enviando nota de voz…';
    const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm';
    const path = `${profile.id}/${fbEstado.sesion.alumno_id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('feedback-voz').upload(path, blob, { contentType: tipo });
    if(error){ if(est) est.textContent = ''; showToast('No se pudo subir el audio: ' + error.message); return; }
    if(est) est.textContent = '';
    await fbInsertar({ tipo: 'voz', audio_path: path, audio_duracion_seg: dur });
  };
  rec.start();
  fbRec = rec;
  if(btn) btn.textContent = '⏹ Detener y enviar';
}

// El alumno escucha la nota: se descarga, se borra del servidor y suena una vez
async function fbEscucharVoz(id, btn){
  const item = fbEstado.items.find(i => i.id === id);
  if(!item) return;
  btn.disabled = true; btn.textContent = 'Cargando…';
  const { data: blob, error } = await sb.storage.from('feedback-voz').download(item.audio_path);
  if(error || !blob){ showToast('No se pudo cargar la nota de voz'); btn.disabled = false; btn.textContent = '▶ Escuchar nota de voz'; return; }
  await sb.rpc('escuchar_voz_feedback', { p_id: id });
  sb.storage.from('feedback-voz').remove([item.audio_path]).then(() => {}, () => {});
  item.audio_borrado = true;
  const url = URL.createObjectURL(blob);
  btn.parentElement.innerHTML = `<audio controls autoplay src="${url}"></audio><small>Ya se borró del servidor: si sales de esta pantalla no podrás volver a escucharla.</small>`;
}

// Inicio del alumno: aviso de comentarios nuevos, botón en el historial y notas por ejercicio
async function cargarFeedbackAlumno(){
  const { data, error } = await sb.from('sesion_feedback')
    .select('id, sesion_id, tipo, emoji, texto, ejercicio_nombre, visto_at, created_at')
    .eq('alumno_id', profile.id).order('created_at', { ascending: false }).limit(300);
  if(error) return;
  const items = data || [];
  notasProfePorEjercicio = {};
  items.filter(i => i.tipo === 'nota_ejercicio' && i.ejercicio_nombre).forEach(i => {
    const k = normalizeExerciseName(i.ejercicio_nombre);
    if(!notasProfePorEjercicio[k]) notasProfePorEjercicio[k] = i.texto;
  });
  const conFb = new Set(items.map(i => i.sesion_id));
  document.querySelectorAll('.session-card[data-sesion]').forEach(c => {
    if(conFb.has(c.dataset.sesion) && !c.querySelector('.fb-hist-btn')){
      c.querySelector('.session-head').insertAdjacentHTML('afterend', `<button type="button" class="fb-hist-btn" onclick="renderResumenProfe('${c.dataset.sesion}')">💬 Ver lo que te dijo tu profe</button>`);
    }
  });
  const holder = document.getElementById('fb-aviso-holder');
  const nuevos = items.filter(i => !i.visto_at);
  if(holder && nuevos.length){
    const reac = nuevos.find(i => i.tipo === 'reaccion');
    holder.innerHTML = `
      <button type="button" class="fb-aviso-card" id="btn-fb-aviso">
        <span class="fb-aviso-emoji">${reac ? reac.emoji : '💬'}</span>
        <span class="fb-aviso-copy"><small>TU PROFE REVISÓ TU ENTRENAMIENTO</small><b>Tienes ${nuevos.length === 1 ? 'algo nuevo' : `${nuevos.length} cosas nuevas`} de tu profe</b><em>Toca para verlo</em></span>
        <span class="fb-aviso-go">${ICONS.chevronRight}</span>
      </button>`;
    document.getElementById('btn-fb-aviso').onclick = () => renderResumenProfe(nuevos[0].sesion_id);
  }
}

function notaProfeHtml(nombreEjercicio){
  const t = notasProfePorEjercicio[normalizeExerciseName(nombreEjercicio)];
  return t ? `<div class="reg-previo reg-nota-profe">🧑‍🏫 Tu profe: ${escapeHtml(t)}</div>` : '';
}

// ---------- VIDEO DE TÉCNICA DENTRO DE LA APP (YouTube incrustado) ----------
// Antes el video abría YouTube en otra pestaña y en la app instalada quedaba
// unos segundos en negro. Ahora se reproduce aquí mismo, con la miniatura de
// fondo mientras carga, y sigue existiendo el botón "Abrir en YouTube".
function youtubeIdDe(url){
  try {
    const u = new URL(String(url));
    if(u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
    if(m) return m[2];
    return u.searchParams.get('v');
  } catch(e){ return null; }
}
function abrirVideoTecnica(url, nombre){
  const id = youtubeIdDe(url);
  if(!id){ window.open(url, '_blank', 'noopener'); return; }
  const esShort = /\/shorts\//.test(url);
  const capa = document.createElement('div');
  capa.className = 'yt-capa';
  capa.innerHTML = `
    <div class="yt-top">
      <span class="yt-titulo">${escapeHtml(nombre || 'Técnica')}</span>
      <button type="button" class="yt-cerrar" aria-label="Cerrar">✕</button>
    </div>
    <div class="yt-marco ${esShort ? 'vertical' : ''}" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')">
      <div class="yt-cargando"><span></span>Cargando video…</div>
      <iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${id}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}"
        referrerpolicy="strict-origin-when-cross-origin" title="Video de técnica" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
    </div>
    <div class="yt-pie">
      <small>El video parte sin sonido: toca el parlante para activarlo.</small>
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>
    </div>`;
  document.body.appendChild(capa);
  const iframe = capa.querySelector('iframe');
  // Se muestra el video recién cuando YouTube avisa que está reproduciendo (sin pantalla negra)
  const mostrar = () => capa.classList.add('listo');
  const alMensaje = (e) => {
    if(!/youtube/.test(e.origin || '')) return;
    try {
      const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const estado = d && d.info && d.info.playerState;
      if(estado === 1 || (d && d.info && d.info.currentTime > 0.1)) mostrar();
    } catch(_){}
  };
  window.addEventListener('message', alMensaje);
  iframe.addEventListener('load', () => {
    try { iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'); } catch(_){}
  });
  const respaldo = setTimeout(mostrar, 7000);
  const cerrar = () => { clearTimeout(respaldo); window.removeEventListener('message', alMensaje); iframe.src = 'about:blank'; capa.remove(); document.removeEventListener('keydown', esc); };
  const esc = e => { if(e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', esc);
  capa.querySelector('.yt-cerrar').onclick = cerrar;
  capa.addEventListener('click', e => { if(e.target === capa) cerrar(); });
}
// Intercepta los botones de video (fase de captura: antes que cualquier otro clic)
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a.workout-video-icon[href], a.exercise-video-btn[href]');
  if(!a) return;
  e.preventDefault();
  e.stopPropagation();
  const label = a.getAttribute('aria-label') || '';
  abrirVideoTecnica(a.href, label.replace(/^Ver técnica de\s*/i, '').replace(/\s*en YouTube$/i, ''));
}, true);
// Conecta antes con YouTube para que el video cargue más rápido
['https://www.youtube-nocookie.com', 'https://i.ytimg.com', 'https://www.google.com'].forEach(h => {
  try { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; document.head.appendChild(l); } catch(e){}
});
// ---------- NOTIFICACIONES PUSH (el celular suena y vibra) ----------
// Cada celular que las activa guarda su suscripción en Supabase
// (schema_notificaciones_push.sql). Al enviar un mensaje profe ↔ alumno o una
// rutina, la app llama a la función "enviar-push" (supabase/functions), que
// avisa al otro aunque tenga la app cerrada. sw.js muestra la notificación.
function pushSoportado(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    && typeof VAPID_PUBLIC_KEY === 'string' && !!VAPID_PUBLIC_KEY;
}
// 'ios-instalar' | 'no-soportado' | 'default' | 'granted' | 'denied'
function pushEstado(){
  if(esIOSSafariSinInstalar()) return 'ios-instalar';
  if(!pushSoportado()) return 'no-soportado';
  return Notification.permission;
}
function claveVapidBytes(){
  const b64 = VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - VAPID_PUBLIC_KEY.length % 4) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function pushSuscripcionActual(){
  if(!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}
async function pushSuscribir(){
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapidBytes() });
  const j = sub.toJSON();
  const { error } = await sb.rpc('registrar_push_suscripcion', {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent
  });
  if(error) throw error;
}
async function activarNotificaciones(){
  const estado = pushEstado();
  if(estado === 'ios-instalar'){ showToast('Primero instala la app en tu pantalla de inicio'); return false; }
  if(estado === 'no-soportado'){ showToast('Este navegador no permite notificaciones'); return false; }
  let permiso = Notification.permission;
  if(permiso === 'default') permiso = await Notification.requestPermission();
  if(permiso !== 'granted'){ showToast('No diste permiso para las notificaciones'); return false; }
  try {
    await pushSuscribir();
    showToast('¡Notificaciones activadas! 🔔');
    if(window.UCKilo) window.UCKilo.vibrar([200, 100, 200]);
    return true;
  } catch(e){
    console.error('No se pudo activar push', e);
    showToast('No se pudieron activar las notificaciones');
    return false;
  }
}
// Al abrir la app: si ya dio permiso, vuelve a guardar la suscripción
// (el navegador a veces la renueva, o entró otra persona en el celular).
async function pushSincronizar(){
  try { if(pushSoportado() && Notification.permission === 'granted') await pushSuscribir(); } catch(e){}
}
async function pushQuitarDeEsteCelular(){
  try {
    const sub = await pushSuscripcionActual();
    if(!sub) return;
    await sb.from('push_suscripciones').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch(e){}
}
// Se llama después de enviar un mensaje o una rutina. Si falla, no molesta:
// el mensaje ya quedó guardado.
async function avisarPush(datos){
  try {
    const { data, error } = await sb.functions.invoke('enviar-push', { body: datos });
    if(error) console.error('No se pudo enviar la notificación', error);
    else if(data && data.enviados === 0) console.warn('Notificación sin dispositivo receptor', data);
  } catch(e){ console.error('Falló la notificación', e); }
}

// Aviso en el inicio para activarlas. "Ahora no" lo oculta solamente durante
// esta sesión y solo para la cuenta actual; al reabrir la app vuelve a aparecer.
// Antes se guardaba un único valor permanente en localStorage, por lo que al
// ocultarlo en una cuenta desaparecía también para todas las demás del teléfono.
function mostrarAvisoPush(){
  const holder = document.getElementById('push-aviso-holder');
  if(!holder) return;
  let cerrado = false;
  const claveCerrado = `push_aviso_cerrado_${profile.id}`;
  try { cerrado = sessionStorage.getItem(claveCerrado) === '1'; } catch(e){}
  if(cerrado || pushEstado() !== 'default'){ holder.innerHTML = ''; return; }
  const texto = profile.role === 'alumno'
    ? 'Entérate al tiro cuando tu profe te escriba o te envíe una rutina, aunque tengas la app cerrada.'
    : 'Entérate al tiro cuando tus alumnos te escriban o te manden un video de técnica.';
  holder.innerHTML = `
    <div class="push-aviso-card">
      <span class="push-aviso-icon">${ICONS.bell}</span>
      <span class="push-aviso-copy"><b>Activa las notificaciones</b><em>${texto}</em>
        <span class="push-aviso-acciones">
          <button type="button" class="btn push-aviso-si" id="btn-push-activar">Activar</button>
          <button type="button" class="link-btn" id="btn-push-ahora-no">Ahora no</button>
        </span>
      </span>
    </div>`;
  document.getElementById('btn-push-activar').onclick = async () => {
    if(await activarNotificaciones()) holder.innerHTML = '';
    else mostrarAvisoPush();
  };
  document.getElementById('btn-push-ahora-no').onclick = () => {
    try { sessionStorage.setItem(claveCerrado, '1'); } catch(e){}
    holder.innerHTML = '';
    showToast('Puedes activarlas cuando quieras desde tu perfil');
  };
}

// Tarjeta en "Tu perfil": muestra el estado y permite activar o desactivar.
async function renderPushPerfil(){
  const holder = document.getElementById('push-perfil-holder');
  if(!holder) return;
  const estado = pushEstado();
  let activa = false;
  if(estado === 'granted'){ try { activa = !!(await pushSuscripcionActual()); } catch(e){} }
  let detalle = '', boton = '';
  if(estado === 'ios-instalar'){
    detalle = 'En iPhone primero instala la app: toca <b>Compartir</b> en Safari y elige <b>"Añadir a pantalla de inicio"</b>. Después ábrela desde el ícono y actívalas aquí.';
  } else if(estado === 'no-soportado'){
    detalle = 'Este navegador no permite notificaciones. En Android usa Chrome; en iPhone, instala la app en la pantalla de inicio.';
  } else if(estado === 'denied'){
    detalle = 'Las bloqueaste en este celular. Para activarlas, ve a los ajustes del celular (o al candado junto a la dirección en el navegador) y permite las notificaciones de STC App.';
  } else if(activa){
    detalle = '<b class="push-ok">Activadas en este celular ✓</b> Te avisaremos con sonido y vibración.';
    boton = '<button type="button" class="link-btn" id="btn-push-perfil-quitar">Desactivar en este celular</button>';
  } else {
    detalle = profile.role === 'alumno'
      ? 'Recibe un aviso con sonido y vibración cuando tu profe te escriba o te envíe una rutina.'
      : 'Recibe un aviso con sonido y vibración cuando tus alumnos te escriban o te manden un video.';
    boton = '<button type="button" class="btn" id="btn-push-perfil-activar">Activar notificaciones</button>';
  }
  holder.innerHTML = `<label>${ICONS.bell} Notificaciones</label><div class="profile-upload-note">${detalle}</div>${boton}`;
  const btnActivar = document.getElementById('btn-push-perfil-activar');
  if(btnActivar) btnActivar.onclick = async () => { btnActivar.disabled = true; await activarNotificaciones(); renderPushPerfil(); };
  const btnQuitar = document.getElementById('btn-push-perfil-quitar');
  if(btnQuitar) btnQuitar.onclick = async () => {
    btnQuitar.disabled = true;
    await pushQuitarDeEsteCelular();
    showToast('Notificaciones desactivadas en este celular');
    renderPushPerfil();
  };
}

// ?abrir=chat&con=<id> o ?abrir=rutina (vienen de la notificación tocada).
// Se leen una sola vez y se limpian de la dirección.
function tomarDestinoNotificacionDeUrl(){
  try {
    const url = new URL(window.location.href);
    if(!url.searchParams.get('abrir')) return null;
    const destino = url.href;
    url.searchParams.delete('abrir');
    url.searchParams.delete('con');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    return destino;
  } catch(e){ return null; }
}
async function abrirDestinoNotificacion(destino){
  if(!profile) return false;
  let params;
  try { params = new URL(destino, window.location.href).searchParams; } catch(e){ return false; }
  const abrir = params.get('abrir');
  if(abrir === 'chat' && params.get('con')){
    await renderChat(params.get('con'), profile.role === 'alumno' ? renderAlumnoHome : renderBuzonProfesor);
    return true;
  }
  if(abrir === 'rutina' && profile.role === 'alumno'){
    await renderAlumnoHome();
    setToggleOpen('btn-toggle-rutina', 'rutina-detail-card', true);
    const btn = document.getElementById('btn-toggle-rutina');
    if(btn) btn.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
  return false;
}
// Notificación tocada con la app ya abierta (la manda sw.js).
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', (e) => {
    if(e.data && e.data.tipo === 'abrir-notificacion') abrirDestinoNotificacion(e.data.url);
  });
  try { navigator.serviceWorker.startMessages(); } catch(e){}
}

// ---------- INSTALAR EN IPHONE (banner PWA para Safari) ----------
function esIOSSafariSinInstalar(){
  if(window.navigator.standalone === true) return false; // ya instalada
  if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return false;
  const ua = window.navigator.userAgent || '';
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  if(!esIOS) return false;
  const esOtroNavegador = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if(esOtroNavegador) return false;
  return true;
}

function initIOSInstallBanner(){
  try{
    if(!esIOSSafariSinInstalar()) return;
    if(localStorage.getItem('ios_install_banner_cerrado') === '1') return;

    const wrap = document.querySelector('.wrap');
    const appRoot = document.getElementById('app-root');
    if(!wrap || !appRoot) return;

    const banner = document.createElement('div');
    banner.className = 'card ios-install-banner';
    banner.innerHTML = `
      <button type="button" class="ios-install-close" title="Cerrar">✕</button>
      <div class="ios-install-row">
        <div class="ios-install-icon">${ICONS.share}</div>
        <div>
          <div class="ios-install-title">Instalá STC App en tu iPhone</div>
          <div>Tocá <b>Compartir</b> abajo en Safari y elegí <b>"Añadir a pantalla de inicio"</b>. Así la abrís como una app, sin el navegador.</div>
        </div>
      </div>
    `;
    wrap.insertBefore(banner, appRoot);

    banner.querySelector('.ios-install-close').onclick = () => {
      localStorage.setItem('ios_install_banner_cerrado', '1');
      banner.remove();
    };
  } catch(e){
    // si algo falla acá, que no rompa el resto de la app
  }
}

// ---------- ARRANCA LA APP ----------
const _splashStart = Date.now();
boot().finally(() => {
  const wait = Math.max(0, 500 - (Date.now() - _splashStart));
  setTimeout(hideSplash, wait);
});
initIOSInstallBanner();
