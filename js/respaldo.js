'use strict';
/* Copia de seguridad automática diaria de usuarios, historial y ejercicios creados. */
window.PA = window.PA || {};

PA.respaldo = (function () {
  let ultimaHuella = '';

  function huella(texto) {
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
    return `${texto.length}:${h}`;
  }

  /** Guarda una copia si los datos cambiaron (o si se pide forzar). */
  async function hacer(forzar) {
    if (!PA.enEscritorio()) return null;
    const datos = PA.db.exportarTodo();
    const h = huella(JSON.stringify(datos));
    if (!forzar && h === ultimaHuella) return null;
    try {
      const r = await window.pausas.respaldo.guardar(datos);
      if (r && r.ok) ultimaHuella = h;
      return r;
    } catch (e) {
      console.error('No se pudo hacer la copia:', e);
      return null;
    }
  }

  async function restaurar() {
    const r = await window.pausas.respaldo.restaurar();
    if (r.cancelado) return;
    if (!r.ok) return PA.ui.aviso('❌ ' + r.error);
    const fecha = r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : '';
    if (!confirm(PA.t(`¿Restaurar la copia del ${fecha}? Se reemplazarán los datos actuales.`,
      `Restore the backup from ${fecha}? Current data will be replaced.`))) return;
    await hacer(true); // primero se respalda lo actual
    PA.db.restaurarTodo(r.datos);
    location.reload();
  }

  function iniciar() {
    setTimeout(() => hacer(false), 5000);          // al abrir
    setInterval(() => hacer(false), 30 * 60 * 1000); // cada 30 min si hubo cambios
    window.addEventListener('beforeunload', () => { hacer(false); });
  }

  return { iniciar, hacer, restaurar };
})();
