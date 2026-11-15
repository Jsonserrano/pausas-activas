'use strict';
/* Arranque: une todos los módulos. */
window.PA = window.PA || {};

(function () {
  const $ = PA.$;

  function crearCielo() {
    const estrellas = document.querySelector('.stars');
    const cometas = document.querySelector('.comets');
    const f1 = document.createDocumentFragment();
    for (let i = 0; i < 300; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const t = 1.5 + Math.random() * 2.5;
      s.style.cssText = `left:${Math.random() * 100}vw;top:${Math.random() * 100}vh;width:${t}px;height:${t}px;opacity:${0.5 + Math.random() * 0.5};animation-delay:${Math.random() * 5}s`;
      f1.appendChild(s);
    }
    estrellas.appendChild(f1);
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('div');
      c.className = 'comet';
      c.style.cssText = `left:${Math.random() * 20}vw;top:${Math.random() * 20}vh;animation-delay:${Math.random() * 10}s;animation-duration:${10 + Math.random() * 20}s`;
      cometas.appendChild(c);
    }
  }

  function piePagina() {
    $('copyright').innerHTML = `&copy; ${new Date().getFullYear()} ${PA.t(
      'Todos los derechos reservados. Elaborado por el Aprendiz del SENA (Jeison Serrano).',
      'All rights reserved. Developed by SENA Apprentice (Jeison Serrano).')}`;
  }

  function cambiarIdioma(idioma) {
    PA.idioma = idioma === 'en' ? 'en' : 'es';
    document.querySelectorAll('.language-btn[data-idioma]').forEach(b => b.classList.toggle('active', b.dataset.idioma === PA.idioma));
    PA.traducirPagina();
    piePagina();
    PA.reproductor.refrescar();
    PA.usuarios.refrescar();
    PA.ia.llenarZonas();
    try { localStorage.setItem('preferredLanguage', PA.idioma); } catch { /* sin acción */ }
  }

  function iniciar() {
    const datos = PA.db.iniciar();
    PA.idioma = localStorage.getItem('preferredLanguage') === 'en' ? 'en' : 'es';
    crearCielo();

    // Botones "Cancelar" y "×" de todos los cuadros
    document.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => PA.ui.cerrarModal(b.dataset.cerrar)));
    document.querySelectorAll('.language-btn[data-idioma]').forEach(b => b.addEventListener('click', () => cambiarIdioma(b.dataset.idioma)));

    PA.usuarios.iniciar(datos);
    PA.reproductor.iniciar();
    PA.excel.iniciar();
    PA.recordatorios.iniciar();
    PA.ia.iniciar();
    PA.respaldo.iniciar();
    PA.ajustes.iniciar();
    cambiarIdioma(PA.idioma);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
