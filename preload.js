'use strict';
/**
 * Puente seguro entre la página y el proceso principal.
 * Autoría: Jeison Serrano – Aprendiz SENA
 * (Con sandbox activo, aquí solo se puede usar el módulo "electron".)
 */
const { contextBridge, ipcRenderer } = require('electron');

const llamar = (canal, ...args) => ipcRenderer.invoke(canal, ...args);

contextBridge.exposeInMainWorld('pausas', {
  version: () => llamar('app:version'),
  ajustes: {
    obtener: () => llamar('ajustes:obtener'),
    recordatorios: (horas, sonido) => llamar('ajustes:recordatorios', horas, sonido)
  },
  verificarClave: clave => llamar('clave:verificar', clave),
  excel: {
    exportar: (clave, datos) => llamar('excel:exportar', clave, datos),
    importar: () => llamar('excel:importar')
  },
  ia: {
    generar: opciones => llamar('ia:generar', opciones),
    guardarLlave: llave => llamar('ia:guardarLlave', llave),
    abrirConsola: () => llamar('ia:abrirConsola')
  },
  cache: {
    info: () => llamar('cache:info'),
    limpiar: () => llamar('cache:limpiar'),
    configurar: op => llamar('cache:configurar', op)
  },
  respaldo: {
    guardar: datos => llamar('respaldo:guardar', datos),
    ultimo: () => llamar('respaldo:ultimo'),
    restaurar: () => llamar('respaldo:restaurar'),
    abrirCarpeta: () => llamar('respaldo:abrirCarpeta')
  },
  alRecordatorio: cb => ipcRenderer.on('recordatorio', (_e, hora) => cb(hora)),
  alLimpiarCache: cb => ipcRenderer.on('cache:limpiada', (_e, r) => cb(r))
});
