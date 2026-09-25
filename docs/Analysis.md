# Análisis

## Actores

| Actor | Rol |
|-------|-----|
| **Candidato** | Persona externa que visita la URL pública, completa el formulario, elige uno o más cargos y adjunta su CV en PDF. No crea cuenta. |
| **Revisor / RH** | Persona interna que consulta las postulaciones (SQLite + carpeta de PDFs), filtra candidatos y deriva los perfiles al gerente del área. |
| **Gerente de área** | Persona interna que recibe los perfiles derivados y decide a quién contactar para entrevista. |

## Flujo de Trabajo

### Estado actual (as-is)

1. El candidato envía su postulación por un canal informal: correo, WhatsApp o entrega presencial de CV en papel (canal mixto, sin punto único).
2. RH recibe las postulaciones dispersas entre canales y buzones personales.
3. RH filtra los CV y deriva los perfiles viables al gerente del área correspondiente.
4. No hay ciclo formal de vacantes: la contratación se decide caso por caso según necesidad.
5. El contacto con el candidato (llamada/WhatsApp) se hace sin regla definida.
6. Los CV se acumulan sin retención definida; no hay lugar único para consultarlos.

**Problemas identificados:** información dispersa y duplicada, imposibilidad de consultar el histórico, pérdida de CV, sin estándar de datos por candidato.

### Flujo objetivo con el MVP (to-be)

1. El candidato visita la URL pública desde celular o escritorio.
2. Completa sus datos: nombre y apellido, correo, teléfono/WhatsApp, ciudad/país, años de experiencia, expectativa salarial.
3. Selecciona uno o varios cargos entre: Gerente, Cajero, Asesor, Auxiliar de Bodega.
4. Adjunta su hoja de vida como **1 PDF, máximo 10 MB**.
5. Envía la postulación → validación en cliente y servidor → registro en **SQLite** + PDF en **carpeta local**.
6. RH consulta directamente la base de datos y la carpeta de PDFs (sin panel de administración).
7. RH filtra y deriva al gerente del área; el contacto con el candidato se realiza según criterio del revisor.
8. A los 6 meses, purge **manual** de la postulación (registro + PDF) mediante script/consulta.

## Estados

El MVP **no** implementa estados de seguimiento (excluido por decisión de alcance). Toda postulación tiene un único estado efectivo:

| Estado | Descripción |
|--------|-------------|
| **Recibida** | Registrada en SQLite con su PDF. Estado inicial y único. |
| **Purgada** | Eliminada manualmente al superar los 6 meses de retención. |

Los estados de negocio reales (en revisión, derivada, entrevista, contratada, rechazada) existen solo en el proceso humano fuera del sistema.

## Reglas de Negocio

| ID | Regla |
|----|-------|
| RN-01 | Una postulación puede cubrir **uno o varios cargos** a la vez (selección múltiple, mínimo 1). |
| RN-02 | Máximo **1 archivo PDF** por postulación, **10 MB**, tipo `application/pdf`. |
| RN-03 | La lista de cargos es **fija**: Gerente, Cajero, Asesor, Auxiliar de Bodega (definida en configuración, sin gestión en el MVP). |
| RN-04 | **Sin requisitos formales prevalidados**: escolaridad, experiencia y residencia los evalúa quien revisa el CV. La edad mínima se verifica en la etapa de entrevista, no en el formulario. |
| RN-05 | El correo electrónico debe tener formato válido: es el canal principal de contacto posterior. |
| RN-06 | Retención: **6 meses** desde la postulación; después, purge **manual** de registro y PDF (fuera del MVP). |
| RN-07 | RH filtra y deriva al gerente del área; no hay regla fija de contacto al candidato (criterio del revisor). |
| RN-08 | **Anti-duplicados**: se rechaza la postulación si ese **correo** ya postuló a **ese mismo cargo**. A otros cargos sí puede postularse (re-postulación permitida en general). |

## Preguntas Abiertas

Todas resueltas y aprobadas por el Propietario del Proyecto:

| # | Pregunta | Resolución |
|---|----------|------------|
| P-1 | ¿Qué campos son obligatorios? | Obligatorios: nombre, correo, teléfono, ciudad, años de experiencia y ≥1 cargo. Opcional: expectativa salarial. |
| P-2 | ¿Se bloquean duplicados? | Sí: bloqueo por **correo + cargo** (RN-08). |

## Condición de Salida

El problema de negocio está comprendido completamente, documentado en este archivo y aprobado por el Propietario del Proyecto (incluyendo P-1 y P-2).
