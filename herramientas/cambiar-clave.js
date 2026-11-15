'use strict';
/*
 * Cambia la contraseña de "Exportar Reporte SST".
 * Uso:  npm run cambiar-clave -- "NuevaClave"
 * Guarda solo la huella (scrypt) en clave-local.json; ese archivo no se sube a GitHub.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const clave = process.argv[2];
if (!clave || clave.length < 6) {
  console.error('Escribe la nueva contraseña (mínimo 6 caracteres):  npm run cambiar-clave -- "NuevaClave"');
  process.exit(1);
}
const sal = crypto.randomBytes(16).toString('hex');
const huella = crypto.scryptSync(clave, sal, 32).toString('hex');
fs.writeFileSync(path.join(__dirname, '..', 'clave-local.json'), JSON.stringify({ sal, huella }, null, 2) + '\n');
console.log('✅ Contraseña cambiada. Cierra y vuelve a abrir la app (npm start).');
