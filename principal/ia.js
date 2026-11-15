'use strict';
/**
 * Generador de ejercicios con IA (Claude, de Anthropic).
 * La llamada se hace desde el proceso principal para que la llave nunca
 * llegue a la página. Si no hay llave o no hay internet, la página usa el
 * generador local (js/generador-local.js).
 */
// Se carga al usar (así las pruebas pueden correr sin Electron).
const ajustes = () => require('./ajustes');

const URL_API = 'https://api.anthropic.com/v1/messages';

const ZONAS = {
  ojos: { es: 'ojos (descanso visual frente a pantallas)', en: 'eyes (screen eye-strain relief)' },
  cuello: { es: 'cuello', en: 'neck' },
  hombros: { es: 'hombros y parte alta de la espalda', en: 'shoulders and upper back' },
  manos: { es: 'manos, muñecas y antebrazos', en: 'hands, wrists and forearms' },
  espalda: { es: 'espalda baja y abdomen', en: 'lower back and core' },
  piernas: { es: 'cadera y piernas', en: 'hips and legs' },
  respiracion: { es: 'respiración y manejo del estrés', en: 'breathing and stress relief' },
  completo: { es: 'cuerpo completo', en: 'full body' }
};

function instrucciones(idioma) {
  if (idioma === 'en') {
    return 'You design short active-break exercises for office workers in an occupational health and safety (SST) program. ' +
      'Exercises must be safe, gentle, done standing or seated next to the desk, with no equipment, no jumping and no pain. ' +
      'Reply ONLY with a JSON object, no extra text.';
  }
  return 'Diseñas ejercicios cortos de pausa activa para trabajadores de oficina dentro de un programa de Seguridad y Salud en el Trabajo (SST). ' +
    'Deben ser seguros y suaves, hechos de pie o sentado junto al puesto, sin implementos, sin saltos y sin dolor. ' +
    'Responde SOLO con un objeto JSON, sin texto adicional.';
}

function pedido({ idioma, zona, duracion, nivel, nota, evitar }) {
  const z = (ZONAS[zona] || ZONAS.completo)[idioma === 'en' ? 'en' : 'es'];
  const lista = (evitar || []).slice(0, 15).join(' | ');
  if (idioma === 'en') {
    return `Create ONE new active-break exercise.
Body area: ${z}. Total duration: about ${duracion} seconds. Level: ${nivel === 'moderado' ? 'moderate' : 'gentle'}.
${nota ? `Extra request from the user: "${nota}".` : ''}
${lista ? `Do not repeat these existing exercises: ${lista}.` : ''}
JSON format:
{"titulo":"SHORT TITLE IN CAPITALS","zona":"${zona}","pasos":[{"texto":"clear instruction of one movement (max 160 characters)","segundos":15}],"precaucion":"one short safety note","beneficio":"one short benefit"}
Rules: 4 to 8 steps; each step 8 to 40 seconds; the steps must add up to about ${duracion} seconds; write in English.`;
  }
  return `Crea UN ejercicio de pausa activa nuevo.
Zona: ${z}. Duración total: unos ${duracion} segundos. Nivel: ${nivel === 'moderado' ? 'moderado' : 'suave'}.
${nota ? `Pedido adicional del usuario: "${nota}".` : ''}
${lista ? `No repitas estos ejercicios que ya existen: ${lista}.` : ''}
Formato JSON:
{"titulo":"TÍTULO CORTO EN MAYÚSCULAS","zona":"${zona}","pasos":[{"texto":"instrucción clara de un solo movimiento (máx. 160 caracteres)","segundos":15}],"precaucion":"una nota corta de seguridad","beneficio":"un beneficio corto"}
Reglas: de 4 a 8 pasos; cada paso entre 8 y 40 segundos; los pasos deben sumar unos ${duracion} segundos; escribe en español.`;
}

function texto(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Valida y limpia lo que devuelve el modelo; lanza error si no sirve. */
function normalizar(bruto, { zona, idioma }) {
  const inicio = bruto.indexOf('{');
  const fin = bruto.lastIndexOf('}');
  if (inicio < 0 || fin <= inicio) throw new Error('La IA no devolvió un ejercicio válido.');
  const datos = JSON.parse(bruto.slice(inicio, fin + 1));
  const pasos = (Array.isArray(datos.pasos) ? datos.pasos : [])
    .map(p => ({ texto: texto(p && p.texto, 200), segundos: Math.round(Math.min(60, Math.max(5, Number(p && p.segundos) || 15))) }))
    .filter(p => p.texto)
    .slice(0, 10);
  if (pasos.length < 2) throw new Error('La IA devolvió muy pocos pasos.');
  const titulo = texto(datos.titulo, 60).toUpperCase() || (idioma === 'en' ? 'NEW EXERCISE' : 'EJERCICIO NUEVO');
  return {
    titulo,
    zona: ZONAS[zona] ? zona : 'completo',
    pasos,
    precaucion: texto(datos.precaucion, 200),
    beneficio: texto(datos.beneficio, 200),
    idioma: idioma === 'en' ? 'en' : 'es'
  };
}

async function generar(opciones = {}) {
  const llave = ajustes().obtenerLlave();
  if (!llave) return { ok: false, sinLlave: true };

  const op = {
    idioma: opciones.idioma === 'en' ? 'en' : 'es',
    zona: ZONAS[opciones.zona] ? opciones.zona : 'completo',
    duracion: Math.min(300, Math.max(45, Number(opciones.duracion) || 90)),
    nivel: opciones.nivel === 'moderado' ? 'moderado' : 'suave',
    nota: texto(opciones.nota, 200),
    evitar: Array.isArray(opciones.evitar) ? opciones.evitar.map(t => texto(t, 60)) : []
  };

  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 45000);
  try {
    const r = await fetch(URL_API, {
      method: 'POST',
      signal: control.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': llave,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ajustes().leer().modeloIA,
        max_tokens: 1200,
        system: instrucciones(op.idioma),
        messages: [{ role: 'user', content: pedido(op) }]
      })
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (cuerpo && cuerpo.error && cuerpo.error.message) || `HTTP ${r.status}`;
      return { ok: false, error: r.status === 401 ? 'La llave de IA no es válida.' : msg, estado: r.status };
    }
    const salida = (cuerpo.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return { ok: true, ejercicio: normalizar(salida, op), fuente: 'ia' };
  } catch (e) {
    const sinRed = e.name === 'AbortError' || /fetch failed|ENOTFOUND|ECONN/i.test(String(e.message || e));
    return { ok: false, sinRed, error: sinRed ? 'Sin conexión con el servicio de IA.' : String(e.message || e) };
  } finally {
    clearTimeout(limite);
  }
}

module.exports = { generar, normalizar, ZONAS };
