'use strict';

const config = require('./config');
const { createDb } = require('./db');
const { createApp } = require('./app');

const db = createDb(config.DB_PATH);
const app = createApp({ db, uploadDir: config.UPLOAD_DIR });

app.listen(config.PORT, () => {
  console.log(`Postulaciones MVP escuchando en http://localhost:${config.PORT}`);
  console.log(`  BD:     ${config.DB_PATH}`);
  console.log(`  PDFs:   ${config.UPLOAD_DIR}`);
});
