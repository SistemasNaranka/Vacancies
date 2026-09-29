'use strict';

const fs = require('fs');
const { DIRECTUS_URL, DIRECTUS_TOKEN, DIRECTUS_CV_FOLDER } = require('./config');

const TIMEOUT_MS = 15000;

/** Error de comunicación con Directus. Lleva el mensaje real para la terminal. */
class DirectusError extends Error {
  constructor(message, directusStatus) {
    super(message);
    this.name = 'DirectusError';
    this.status = 502;
    this.directusStatus = directusStatus;
  }
}

async function request(method, path, { json, form, query } = {}) {
  const url = new URL(path, DIRECTUS_URL);
  if (query) url.search = new URLSearchParams(query).toString();

  const headers = { Authorization: `Bearer ${DIRECTUS_TOKEN}` };
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch arma solo el Content-Type multipart
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new DirectusError(`${method} ${path}: Directus no respondió (${err.message})`);
  }

  const payload = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const detail = payload?.errors?.map((e) => e.message).join(' | ') || res.statusText;
    throw new DirectusError(`${method} ${path} → ${res.status}: ${detail}`, res.status);
  }
  return payload?.data ?? null;
}

/** Sube un PDF a la carpeta de hojas de vida y devuelve su id. */
async function uploadFile(filePath, downloadName) {
  const form = new FormData();
  form.append('folder', DIRECTUS_CV_FOLDER); // debe ir ANTES que 'file' o Directus lo ignora
  form.append('file', await fs.openAsBlob(filePath, { type: 'application/pdf' }), downloadName);
  const file = await request('POST', '/files', { form });
  if (!file?.id) {
    throw new DirectusError('Directus no devolvió el id del archivo: falta permiso de Leer (id) en directus_files');
  }
  return file.id;
}

const deleteFile = (id) => request('DELETE', `/files/${id}`);
const createItem = (collection, data) => request('POST', `/items/${collection}`, { json: data });
const readItems = (collection, query) => request('GET', `/items/${collection}`, { query });

module.exports = { uploadFile, deleteFile, createItem, readItems, DirectusError };