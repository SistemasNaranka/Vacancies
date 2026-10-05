'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const config = require('./config');
const { createApplicationsRouter, cleanupUploads } = require('./routes/applications');

/**
 * Fábrica de la aplicación (permite tests con carpeta temporal).
 * @param {{ uploadDir?: string, rateLimitMax?: number, service?: object }} [deps]
 */
function createApp({ uploadDir = config.UPLOAD_DIR, rateLimitMax = config.RATE_LIMIT_MAX, service } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  // helmet añade por defecto la directiva CSP 'upgrade-insecure-requests', que hace que
  // el navegador reescriba los subrecursos (styles.css, form.js) a HTTPS. En HTTP plano
  // (LAN o IP pública) esas peticiones fallan y la página queda sin estilos ni JS; en
  // localhost no ocurre porque es un origen de confianza (de ahí que el fallo solo
  // aparezca fuera de localhost). Se activa solo con HTTPS real (ENFORCE_HTTPS=1).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { 'upgrade-insecure-requests': config.ENFORCE_HTTPS ? [] : null },
      },
    })
  );
  app.use(express.static(path.join(config.rootDir, 'public'), { index: 'index.html' }));

  // Health va ANTES del rate limit: el health check de Coolify no debe gastar el cupo
  // ni recibir 429 (eso marcaría el contenedor como caído).
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Rate limit sobre el resto de la API (debe montarse antes de las rutas)
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { ok: false, message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
    })
  );

  app.use(createApplicationsRouter({ uploadDir, service }));

  // 404 para rutas /api inexistentes (las de afuera las resuelve express.static)
  app.use('/api', (req, res) => res.status(404).json({ ok: false, message: 'Recurso no encontrado.' }));

  // Manejador de errores: multer (413/415) y errores con status
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof multer.MulterError || err.status) {
      cleanupUploads(req); // nunca dejar un PDF sin registro (RF-07)
    }

    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        ok: false,
        message: tooLarge
          ? `El PDF supera el máximo de ${config.MAX_PDF_MB} MB.`
          : 'Error al procesar el archivo subido.',
      });
    }

    if (err.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }

    console.error(err);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
  });

  return app;
}

module.exports = { createApp };
