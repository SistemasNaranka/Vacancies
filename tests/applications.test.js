'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createDb } = require('../src/db');
const { createApp } = require('../src/app');
const { POSITIONS, MAX_PDF_BYTES } = require('../src/config');

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('contenido de prueba de hoja de vida')]);
const NOT_PDF = Buffer.from('MZ\x90\x00 Esto es un ejecutable renombrado');

function makeApp(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'postulaciones-'));
  const db = createDb(path.join(dir, 'test.db'));
  const uploadDir = path.join(dir, 'uploads');
  const app = createApp({ db, uploadDir, rateLimitMax: options.rateLimitMax ?? 10_000 });
  return { app, db, uploadDir, dir };
}

const BASE_FIELDS = {
  document_type: 'CC',
  document_number: '1144123456',
  full_name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '3001234567',
  city: 'Cali',
  education_level: 'bachiller',
  years_experience: '3',
  positions: ['Cajero vendedor'],
  data_consent: 'true',
};

/** POST crudo: los campos indicados como null se omiten. */
function post(app, fields, file = PDF) {
  const req = request(app).post('/api/applications');
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => req.field(key, v));
    else req.field(key, String(value));
  }
  if (file) req.attach('cv', file, { filename: 'cv.pdf', contentType: 'application/pdf' });
  return req;
}

/** POST con los campos base, sobrescritos por `overrides` (null = omitir). */
function postValid(app, overrides = {}, file = PDF) {
  return post(app, { ...BASE_FIELDS, ...overrides }, file);
}

function countRows(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM applications').get().n;
}

function storedFiles(uploadDir) {
  return fs.readdirSync(uploadDir);
}

test('CA-01: envío válido crea registro en BD + PDF en carpeta y responde 201', async () => {
  const { app, db, uploadDir } = makeApp();

  const res = await postValid(app, { positions: ['Cajero vendedor', 'Asesor comercial'] });

  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
  assert.equal(countRows(db), 1);

  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(res.body.id);
  assert.equal(row.full_name, 'Ana Pérez');
  assert.equal(row.email, 'ana@ejemplo.com');
  assert.equal(row.years_experience, 3);
  assert.equal(row.salary_expectation, null);

  const positions = db
    .prepare('SELECT position FROM application_positions ORDER BY position')
    .all()
    .map((r) => r.position);
  assert.deepEqual(positions, ['Asesor comercial', 'Cajero vendedor']);

  const files = storedFiles(uploadDir);
  assert.equal(files.length, 1);
  assert.equal(row.cv_filename, files[0]);
  assert.match(files[0], /^[0-9a-f-]{36}\.pdf$/); // UUID, sin datos personales (RNF-04)
});

test('CA-02: campos obligatorios vacíos → 400, sin registro y sin archivo', async () => {
  const { app, db, uploadDir } = makeApp();

  const res = await post(app, {
    full_name: null,
    email: null,
    phone: null,
    city: null,
    years_experience: null,
    positions: null,
  });

  assert.equal(res.status, 400);
  for (const field of [
    'document_type', 'document_number', 'full_name', 'email', 'phone', 'city',
    'education_level', 'years_experience', 'positions', 'data_consent',
  ]) {
    assert.ok(res.body.errors[field], `falta error para ${field}`);
  }
  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []); // el PDF subido se limpió (RF-07)
});

test('CA-03: correo con formato inválido → 400 sin crear registro', async () => {
  const { app, db, uploadDir } = makeApp();

  const res = await postValid(app, { email: 'no-es-correo' });

  assert.equal(res.status, 400);
  assert.ok(res.body.errors.email);
  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-04: sin archivo o extensión no PDF → 400/415 sin crear registro', async () => {
  const { app, db, uploadDir } = makeApp();

  // (a) sin archivo adjunto
  const noFile = await post(app, BASE_FIELDS, null);
  assert.equal(noFile.status, 400);
  assert.ok(noFile.body.errors.cv);

  // (b) contenido que no es PDF con nombre .pdf → magic bytes (RNF-04)
  const wrongExt = await post(app, BASE_FIELDS, Buffer.from('hola'));
  assert.ok([400, 415].includes(wrongExt.status));

  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-04: .exe renombrado a .pdf → 415 por magic bytes, sin registro', async () => {
  const { app, db, uploadDir } = makeApp();

  const res = await post(app, BASE_FIELDS, NOT_PDF);

  assert.equal(res.status, 415);
  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []); // limpiado (RF-07)
});

test('CA-04: PDF mayor al límite configurado → 413 sin registro ni archivo', async () => {
  const { app, db, uploadDir } = makeApp();

  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(MAX_PDF_BYTES + 1024, 0x61)]);
  const res = await post(app, BASE_FIELDS, big);

  assert.equal(res.status, 413);
  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-05: correo ya postulado al cargo → 409 mencionando el cargo y sin registro nuevo', async () => {
  const { app, db } = makeApp();

  const first = await postValid(app, { positions: ['Cajero vendedor'] });
  assert.equal(first.status, 201);

  const dup = await postValid(app, { positions: ['Cajero vendedor', 'Asesor comercial'] });

  assert.equal(dup.status, 409);
  assert.match(dup.body.message, /Cajero vendedor/);
  assert.equal(countRows(db), 1); // rechazo total del envío, sin parciales (RF-06)
});

