'use strict';

const path = require('path');

const rootDir = path.join(__dirname, '..');

// Carga .env antes de leer cualquier variable. Si no existe, se usan los valores por defecto.
try {
  process.loadEnvFile(path.join(rootDir, '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

/** Lista fija de cargos (RN-03). Debe coincidir con los checkboxes de public/index.html
 *  — ver tests/applications.test.js (test de consistencia). */
const POSITIONS = ['Administrador de tienda', 'Cajero vendedor', 'Asesor comercial', 'Auxiliar de Bodega'];

const MAX_PDF_MB = Number(process.env.MAX_PDF_MB || 5);

module.exports = {
  rootDir,
  PORT: Number(process.env.PORT || 3000),
  DB_PATH: process.env.DB_PATH || path.join(rootDir, 'data', 'app.db'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'),
  POSITIONS,
  MAX_PDF_MB,
  MAX_PDF_BYTES: MAX_PDF_MB * 1024 * 1024,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 5),
  TRUST_PROXY: Number(process.env.TRUST_PROXY ?? 1),
  // El MVP se sirve por HTTP (LAN o IP pública). Solo activar con HTTPS real,
  // porque 'upgrade-insecure-requests' rompe los subrecursos en HTTP no-localhost.
  ENFORCE_HTTPS: process.env.ENFORCE_HTTPS === '1',
  DIRECTUS_URL: process.env.DIRECTUS_URL,
  DIRECTUS_TOKEN: process.env.DIRECTUS_TOKEN,
  DIRECTUS_COLLECTION: process.env.DIRECTUS_COLLECTION || 'app_applications',
  DIRECTUS_CV_FOLDER: process.env.DIRECTUS_CV_FOLDER,
};
