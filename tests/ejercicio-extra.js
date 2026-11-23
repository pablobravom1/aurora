// Prueba la identidad y el duplicado al agregar un ejercicio extra.
// No toca la base. Corre con: node tests/ejercicio-extra.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = { window: { STCAkadiaBanco: [] }, console };
vm.createContext(context);
for (const n of [0, 1, 2, 3, 4]) {
  vm.runInContext(fs.readFileSync(path.join(root, `stc-banco-akadia-${n}.js`), 'utf8'), context);
}
vm.runInContext(fs.readFileSync(path.join(root, 'ejercicio-extra.js'), 'utf8'), context);

const banco = context.window.STCAkadiaBanco;
const indice = context.crearIndiceEjercicios(banco);
const id = (nombre) => context.identidadEjercicioAgregado(nombre, indice);
const dup = (ya, nombre) => context.ejercicioExtraDuplicado(ya, nombre, indice);

let fallos = 0;
function ok(cond, msg) {
  if (!cond) {
    fallos++;
    console.error('FALLO:', msg);
  }
}

const banca = id('press banca');
const inclinado = id('press banca inclinado');
const militar = id('press militar');
const solo = id('press');
const soloMay = id('Press');

ok(banca && banca.nombre === 'Press banca', 'press banca guarda el nombre completo del banco, no "Press"');
ok(banca && banca.clave === 'id:press-banca', 'press banca usa el id exacto');
ok(inclinado && inclinado.nombre === 'press banca inclinado', 'press banca inclinado se conserva entero');
ok(inclinado && inclinado.nombre !== 'Press' && inclinado.nombre !== 'Press banca', 'inclinado no se recorta ni se pega a press banca');
ok(inclinado && inclinado.clave !== banca.clave, 'press banca inclinado no es el mismo que press banca');
ok(militar && militar.nombre === 'Press militar con barra', 'press militar es alias exacto y muestra el nombre completo');
ok(militar && militar.clave === 'id:press-militar-barra', 'press militar usa su propio id');
ok(militar.clave !== banca.clave && militar.clave !== inclinado.clave, 'press militar convive con los otros');
ok(solo && solo.nombre === 'press' && solo.clave === 'nombre:press', 'press solo no lo captura el catálogo');
ok(solo.clave !== banca.clave && solo.clave !== militar.clave && solo.clave !== inclinado.clave, 'press solo convive con los demás');
ok(soloMay.clave === solo.clave, 'Press y press son el mismo ejercicio suelto');

ok(id('PRESS BANCA').clave === banca.clave, 'mayúsculas no crean otro press banca');
ok(id('  Press   banca  ').clave === banca.clave, 'espacios de más no crean otro press banca');
ok(id('press de banca').clave === banca.clave && id('press de banca').nombre === 'Press banca', 'el alias exacto usa el nombre completo');
ok(id('bench press').nombre === 'Press banca', 'bench press es el mismo press banca');
ok(id('Press banca en Smith').clave !== banca.clave && id('Press banca en Smith').nombre === 'Press banca en Smith', 'un press banca más largo no se traga por prefijo');

const primero = banco.find(item => context.normalizeExerciseName(item.name).split(' ')[0] === 'press');
ok(primero && primero.name !== solo.nombre, 'el primer press del catálogo no se lleva la palabra suelta');
ok(id('press').clave !== id(primero.name).clave, 'buscar por la primera palabra no elige el primer resultado');

let puestos = [];
for (const texto of ['press banca', 'press banca inclinado', 'press militar', 'Press']) {
  const decision = dup(puestos, texto);
  ok(!decision.duplicado && decision.identidad, 'se puede agregar ' + texto);
  puestos.push(decision.identidad.nombre);
}
ok(new Set(puestos).size === 4, 'los cuatro press quedan guardados distintos: ' + puestos.join(' | '));
ok(!puestos.some((n, i) => i < 3 && n === 'Press'), 'ningún press compuesto se guardó como Press: ' + puestos.join(' | '));

ok(dup(puestos, 'Press banca').duplicado, 'repetir press banca es duplicado');
ok(dup(puestos, 'bench press').duplicado, 'el alias bench press también es duplicado de press banca');
ok(dup(puestos, 'press banca inclinado').duplicado, 'repetir el inclinado escrito es duplicado');
ok(!dup(puestos, 'press militar con mancuernas').duplicado, 'otro press militar distinto no es duplicado');
ok(!dup(puestos, 'Press francés').duplicado, 'press francés no es duplicado de los anteriores');
ok(dup(['Press'], 'press').duplicado, 'un Press ya guardado (dato viejo) solo choca con otro press solo');
ok(!dup(['Press'], 'Press banca').duplicado, 'un Press viejo no bloquea Press banca');

function atributo(html, nombre) {
  const marca = nombre + '=';
  const i = html.indexOf(marca);
  if (i < 0) throw new Error('sin atributo ' + nombre);
  let j = i + marca.length;
  const q = html[j];
  if (q !== '"' && q !== "'") throw new Error('atributo sin comillas en ' + nombre);
  j++;
  let out = '';
  const entidades = { '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'" };
  while (j < html.length && html[j] !== q) {
    if (html[j] === '&') {
      const fin = html.indexOf(';', j);
      const ent = html.slice(j, fin + 1);
      out += Object.prototype.hasOwnProperty.call(entidades, ent) ? entidades[ent] : ent;
      j = fin + 1;
    } else {
      out += html[j++];
    }
  }
  return out;
}

for (const nombre of ['Press banca', 'Press banca inclinado', 'Press militar con barra', "Captain's chair"]) {
  const js = context.exerciseBankJsArg(nombre);
  const html = `<button type="button" onclick="selectSimpleExercise('session-exercise',${js},event)"></button>`;
  const onclick = atributo(html, 'onclick');
  let recibido = null;
  const fn = new Function('selectSimpleExercise', 'event', onclick);
  fn((prefix, name) => { recibido = { prefix, name }; }, null);
  ok(recibido && recibido.name === nombre, 'el botón del banco entrega el nombre completo: ' + JSON.stringify(recibido && recibido.name));
}

const boton = `<button type="button" data-elegir-ejercicio="${context.escapeAttr('session-exercise')}" data-ejercicio-nombre="${context.escapeAttr('Press banca inclinado')}"></button>`;
ok(atributo(boton, 'data-ejercicio-nombre') === 'Press banca inclinado', 'el atributo del listado conserva el nombre completo');

if (fallos) {
  console.error(fallos + ' fallo(s)');
  process.exit(1);
}
console.log('ok: press banca, press banca inclinado, press militar, press solo y duplicado real');
