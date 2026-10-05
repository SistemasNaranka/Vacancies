'use strict';

const form = document.getElementById('application-form');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const successBox = document.getElementById('success');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const FILE_HINT = 'Toca para elegir un archivo · máximo 5 MB';

function fieldError(name, message) {
  const el = document.querySelector('[data-error-for="' + name + '"]');
  if (el) el.textContent = message || '';
}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  formError.textContent = '';
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  form.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
}

function markInvalid(name, message) {
  fieldError(name, message);
  const input = form.elements[name];
  if (input && input.classList) {
    input.classList.add('invalid');
    const field = input.closest ? input.closest('.field') : null;
    if (field) field.classList.add('has-error');
  }
}

function pdfError(file) {
  if (!/\.pdf$/i.test(file.name) || file.type !== 'application/pdf') return 'Solo se admiten archivos PDF.';
  if (file.size > MAX_PDF_BYTES) return 'El PDF supera el máximo de 5 MB.';
  return '';
}

/** Validación en cliente (RF-05): espejo de src/middleware/validate.js */
function validateClient() {
  const errors = {};
  const value = (name) => (form.elements[name].value || '').trim();

  if (!value('document_type')) errors.document_type = 'Elige el tipo de documento.';
  if (!value('document_number')) errors.document_number = 'Escribe tu número de documento.';
  if (!value('full_name')) errors.full_name = 'Escribe tu nombre completo.';
  if (!value('email')) errors.email = 'Escribe tu correo electrónico.';
  else if (!EMAIL_RE.test(value('email'))) errors.email = 'Correo electrónico inválido.';
  if (!value('phone')) errors.phone = 'Escribe tu teléfono o WhatsApp.';
  if (!value('city')) errors.city = 'Elige tu ciudad.';
  if (!value('education_level')) errors.education_level = 'Elige tu nivel educativo.';

  const exp = value('years_experience');
  if (exp === '') errors.years_experience = 'Indica tus años de experiencia.';
  else if (!/^\d{1,2}$/.test(exp)) errors.years_experience = 'Debe ser un número entre 0 y 99.';

  if (!value('positions')) errors.positions = 'Selecciona un cargo.';

  const file = form.elements.cv.files[0];
  if (!file) errors.cv = 'Adjunta tu hoja de vida en PDF.';
  else {
    const cvError = pdfError(file);
    if (cvError) errors.cv = cvError;
  }

  if (!form.elements.data_consent.checked) {
    errors.data_consent = 'Debes aceptar el tratamiento de datos para enviar tu postulación.';
  }

  return errors;
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => markInvalid(name, message));
  const first = form.querySelector('.invalid') || form.querySelector('.field-error:not(:empty)');
  if (first && first.focus) first.focus();
  else if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const errors = validateClient();
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando…';

  try {
    const response = await fetch('/api/applications', { method: 'POST', body: new FormData(form) });
    const body = await response.json().catch(() => ({}));

    if (response.status === 201) {
      form.reset();
      form.classList.add('hidden');
      successBox.classList.remove('hidden');
      successBox.scrollIntoView({ block: 'center' });
      return;
    }

    if (response.status === 400 && body.errors) {
      showErrors(body.errors);
      formError.textContent = 'Revisa los campos marcados. Tus datos siguen aquí.';
    } else {
      // 409 duplicado, 413/415 archivo, 429 rate limit, 500
      formError.textContent = body.message || 'No se pudo enviar la postulación. Intenta de nuevo.';
      if (response.status === 400 || response.status === 413 || response.status === 415) {
        fieldError('cv', body.message || '');
      }
    }
    formError.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch {
    formError.textContent = 'Sin conexión al servidor. Revisa tu internet y vuelve a intentar.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar postulación';
  }
});

/* --- Refuerzos visuales (no alteran la validación ni el envío) --- */

// Estado visual de los chips de cargo, incluido como respaldo si :has() no está disponible.
form.querySelectorAll('.chip input[type="checkbox"]').forEach((checkbox) => {
  const chip = checkbox.closest('.chip');
  if (!chip) return;
  const sync = () => chip.classList.toggle('is-checked', checkbox.checked);
  checkbox.addEventListener('change', sync);
  sync();
});

// Muestra el nombre del PDF elegido en la zona de carga.
const cvInput = form.elements.cv;
if (cvInput) {
  const fileName = document.getElementById('file-name');
  cvInput.addEventListener('change', () => {
    const file = cvInput.files[0];
    const error = file ? pdfError(file) : '';
    if (fileName) fileName.textContent = file ? file.name : FILE_HINT;
    const drop = cvInput.closest('.file-drop');
    if (drop) drop.classList.toggle('has-file', Boolean(file) && !error);
    const field = cvInput.closest('.field');
    if (field) field.classList.toggle('has-error', Boolean(error));
    fieldError('cv', error);
  });
}

