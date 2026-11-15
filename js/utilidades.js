'use strict';
/* Ayudas de interfaz compartidas por todos los módulos. */
window.PA = window.PA || {};

PA.$ = id => document.getElementById(id);

/** Evita que un nombre con < > & rompa la tabla (o inyecte código). */
PA.escapar = function (texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

PA.formatoTiempo = function (segundos) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

PA.formatoBytes = function (b) {
  if (!b) return '0 MB';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

/** ¿Estamos dentro de Electron (con el puente del preload)? */
PA.enEscritorio = () => typeof window.pausas === 'object' && window.pausas !== null;

PA.ui = (function () {
  let temporizador = null;

  function aviso(mensaje) {
    const el = PA.$('feedback-message');
    el.textContent = mensaje;
    el.style.display = 'block';
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { el.style.display = 'none'; }, 5000);
  }

  function abrirModal(id) {
    const m = PA.$(id);
    m.style.display = 'flex';
    const primero = m.querySelector('input:not([type=hidden]), select, textarea');
    if (primero) setTimeout(() => primero.focus(), 30);
  }

  function cerrarModal(id) {
    const m = PA.$(id);
    m.style.display = 'none';
    m.querySelectorAll('input[type=text], input[type=password], input[type=hidden], textarea').forEach(i => { i.value = ''; });
  }

  // Cerrar con Escape o haciendo clic fuera del cuadro
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal').forEach(m => { if (m.style.display === 'flex') cerrarModal(m.id); });
  });
  document.addEventListener('mousedown', e => {
    if (e.target.classList && e.target.classList.contains('modal')) cerrarModal(e.target.id);
  });

  return { aviso, abrirModal, cerrarModal };
})();
