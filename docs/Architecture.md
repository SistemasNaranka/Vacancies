# Arquitectura

Fase: Diseño. Basado en `Requirements.md` (RF/RNF/CA) y `Analysis.md` (RN-01..RN-08).

## Pila Tecnológica

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Runtime | **Node.js (LTS ≥20)** | Ya aprobado en Decisión 2; mismo lenguaje front y back. |
| Backend | **Express 4** | Framework mínimo y maduro para un solo endpoint de alta concurrencia de escritura. |
| Base de datos | **SQLite** con `better-sqlite3` | Aprobado en la fase Idea. Síncrono (sin callbacks/async innecesarios), sentencias preparadas integradas, cero configuración, un solo archivo respaldable. *Alternativa descartada:* `node:sqlite` nativo (requiere Node muy reciente y su API aún menos madura). |
| Subida de archivos | **multer** (motor `diskStorage`) | Estándar para multipart en Express; permite límite de 10 MB y filtro de extensión/Tipo en el servidor. |
| Seguridad | **helmet** + **express-rate-limit** | Cabeceras básicas (RNF-04) y freno de abuso/automatización en el endpoint público (10 req/min/IP). |
| Frontend | **HTML + CSS + JS vanilla** (sin build) | Un solo formulario: un framework añadiría build, dependencias y complejidad sin beneficio para este MVP (Principio: Simplicidad). El JS solo envía `FormData` por `fetch` y pinta confirmación/errores. |
| Pruebas | **`node:test` (nativo) + supertest** | Sin dependencias de framework de test; cubre CA-01..CA-08 y CA-11. |

## Estructura del Proyecto

```text
/
├── package.json              # scripts: dev, start, test
├── .env.example              # PORT, DB_PATH, UPLOAD_DIR, RATE_LIMIT_*
├── .gitignore                # data/, uploads/, node_modules/
├── src/
│   ├── server.js             # punto de entrada: init DB + app.listen
│   ├── app.js                # fábrica de la app Express (para tests)
│   ├── config.js             # lista fija de cargos, límites, rutas
│   ├── db.js                 # conexión SQLite + migración de esquema
│   ├── routes/
│   │   └── applications.js   # POST /api/applications, GET /api/health
│   ├── middleware/
│   │   └── validate.js       # validación de campos + manejo de errores
│   └── services/
│       └── applicationService.js  # anti-duplicados + persistencia atómica
├── public/
│   ├── index.html            # formulario de postulación
│   ├── styles.css            # mobile-first
│   └── form.js               # validación cliente + fetch + estados
├── data/                     # app.db (gitignored)
├── uploads/                  # <uuid>.pdf (gitignored)
├── scripts/
│   └── purge.sql             # consulta de purge >6 meses (RF-10)
└── tests/
    ├── applications.test.js  # integración: CA-01..CA-08
    └── validation.test.js    # unit: validadores
```

## Componentes

1. **Frontend estático** (`public/`): formulario con validación inline (obligatorios, correo, número ≥0, cargos ≥1, PDF ≤10 MB). Envía `FormData` a la API; muestra confirmación o error **conservando lo digitado** (RF-09).
2. **API Express** (`src/`):
   - `POST /api/applications` — multipart: campos + 1 PDF. Flujo:
     1. multer: límite 10 MB y solo `.pdf` → 413/415 si falla.
     2. `validate.js`: obligatorios, formato correo, `years_experience` entero ≥0, ≥1 cargo válido de la lista fija, expectativa opcional.
     3. `applicationService`: transacción → anti-duplicados (correo ∩ cargos seleccionados) → si hay conflicto: **409** con el cargo en conflicto (RF-06) y se borra el PDF temporal.
     4. PDF movido a `uploads/<uuid>.pdf`; **si el INSERT falla, se hace unlink del PDF** (y viceversa) → sin huérfanos (RF-07).
     5. **201** con confirmación.
   - `GET /api/health` — para verificación de despliegue.
   - **Los PDFs NO se sirven por HTTP**: no hay endpoint de descarga. El acceso es solo por filesystem en el servidor (CA-09). Esto cumple RNF-05 sin necesidad de autenticación.
