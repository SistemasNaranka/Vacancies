'use strict';

/** Error 409: el correo ya postuló a uno de los cargos seleccionados (RN-08, RF-06). */
class ConflictError extends Error {
  constructor(position) {
    super(`Ya existe una postulación de este correo al cargo ${position}.`);
    this.name = 'ConflictError';
    this.status = 409;
    this.position = position;
  }
}

/**
 * Servicio de postulaciones: anti-duplicados + persistencia atómica (RF-06, RF-07).
 * La transacción garantiza que no quede registro sin cargo ni cargo sin registro;
 * la limpieza del PDF ante fallos la hace la capa de rutas.
 */
function createApplicationService(db) {
  const findDuplicate = db.prepare(`
    SELECT p.position
    FROM applications a
    JOIN application_positions p ON p.application_id = a.id
    WHERE a.email = ? AND p.position = ?
  `);

  const insertApplication = db.prepare(`
    INSERT INTO applications (
      document_type, document_number, full_name, email, phone, city, education_level,
      years_experience, salary_expectation, cv_filename, consent_accepted_at, consent_text
    )
    VALUES (
      @document_type, @document_number, @full_name, @email, @phone, @city, @education_level,
      @years_experience, @salary_expectation, @cv_filename, datetime('now'), @consent_text
    )
  `);

  const insertPosition = db.prepare(`
    INSERT INTO application_positions (application_id, position) VALUES (?, ?)
  `);

  const submitTx = db.transaction((data) => {
    for (const position of data.positions) {
      const duplicate = findDuplicate.get(data.email, position);
      if (duplicate) throw new ConflictError(position);
    }
    const { lastInsertRowid } = insertApplication.run({
      document_type: data.document_type,
      document_number: data.document_number,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      education_level: data.education_level,
      years_experience: data.years_experience,
      salary_expectation: data.salary_expectation,
      cv_filename: data.cv_filename,
      consent_text: data.consent_text,
    });
    for (const position of data.positions) {
      insertPosition.run(lastInsertRowid, position);
    }
    return Number(lastInsertRowid);
  });

  return { submit: (data) => submitTx(data) };
}

module.exports = { createApplicationService, ConflictError };
