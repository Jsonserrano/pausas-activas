'use strict';
/**
 * Limpieza de caché de Electron/Chromium.
 * Solo borra archivos temporales (caché HTTP, caché de código, shaders,
 * Cache Storage y service workers). NUNCA borra localStorage, que es donde
 * viven los usuarios y el historial de pausas.
 */
const { session } = require('electron');
const ajustes = require('./ajustes');

const DIA_MS = 24 * 60 * 60 * 1000;
let temporizador = null;

async function info() {
  const bytes = await session.defaultSession.getCacheSize();
  const a = ajustes.leer();
  return { bytes, ultimaLimpieza: a.ultimaLimpieza, auto: a.cacheAuto, dias: a.cacheDias };
}

async function limpiar(motivo = 'manual') {
  const s = session.defaultSession;
  const antes = await s.getCacheSize();
  await s.clearCache();
  await s.clearCodeCaches({});
  await s.clearStorageData({ storages: ['shadercache', 'cachestorage', 'serviceworkers'] });
  const despues = await s.getCacheSize();
  ajustes.guardar({ ultimaLimpieza: Date.now() });
  console.log(`[caché] limpieza ${motivo}: ${antes} → ${despues} bytes`);
  return { ok: true, liberados: Math.max(0, antes - despues), motivo };
}

/** Limpia sola si está activado y ya pasó el plazo o la caché creció demasiado. */
async function revisarAutomatico() {
  const a = ajustes.leer();
  if (!a.cacheAuto) return null;
  const vencida = Date.now() - (a.ultimaLimpieza || 0) >= a.cacheDias * DIA_MS;
  const bytes = await session.defaultSession.getCacheSize();
  const grande = bytes > a.cacheMaxMB * 1024 * 1024;
  if (vencida || grande) return limpiar(grande ? 'automática (tamaño)' : 'automática (plazo)');
  return null;
}

function iniciarAutomatico(alLimpiar) {
  const revisar = () => revisarAutomatico()
    .then(r => { if (r && alLimpiar) alLimpiar(r); })
    .catch(e => console.error('[caché] error en limpieza automática:', e));
  setTimeout(revisar, 15 * 1000); // al arrancar, cuando la ventana ya cargó
  clearInterval(temporizador);
  temporizador = setInterval(revisar, 6 * 60 * 60 * 1000); // y cada 6 h si queda abierta
}

function configurar({ auto, dias }) {
  const cambios = {};
  if (typeof auto === 'boolean') cambios.cacheAuto = auto;
  const d = Number(dias);
  if ([1, 3, 7, 15, 30].includes(d)) cambios.cacheDias = d;
  ajustes.guardar(cambios);
  return info();
}

module.exports = { info, limpiar, iniciarAutomatico, configurar };
