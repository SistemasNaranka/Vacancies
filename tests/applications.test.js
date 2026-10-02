'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../src/app');
const { POSITIONS, MAX_PDF_BYTES } = require('../src/config');

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('contenido de prueba de hoja de vida')]);
const NOT_PDF = Buffer.from('MZ\x90\x00 Esto es un ejecutable renombrado');

/** Servicio falso: anota cada envío en vez de llamar a Directus. */
function makeFakeService({ fail = false, failWith = null } = {}) {
  const calls = [];
  return {
    calls,
    async submit(data, cvPath) {
      calls.push({ data, cvPath, fileExisted: fs.existsSync(cvPath) });
      if (failWith) throw failWith;
      if (fail) throw new Error('POST /items/app_applications → 500: detalle interno');
    },
  };
}

function makeApp(options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'postulaciones-'));
  const uploadDir = path.join(dir, 'uploads');
  const service = makeFakeService({ fail: options.fail, failWith: options.failWith });
  const app = createApp({ uploadDir, service, rateLimitMax: options.rateLimitMax ?? 10_000 });
  return { app, service, uploadDir };
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

function storedFiles(uploadDir) {
  return fs.readdirSync(uploadDir);
}

test('CA-01: envío válido → 201, entrega datos y PDF al servicio y borra la copia local', async () => {
  const { app, service, uploadDir } = makeApp();

  const res = await postValid(app, { positions: ['Cajero vendedor', 'Asesor comercial'] });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(service.calls.length, 1);

  const { data, cvPath, fileExisted } = service.calls[0];
  assert.equal(data.full_name, 'Ana Pérez');
  assert.equal(data.email, 'ana@ejemplo.com');
  assert.equal(data.years_experience, 3);
  assert.deepEqual([...data.positions].sort(), ['Asesor comercial', 'Cajero vendedor']);
  assert.equal('salary_expectation' in data, false);

  assert.ok(fileExisted, 'el PDF debe existir cuando el servicio lo sube');
  assert.match(path.basename(cvPath), /^[0-9a-f-]{36}\.pdf$/); // UUID, sin datos personales
  assert.deepEqual(storedFiles(uploadDir), [], 'la copia local se borra tras subirla');
});

