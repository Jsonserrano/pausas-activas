'use strict';
/* Reporte SST en Excel (lo genera el proceso principal con exceljs, sin internet). */
window.PA = window.PA || {};

PA.excel = (function () {
  const $ = PA.$;

  function soloEscritorio() {
    if (PA.enEscritorio()) return false;
    PA.ui.aviso(PA.t('Esta opción funciona en la aplicación de escritorio.', 'This option works in the desktop app.'));
    return true;
  }

  function pedirClave() {
    if (soloEscritorio()) return;
    $('password-error').style.display = 'none';
    $('export-password').type = 'password';
    PA.ui.abrirModal('password-modal');
  }

  async function exportar() {
    const clave = $('export-password').value;
    const boton = $('submit-password');
    boton.disabled = true;
    try {
      const r = await window.pausas.excel.exportar(clave, { usuarios: PA.db.usuarios(), actividad: PA.db.actividad() });
      if (r.claveIncorrecta) {
        $('password-error').style.display = 'block';
        $('export-password').select();
        return;
      }
      PA.ui.cerrarModal('password-modal');
      if (r.ok) PA.ui.aviso(PA.t(`✅ Archivo "${r.nombre}" exportado correctamente.`, `✅ File "${r.nombre}" exported successfully.`));
    } catch (e) {
      console.error('Error al exportar:', e);
      PA.ui.aviso(PA.t('❌ Error al exportar el archivo.', '❌ Error exporting file.'));
    } finally {
      boton.disabled = false;
    }
  }

  async function importar() {
    if (soloEscritorio()) return;
    try {
      const r = await window.pausas.excel.importar();
      if (r.cancelado) return;
      if (!r.ok) return PA.ui.aviso('❌ ' + (r.error || PA.t('Error al importar', 'Error importing')));
      const partes = [];
      if (r.usuarios && r.usuarios.length) partes.push(`${r.usuarios.length} ${PA.t('usuarios', 'users')}`);
      if (r.actividad) partes.push(`${r.actividad.length} ${PA.t('registros de actividad', 'activity records')}`);
      const ok = confirm(PA.t(
        `Se reemplazarán los datos actuales con ${partes.join(' y ')} de "${r.nombre}". ¿Continuar?`,
        `Current data will be replaced with ${partes.join(' and ')} from "${r.nombre}". Continue?`));
      if (!ok) return;

      PA.respaldo.hacer(); // copia de lo que había, por si acaso
      if (r.usuarios && r.usuarios.length) PA.db.guardarUsuarios(r.usuarios);
      if (r.actividad) {
        // Reportes antiguos no traían "ID Usuario": se busca por nombre
        const equipo = PA.db.usuarios();
        r.actividad.forEach(a => {
          if (!a.userId) {
            const u = equipo.find(x => x.nombre === a.userName);
            if (u) a.userId = u.id;
          }
        });
        PA.db.guardarActividad(r.actividad);
      }
      PA.usuarios.refrescar();
      PA.usuarios.estadisticas();
      PA.ui.aviso(PA.t('✅ Datos importados', '✅ Data imported'));
    } catch (e) {
      console.error('Error al importar:', e);
      PA.ui.aviso(PA.t('❌ Error al importar', '❌ Error importing'));
    }
  }

  function iniciar() {
    $('excel-export').addEventListener('click', pedirClave);
    $('excel-import').addEventListener('click', importar);
    $('submit-password').addEventListener('click', exportar);
    $('export-password').addEventListener('keydown', e => { if (e.key === 'Enter') exportar(); });
    $('toggle-export-password').addEventListener('click', () => {
      const i = $('export-password');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('toggle-export-password').innerHTML = i.type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  }

  return { iniciar };
})();
