'use strict';

const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { MAX_PDF_BYTES } = require('../config');
const { validateApplication } = require('../middleware/validate');
const { createApplicationService } = require('../services/applicationService');
const { isPdfFile } = require('../pdf');

/**
 * Registra en req.uploadedFiles cada PDF escrito por multer, para poder
 * eliminarlos desde cualquier manejador de errores (RF-07: sin huérfanos).
 */
function cleanupUploads(req) {
  for (const filePath of req.uploadedFiles || []) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ya eliminado o nunca escrito */
    }
  }
  req.uploadedFiles = [];
}

function createApplicationsRouter({ db, uploadDir }) {
  const router = express.Router();
  const service = createApplicationService(db);
  fs.mkdirSync(uploadDir, { recursive: true });

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
  });

  const trackingStorage = {
    _handleFile(req, file, cb) {
      diskStorage._handleFile(req, file, (err, info) => {
        if (!err && info && info.path) {
          req.uploadedFiles = req.uploadedFiles || [];
          req.uploadedFiles.push(info.path);
        }
        cb(err, info);
      });
    },
    _removeFile(req, file, cb) {
      diskStorage._removeFile(req, file, cb);
    },
  };

  const upload = multer({
    storage: trackingStorage,
    limits: { fileSize: MAX_PDF_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      const isPdfName = /\.pdf$/i.test(file.originalname || '');
      const isPdfMime = file.mimetype === 'application/pdf';
      if (isPdfName && isPdfMime) return cb(null, true);
      const err = new Error('Solo se admiten archivos PDF.');
      err.status = 415;
      return cb(err);
    },
  });

  router.post('/api/applications', upload.single('cv'), async (req, res, next) => {
    try {
      // MIME real por magic bytes (RNF-04): rechaza .exe renombrado a .pdf
      if (req.file && !isPdfFile(req.file.path)) {
        cleanupUploads(req);
        return res.status(415).json({ ok: false, message: 'El archivo no es un PDF válido.' });
      }

      const { ok, errors, data } = validateApplication(req.body, req.file);
      if (!ok) {
        cleanupUploads(req);
        return res.status(400).json({ ok: false, errors });
      }

      let id;
      try {
        id = service.submit(data); // transacción: anti-duplicados + inserts
      } catch (err) {
        cleanupUploads(req);
        throw err;
      }

      return res.status(201).json({ ok: true, id });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createApplicationsRouter, cleanupUploads };