test('CA-02: campos obligatorios vacíos → 400, sin envío y sin archivo', async () => {
  const { app, service, uploadDir } = makeApp();

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
  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-03: correo con formato inválido → 400 sin envío', async () => {
  const { app, service, uploadDir } = makeApp();

  const res = await postValid(app, { email: 'no-es-correo' });

  assert.equal(res.status, 400);
  assert.ok(res.body.errors.email);
  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-04: sin archivo o contenido no PDF → 400/415 sin envío', async () => {
  const { app, service, uploadDir } = makeApp();

  const noFile = await post(app, BASE_FIELDS, null);
  assert.equal(noFile.status, 400);
  assert.ok(noFile.body.errors.cv);

  const wrongContent = await post(app, BASE_FIELDS, Buffer.from('hola'));
  assert.ok([400, 415].includes(wrongContent.status));

  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-04: .exe renombrado a .pdf → 415 por magic bytes, sin envío', async () => {
  const { app, service, uploadDir } = makeApp();

  const res = await post(app, BASE_FIELDS, NOT_PDF);

  assert.equal(res.status, 415);
  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('CA-04: PDF mayor al límite configurado → 413 sin envío ni archivo', async () => {
  const { app, service, uploadDir } = makeApp();

  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(MAX_PDF_BYTES + 1024, 0x61)]);
  const res = await post(app, BASE_FIELDS, big);

  assert.equal(res.status, 413);
  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('sin anti-duplicados (decisión A): mismo correo y cargo dos veces → ambos 201', async () => {
  const { app, service } = makeApp();

  const first = await postValid(app);
  const second = await postValid(app);

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(service.calls.length, 2);
});

test('CA-08: años de experiencia no numéricos o negativos → 400', async () => {
  const { app, service } = makeApp();

  for (const bad of ['abc', '-1']) {
    const res = await postValid(app, { years_experience: bad });
    assert.equal(res.status, 400, `debería rechazar "${bad}"`);
    assert.ok(res.body.errors.years_experience);
  }
  assert.equal(service.calls.length, 0);
});

test('sin autorización de datos → 400 sin envío ni archivo', async () => {
  const { app, service, uploadDir } = makeApp();

  const res = await postValid(app, { data_consent: null });

  assert.equal(res.status, 400);
  assert.ok(res.body.errors.data_consent);
  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('entrega documento normalizado, nivel educativo y texto de autorización', async () => {
  const { app, service } = makeApp();

  const res = await postValid(app, { document_number: '1.144.123.456' });

  assert.equal(res.status, 201);
  const { data } = service.calls[0];
  assert.equal(data.document_type, 'CC');
  assert.equal(data.document_number, '1144123456');
  assert.equal(data.education_level, 'bachiller');
  assert.match(data.consent_text, /Naranka/);
});

test('RNF: preserva caracteres UTF-8 (acentos y ñ) en los datos', async () => {
  const { app, service } = makeApp();

  const res = await postValid(app, { full_name: 'José Muñoz', city: 'Popayán' });

  assert.equal(res.status, 201);
  const { data } = service.calls[0];
  assert.equal(data.full_name, 'José Muñoz');
  assert.equal(data.city, 'Popayán');
});

test('Directus falla → 502 con mensaje genérico y sin copia local', async () => {
  const { app, uploadDir } = makeApp({ fail: true });

  const res = await postValid(app);

  assert.equal(res.status, 502);
  assert.equal(res.body.ok, false);
  assert.doesNotMatch(res.body.message, /items|Directus|500/, 'no debe filtrar detalles internos');
  assert.deepEqual(storedFiles(uploadDir), []);
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

  // Solo el <select> de cargos, para no tomar opciones de ciudad o nivel educativo
  const selectCargos = res.text.match(/<select id="positions"[\s\S]*?<\/select>/)?.[0] ?? '';
  const htmlPositions = [...selectCargos.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);

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
  assert.equal(brand[1].toLowerCase(), '#d85321', 'el color corporativo aprobado es #d85321');

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

  // Ruta inexistente bajo /api: pasa por el limitador (404) sin tocar el servicio
  await request(app).get('/api/no-existe');
  await request(app).get('/api/no-existe');
  const third = await request(app).get('/api/no-existe');

  assert.equal(third.status, 429);
});

test('health no consume el rate limit (el health check de Coolify nunca recibe 429)', async () => {
  const { app } = makeApp({ rateLimitMax: 2 });

  const responses = await Promise.all(
    Array.from({ length: 5 }, () => request(app).get('/api/health'))
  );
  for (const res of responses) assert.equal(res.status, 200);

  // Health no gastó cupo: la API sigue disponible para postulantes
  const api = await request(app).get('/api/no-existe');
  assert.equal(api.status, 404);
});

test('cédula repetida (Directus RECORD_NOT_UNIQUE) → 409 con mensaje claro', async () => {
  const duplicate = Object.assign(new Error('duplicado'), {
    extensions: { code: 'RECORD_NOT_UNIQUE', field: 'document_number' },
  });
  const { app, uploadDir } = makeApp({ failWith: duplicate });

  const res = await postValid(app);

  assert.equal(res.status, 409);
  assert.match(res.body.message, /documento/);
  assert.deepEqual(storedFiles(uploadDir), []);
});

test('multipart inflado (demasiados campos o campo gigante) → 400 sin envío ni archivo', async () => {
  const { app, service, uploadDir } = makeApp();

  const extra = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`basura${i}`, 'x']));
  const tooMany = await postValid(app, extra);
  assert.equal(tooMany.status, 400);

  const tooBig = await postValid(app, { full_name: 'a'.repeat(11 * 1024) });
  assert.equal(tooBig.status, 400);

  assert.equal(service.calls.length, 0);
  assert.deepEqual(storedFiles(uploadDir), []);
});