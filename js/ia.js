'use strict';
/*
 * Ventana "Nuevo ejercicio IA": pide un ejercicio a Claude (si hay llave) o al
 * generador local (sin internet), lo muestra y permite agregarlo a la rutina.
 */
window.PA = window.PA || {};

PA.ia = (function () {
  const $ = PA.$;
  let propuesta = null;
  let tieneLlave = false;

  function llenarZonas() {
    const sel = $('ia-zona');
    const elegida = sel.value || 'cuello';
    sel.innerHTML = '';
    Object.entries(PA.ZONAS).forEach(([clave, nombres]) => {
      const o = document.createElement('option');
      o.value = clave;
      o.textContent = nombres[PA.idioma];
      sel.appendChild(o);
    });
    sel.value = elegida;
  }

  function abrir() {
    llenarZonas();
    propuesta = null;
    $('ia-resultado').hidden = true;
    $('ia-guardar').hidden = true;
    $('ia-generar').innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${PA.t('ai-generate')}`;
    $('ia-aviso').textContent = tieneLlave ? '' : PA.t('ai-hint-nokey');
    PA.ui.abrirModal('ia-modal');
  }

  function pintar(ej, fuente) {
    $('ia-fuente').textContent = PA.t(fuente === 'ia' ? 'ai-source-ia' : 'ai-source-local');
    $('ia-fuente').className = `ia-fuente ${fuente}`;
    $('ia-titulo').textContent = ej.titulo;
    const ol = $('ia-pasos');
    ol.innerHTML = '';
    ej.pasos.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.texto} (${p.segundos}s)`;
      ol.appendChild(li);
    });
    $('ia-extra').textContent = [
      ej.beneficio ? `${PA.t('ai-benefit')} ${ej.beneficio}` : '',
      ej.precaucion ? `${PA.t('ai-caution')} ${ej.precaucion}` : ''
    ].filter(Boolean).join('  ·  ');
    $('ia-resultado').hidden = false;
    $('ia-guardar').hidden = false;
    $('ia-generar').innerHTML = `<i class="fas fa-rotate"></i> ${PA.t('ai-another')}`;
  }

  async function generar() {
    const opciones = {
      idioma: PA.idioma,
      zona: $('ia-zona').value,
      duracion: Number($('ia-duracion').value),
      nivel: $('ia-nivel').value,
      nota: $('ia-nota').value.trim(),
      evitar: PA.reproductor.titulos()
    };
    const boton = $('ia-generar');
    boton.disabled = true;
    $('ia-cargando').hidden = false;
    $('ia-aviso').textContent = '';
    try {
      let ej = null;
      let fuente = 'local';
      if (PA.enEscritorio() && tieneLlave) {
        const r = await window.pausas.ia.generar(opciones);
        if (r.ok) { ej = r.ejercicio; fuente = 'ia'; }
        else {
          $('ia-aviso').textContent = `${r.error || 'Error'} — ${PA.t('se usó el generador sin internet.', 'the offline generator was used.')}`;
        }
      }
      if (!ej) {
        ej = PA.generadorLocal.generar(opciones);
        if (!tieneLlave) $('ia-aviso').textContent = PA.t('ai-hint-nokey');
      }
      propuesta = { ...ej, fuente };
      pintar(ej, fuente);
    } finally {
      boton.disabled = false;
      $('ia-cargando').hidden = true;
    }
  }

  function guardar() {
    if (!propuesta) return;
    const lista = PA.db.ejerciciosCreados();
    lista.push({
      id: `ia-${Date.now().toString(36)}`,
      titulo: propuesta.titulo,
      zona: propuesta.zona,
      pasos: propuesta.pasos,
      precaucion: propuesta.precaucion,
      beneficio: propuesta.beneficio,
      idioma: propuesta.idioma,
      fuente: propuesta.fuente,
      creado: new Date().toISOString()
    });
    PA.db.guardarEjerciciosCreados(lista);
    PA.ui.cerrarModal('ia-modal');
    PA.reproductor.irAlUltimo();
    PA.ui.aviso(PA.t('✅ Ejercicio agregado a la rutina', '✅ Exercise added to the routine'));
  }

  function estado(conLlave) {
    tieneLlave = Boolean(conLlave);
  }

  function iniciar() {
    $('btn-ia').addEventListener('click', abrir);
    $('ia-generar').addEventListener('click', generar);
    $('ia-guardar').addEventListener('click', guardar);
  }

  return { iniciar, estado, llenarZonas };
})();
