# Decisiones

| # | Fecha | Decisión | Razón | Estado |
|---|-------|----------|-------|--------|
| 1 | 2026-09-24 | MVP = solo formulario público con guardado en SQLite y carpeta local; sin panel de administración ni notificaciones por email | Reducir alcance a lo mínimamente viable para validar el proceso de postulación | Aprobada |
| 2 | 2026-09-24 | Stack: Node.js + Express + SQLite; PDFs en carpeta local del servidor (no storage en la nube) | Simplicidad y costo cero de infraestructura para el MVP | Aprobada |
| 3 | 2026-09-24 | Lista de cargos fija (Gerente, Cajero, Asesor, Auxiliar de Bodega) con selección múltiple; una sola postulación puede cubrir varios cargos | No hay panel para gestionar vacantes; el negocio solo necesita esos 4 cargos activos | Aprobada |
| 4 | 2026-09-24 | 1 PDF por postulación, máximo 10 MB | Suficiente para una hoja de vida; simplifica validación y almacenamiento | Aprobada |
| 5 | 2026-09-24 | Agregar campo numérico 'Años de experiencia' al formulario | El Propietario quiere capturar la experiencia de un vistazo sin abrir el CV; requisitos formales por cargo no aplican (el revisor decide) | Aprobada |
| 6 | 2026-09-24 | Purga de postulaciones >6 meses: manual (script/consulta), fuera del MVP | Retención definida en análisis sin añadir complejidad de tareas programadas al MVP | Aprobada |
| 7 | 2026-09-24 | Anti-duplicados por combinación correo + cargo (rechazo del envío); sin campo de documento de identidad | Regla pedida por el Propietario que no requiere cambiar el alcance del formulario | Aprobada |
| 8 | 2026-09-25 | Color de marca del frontend: **#004680** (corporativo), con escala de tintes y sombras derivada del mismo tono | Identidad corporativa indicada por el Propietario; unificar la marca en variables CSS evita colores dispersos por el código | Aprobada |
