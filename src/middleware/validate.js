'use strict';

const { POSITIONS } = require('../config');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9()\-\s]{7,30}$/;
const EXPERIENCE_RE = /^\d{1,2}$/;

const DOCUMENT_TYPES = ['CC', 'PPT'];
const DOCUMENT_NUMBER_RE = /^[A-Z0-9]{5,20}$/;
const EDUCATION_LEVELS = ['bachiller', 'tecnico_tecnologo', 'profesional'];
const CITIES = [
  'Armenia', 'Bucaramanga', 'Buga', 'Cali', 'Candelaria', 'Cartago', 'Ipiales',
  'Jamundí', 'Manizales', 'Palmira', 'Pasto', 'Pereira', 'Popayán', 'Tuluá', 'Yumbo',
];
// Debe coincidir con el texto de la casilla en public/index.html
const CONSENT_TEXT = 'Autorizo a Naranka S.A.S. (KanCan) a tratar mis datos personales y mi hoja de vida para este proceso de selección.';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Normaliza el campo multiple 'positions' (string | string[]) a array sin duplicados. */
function normalizePositions(raw) {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map((p) => text(p)).filter(Boolean))];
}

/**
 * Valida los datos del formulario (RF-05, lado servidor).
 * @returns {{ ok: boolean, errors: Object<string,string>, data: object }}
 */
function validateApplication(body, file) {
  const errors = {};
  const data = {};

  const documentType = text(body.document_type);
  if (!documentType) errors.document_type = 'El tipo de documento es obligatorio.';
  else if (!DOCUMENT_TYPES.includes(documentType)) errors.document_type = 'Tipo de documento no válido.';
  else data.document_type = documentType;

  const documentNumber = text(body.document_number).replace(/[.\s-]/g, '').toUpperCase();
  if (!documentNumber) errors.document_number = 'El número de documento es obligatorio.';
  else if (!DOCUMENT_NUMBER_RE.test(documentNumber)) errors.document_number = 'Usa solo letras y números (5 a 20).';
  else data.document_number = documentNumber;

  const fullName = text(body.full_name);
  if (!fullName) errors.full_name = 'El nombre completo es obligatorio.';
  else if (fullName.length > 120) errors.full_name = 'Máximo 120 caracteres.';
  else data.full_name = fullName;

  const email = text(body.email).toLowerCase();
  if (!email) errors.email = 'El correo es obligatorio.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Correo electrónico inválido.';
  else data.email = email;

  const phone = text(body.phone);
  if (!phone) errors.phone = 'El teléfono es obligatorio.';
  else if (!PHONE_RE.test(phone)) errors.phone = 'Teléfono inválido: usa dígitos, espacios y + ( ) -.';
  else data.phone = phone;

  const city = text(body.city);
  if (!city) errors.city = 'La ciudad es obligatoria.';
  else if (!CITIES.includes(city)) errors.city = 'Ciudad no válida.';
  else data.city = city;

  const education = text(body.education_level);
  if (!education) errors.education_level = 'El nivel educativo es obligatorio.';
  else if (!EDUCATION_LEVELS.includes(education)) errors.education_level = 'Nivel educativo no válido.';
  else data.education_level = education;

  const experience = text(body.years_experience);
  if (!experience) errors.years_experience = 'Los años de experiencia son obligatorios.';
  else if (!EXPERIENCE_RE.test(experience)) errors.years_experience = 'Debe ser un número entero entre 0 y 99.';
  else data.years_experience = Number(experience);

  const positions = normalizePositions(body.positions);
  if (positions.length === 0) errors.positions = 'Selecciona al menos un cargo.';
  else {
    const invalid = positions.filter((p) => !POSITIONS.includes(p));
    if (invalid.length > 0) errors.positions = `Cargos no válidos: ${invalid.join(', ')}.`;
    else data.positions = positions;
  }

  if (!file) errors.cv = 'La hoja de vida en PDF es obligatoria.';
  else data.cv_filename = file.filename;

  if (body.data_consent !== 'true') errors.data_consent = 'Debes aceptar el tratamiento de datos para enviar tu postulación.';
  else data.consent_text = CONSENT_TEXT;
  return { ok: Object.keys(errors).length === 0, errors, data };
}

module.exports = { validateApplication, normalizePositions };