test('CA-06: mismo correo a un cargo distinto → 201 (re-postulación válida)', async () => {
  const { app, db } = makeApp();

  await postValid(app, { positions: ['Cajero vendedor'] });
  const second = await postValid(app, { positions: ['Asesor comercial'] });

  assert.equal(second.status, 201);
  assert.equal(countRows(db), 2);
});

test('CA-07: expectativa salarial omitida → 201 con valor NULL', async () => {
  const { app, db } = makeApp();

  const res = await postValid(app, { salary_expectation: null });

  assert.equal(res.status, 201);
  const row = db.prepare('SELECT salary_expectation FROM applications WHERE id = ?').get(res.body.id);
  assert.equal(row.salary_expectation, null);
});

test('CA-08: años de experiencia no numéricos o negativos → 400', async () => {
  const { app, db } = makeApp();

  for (const bad of ['abc', '-1']) {
    const res = await postValid(app, { years_experience: bad });
    assert.equal(res.status, 400, `debería rechazar "${bad}"`);
    assert.ok(res.body.errors.years_experience);
  }
  assert.equal(countRows(db), 0);
});

test('sin autorización de datos → 400 sin registro ni archivo', async () => {
  const { app, db, uploadDir } = makeApp();

  const res = await postValid(app, { data_consent: null });

  assert.equal(res.status, 400);
  assert.ok(res.body.errors.data_consent);
  assert.equal(countRows(db), 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('guarda documento normalizado, nivel educativo y prueba de autorización', async () => {
  const { app, db } = makeApp();

  const res = await postValid(app, { document_number: '1.144.123.456' });

  assert.equal(res.status, 201);
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(res.body.id);
  assert.equal(row.document_type, 'CC');
  assert.equal(row.document_number, '1144123456');
  assert.equal(row.education_level, 'bachiller');
  assert.ok(row.consent_accepted_at, 'debe guardar la fecha de aceptación');
  assert.match(row.consent_text, /Naranka/);
});

test('RNF: preserva caracteres UTF-8 (acentos y ñ) en los datos', async () => {
  const { app, db } = makeApp();

  const res = await postValid(app, {
    full_name: 'José Muñoz',
    city: 'Popayán',
    salary_expectation: '2.500.000',
  });

  assert.equal(res.status, 201);
  const row = db.prepare('SELECT full_name, city, salary_expectation FROM applications WHERE id = ?').get(res.body.id);
  assert.equal(row.full_name, 'José Muñoz');
  assert.equal(row.city, 'Popayán');
  assert.equal(row.salary_expectation, '2.500.000');
});

test('GET /api/health responde 200', async () => {
  const { app } = makeApp();
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('GET / sirve el formulario y sus cargos coinciden con config (consistencia)', async () => {
  const { app } = makeApp();
  const res = await request(app).get('/');

  assert.equal(res.status, 200);
  assert.match(res.text, /<form id="application-form"/);

  const htmlPositions = [...res.text.matchAll(/<input type="checkbox" name="positions" value="([^"]+)">/g)].map(
    (m) => m[1]
  );
  assert.deepEqual(htmlPositions, POSITIONS, 'index.html y config.POSITIONS deben listar los mismos cargos');
});

test('CSP permite servir por HTTP fuera de localhost (sin upgrade-insecure-requests)', async () => {
  const { app } = makeApp();
  const res = await request(app).get('/');

  const csp = res.headers['content-security-policy'] || '';
  assert.ok(csp.includes("default-src 'self'"), 'debe conservar el CSP base de helmet');
  assert.ok(csp.includes("style-src 'self'"), 'debe permitir la hoja de estilos propia');
  assert.ok(
    !csp.includes('upgrade-insecure-requests'),
    'en HTTP no-localhost el navegador reescribiría styles.css y form.js a HTTPS y la página quedaría sin CSS ni JS'
  );
});

test('el color de marca coincide entre styles.css y el theme-color de index.html', async () => {
  const { app } = makeApp();
  const res = await request(app).get('/');

  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
  const brand = css.match(/--brand-600:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(brand, 'styles.css debe definir --brand-600');
  assert.equal(brand[1].toLowerCase(), '#004680', 'el color corporativo aprobado es #004680');

  const theme = res.text.match(/<meta name="theme-color" content="(#[0-9a-fA-F]{6})">/);
  assert.ok(theme, 'index.html debe declarar theme-color');
  assert.equal(
    theme[1].toLowerCase(),
    brand[1].toLowerCase(),
    'theme-color debe coincidir con el color de marca de styles.css'
  );
});

test('rate limit: superado el límite responde 429', async () => {
  const { app } = makeApp({ rateLimitMax: 2 });

  await request(app).get('/api/health');
  await request(app).get('/api/health');
  const third = await request(app).get('/api/health');

  assert.equal(third.status, 429);
});