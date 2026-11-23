// Nombre completo y duplicados al agregar un ejercicio extra.
// La coincidencia es exacta: nombre o alias ya normalizado (minúsculas,
// sin tildes, espacios simples). No usa la primera palabra, un prefijo
// ni un includes contra el catálogo.
function normalizeExerciseName(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeAttr(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Texto seguro para meter un argumento de JavaScript dentro de onclick="...".
// Comillas simples: las dobles de JSON.stringify cerraban el atributo HTML
// y el navegador se quedaba solo con la primera palabra (Press).
function exerciseBankJsArg(value){
  const literal = "'" + String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029') + "'";
  return escapeAttr(literal);
}

function crearIndiceEjercicios(items){
  const byName = new Map();
  const byAlias = new Map();
  for (const item of items || []) {
    const nameKey = normalizeExerciseName(item && item.name);
    if (nameKey) byName.set(nameKey, item);
    for (const alias of (item && item.aliases) || []) {
      const key = normalizeExerciseName(alias);
      if (key && !byAlias.has(key)) byAlias.set(key, item);
    }
  }
  return { byName, byAlias };
}

function buscarEjercicioExacto(indice, nombre){
  const target = normalizeExerciseName(nombre);
  if (!target || !indice) return null;
  return indice.byName.get(target) || indice.byAlias.get(target) || null;
}

// nombre: el que se guarda y se muestra. clave: id del banco si el texto
// coincide exacto con el nombre o un alias; si no, el nombre completo normalizado.
function identidadEjercicioAgregado(nombre, indice){
  const limpio = String(nombre || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return null;
  const entry = buscarEjercicioExacto(indice, limpio);
  if (entry && entry.name) {
    const oficial = String(entry.name).replace(/\s+/g, ' ').trim();
    const clave = entry.id ? ('id:' + entry.id) : ('nombre:' + normalizeExerciseName(oficial));
    return { nombre: oficial, clave };
  }
  return { nombre: limpio, clave: 'nombre:' + normalizeExerciseName(limpio) };
}

function ejercicioExtraDuplicado(nombresExistentes, nombre, indice){
  const identidad = identidadEjercicioAgregado(nombre, indice);
  if (!identidad) return { vacio: true, duplicado: false, identidad: null };
  const duplicado = (nombresExistentes || []).some(prev => {
    const otro = identidadEjercicioAgregado(prev, indice);
    return !!(otro && otro.clave === identidad.clave);
  });
  return { vacio: false, duplicado, identidad };
}
