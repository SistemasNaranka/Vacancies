# Vacancies — Formulario de postulación

Formulario web donde los candidatos se postulan a una vacante: llenan sus datos, eligen un cargo y adjuntan su hoja de vida en PDF. Las postulaciones se guardan en Directus.

## Cómo funciona

1. El candidato llena el formulario (`public/`). El navegador valida los campos antes de enviar.
2. El servidor vuelve a validar todo y comprueba que el archivo sea un PDF real.
3. El PDF se sube a Directus y se crea la postulación con sus datos y su cargo.
4. Si la postulación no se puede crear (por ejemplo, cédula o correo ya registrados), el PDF se borra y el candidato recibe un mensaje claro.

## Estructura

| Archivo | Qué hace |
|---------|----------|
| `src/server.js` | Arranca el servidor y verifica las variables obligatorias |
| `src/app.js` | Configura Express: seguridad, archivos estáticos, límite de peticiones y errores |
| `src/routes/applications.js` | Recibe el formulario y el PDF, valida y responde |
| `src/middleware/validate.js` | Reglas de validación de cada campo |
| `src/services/applicationService.js` | Guarda la postulación en Directus |
| `src/directus.js` | Cliente HTTP de Directus |
| `src/config.js` | Variables de entorno y valores fijos (como la lista de cargos) |
| `public/` | El formulario: `index.html`, `form.js`, `styles.css` |

## Requisitos

- Node.js 22
- Una instancia de Directus con un token que pueda crear postulaciones y subir archivos

## Instalación y ejecución

```bash
npm install
cp .env.example .env   # completa las variables de Directus
npm start              # o: npm run dev (recarga automática)
```

Abre `http://localhost:3000`.

## Pruebas

```bash
npm test
```

Las pruebas no se conectan a Directus: usan un servicio simulado.

## Variables de entorno

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `DIRECTUS_URL` | — | URL de Directus (obligatoria) |
| `DIRECTUS_TOKEN` | — | Token de acceso (obligatoria) |
| `DIRECTUS_CV_FOLDER` | — | ID de la carpeta donde se guardan los PDF (obligatoria) |
| `PORT` | 3000 | Puerto del servidor |
| `UPLOAD_DIR` | `./uploads` | Carpeta temporal de los PDF |
| `RATE_LIMIT_MAX` | 10 | Peticiones por minuto por IP |
| `MAX_PDF_MB` | 5 | Tamaño máximo del PDF |
| `TRUST_PROXY` | 1 | Cantidad de proxies delante de la app. Usa `0` si recibe el tráfico directo |
| `ENFORCE_HTTPS` | `0` | Usa `1` solo si el sitio se sirve con HTTPS |

## Cambiar los cargos

Los cargos están en `src/config.js` y en `public/index.html`; hay que editar ambos. Una prueba verifica que coincidan.

## Despliegue

Incluye un `Dockerfile`. El contenedor escucha en el puerto 3000, y `GET /api/health` sirve como chequeo de salud.