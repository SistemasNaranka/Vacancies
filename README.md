# Postulaciones MVP

Sitio público donde los candidatos se postulan a vacantes: datos básicos + selección de uno o varios cargos (Gerente, Cajero, Asesor, Auxiliar de Bodega) + hoja de vida en PDF. Sin panel de administración: las postulaciones se consultan directo en SQLite y la carpeta de PDFs.

Documentación del proyecto (fuente única de verdad): [`docs/`](docs/Project.md).

## Requisitos

- Node.js LTS ≥ 20

## Instalación

```bash
npm install
cp .env.example .env   # opcional: ajusta puerto, rutas y límites
```

## Ejecutar

```bash
npm start              # producción
npm run dev            # desarrollo con recarga (nodemon)
```

Abre `http://localhost:3000` (o el puerto de `PORT`).

Desde otro equipo o teléfono en la misma red, usa la IP del servidor, por ejemplo `http://192.168.1.20:3000`. En ese caso la app se sirve por HTTP, que es lo esperado: no actives `ENFORCE_HTTPS` (ver *Variables de entorno*).

## Pruebas

```bash
npm test               # 23 pruebas: validación, API, duplicados, límites, CSP
```

## Variables de entorno (`.env`)

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `PORT` | 3000 | Puerto del servidor |
| `DB_PATH` | `./data/app.db` | Ruta de la base SQLite |
| `UPLOAD_DIR` | `./uploads` | Carpeta de los PDFs |
| `RATE_LIMIT_MAX` | 10 | Peticiones/min por IP en la API |
| `MAX_PDF_MB` | 10 | Tamaño máximo del PDF |
| `TRUST_PROXY` | 1 | Saltos de proxy confiables (para rate limit detrás de proxy) |
| `ENFORCE_HTTPS` | `0` | `1` solo si el sitio se sirve con HTTPS real. Activa la directiva CSP `upgrade-insecure-requests`; con HTTP plano (LAN o IP pública) deja la página sin CSS ni JS |

## Consultar las postulaciones (sin panel)

```bash
# Datos
sqlite3 data/app.db "SELECT id, full_name, email, phone, city, years_experience, created_at FROM applications;"

# Cargos de cada postulación
sqlite3 data/app.db "SELECT a.id, a.email, p.position FROM applications a JOIN application_positions p ON p.application_id = a.id;"

# Descargar un CV (el nombre está en cv_filename)
ls uploads/
```

## Mantenimiento

- **Purga a los 6 meses** (RF-10): ver [`scripts/purge.sql`](scripts/purge.sql). Ejecutar manualmente.
- **Respaldo** (RNF-06): copiar `data/app.db*` y `uploads/` de forma periódica (con el servidor detenido o usando `sqlite3 data/app.db ".backup respaldo.db"`).

## Despliegue

Cualquier host con Node ≥20 y disco persistente. Asegura que `data/` y `uploads/` vivan en un volumen persistente y que el host provea HTTPS (RNF-02).
