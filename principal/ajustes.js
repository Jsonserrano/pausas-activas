'use strict';
/**
 * Ajustes de la aplicación guardados en la carpeta de datos del usuario
 * (%APPDATA%\Pausas Activas\ajustes.json). La llave de la IA se guarda
 * cifrada con el cifrado del propio Windows (safeStorage).
 */
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const PREDETERMINADOS = {
  recordatorios: ['11:00', '15:00'],
  sonido: true,
  cacheAuto: true,
  cacheDias: 7,
  cacheMaxMB: 150,
  ultimaLimpieza: 0,
  modeloIA: 'claude-haiku-5-5',
  llaveIA: null // cifrada (base64)
};

let cache = null;

function ruta() {
  return path.join(app.getPath('userData'), 'ajustes.json');
}

function leer() {
  if (cache) return cache;
  try {
    cache = { ...PREDETERMINADOS, ...JSON.parse(fs.readFileSync(ruta(), 'utf8')) };
  } catch {
    cache = { ...PREDETERMINADOS };
  }
  return cache;
}

function guardar(cambios) {
  cache = { ...leer(), ...cambios };
  try {
    fs.mkdirSync(path.dirname(ruta()), { recursive: true });
    fs.writeFileSync(ruta(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.error('No se pudieron guardar los ajustes:', e);
  }
  return cache;
}

function guardarLlave(llave) {
  const limpia = String(llave || '').trim();
  if (!limpia) return guardar({ llaveIA: null });
  const valor = safeStorage.isEncryptionAvailable()
    ? 'enc:' + safeStorage.encryptString(limpia).toString('base64')
    : 'b64:' + Buffer.from(limpia, 'utf8').toString('base64');
  return guardar({ llaveIA: valor });
}

function obtenerLlave() {
  const v = leer().llaveIA;
  if (!v) return null;
  try {
    if (v.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64'));
    if (v.startsWith('b64:')) return Buffer.from(v.slice(4), 'base64').toString('utf8');
  } catch (e) {
    console.error('No se pudo leer la llave de IA:', e);
  }
  return null;
}

/** Ajustes que se pueden mostrar en pantalla (nunca la llave). */
function publicos() {
  const a = leer();
  return {
    recordatorios: a.recordatorios,
    sonido: a.sonido,
    cacheAuto: a.cacheAuto,
    cacheDias: a.cacheDias,
    ultimaLimpieza: a.ultimaLimpieza,
    modeloIA: a.modeloIA,
    tieneLlaveIA: Boolean(a.llaveIA)
  };
}

module.exports = { leer, guardar, guardarLlave, obtenerLlave, publicos };
