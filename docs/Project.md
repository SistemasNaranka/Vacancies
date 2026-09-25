# Proyecto

**Fase Actual**: Pruebas
**Estado de la Fase**: En Progreso

## Problema

La empresa recibe postulantes a sus vacantes por canales informales (correo, WhatsApp, entrega presencial), lo que produce información desordenada, difícil de consultar y hojas de vida que se pierden o se duplican.

No existe un punto de entrada único y estandarizado donde el candidato registre sus datos y adjunte su CV, ni un lugar organizado donde el personal de reclutamiento revise las postulaciones recibidas.

## Objetivos

1. Centralizar las postulaciones en una sola base de datos con datos estandarizados por candidato.
2. Permitir que el candidato se postule a uno o varios cargos desde su celular en pocos minutos, adjuntando su hoja de vida en PDF.
3. Permitir al equipo de reclutamiento consultar todas las postulaciones (datos + PDF) sin necesidad de un panel de administración.

### Objetivos medibles

- Un candidato completa y envía su postulación desde un teléfono móvil sin asistencia.
- Toda postulación queda registrada en SQLite con su PDF almacenado en carpeta local, consultable y descargable directamente.
- El sitio queda accesible mediante una URL pública.

## Usuarios

- **Candidato**: visita la URL pública, selecciona uno o más cargos, completa sus datos, sube su CV en PDF y envía la postulación. No crea cuenta.
- **Reclutamiento / Gerencia**: consulta directamente la base de datos SQLite y la carpeta de PDFs (sin interfaz propia en el MVP).

## Alcance

### Dentro del alcance

- Formulario público responsive (móvil primero) con:
  - Nombre y apellido
  - Correo electrónico
  - Teléfono / WhatsApp
  - Ciudad / País de residencia
  - Años de experiencia (numérico)
  - Expectativa salarial
  - Selección de uno o varios cargos: **Gerente, Cajero, Asesor, Auxiliar de Bodega**
  - Subida de **1 archivo PDF** de hoja de vida, máximo **10 MB**
- Validaciones en cliente y servidor (campos obligatorios, formato de correo, tipo y tamaño del archivo, anti-duplicados por correo+cargo).
- Backend **Node.js + Express** con base de datos **SQLite** y almacenamiento de PDFs en **carpeta local**.
- Despliegue accesible por URL pública.
- Pruebas automatizadas mínimas: envío de formulario, subida de PDF y validaciones.

### Fuera del alcance (exclusiones)

- Panel de administración o cualquier interfaz de gestión de postulaciones.
- Notificaciones por correo (al reclutador o al candidato).
- Login de candidatos y cuentas de usuario.
- Edición o eliminación de una postulación ya enviada.
- Seguimiento de estados (en revisión, entrevista, rechazado, etc.).
- Evaluaciones, tests y agenda de entrevistas.
- Vacantes dinámicas: la lista de cargos es fija y se define en configuración.
- Almacenamiento en la nube (S3, etc.): los PDFs viven en una carpeta local del servidor.

- Experiencia mínima formal por cargo: **no aplica** (el filtro lo hace quien revisa el CV al postular).
- Sin requisitos formales de escolaridad, experiencia o residencia prevalidados en el formulario. El único límite es la edad, evaluado en la etapa de entrevista.

## Criterios de Éxito

| # | Criterio |
|---|----------|
| 1 | El candidato completa y envía la postulación desde un móvil sin ayuda |
| 2 | Toda la postulación (datos + PDF) queda consultable y descargable directo de SQLite y la carpeta local |
| 3 | El sitio es accesible por una URL pública |
| 4 | Pruebas automatizadas cubren envío de formulario, subida de PDF y validaciones |

## Restricciones

- Stack: Node.js + Express + SQLite, PDFs en carpeta local.
- Máximo 1 PDF por postulación, 10 MB.
- Vacantes fijas: Gerente, Cajero, Asesor, Auxiliar de Bodega (aplicación múltiple permitida).

## Riesgos Aceptados

- **Sin panel de administración**: la revisión depende de acceso directo a la BD y la carpeta de archivos. Aceptado para el MVP; se reconsidera como fase posterior.
- **PDFs en carpeta local**: no escala si el sitio se despliega en múltiples instancias. Aceptado para el MVP.

## Próximo Paso

Fase de Pruebas: ejecutar suite automatizada, validar CA-01..CA-11 y resolver defectos (`Testing.md`).
