'use strict';
/*
 * Reloj de Bogotá y recordatorios de pausa activa.
 * Antes el aviso solo salía si el reloj marcaba exactamente el segundo 00
 * (a veces se lo saltaba). Ahora basta con que sea ese minuto, y no se repite
 * en el mismo día aunque se recargue la ventana.
 */
window.PA = window.PA || {};

PA.recordatorios = (function () {
  const $ = PA.$;
  let horas = ['11:00', '15:00'];
  let sonido = true;
  let audio = null;
  const formato = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function contexto() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  /** Pitido corto (también se usa al cambiar de paso en los ejercicios guiados). */
  function tono(duracion = 0.2, frecuencia = 800, volumen = 0.4) {
    if (!sonido) return;
    try {
      const ctx = contexto();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      g.gain.setValueAtTime(volumen, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duracion);
      osc.connect(g).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duracion + 0.05);
    } catch (e) {
      console.warn('Sin sonido:', e);
    }
  }

  function alarma() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => tono(0.2), i * 1000);
      setTimeout(() => tono(0.2), i * 1000 + 300);
    }
  }

  function mostrados() {
    const fecha = new Date().toDateString();
    const r = PA.db.leer('recordatorios_mostrados', null);
    return r && r.fecha === fecha ? r : { fecha, horas: [] };
  }

  function mostrar(hhmm) {
    const r = mostrados();
    if (r.horas.includes(hhmm)) return; // ya se mostró hoy
    r.horas.push(hhmm);
    PA.db.escribir('recordatorios_mostrados', r);
    alarma();
    $('reminder-title').textContent = PA.t('¡Recordatorio de Pausa Activa!', 'Active Break Reminder!');
    $('reminder-message').textContent = PA.t(
      `Son las ${hhmm}. Es un buen momento para realizar ejercicios de pausa activa.`,
      `It's ${hhmm}. It's a good time to do active break exercises.`);
    $('reminder-alert').style.display = 'block';
  }

  function revisar(ahora) {
    const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    if (horas.includes(hhmm)) mostrar(hhmm);
  }

  function reloj() {
    const ahora = new Date();
    $('colombia-time').textContent = formato.format(ahora);
    revisar(ahora);
  }

  function configurar(nuevas, conSonido) {
    if (Array.isArray(nuevas)) horas = nuevas;
    if (typeof conSonido === 'boolean') sonido = conSonido;
  }

  function iniciar() {
    $('reminder-close').addEventListener('click', () => { $('reminder-alert').style.display = 'none'; });
    $('reminder-start').addEventListener('click', () => {
      $('reminder-alert').style.display = 'none';
      PA.reproductor.cargar(0);
      PA.reproductor.reproducir();
    });
    if (PA.enEscritorio()) window.pausas.alRecordatorio(mostrar);
    reloj();
    setInterval(reloj, 1000);
  }

  return { iniciar, configurar, tono, mostrar, horas: () => horas.slice(), sonido: () => sonido };
})();
