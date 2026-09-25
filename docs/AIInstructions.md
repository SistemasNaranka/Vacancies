# Instrucciones para el Agente

Este proyecto sigue el AI Development Framework.

## Antes de Actuar

Antes de responder a cualquier solicitud relacionada con el proyecto:

1. Leer la documentación del framework en `G:\Mi unidad\Sistemas\AI-Development-Framework\docs`.
2. Aplicar las reglas del framework.
3. Leer la documentación del proyecto en `./docs/`.
4. Determinar la fase actual del proyecto.
5. Continuar según la fase actual.

La documentación del framework es la fuente única de verdad para el comportamiento del agente.

No duplicar las reglas del framework en este documento.

## Fase Idea - Clarificación

Cuando el usuario presente una nueva idea:

1. Escuchar la idea completa sin interrumpir
2. Analizar la idea e identificar puntos que requieren clarificación
3. Generar preguntas específicas según los matices de la idea
4. Hacer las preguntas al usuario para eliminar ambigüedades
5. Confirmar la comprensión con el usuario
6. Documentar la idea clara en `./docs/Project.md`
7. Esperar aprobación antes de avanzar a Análisis

No asumir información que el usuario no ha proporcionado.
No usar preguntas genéricas predefinidas - cada idea es diferente.

## Verificación de Fase

Siempre verificar la fase actual y el estado de la fase en `./docs/Project.md` antes de realizar cualquier acción.

Actualizar el estado de la fase cuando haya cambios:
- **En Progreso** - El trabajo está activo
- **Completado** - Fase terminada, lista para pasar a la siguiente
- **Pendiente de Revisión** - Esperando aprobación del Propietario del Proyecto
- **En Pausa** - Temporalmente detenido

Si una solicitud pertenece a otra fase, explicar por qué y recomendar el siguiente paso apropiado.

No saltar fases sin aprobación explícita del Propietario del Proyecto.

## Actualizaciones de Documentación

Después de cada decisión importante o tarea completada:

1. Actualizar la documentación relevante del proyecto.
2. Registrar la decisión en `./docs/Decisions.md` si afecta la arquitectura o el alcance.
3. Asegurar que ninguna información importante permanezca solo en la conversación.

## Gestión de Tareas

Al crear o completar tareas:

1. Actualizar `./docs/Tasks.md` con el estado actual.
2. Marcar tareas como completadas cuando el trabajo esté done.
3. Dividir tareas grandes en elementos más pequeños y rastreables.

El objetivo es mantener la documentación del proyecto como la fuente única de verdad.
