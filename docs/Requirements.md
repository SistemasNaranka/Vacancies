# Requisitos

Fase: Requisitos. Basado en `Project.md` (alcance) y `Analysis.md` (RN-01..RN-08).

## Requisitos Funcionales

| ID | Requisito | Origen |
|----|-----------|--------|
| RF-01 | El sitio expone un **formulario público de postulación** accesible por URL, sin login ni registro previo. | RN-08 |
| RF-02 | El formulario recoge: **nombre y apellido** (obligatorio), **correo** (obligatorio), **teléfono/WhatsApp** (obligatorio), **ciudad/país** (obligatorio), **años de experiencia** numérico ≥ 0 (obligatorio), **expectativa salarial** (opcional). | P-1 |
| RF-03 | Selección de **uno o varios cargos** (obligatorio, mínimo 1) de la lista fija: Gerente, Cajero, Asesor, Auxiliar de Bodega. | RN-01, RN-03 |
| RF-04 | Carga de **1 solo archivo PDF** de hoja de vida, máximo **10 MB**, tipo `application/pdf` (el input solo acepta un archivo). | RN-02 |
| RF-05 | **Validación en cliente y en servidor** (obligatoriedad, formato de correo, rango de experiencia, selección de cargo, tipo y tamaño del PDF). El servidor nunca confía en la validación del cliente. | RF-02..RF-04 |
| RF-06 | **Anti-duplicados**: el servidor rechaza el envío si el correo ya postuló a **alguno de los cargos seleccionados**, con mensaje claro que indique el cargo en conflicto. La selección completa se rechaza (no envíos parciales). | RN-08, P-2 |
| RF-07 | **Persistencia**: los datos se guardan en **SQLite** y el PDF en una **carpeta local** con nombre de archivo único (no expone datos personales). Si falla una parte, no quedan registros huérfanos (BD sin PDF ni PDF sin BD). | Alcance |
| RF-08 | Tras un envío exitoso, el candidato ve un **mensaje de confirmación**. | Criterio 1 |
| RF-09 | Ante un error de validación o de duplicado, se muestra un **mensaje claro** y **se conservan los datos ya digitados** (excepto el archivo, que debe re-seleccionarse). | Criterio 1 (móvil) |
| RF-10 | Se documenta la **consulta de purge** de postulaciones con más de 6 meses (ejecución manual, fuera del código del MVP). | RN-06, Decisión 6 |

## Requisitos No Funcionales

| ID | Requisito |
|----|-----------|
| RNF-01 | **Usabilidad móvil primero**: diseño responsive; completar y enviar la postulación desde un teléfono sin asistencia. |
| RNF-02 | **Despliegue**: accesible por URL pública con HTTPS. |
| RNF-03 | **Rendimiento**: carga de la página en < 3 s en conexión móvil; envío en < 5 s (incluye subida del PDF). |
| RNF-04 | **Seguridad básica**: sentencias preparadas (sin inyección SQL), nombres de archivo aleatorios/UUID (sin directory traversal ni datos personales en URLs), límite de 10 MB aplicado en el servidor, validación de MIME real del PDF, cabeceras básicas de seguridad. |
| RNF-05 | **Privacidad**: los datos personales y PDFs se conservan 6 meses (purge manual); las rutas de PDF no son indexables ni adivinables. |
| RNF-06 | **Operación simple**: SQLite sin servidor; respaldo manual de la BD + carpeta de PDFs documentado. |
| RNF-07 | **Compatibilidad**: últimos 2 años de navegadores móviles/escritorio (Chrome, Safari, Firefox, Edge). |
| RNF-08 | **Pruebas automatizadas**: cobertura mínima de validaciones, subida de PDF, anti-duplicados y flujo de envío completo. |
| RNF-09 | **Trazabilidad**: un error de envío no debe dejar la BD y la carpeta en estado inconsistente (ver RF-07). |

## Fuera de Alcance (confirmado)

Panel de administración · notificaciones por email · login · edición/eliminación de postulación · estados de seguimiento · evaluaciones/agenda · vacantes dinámicas · storage en la nube · purge automatizada · bloqueo por documento de identidad.

## Criterios de Aceptación

| ID | Criterio | Verificación |
|----|----------|--------------|
| CA-01 | **Envío válido**: Dado el formulario completo con PDF válido de <10 MB, Al enviar, Entonces se crea 1 registro en SQLite + 1 PDF en la carpeta, y se muestra confirmación. | Prueba automatizada |
| CA-02 | **Obligatorios**: Dado cualquier campo obligatorio vacío o cargo sin seleccionar, Al enviar, Entonces no se crea registro y se muestra el campo en error conservando lo digitado. | Prueba automatizada |
| CA-03 | **Correo inválido**: Dado un correo con formato inválido, Al enviar, Entonces se rechaza sin crear registro. | Prueba automatizada |
| CA-04 | **Archivo**: Dado un archivo >10 MB o que no sea PDF (ej. .exe renombrado), Al enviar, Entonces se rechaza sin crear registro ni archivo. | Prueba automatizada |
| CA-05 | **Duplicado**: Dado que `x@y.com` ya postuló a *Cajero*, Al enviar postulación de `x@y.com` con cargos [Cajero, Asesor], Entonces se rechaza todo el envío con mensaje que menciona *Cajero*. | Prueba automatizada |
| CA-06 | **Re-postulación válida**: Dado que `x@y.com` ya postuló a *Cajero*, Al enviar postulación de `x@y.com` con cargo [Asesor], Entonces se acepta y crea registro + PDF. | Prueba automatizada |
| CA-07 | **Opcionalidad**: Dado un formulario sin expectativa salarial, Al enviar con el resto válido, Entonces se acepta (expectativa queda vacía en BD). | Prueba automatizada |
| CA-08 | **Experiencia**: Dado "años de experiencia" no numérico o negativo, Al enviar, Entonces se rechaza. | Prueba automatizada |
| CA-09 | **Consulta manual**: Dada una postulación recibida, Al consultar la BD y la carpeta, Entonces los datos y el PDF son localizables y descargables directamente. | Verificación manual |
| CA-10 | **Móvil**: Dado un teléfono, Al completar y enviar una postulación desde la URL pública, Entonces el flujo se completa sin ayuda ni zooms forzados. | Verificación manual |
| CA-11 | **Pruebas**: Al ejecutar la suite de pruebas, Entonces todas pasan sin errores. | Comando local/CI |

## Condición de Salida

Todos los requisitos han sido aprobados por el Propietario del Proyecto.
