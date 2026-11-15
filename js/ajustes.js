'use strict';
/* Ventana de Ajustes: llave de IA, horas de recordatorio, caché y copias. */
window.PA = window.PA || {};

PA.ajustes = (function () {
  const $ = PA.$;
  let datos = null;

  const fechaLarga = ms => (ms ? new Date(ms).toLocaleString('es-CO') : PA.t('never'));

  function pintarIA() {
    $('aj-ia-estado').textContent = PA.t(datos.tieneLlaveIA ? 'set-ai-on' : 'set-ai-off');
    $('aj-ia-estado').className = `aj-estado ${datos.tieneLlaveIA ? 'ok' : ''}`;
    $('aj-ia-quitar').hidden = !datos.tieneLlaveIA;
    PA.ia.estado(datos.tieneLlaveIA);
  }

  function pintarHoras() {
    const caja = $('aj-horas');
    caja.innerHTML = '';
    PA.recordatorios.horas().forEach(h => agregarHora(h));
    $('aj-sonido').checked = PA.recordatorios.sonido();
  }

  function agregarHora(valor) {
    const fila = document.createElement('div');
    fila.className = 'aj-hora';
    const input = document.createElement('input');
    input.type = 'time';
    input.value = valor || '09:00';
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'aj-mini';
    quitar.innerHTML = '<i class="fas fa-times"></i>';
    quitar.addEventListener('click', () => fila.remove());
    fila.append(input, quitar);
    $('aj-horas').appendChild(fila);
  }

  async function pintarCache() {
    const c = await window.pausas.cache.info();
    $('aj-cache-tamano').textContent = PA.formatoBytes(c.bytes);
    $('aj-cache-ultima').textContent = fechaLarga(c.ultimaLimpieza);
    $('aj-cache-auto').checked = c.auto;
    $('aj-cache-dias').value = String(c.dias);
  }

  async function pintarRespaldo() {
    const f = await window.pausas.respaldo.ultimo();
    $('aj-respaldo-ultimo').textContent = f || PA.t('never');
  }

  async function abrir() {
    if (!PA.enEscritorio()) return PA.ui.aviso(PA.t('Los ajustes funcionan en la aplicación de escritorio.', 'Settings work in the desktop app.'));
    datos = await window.pausas.ajustes.obtener();
    $('aj-version').textContent = await window.pausas.version();
    pintarIA();
    pintarHoras();
    PA.ui.abrirModal('ajustes-modal');
    pintarCache();
    pintarRespaldo();
  }

  async function guardarLlave() {
    const r = await window.pausas.ia.guardarLlave($('aj-ia-llave').value);
    if (!r.ok) return PA.ui.aviso('❌ ' + r.error);
    $('aj-ia-llave').value = '';
    datos = r;
    pintarIA();
    PA.ui.aviso(PA.t('✅ Llave guardada (cifrada en este equipo)', '✅ Key saved (encrypted on this computer)'));
  }

  async function quitarLlave() {
    datos = await window.pausas.ia.guardarLlave('');
    pintarIA();
    PA.ui.aviso(PA.t('Llave quitada', 'Key removed'));
  }

  async function guardarHoras() {
    const horas = [...$('aj-horas').querySelectorAll('input[type=time]')].map(i => i.value).filter(Boolean);
    datos = await window.pausas.ajustes.recordatorios(horas, $('aj-sonido').checked);
    PA.recordatorios.configurar(datos.recordatorios, datos.sonido);
    pintarHoras();
    PA.ui.aviso(PA.t(`✅ Recordatorios: ${datos.recordatorios.join(', ') || 'ninguno'}`, `✅ Reminders: ${datos.recordatorios.join(', ') || 'none'}`));
  }

  async function limpiarCache() {
    const b = $('aj-cache-limpiar');
    b.disabled = true;
    try {
      const r = await window.pausas.cache.limpiar();
      PA.ui.aviso(PA.t(`✅ Caché borrada (${PA.formatoBytes(r.liberados)} liberados)`, `✅ Cache cleared (${PA.formatoBytes(r.liberados)} freed)`));
      await pintarCache();
    } finally {
      b.disabled = false;
    }
  }

  async function configurarCache() {
    await window.pausas.cache.configurar({ auto: $('aj-cache-auto').checked, dias: Number($('aj-cache-dias').value) });
    pintarCache();
  }

  async function respaldarAhora() {
    const r = await PA.respaldo.hacer(true);
    if (r && r.ok) PA.ui.aviso(PA.t('✅ Copia guardada', '✅ Backup saved'));
    pintarRespaldo();
  }

  /** Carga los ajustes guardados al abrir la app (horas, sonido, estado de IA). */
  async function iniciar() {
    $('btn-ajustes').addEventListener('click', abrir);
    $('aj-ia-guardar').addEventListener('click', guardarLlave);
    $('aj-ia-llave').addEventListener('keydown', e => { if (e.key === 'Enter') guardarLlave(); });
    $('aj-ia-quitar').addEventListener('click', quitarLlave);
    $('aj-ia-consola').addEventListener('click', () => window.pausas.ia.abrirConsola());
    $('aj-hora-agregar').addEventListener('click', () => agregarHora());
    $('aj-horas-guardar').addEventListener('click', guardarHoras);
    $('aj-cache-limpiar').addEventListener('click', limpiarCache);
    $('aj-cache-auto').addEventListener('change', configurarCache);
    $('aj-cache-dias').addEventListener('change', configurarCache);
    $('aj-respaldo-ahora').addEventListener('click', respaldarAhora);
    $('aj-respaldo-abrir').addEventListener('click', () => window.pausas.respaldo.abrirCarpeta());
    $('aj-respaldo-restaurar').addEventListener('click', () => PA.respaldo.restaurar());

    if (!PA.enEscritorio()) return;
    datos = await window.pausas.ajustes.obtener();
    PA.recordatorios.configurar(datos.recordatorios, datos.sonido);
    PA.ia.estado(datos.tieneLlaveIA);
    window.pausas.alLimpiarCache(r => {
      console.log('Caché borrada automáticamente:', r);
      if (r.liberados > 0) PA.ui.aviso(PA.t(`🧹 Caché borrada automáticamente (${PA.formatoBytes(r.liberados)})`, `🧹 Cache cleared automatically (${PA.formatoBytes(r.liberados)})`));
    });
  }

  return { iniciar };
})();
