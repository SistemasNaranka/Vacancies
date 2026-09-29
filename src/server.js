'use strict';

const config = require('./config');
const { createApp } = require('./app');

// Sin Directus no se puede guardar nada: mejor no arrancar que fallar con cada postulante
const missing = ['DIRECTUS_URL', 'DIRECTUS_TOKEN', 'DIRECTUS_CV_FOLDER'].filter((k) => !config[k]);
if (missing.length) {
  console.error(`Faltan variables en .env: ${missing.join(', ')}`);
  process.exit(1);
}

const app = createApp({ uploadDir: config.UPLOAD_DIR });

app.listen(config.PORT, (err) => {
  if (err) {
    console.error(`No se pudo abrir el puerto ${config.PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Postulaciones escuchando en http://localhost:${config.PORT}`);
  console.log(`  Directus: ${config.DIRECTUS_URL} → ${config.DIRECTUS_COLLECTION}`);
  console.log(`  PDFs temporales: ${config.UPLOAD_DIR}`);
});