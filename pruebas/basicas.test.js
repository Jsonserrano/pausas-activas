'use strict';
/* Pruebas rápidas sin Electron:  npm test */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');

function cargarNavegador(archivos) {
  const ctx = { window: {}, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  archivos.forEach(a => vm.runInContext(fs.readFileSync(path.join(raiz, a), 'utf8'), ctx, { filename: a }));
  return ctx.PA;
}

test('la IA: se limpia y valida la respuesta del modelo', () => {
  const { normalizar } = require('../principal/ia');
  const bruto = 'Claro: {"titulo":"suelta el cuello","pasos":[{"texto":"Inclina la cabeza","segundos":500},{"texto":"Gira despacio","segundos":"12"}],"precaucion":"Sin dolor"}';
  const ej = normalizar(bruto, { zona: 'cuello', idioma: 'es' });
  assert.strictEqual(ej.titulo, 'SUELTA EL CUELLO');
  assert.strictEqual(ej.pasos.length, 2);
  assert.strictEqual(ej.pasos[0].segundos, 60); // se limita a 60 s
  assert.strictEqual(ej.pasos[1].segundos, 12);
  assert.throws(() => normalizar('sin json', { zona: 'cuello', idioma: 'es' }));
});

test('generador sin internet: arma ejercicios válidos en ES y EN', () => {
  const PA = cargarNavegador(['js/datos/movimientos.js', 'js/generador-local.js']);
  for (const zona of Object.keys(PA.ZONAS)) {
    for (const idioma of ['es', 'en']) {
      const ej = PA.generadorLocal.generar({ idioma, zona, duracion: 90 });
      assert.ok(ej.titulo.length > 3);
      assert.ok(ej.pasos.length >= 3, `${zona} tiene pocos pasos`);
      ej.pasos.forEach(p => assert.ok(p.texto && p.segundos >= 8));
    }
  }
});

test('los 53 empleados iniciales siguen completos', () => {
  const PA = cargarNavegador(['js/datos/empleados.js']);
  assert.strictEqual(PA.EMPLEADOS_INICIALES.length, 53);
  assert.ok(PA.EMPLEADOS_INICIALES.every(u => u.id && u.nombre && u.cargo && u.area));
});
