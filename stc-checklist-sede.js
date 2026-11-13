(() => {
  'use strict';
  const blocks = [
  {
    "id": "apertura",
    "title": "Apertura",
    "items": [
      "Llegada con al menos 20 minutos de anticipación al primer cliente agendado",
      "Pantallas de TV y neones encendidos",
      "Sala sin basura y ordenada (piso, equipos, espejos, zonas de tránsito, colchonetas y bandas)",
      "Sillas de la zona de descanso puestas",
      "Baños limpios, con luz de espejos encendida e insumos repuestos",
      "Recepción: notebook encendido con EVO e internet verificado",
      "Recepción: máquina de pagos cargada y teléfono del mesón operativo",
      "Mesón de recepción ordenado",
      "Café: agua y elementos necesarios en los mesones de recepción",
      "Refrigeradores encendidos y con bebidas disponibles (el detalle del stock va en la sección 2.6)",
      "Ventanales y/o aire acondicionado según necesidad (temperatura y ventilación)",
      "Equipos revisados; las máquinas fuera de servicio, señalizadas",
      "Agenda del día revisada en EVO (clientes nuevos, CP, condición médica, cumpleaños)",
      "Lista de CP de hoy y de mañana revisada (el RS la revisa a distancia antes de las 14:00; el Encargado/a AM también se encarga), con las llamadas de confirmación en marcha (sección 2.5)",
      "Agenda confirmada con cada coach del turno",
      "Briefing de 3 minutos con los coaches y teléfonos de coaches guardados antes de abrir",
      "Materiales de protocolo disponibles (balanza cargada y calibrada, formularios o tablet, Wizfit)",
      "Hallazgos que requieren reparación, reposición o mantención registrados en la bitácora"
    ]
  },
  {
    "id": "turno",
    "title": "Durante el turno",
    "items": [
      "Llamadas de confirmación de CP del día y del siguiente ejecutadas (con apoyo del RS en las que faltan)",
      "Inspección de coaches: uniforme",
      "Inspección de coaches: trabajo en sala",
      "EVO y agenda de clientes revisados",
      "Protocolos del día supervisados (entrevistas, evaluaciones y planificaciones Wizfit de clientes nuevos)",
      "Sala, baños (a media jornada), materiales de protocolo y café revisados durante el día",
      "Clientes nuevos con onboarding completo (contrato, tarjeta PAT, app y reglamentos) y registrados en EVO"
    ],
    "optional": [
      "Casos de clientes resueltos o derivados (si hubo)",
      "Pendientes de clientes regularizados: deuda, contrato sin firmar o tarjeta sin registrar (si hubo)",
      "Apoyo en cierres de venta de CP (si hubo)",
      "Revisión de cámaras (aleatoria semanal; diaria la primera semana de un encargado nuevo)",
      "Corte semanal de protocolos a las 12:00 (solo miércoles, según sede): anotar % y decisión"
    ]
  },
  {
    "id": "cierre",
    "title": "Cierre",
    "items": [
      "Clientes del día atendidos o registrados como inasistencia (no-show) en EVO",
      "Protocolos del día (entrevista, evaluación, Wizfit) completos y registrados",
      "Implementos guardados (mancuernas, bandas, colchonetas, balones)",
      "Superficies de contacto frecuente limpiadas",
      "Objetos olvidados revisados (bitácora de objetos perdidos si hay)",
      "Sala sin basura y ordenada",
      "Basura del gimnasio sacada",
      "Baños en condiciones, insumos repuestos y basureros vacíos",
      "Sillas de la zona de descanso guardadas",
      "Mesón de recepción ordenado",
      "Termoeléctricos o calefón totalmente apagados (solo se encienden cuando se usan) y anotado en el registro de apagado",
      "Refrigeradores de agua y de líquidos de venta apagados (solo se encienden cuando se usan) y anotado en el registro de apagado",
      "Stock para mañana revisado y compras anotadas en pendientes",
      "Pantallas de TV y neones apagados",
      "Luz de espejos de baños apagada",
      "Notebook de recepción apagado",
      "Máquina de pagos guardada",
      "Ventanales cerrados y aire acondicionado apagado si corresponde",
      "Incidencias sin resolver registradas en bitácora, con responsable para mañana",
      "Reporte diario de cierre enviado al LOC y a la JSO (incluye gastos del día)",
      "Alarma de seguridad puesta (último paso)"
    ]
  }
];
  function render(holder, adminId) {
    if (!holder || !adminId) return;
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Santiago', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
    const key = 'stc-checklist-prueba:v1:' + adminId + ':' + today;
    let marks = {};
    let storageAvailable = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) marks = saved;
    } catch (_) { storageAvailable = false; }
    const renderItems = (block, list, kind) => list.map((label, index) => {
      const id = block.id + '-' + kind + '-' + index;
      return `<div class="stc-check-row" role="group" aria-labelledby="stc-check-${id}">
        <span id="stc-check-${id}">${label}</span>
        <div class="stc-check-actions">
          <button type="button" data-item="${id}" data-value="yes" aria-pressed="false">Sí</button>
          <button type="button" data-item="${id}" data-value="no" aria-pressed="false">No</button>
        </div>
      </div>`;
    }).join('');
    holder.innerHTML = `<section class="stc-check card" aria-label="Checklist de sede">
      <p class="stc-check-meta">${new Intl.DateTimeFormat('es-CL', {timeZone:'America/Santiago',dateStyle:'long'}).format(new Date())} · Prueba en este dispositivo</p>
      <p class="stc-check-warning" role="status" hidden></p>
      ${blocks.map((block, index) => `<details data-block="${block.id}" ${index === 0 ? 'open' : ''}>
        <summary><b>${block.title}</b><small data-count aria-live="polite"></small></summary>
        ${renderItems(block, block.items, 'main')}
        ${block.optional ? '<h4>Si corresponde</h4>' + renderItems(block, block.optional, 'optional') : ''}
      </details>`).join('')}
    </section>`;
    const buttons = [...holder.querySelectorAll('button[data-item]')];
    const warning = holder.querySelector('.stc-check-warning');
    function update() {
      for (const button of buttons) button.setAttribute('aria-pressed', String(marks[button.dataset.item] === button.dataset.value));
      for (const block of blocks) {
        const reviewed = block.items.filter((_, i) => ['yes','no'].includes(marks[block.id + '-main-' + i])).length;
        holder.querySelector('[data-block="' + block.id + '"] [data-count]').textContent = reviewed + ' de ' + block.items.length + ' revisados';
      }
      warning.hidden = storageAvailable;
      warning.textContent = storageAvailable ? '' : 'El dispositivo no pudo guardar las marcas. Pueden perderse al cerrar la app.';
    }
    holder.onclick = (event) => {
      const button = event.target.closest('button[data-item]');
      if (!button || !holder.contains(button)) return;
      const {item, value} = button.dataset;
      if (marks[item] === value) delete marks[item];
      else marks[item] = value;
      try { localStorage.setItem(key, JSON.stringify(marks)); storageAvailable = true; }
      catch (_) { storageAvailable = false; }
      update();
    };
    update();
  }
  window.STCChecklistSede = {render};
})();

