'use strict';
/*
 * Reproductor de la rutina: videos originales + ejercicios guiados (los
 * creados con IA o sin internet), que se muestran paso a paso con temporizador.
 */
window.PA = window.PA || {};

PA.reproductor = (function () {
  const $ = PA.$;
  let lista = [];
  let indice = 0;
  let usuarioInteractuo = false;
  let saltoManual = false;
  let ultimoTiempo = 0;
  let cuadro = null; // requestAnimationFrame del video

  // Estado del ejercicio guiado
  const guia = { transcurrido: 0, corriendo: false, marca: 0, intervalo: null, terminado: false };

  const video = () => $('current-exercise-video');

  /* ---------- Lista de ejercicios ---------- */

  function construirLista() {
    const videos = PA.EJERCICIOS_VIDEO[PA.idioma].map((e, i) => ({ ...e, tipo: 'video', actividadId: i }));
    const creados = PA.db.ejerciciosCreados().map(c => {
      const duracion = c.pasos.reduce((s, p) => s + p.segundos, 0);
      return {
        tipo: 'guiado',
        id: c.id,
        actividadId: c.id,
        title: `${c.titulo} (${duracion}s)`,
        duration: duracion,
        pasos: c.pasos,
        precaucion: c.precaucion,
        beneficio: c.beneficio,
        fuente: c.fuente
      };
    });
    lista = videos.concat(creados);
    if (indice >= lista.length) indice = 0;
    const total = lista.reduce((s, e) => s + e.duration, 0);
    $('total-timer').textContent = `${PA.t('Tiempo total', 'Total time')}: ${PA.formatoTiempo(total)}`;
  }

  function pintarLista() {
    const ul = $('exercise-list');
    ul.innerHTML = '';
    lista.forEach((ej, i) => {
      const li = document.createElement('li');
      if (i === indice) li.classList.add('active');
      if (ej.tipo === 'guiado') li.classList.add('ejercicio-creado');
      const nombre = document.createElement('span');
      nombre.textContent = (ej.tipo === 'guiado' ? '✨ ' : '') + ej.title;
      li.appendChild(nombre);
      li.addEventListener('click', () => { saltoManual = false; cargar(i); });
      if (ej.tipo === 'guiado') {
        const borrar = document.createElement('button');
        borrar.className = 'quitar-ejercicio';
        borrar.title = PA.t('Quitar de la rutina', 'Remove from routine');
        borrar.innerHTML = '<i class="fas fa-trash"></i>';
        borrar.addEventListener('click', e => { e.stopPropagation(); quitarCreado(ej.id); });
        li.appendChild(borrar);
      }
      ul.appendChild(li);
    });
  }

  function refrescar() {
    construirLista();
    pintarLista();
    const ej = lista[indice];
    if (!ej) return;
    $('exercise-title').textContent = ej.title;
    if (ej.tipo === 'guiado') pintarGuia();
    else mostrarRestante(ej.duration - Math.floor(video().currentTime || 0));
  }

  function quitarCreado(id) {
    if (!confirm(PA.t('¿Quitar este ejercicio de la rutina?', 'Remove this exercise from the routine?'))) return;
    const actual = lista[indice];
    PA.db.guardarEjerciciosCreados(PA.db.ejerciciosCreados().filter(e => e.id !== id));
    construirLista();
    if (actual && actual.id === id) cargar(Math.min(indice, lista.length - 1));
    else {
      indice = Math.max(0, lista.findIndex(e => e === actual || (actual && e.actividadId === actual.actividadId)));
      pintarLista();
    }
    PA.ui.aviso(PA.t('Ejercicio quitado', 'Exercise removed'));
  }

  /* ---------- Carga ---------- */

  function detenerTodo() {
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = null; }
    guia.corriendo = false;
    clearInterval(guia.intervalo);
    guia.intervalo = null;
    video().pause();
    $('countdown-timer').classList.remove('pulse');
    video().classList.remove('pulse');
  }

  function cargar(i) {
    if (i < 0 || i >= lista.length) return;
    detenerTodo();
    indice = i;
    saltoManual = false;
    ultimoTiempo = 0;
    const ej = lista[indice];
    $('video-error').style.display = 'none';

    if (ej.tipo === 'guiado') {
      mostrarGuia(true);
      $('video-loading').style.display = 'none';
      guia.transcurrido = 0;
      guia.terminado = false;
      $('exercise-title').textContent = ej.title;
      pintarLista();
      pintarGuia();
      mostrarRestante(ej.duration);
      if (usuarioInteractuo) reproducir();
      return;
    }

    mostrarGuia(false);
    $('exercise-title').textContent = `${PA.t('Cargando', 'Loading')}: ${ej.title}`;
    $('video-loading').style.display = 'flex';
    const v = video();
    v.src = ej.src;
    v.load();
    v.onloadeddata = () => {
      $('video-loading').style.display = 'none';
      $('exercise-title').textContent = ej.title;
      pintarLista();
      mostrarRestante(ej.duration);
      if (usuarioInteractuo) v.play().then(sincronizar).catch(() => {});
    };
    v.onerror = () => {
      $('video-loading').style.display = 'none';
      $('video-error').style.display = 'flex';
      if (!PA.enEscritorio()) {
        // Demo web (GitHub): los videos solo vienen con la app de escritorio
        $('video-error').querySelector('p').textContent = PA.t('video-web');
        return;
      }
      PA.ui.aviso(PA.t('Video no disponible.', 'Video not available.'));
    };
  }

  function mostrarRestante(segundos) {
    $('countdown-timer').textContent = `${PA.t('Tiempo restante: ', 'Time left: ')}${Math.max(0, segundos)}s`;
    const pulso = segundos <= 5 && segundos > 0;
    $('countdown-timer').classList.toggle('pulse', pulso);
    if (lista[indice] && lista[indice].tipo === 'video') video().classList.toggle('pulse', pulso);
  }

  /* ---------- Video (misma lógica que antes) ---------- */

  function sincronizar() {
    if (cuadro) cancelAnimationFrame(cuadro);
    const ej = lista[indice];
    if (!ej || ej.tipo !== 'video') return;
    ultimoTiempo = video().currentTime;

    function revisar() {
      const t = video().currentTime;
      const entero = Math.floor(t);
      // Si saltó más de 1.5 s, el usuario adelantó el video: no cuenta como hecho
      if (Math.abs(t - (ultimoTiempo + 0.2)) > 1.5) saltoManual = true;
      mostrarRestante(ej.duration - entero);

      if (entero >= ej.duration && !saltoManual) {
        cuadro = null;
        completado();
      } else if (video().paused) {
        cuadro = null;
        return;
      } else if (entero < ej.duration) {
        cuadro = requestAnimationFrame(revisar);
      }
      ultimoTiempo = t;
    }
    cuadro = requestAnimationFrame(revisar);
  }

  /* ---------- Ejercicio guiado ---------- */

  function mostrarGuia(si) {
    $('guia-ejercicio').hidden = !si;
    video().style.visibility = si ? 'hidden' : 'visible';
  }

  function pasoActual(ej) {
    let acumulado = 0;
    for (let i = 0; i < ej.pasos.length; i++) {
      acumulado += ej.pasos[i].segundos;
      if (guia.transcurrido < acumulado) return { i, quedan: acumulado - guia.transcurrido };
    }
    return { i: ej.pasos.length - 1, quedan: 0 };
  }

  function pintarGuia() {
    const ej = lista[indice];
    if (!ej || ej.tipo !== 'guiado') return;
    const { i, quedan } = pasoActual(ej);
    $('guia-numero').textContent = `${PA.t('guided-step')} ${i + 1} ${PA.t('guided-of')} ${ej.pasos.length}`;
    $('guia-texto').textContent = guia.terminado ? PA.t('guided-done') : ej.pasos[i].texto;
    $('guia-segundos').textContent = guia.terminado ? '✔' : String(Math.ceil(quedan));
    $('guia-estado').textContent = guia.corriendo || guia.terminado ? '' : PA.t('guided-ready');
    $('guia-barra').style.width = `${Math.min(100, (guia.transcurrido / ej.duration) * 100)}%`;
    const extra = [];
    if (ej.beneficio) extra.push(`${PA.t('ai-benefit')} ${ej.beneficio}`);
    if (ej.precaucion) extra.push(`${PA.t('ai-caution')} ${ej.precaucion}`);
    $('guia-nota').textContent = extra.join('  ·  ');
    const pasos = $('guia-pasos');
    pasos.innerHTML = '';
    ej.pasos.forEach((p, n) => {
      const li = document.createElement('li');
      li.textContent = `${p.texto} (${p.segundos}s)`;
      if (n < i || guia.terminado) li.className = 'hecho';
      else if (n === i) li.className = 'actual';
      pasos.appendChild(li);
    });
    mostrarRestante(Math.ceil(ej.duration - guia.transcurrido));
  }

  function avanzarGuia() {
    const ej = lista[indice];
    if (!guia.corriendo || !ej || ej.tipo !== 'guiado') return;
    const ahora = performance.now();
    const pasoAntes = pasoActual(ej).i;
    guia.transcurrido += (ahora - guia.marca) / 1000;
    guia.marca = ahora;
    if (guia.transcurrido >= ej.duration) {
      guia.transcurrido = ej.duration;
      guia.corriendo = false;
      guia.terminado = true;
      clearInterval(guia.intervalo);
      pintarGuia();
      completado();
      return;
    }
    if (pasoActual(ej).i !== pasoAntes) PA.recordatorios.tono(0.15); // pitido corto al cambiar de paso
    pintarGuia();
  }

  /* ---------- Controles ---------- */

  function reproducir() {
    usuarioInteractuo = true;
    saltoManual = false;
    const ej = lista[indice];
    if (!ej) return;
    if (ej.tipo === 'guiado') {
      if (guia.terminado) { guia.transcurrido = 0; guia.terminado = false; }
      guia.corriendo = true;
      guia.marca = performance.now();
      clearInterval(guia.intervalo);
      guia.intervalo = setInterval(avanzarGuia, 200);
      pintarGuia();
      return;
    }
    video().play().then(sincronizar).catch(() => PA.ui.aviso(PA.t('Error al reproducir.', 'Playback error.')));
  }

  function pausar() {
    const ej = lista[indice];
    if (ej && ej.tipo === 'guiado') {
      avanzarGuia();
      guia.corriendo = false;
      clearInterval(guia.intervalo);
      pintarGuia();
      return;
    }
    video().pause();
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = null; }
  }

  function reiniciar() {
    saltoManual = false;
    const ej = lista[indice];
    if (ej && ej.tipo === 'guiado') {
      guia.transcurrido = 0;
      guia.terminado = false;
      reproducir();
      return;
    }
    video().currentTime = 0;
    video().play().then(sincronizar).catch(() => {});
  }

  function siguiente() {
    saltoManual = false;
    if (indice < lista.length - 1) cargar(indice + 1);
    else PA.ui.aviso(PA.t('¡Has completado toda la rutina!', 'You have completed the entire routine!'));
  }

  function anterior() {
    saltoManual = false;
    if (indice > 0) cargar(indice - 1);
  }

  function completado() {
    $('countdown-timer').classList.remove('pulse');
    video().classList.remove('pulse');
    PA.usuarios.registrarActividad(lista[indice], saltoManual);
    if (indice === lista.length - 1) {
      PA.ui.aviso(PA.t('¡Felicidades! Has completado toda la rutina.', 'Congratulations! You have completed the entire routine.'));
    } else {
      setTimeout(siguiente, 1000);
    }
  }

  function iniciar() {
    $('btn-anterior').addEventListener('click', anterior);
    $('btn-reproducir').addEventListener('click', reproducir);
    $('btn-pausar').addEventListener('click', pausar);
    $('btn-reiniciar').addEventListener('click', reiniciar);
    $('btn-siguiente').addEventListener('click', siguiente);
    $('reload-video-btn').addEventListener('click', () => { saltoManual = false; cargar(indice); });
    video().addEventListener('seeked', () => { saltoManual = false; });
    video().addEventListener('play', () => { usuarioInteractuo = true; if (!cuadro) sincronizar(); });
    document.addEventListener('click', () => { usuarioInteractuo = true; }, { once: true });
    // Barra espaciadora = reproducir / pausar (si no se está escribiendo)
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      const ej = lista[indice];
      const enMarcha = ej && (ej.tipo === 'guiado' ? guia.corriendo : !video().paused);
      if (enMarcha) pausar(); else reproducir();
    });
    if (!PA.enEscritorio() && !PA.db.ejerciciosCreados().length) sembrarDemo();
    construirLista();
    pintarLista();
    const primero = PA.enEscritorio() ? 0 : Math.max(0, lista.findIndex(e => e.tipo === 'guiado'));
    if (lista.length) cargar(primero);
  }

  /** Demo web: deja dos ejercicios guiados de ejemplo para que se pueda probar. */
  function sembrarDemo() {
    const ejemplos = ['cuello', 'ojos'].map((zona, n) => {
      const e = PA.generadorLocal.generar({ idioma: PA.idioma, zona, duracion: 60 });
      return { id: `demo-${n}`, ...e, fuente: 'local', creado: new Date().toISOString() };
    });
    PA.db.guardarEjerciciosCreados(ejemplos);
  }

  return {
    iniciar,
    refrescar,
    cargar,
    reproducir,
    irAlUltimo: () => { construirLista(); cargar(lista.length - 1); },
    actual: () => lista[indice],
    titulos: () => lista.map(e => e.title)
  };
})();
