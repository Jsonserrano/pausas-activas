'use strict';
/**
 * Exportar / importar el reporte SST en Excel con exceljs (ya estaba en las
 * dependencias). Funciona sin internet y abre el cuadro "Guardar como".
 */
const { dialog, app } = require('electron');
const path = require('path');
const ExcelJS = require('exceljs');

const ENCABEZADO = { font: { bold: true, color: { argb: 'FF000000' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } } };

function hoja(wb, nombre, columnas, filas) {
  const ws = wb.addWorksheet(nombre);
  ws.columns = columnas;
  filas.forEach(f => ws.addRow(f));
  const h = ws.getRow(1);
  h.font = ENCABEZADO.font;
  h.fill = ENCABEZADO.fill;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (filas.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return ws;
}

async function exportar(ventana, { usuarios = [], actividad = [] }) {
  const fecha = new Date().toISOString().split('T')[0];
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar reporte SST',
    defaultPath: path.join(app.getPath('documents'), `Reporte_SST_LorenZOO_${fecha}.xlsx`),
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (canceled || !filePath) return { ok: false, cancelado: true };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pausas Activas – Jeison Serrano';
  wb.created = new Date();

  hoja(wb, 'Usuarios', [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Cargo', key: 'cargo', width: 36 },
    { header: 'Área', key: 'area', width: 40 }
  ], usuarios.map(u => ({ id: u.id, nombre: u.nombre, cargo: u.cargo, area: u.area })));

  hoja(wb, 'Actividad', [
    { header: 'ID Usuario', key: 'userId', width: 11 },
    { header: 'Usuario', key: 'userName', width: 40 },
    { header: 'Cargo', key: 'userCargo', width: 30 },
    { header: 'Área', key: 'userArea', width: 34 },
    { header: 'Ejercicio', key: 'exerciseName', width: 44 },
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Sesiones', key: 'count', width: 10 },
    { header: 'Tiempo Total (s)', key: 'totalTime', width: 16 },
    { header: 'Última Sesión', key: 'lastSession', width: 24 }
  ], actividad);

  // Resumen por persona (nuevo): útil para el indicador de participación SST
  const porUsuario = new Map();
  actividad.forEach(a => {
    const r = porUsuario.get(a.userId) || { userId: a.userId, userName: a.userName, userArea: a.userArea, sesiones: 0, minutos: 0, dias: new Set(), ultima: '' };
    r.sesiones += Number(a.count) || 0;
    r.minutos += (Number(a.totalTime) || 0) / 60;
    r.dias.add(a.date);
    if (String(a.lastSession) > r.ultima) r.ultima = String(a.lastSession);
    porUsuario.set(a.userId, r);
  });
  hoja(wb, 'Resumen', [
    { header: 'ID Usuario', key: 'userId', width: 11 },
    { header: 'Usuario', key: 'userName', width: 40 },
    { header: 'Área', key: 'userArea', width: 34 },
    { header: 'Ejercicios completados', key: 'sesiones', width: 22 },
    { header: 'Minutos totales', key: 'minutos', width: 16 },
    { header: 'Días con pausa', key: 'dias', width: 15 },
    { header: 'Última pausa', key: 'ultima', width: 24 }
  ], [...porUsuario.values()].map(r => ({ ...r, minutos: Math.round(r.minutos * 10) / 10, dias: r.dias.size })));

  await wb.xlsx.writeFile(filePath);
  return { ok: true, ruta: filePath, nombre: path.basename(filePath) };
}

function valor(celda) {
  const v = celda && celda.value;
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return v.text || v.result || (v.richText ? v.richText.map(t => t.text).join('') : '');
  return v;
}

function filasDe(ws) {
  if (!ws) return null;
  const titulos = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => { titulos[i] = String(valor(c)).trim(); });
  const filas = [];
  ws.eachRow((fila, n) => {
    if (n === 1) return;
    const o = {};
    titulos.forEach((t, i) => { if (t) o[t] = valor(fila.getCell(i)); });
    if (Object.values(o).some(v => v !== '')) filas.push(o);
  });
  return filas;
}

async function importar(ventana) {
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: 'Importar desde Excel',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (canceled || !filePaths[0]) return { ok: false, cancelado: true };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePaths[0]);
  const usuariosF = filasDe(wb.getWorksheet('Usuarios'));
  const actividadF = filasDe(wb.getWorksheet('Actividad'));
  if (!usuariosF && !actividadF) return { ok: false, error: 'El archivo no tiene hojas "Usuarios" ni "Actividad".' };

  const usuarios = usuariosF && usuariosF
    .map(u => ({ id: parseInt(u.ID, 10), nombre: String(u.Nombre || '').trim(), cargo: String(u.Cargo || '').trim(), area: String(u['Área'] || u.Area || '').trim() }))
    .filter(u => u.id && u.nombre);

  const actividad = actividadF && actividadF.map(a => ({
    userId: parseInt(a['ID Usuario'], 10) || 0,
    userName: String(a.Usuario || ''),
    userCargo: String(a.Cargo || ''),
    userArea: String(a['Área'] || a.Area || ''),
    exerciseId: String(a.Ejercicio || ''),
    exerciseName: String(a.Ejercicio || ''),
    date: String(a.Fecha || '').slice(0, 10),
    count: Number(a.Sesiones) || 0,
    totalTime: Number(a['Tiempo Total (s)']) || 0,
    lastSession: String(a['Última Sesión'] || '')
  }));

  return { ok: true, usuarios, actividad, nombre: path.basename(filePaths[0]) };
}

module.exports = { exportar, importar };
