'use strict';
/*
 * Datos guardados en localStorage. Se conservan las mismas claves y la misma
 * versión (10) de antes para que NO se pierdan los usuarios ni el historial.
 */
window.PA = window.PA || {};

PA.DB_VERSION = 10;

PA.db = (function () {
  function leer(clave, defecto) {
    try {
      const v = JSON.parse(localStorage.getItem(clave));
      return v == null ? defecto : v;
    } catch {
      return defecto;
    }
  }

  function escribir(clave, valor, error) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      if (error) PA.ui.aviso(error);
      return false;
    }
  }

  function iniciar() {
    let usuarios = leer('users', []);
    let actividad = leer('user_activity', []);
    let actual = leer('current_user', null);
    const version = Number(localStorage.getItem('db_version')) || 0;

    if (!Array.isArray(usuarios) || usuarios.length === 0 || version < PA.DB_VERSION) {
      usuarios = PA.EMPLEADOS_INICIALES.map(u => ({ ...u }));
      actividad = [];
      actual = null;
    }
    if (!Array.isArray(actividad)) actividad = [];

    escribir('users', usuarios);
    escribir('user_activity', actividad);
    escribir('current_user', actual);
    localStorage.setItem('db_version', PA.DB_VERSION);
    return { usuarios, actividad, actual };
  }

  return {
    iniciar,
    usuarios: () => leer('users', []),
    actividad: () => leer('user_activity', []),
    usuarioActual: () => leer('current_user', null),
    guardarUsuarios: u => escribir('users', u, PA.t('Error al guardar usuarios.', 'Error saving users.')),
    guardarActividad: a => escribir('user_activity', a, PA.t('Error al guardar actividad.', 'Error saving activity.')),
    guardarUsuarioActual: u => escribir('current_user', u),
    ejerciciosCreados: () => leer('ejercicios_creados', []),
    guardarEjerciciosCreados: l => escribir('ejercicios_creados', l, PA.t('Error al guardar el ejercicio.', 'Error saving exercise.')),
    leer,
    escribir,

    /** Todo lo que vale la pena respaldar. */
    exportarTodo() {
      return {
        users: leer('users', []),
        user_activity: leer('user_activity', []),
        ejercicios_creados: leer('ejercicios_creados', []),
        preferredLanguage: localStorage.getItem('preferredLanguage') || 'es',
        db_version: PA.DB_VERSION
      };
    },

    restaurarTodo(d) {
      if (!d || !Array.isArray(d.users)) throw new Error('copia inválida');
      escribir('users', d.users);
      escribir('user_activity', Array.isArray(d.user_activity) ? d.user_activity : []);
      escribir('ejercicios_creados', Array.isArray(d.ejercicios_creados) ? d.ejercicios_creados : []);
      escribir('current_user', null);
      localStorage.setItem('db_version', PA.DB_VERSION);
    }
  };
})();
