'use strict';
/*
 * Generador de ejercicios SIN internet: arma un ejercicio nuevo combinando
 * movimientos seguros de la biblioteca (js/datos/movimientos.js).
 */
window.PA = window.PA || {};

PA.generadorLocal = (function () {
  const NOMBRES = {
    es: ['ACTIVA: {z}', 'RELAJA: {z}', 'PAUSA EXPRESS: {z}', 'MOVILIDAD: {z}', 'RECARGA: {z}', 'SUELTA TENSIÓN: {z}'],
    en: ['WAKE UP: {z}', 'RELAX: {z}', 'QUICK BREAK: {z}', 'MOBILITY: {z}', 'RECHARGE: {z}', 'RELEASE TENSION: {z}']
  };
  const BENEFICIOS = {
    ojos: ['Reduce la fatiga visual de la pantalla.', 'Reduces screen eye strain.'],
    cuello: ['Disminuye la rigidez del cuello.', 'Eases neck stiffness.'],
    hombros: ['Libera la tensión de hombros y espalda alta.', 'Releases shoulder and upper-back tension.'],
    manos: ['Previene molestias por teclado y mouse.', 'Helps prevent keyboard and mouse discomfort.'],
    espalda: ['Mejora la postura y descarga la zona lumbar.', 'Improves posture and relieves the lower back.'],
    piernas: ['Activa la circulación de las piernas.', 'Boosts leg circulation.'],
    respiracion: ['Baja el estrés y mejora la concentración.', 'Lowers stress and improves focus.'],
    completo: ['Activa todo el cuerpo en pocos minutos.', 'Activates your whole body in a few minutes.']
  };

  function mezclar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generar({ idioma = 'es', zona = 'completo', duracion = 90, nivel = 'suave' }) {
    const L = idioma === 'en' ? 'en' : 'es';
    const banco = PA.MOVIMIENTOS[zona] || PA.MOVIMIENTOS.completo;
    const cantidad = Math.max(3, Math.min(banco.length, Math.round(duracion / 18)));
    const elegidos = mezclar(banco).slice(0, cantidad);
    // Reparte el tiempo entre los pasos (múltiplos de 5 s).
    const base = Math.max(8, Math.round(duracion / elegidos.length / 5) * 5);
    const repeticiones = nivel === 'moderado' ? (L === 'en' ? ' Repeat at a steady pace.' : ' Repite a ritmo constante.') : '';
    const pasos = elegidos.map(m => ({ texto: m[L] + repeticiones, segundos: base }));

    const nombreZona = (PA.ZONAS[zona] || PA.ZONAS.completo)[L].toUpperCase();
    const plantilla = NOMBRES[L][Math.floor(Math.random() * NOMBRES[L].length)];
    return {
      titulo: plantilla.replace('{z}', nombreZona),
      zona,
      pasos,
      precaucion: PA.PRECAUCIONES[L],
      beneficio: (BENEFICIOS[zona] || BENEFICIOS.completo)[L === 'en' ? 1 : 0],
      idioma: L
    };
  }

  return { generar };
})();
