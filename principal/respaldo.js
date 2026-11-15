'use strict';
/**
 * Copias de seguridad automáticas de los datos (usuarios, historial,
 * ejercicios creados). Se guardan en %APPDATA%\Pausas Activas\respaldos,
 * una por día, y se conservan las últimas 15.
 */
const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const MAXIMO = 15;

function carpeta() {
  const c = path.join(app.getPath('userData'), 'respaldos');
  fs.mkdirSync(c, { recursive: true });
  return c;
}

function listar() {
  return fs.readdirSync(carpeta())
    .filter(n => /^respaldo-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort();
}

function guardar(datos) {
  if (!datos || typeof datos !== 'object') return { ok: false };
  const nombre = `respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  const contenido = JSON.stringify({ app: 'pausas-activas', version: 1, fecha: new Date().toISOString(), datos }, null, 1);
  fs.writeFileSync(path.join(carpeta(), nombre), contenido, 'utf8');
  const todos = listar();
  todos.slice(0, Math.max(0, todos.length - MAXIMO)).forEach(n => {
    try { fs.unlinkSync(path.join(carpeta(), n)); } catch { /* sin acción */ }
  });
  return { ok: true, nombre };
}

function ultimo() {
  const todos = listar();
  return todos.length ? todos[todos.length - 1].slice(9, 19) : null;
}

async function restaurar(ventana) {
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: 'Restaurar copia de seguridad',
    defaultPath: carpeta(),
    properties: ['openFile'],
    filters: [{ name: 'Copia de Pausas Activas', extensions: ['json'] }]
  });
  if (canceled || !filePaths[0]) return { ok: false, cancelado: true };
  try {
    const j = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (j.app !== 'pausas-activas' || !j.datos) return { ok: false, error: 'El archivo no es una copia de Pausas Activas.' };
    return { ok: true, datos: j.datos, fecha: j.fecha };
  } catch {
    return { ok: false, error: 'No se pudo leer la copia.' };
  }
}

function abrirCarpeta() {
  return shell.openPath(carpeta());
}

module.exports = { guardar, ultimo, restaurar, abrirCarpeta };
