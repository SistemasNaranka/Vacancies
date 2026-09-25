# Tareas

## Tareas Pendientes

| ID | Tarea | Estado |
|----|-------|--------|
| T-19 | Ejecutar suite automatizada completa (CA-01..CA-08, CA-11) | En Progreso |
| T-20 | Validar CA-09 (consulta manual BD + carpeta) | Pendiente |
| T-21 | Validar CA-10 (flujo completo en móvil) | Pendiente |
| T-22 | Aprobación de la fase Pruebas por el Propietario del Proyecto | Pendiente |

## Tareas Completadas

| ID | Tarea | Fecha |
|----|-------|--------|
| T-00 | Crear estructura `docs/` desde la plantilla del framework | 2026-09-24 |
| T-00 | Documentar la idea clara en `docs/Project.md` y registrar decisiones de alcance | 2026-09-24 |
| T-01 | Aprobación de la idea → fase Idea completada | 2026-09-24 |
| T-04 | Análisis inicial: actores, canal actual, reglas de retención (6 meses, purga manual) | 2026-09-24 |
| T-05 | Re-aprobación del alcance ampliado (campo de experiencia) → fase Idea cerrada | 2026-09-24 |
| T-06 | Análisis documentado en `Analysis.md` (actores, flujo as-is/to-be, RN-01..RN-08) | 2026-09-24 |
| T-09 | Análisis aprobado (incluye P-1 campos obligatorios y P-2 anti-duplicados) → fase Análisis cerrada | 2026-09-24 |
| T-07 | Requisitos RF/RNF/CA aprobados → fase Requisitos cerrada | 2026-09-24 |
| T-10 | Diseño técnico documentado en `Architecture.md` | 2026-09-24 |
| T-11 | Diseño aprobado → fase Diseño cerrada | 2026-09-24 |
| T-12 | Scaffold del proyecto (package.json, .gitignore, .env.example, dependencias) | 2026-09-24 |
| T-13 | Backend: config, db, validación, servicio con transacción, rutas, app, server | 2026-09-24 |
| T-14 | Frontend mobile-first: index.html, styles.css, form.js | 2026-09-24 |
| T-15 | `scripts/purge.sql` (RF-10) + README (RNF-06) | 2026-09-24 |
| T-16 | Pruebas automatizadas: 8 unitarias + 13 integración (CA-01..CA-08) | 2026-09-24 |
| T-17 | Suite completa en verde: 21/21 + smoke test manual (200/201/409) | 2026-09-24 |
| T-18 | Implementación aprobada → fase Implementación cerrada | 2026-09-24 |
| T-23 | Rediseño visual del formulario (encabezado, secciones, chips de cargo, zona de carga PDF y estados) tras la observación estética de CA-10 en móvil | 2026-09-25 |
| T-24 | Defecto CA-10: al abrir por IP de la red (HTTP no-localhost) la página perdía CSS y JS. Causa: `upgrade-insecure-requests` del CSP por defecto de helmet. Se omite la directiva salvo `ENFORCE_HTTPS=1` + prueba de regresión | 2026-09-25 |
| T-25 | Cambiar el color de marca del formulario al corporativo `#004680` (Decisión 8): escala de tintes/sombras derivada, token `--brand-rgb` para eliminar `rgba()` con el violeta anterior, `theme-color` y prueba de consistencia | 2026-09-25 |
