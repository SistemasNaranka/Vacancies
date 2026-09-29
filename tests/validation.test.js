'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateApplication } = require('../src/middleware/validate');

const validFile = { filename: 'abc.pdf' };

function validBody() {
  return {
    document_type: 'CC',
    document_number: '1144123456',
    full_name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    phone: '+57 300 123 4567',
    city: 'Cali',
    education_level: 'bachiller',
    years_experience: '3',
    positions: ['Cajero vendedor', 'Asesor comercial'],
    data_consent: 'true',
  };
}

test('acepta un payload válido con PDF', () => {
  const result = validateApplication(validBody(), validFile);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.years_experience, 3);
  assert.deepEqual(result.data.positions, ['Cajero vendedor', 'Asesor comercial']);
  assert.equal(result.data.cv_filename, 'abc.pdf');
});

test('normaliza correo a minúsculas y recorta espacios', () => {
  const body = validBody();
  body.email = '  ANA@EJEMPLO.COM  ';
  const { data, ok } = validateApplication(body, validFile);
  assert.equal(ok, true);
  assert.equal(data.email, 'ana@ejemplo.com');
});

test('campos obligatorios vacíos generan errores por campo', () => {
  const { ok, errors } = validateApplication({}, null);
  assert.equal(ok, false);
  assert.ok(errors.full_name);
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.ok(errors.city);
  assert.ok(errors.years_experience);
  assert.ok(errors.positions);
  assert.ok(errors.cv);
});

test('rechaza correo con formato inválido', () => {
  const body = validBody();
  body.email = 'no-es-correo';
  const { ok, errors } = validateApplication(body, validFile);
  assert.equal(ok, false);
  assert.match(errors.email, /inválido/i);
});

test('rechaza años de experiencia no numéricos o fuera de rango', () => {
  for (const bad of ['abc', '-1', '3.5', '100', '']) {
    const body = validBody();
    body.years_experience = bad;
    const { ok, errors } = validateApplication(body, validFile);
    assert.equal(ok, false, `debería rechazar "${bad}"`);
    assert.ok(errors.years_experience);
  }
});

test('exige al menos un cargo y valida contra la lista fija', () => {
  const noPositions = validBody();
  noPositions.positions = [];
  assert.equal(validateApplication(noPositions, validFile).ok, false);

  const unknown = validBody();
  unknown.positions = ['Astronauta'];
  const { errors } = validateApplication(unknown, validFile);
  assert.match(errors.positions, /no válidos/i);
});

test('normaliza positions como string único (multipart sin repetir el campo)', () => {
  const body = validBody();
  body.positions = 'Administrador de tienda';
  const { ok, data } = validateApplication(body, validFile);
  assert.equal(ok, true);
  assert.deepEqual(data.positions, ['Administrador de tienda']);
});

test('sin PDF se rechaza con error en cv', () => {
  const { ok, errors } = validateApplication(validBody(), undefined);
  assert.equal(ok, false);
  assert.ok(errors.cv);
});

test('rechaza ciudad, tipo de documento o nivel educativo fuera de la lista', () => {
  const cases = [
    ['city', 'Bogotá'],
    ['document_type', 'PA'],
    ['education_level', 'nivel_1'],
  ];
  for (const [field, bad] of cases) {
    const body = validBody();
    body[field] = bad;
    const { ok, errors } = validateApplication(body, validFile);
    assert.equal(ok, false, `debería rechazar ${field}="${bad}"`);
    assert.ok(errors[field]);
  }
});

test('exige la autorización de datos', () => {
  const body = validBody();
  delete body.data_consent;
  const { ok, errors } = validateApplication(body, validFile);
  assert.equal(ok, false);
  assert.ok(errors.data_consent);
});

test('normaliza el número de documento (quita puntos, espacios y guiones)', () => {
  const body = validBody();
  body.document_number = ' 1.144-123 456 ';
  const { ok, data } = validateApplication(body, validFile);
  assert.equal(ok, true);
  assert.equal(data.document_number, '1144123456');
});