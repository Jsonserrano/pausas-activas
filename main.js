'use strict';
/**
 * Proceso principal de Pausas Activas.
 * Autoría: Jeison Serrano – Aprendiz SENA
 */
const { app, BrowserWindow, ipcMain, Notification, powerMonitor, shell, Menu } = require('electron');
const path = require('path');
const crypto = require('crypto');

const { setAlarm, clearAllAlarms } = require('./alarmScheduler');
const ajustes = require('./principal/ajustes');
const cache = require('./principal/cache');
const ia = require('./principal/ia');
const excel = require('./principal/excel');
const respaldo = require('./principal/respaldo');

// Contraseña de exportación: solo se guarda su huella (scrypt), nunca el texto.
// La de la empresa va en clave-local.json (no se sube a GitHub). Para cambiarla:
//   npm run cambiar-clave -- "NuevaClave"
// Sin ese archivo se usa la clave de demostración "demo-sst".
const CLAVE = (() => {
  try {
    const c = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'clave-local.json'), 'utf8'));
    if (/^[0-9a-f]{32}$/.test(c.sal) && /^[0-9a-f]{64}$/.test(c.huella)) return c;
  } catch { /* sin archivo: clave de demostración */ }
  return { sal: '9d63a63001c1d1c1488316454a60d23e', huella: 'aee936f7caa0a241d4d74b9889b605d6f83b5380815aba4acd0124ca0b518c75' };
})();

let ventana = null;

function claveCorrecta(clave) {
  const h = crypto.scryptSync(String(clave || ''), CLAVE.sal, 32);
  return crypto.timingSafeEqual(h, Buffer.from(CLAVE.huella, 'hex'));
}

function crearVentana() {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Pausas Activas',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icons', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // La app no navega a otras páginas ni abre ventanas nuevas.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());

  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

function mostrarVentana() {
  if (!ventana || ventana.isDestroyed()) return;
  if (ventana.isMinimized()) ventana.restore();
  ventana.show();
  ventana.focus();
}

/* ---------------- Recordatorios ---------------- */

function programarRecordatorios() {
  clearAllAlarms();
  const horas = ajustes.leer().recordatorios || [];
  horas.forEach(hhmm => {
    const [h, m] = String(hhmm).split(':').map(Number);
    if (Number.isInteger(h) && Number.isInteger(m)) programarDiario(h, m, hhmm);
  });
}

function programarDiario(hora, minuto, etiqueta) {
  const ahora = new Date();
  const cuando = new Date();
  cuando.setHours(hora, minuto, 0, 0);
  if (cuando <= ahora) cuando.setDate(cuando.getDate() + 1);
  setAlarm(cuando - ahora, () => {
    avisar(etiqueta);
    programarDiario(hora, minuto, etiqueta); // siguiente día
  });
}

function avisar(hhmm) {
  if (!ventana || ventana.isDestroyed()) return;
  ventana.webContents.send('recordatorio', hhmm);
  // Si la ventana está minimizada o detrás de otras, avisar también con Windows
  if (!ventana.isFocused()) {
    ventana.flashFrame(true);
    if (Notification.isSupported()) {
      const n = new Notification({
        title: '¡Hora de Pausa Activa!',
        body: `Son las ${hhmm}. Tómate unos minutos para tus ejercicios.`,
        icon: path.join(__dirname, 'assets', 'icons', 'app.ico')
      });
      n.on('click', mostrarVentana);
      n.show();
    }
  }
}

/* ---------------- Comunicación con la página ---------------- */

function registrarIPC() {
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('ajustes:obtener', () => ajustes.publicos());
  ipcMain.handle('ajustes:recordatorios', (_e, horas, sonido) => {
    const validas = (Array.isArray(horas) ? horas : [])
      .map(h => String(h).trim())
      .filter(h => /^([01]\d|2[0-3]):[0-5]\d$/.test(h));
    const unicas = [...new Set(validas)].sort().slice(0, 8);
    ajustes.guardar({ recordatorios: unicas, sonido: sonido !== false });
    programarRecordatorios();
    return ajustes.publicos();
  });

  ipcMain.handle('clave:verificar', (_e, clave) => claveCorrecta(clave));

  ipcMain.handle('excel:exportar', async (e, clave, datos) => {
    if (!claveCorrecta(clave)) return { ok: false, claveIncorrecta: true };
    return excel.exportar(BrowserWindow.fromWebContents(e.sender), datos || {});
  });
  ipcMain.handle('excel:importar', e => excel.importar(BrowserWindow.fromWebContents(e.sender)));

  ipcMain.handle('ia:generar', (_e, opciones) => ia.generar(opciones));
  ipcMain.handle('ia:guardarLlave', (_e, llave) => {
    const limpia = String(llave || '').trim();
    if (limpia && !/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(limpia)) return { ok: false, error: 'La llave debe empezar por sk-ant-' };
    ajustes.guardarLlave(limpia);
    return { ok: true, ...ajustes.publicos() };
  });
  ipcMain.handle('ia:abrirConsola', () => shell.openExternal('https://console.anthropic.com/settings/keys'));

  ipcMain.handle('cache:info', () => cache.info());
  ipcMain.handle('cache:limpiar', () => cache.limpiar('manual'));
  ipcMain.handle('cache:configurar', (_e, op) => cache.configurar(op || {}));

  ipcMain.handle('respaldo:guardar', (_e, datos) => respaldo.guardar(datos));
  ipcMain.handle('respaldo:ultimo', () => respaldo.ultimo());
  ipcMain.handle('respaldo:restaurar', e => respaldo.restaurar(BrowserWindow.fromWebContents(e.sender)));
  ipcMain.handle('respaldo:abrirCarpeta', () => respaldo.abrirCarpeta());
}

/* ---------------- Arranque ---------------- */

// Una sola ventana: si se abre de nuevo, se trae al frente la que ya está.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', mostrarVentana);

  app.whenReady().then(() => {
    app.setAppUserModelId('com.labzoo.pausasactivas'); // notificaciones en Windows
    Menu.setApplicationMenu(null);
    registrarIPC();
    ventana = crearVentana();
    programarRecordatorios();
    cache.iniciarAutomatico(r => {
      if (ventana && !ventana.isDestroyed()) ventana.webContents.send('cache:limpiada', r);
    });
    // Al volver de suspensión los temporizadores se desfasan: se reprograman.
    powerMonitor.on('resume', programarRecordatorios);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) ventana = crearVentana();
  });

  app.on('before-quit', clearAllAlarms);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