3. **Persistencia** (`data/app.db`): esquema abajo. Lista de cargos = constante en `config.js` (RN-03, sin tabla de vacantes).
4. **Purge manual** (`scripts/purge.sql`): RF-10.

## Modelo de Datos

```sql
CREATE TABLE applications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name         TEXT    NOT NULL,
  email             TEXT    NOT NULL,
  phone             TEXT    NOT NULL,
  city              TEXT    NOT NULL,
  years_experience  INTEGER NOT NULL CHECK (years_experience >= 0),
  salary_expectation TEXT,                 -- NULL = opcional (P-1)
  cv_filename       TEXT    NOT NULL,      -- <uuid>.pdf
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE application_positions (
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position       TEXT    NOT NULL CHECK (position IN ('Gerente','Cajero','Asesor','Auxiliar de Bodega')),
  PRIMARY KEY (application_id, position)
);

CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_positions_position ON application_positions(position);
```

**Anti-duplicados (RN-08):** dentro de la transacción,
`SELECT 1 FROM applications a JOIN application_positions p ON p.application_id = a.id WHERE a.email = ? AND p.position IN (cargos...)` → si hay match, 409 con el cargo conflictivo.

**Consulta de purge (RF-10):**
`DELETE FROM applications WHERE created_at < datetime('now', '-6 months');` (los PDFs se localizan por `cv_filename` y se eliminan después; documentado en `scripts/purge.sql`).

## Flujo de Datos

```text
Candidato (móvil)
  → index.html (validación inline)
  → POST /api/applications (multipart: campos + 1 PDF)
      → helmet/rate-limit
      → multer (10MB, ext .pdf)
      → validate.js (400 + mensajes por campo)
      → applicationService (transacción):
            anti-duplicados? → 409
            INSERT applications + application_positions
      → uploads/<uuid>.pdf  y  data/app.db
  → 201 confirmación  |  4xx con error (datos conservados en el form)

Reclutamiento
  → consulta directa: data/app.db  +  uploads/<uuid>.pdf   (sin panel)
```

## Dependencias

| Tipo | Paquete | Uso |
|------|---------|-----|
| runtime | `express` | HTTP y rutas |
| runtime | `better-sqlite3` | SQLite síncrono con prepared statements |
| runtime | `multer` | subida multipart con límite 10 MB |
| runtime | `helmet` | cabeceras de seguridad |
| runtime | `express-rate-limit` | 10 req/min/IP en la API |
| dev | `nodemon` | recarga en desarrollo |
| dev | `supertest` | peticiones HTTP en pruebas |

Sin ORM, sin bundler, sin TypeScript: cualquier adición posterior debe justificarse por evidencia (Política de Evolución del framework).

### Configuración de cabeceras (helmet)

`helmet` se aplica con sus valores por defecto **menos** la directiva CSP `upgrade-insecure-requests`, que se omite salvo que `ENFORCE_HTTPS=1`. Motivo: el MVP se sirve por HTTP (LAN o IP pública) y esa directiva hace que el navegador reescriba `styles.css` y `form.js` a HTTPS, donde no hay TLS, dejando la página sin estilos ni JS. En `localhost` no se nota porque el navegador lo trata como origen de confianza, por lo que el fallo solo aparece fuera de `localhost`. Cubierto por una prueba de regresión en `tests/applications.test.js`.

## Despliegue (RNF-02)

Cualquier host con Node LTS y disco persistente (VPS, Railway, Render, etc.). HTTPS lo provee el host/proxy; si el host sirve el sitio con HTTPS real, definir `ENFORCE_HTTPS=1` para reactivar `upgrade-insecure-requests`. `data/` y `uploads/` deben vivir en volumen persistente con respaldo manual (RNF-06). La decisión final del hosting queda registrada en `Decisions.md` cuando se elija.
