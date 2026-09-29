'use strict';

const { uploadFile, createItem, readItems } = require('../directus');
const { DIRECTUS_COLLECTION } = require('../config');

const POSITIONS_COLLECTION = 'app_positions';
const CACHE_MS = 5 * 60 * 1000;

/**
 * Servicio de postulaciones sobre Directus.
 * Sin anti-duplicados: el token del formulario no puede leer postulaciones (decisión A).
 */
function createApplicationService() {
  let cache = { map: null, loadedAt: 0 };

  // Nombre del cargo → id en Directus. Cacheado para no consultar en cada envío.
  async function getPositionIds() {
    if (cache.map && Date.now() - cache.loadedAt < CACHE_MS) return cache.map;
    const rows = await readItems(POSITIONS_COLLECTION, { fields: 'id,nombre', limit: '-1' });
    cache = { map: new Map(rows.map((r) => [r.nombre, r.id])), loadedAt: Date.now() };
    return cache.map;
  }

  async function submit(data, cvPath) {
    // 1. Resolver cargos ANTES de subir el PDF, para no dejar archivos huérfanos
    const ids = await getPositionIds();
    const positionIds = data.positions.map((name) => {
      const id = ids.get(name);
      if (!id) throw new Error(`El cargo "${name}" no existe en ${POSITIONS_COLLECTION}`);
      return id;
    });

    // 2. Subir la hoja de vida
    const cvId = await uploadFile(cvPath, `hv-${data.document_number}.pdf`);

    // 3. Crear la postulación con sus cargos
    try {
      await createItem(DIRECTUS_COLLECTION, {
        document_type: data.document_type,
        document_number: data.document_number,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        education_level: data.education_level,
        years_experience: data.years_experience,
        consent_text: data.consent_text,
        consent_accepted_at: new Date().toISOString(),
        cv: cvId,
        positions: positionIds.map((id) => ({ app_positions_id: id })),
      });
    } catch (err) {
      // El token no puede borrar archivos: se deja rastro para limpiarlo a mano
      console.error(`[postulaciones] PDF huérfano en Directus: ${cvId}`);
      throw err;
    }
  }

  return { submit };
}

module.exports = { createApplicationService };