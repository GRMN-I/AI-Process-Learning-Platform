# Huckathon: documento base para presentación

## 1. Resumen ejecutivo

Huckathon es una plataforma para gestionar conocimiento operativo de una empresa a partir de procedimientos versionados. El sistema toma como fuente principal videos operativos cortos y los transforma en activos estructurados, buscables y reutilizables:

- `Procedure`: representa el concepto general de un procedimiento.
- `ProcedureVersion`: representa una versión concreta de ese procedimiento y es la unidad real de trabajo del sistema.
- `Training`: es un artefacto derivado 1:1 desde una `ProcedureVersion`.
- `Incident`: representa una incidencia operativa que puede analizarse con ayuda de IA para detectar procedimientos involucrados, hallazgos y acciones correctivas.

La tesis del producto es que el conocimiento operativo no debe vivir sólo en videos, documentos o experiencia informal, sino en una capa estructurada que permita:

- buscar procedimientos de forma inteligente,
- detectar qué cambia cuando aparece una nueva normativa o cambio operativo,
- analizar incidentes usando memoria previa,
- y traducir ese análisis en recapacitación, redefinición de procedimientos o nuevos controles.

## 2. Stack y modelos de IA

### Stack técnico

- Frontend: React 18, Vite, TypeScript, Tailwind, React Query.
- Backend: FastAPI, SQLAlchemy async, Alembic.
- Base de datos: PostgreSQL + `pgvector`.
- Storage: MinIO local o Cloudflare R2 en producción.
- Procesamiento de video: `ffmpeg` y `ffprobe`.

### Perfiles de IA soportados

El sistema abstrae el proveedor detrás de `AI_PROFILE`.

#### Perfil (OpenAI)

- Transcripción: `whisper-1`
- Generación estructurada: `gpt-4o`
- Captioning de frames: `gpt-4o-mini`
- Embeddings: `text-embedding-3-large`
- Dimensión de embedding: `3072`

#### Perfil (Gemini)

- Transcripción: `gemini-2.5-flash`
- Generación estructurada: `gemini-2.5-flash`
- Captioning de frames: `gemini-2.5-flash`
- Embeddings: `gemini-embedding-001`
- Dimensión de embedding: `3072`

### Observación importante

El sistema no depende conceptualmente de un proveedor específico. El flujo es el mismo y cambia únicamente el adaptador.

## 3. Entidades principales y vínculo conceptual

### 3.1. Gestión operativa

- `User`: persona dentro de la empresa.
- `Role`: rol operativo, por ejemplo supervisor, cocina, caja.
- `Task`: tarea que un rol debe ejecutar.
- `RoleTaskLink`: indica qué tareas son requeridas para un rol.
- `Procedure`: concepto general de un procedimiento.
- `TaskProcedureLink`: indica qué procedimientos están asociados a una tarea.
- `ProcedureVersion`: versión concreta del procedimiento.

Relación conceptual:

`User -> UserRoleAssignment -> Role -> RoleTaskLink -> Task -> TaskProcedureLink -> Procedure -> ProcedureVersion`

Esto permite modelar que:

- un usuario puede tener uno o más roles,
- un rol exige una o más tareas,
- una tarea puede requerir uno o más procedimientos,
- y siempre interesa la última versión vigente del procedimiento.

### 3.2. Inteligencia de fuente de una versión

La `ProcedureVersion` concentra la inteligencia derivada del activo fuente:

- `ProcedureVersionTranscript`: transcripción completa del video.
- `ProcedureVersionChunk`: segmentos temporales de transcripción.
- `VideoFrame`: frames extraídos y captionados.
- `SemanticSegment`: fusión de texto transcripto + información visual en ventanas temporales.
- `ProcedureVersionStructure`: estructura canónica del procedimiento.
- `ProcedureStepIndex`: índice por pasos del procedimiento para búsqueda semántica más precisa.

### 3.3. Capa pedagógica

- `Training`: training derivado 1:1 desde una `ProcedureVersion`.
- `TrainingStructure`: estructura pedagógica consumible por la UI.
- `QuizQuestion`: preguntas del quiz generado.
- `Job`: representa el estado de una generación o iteración de training.

### 3.4. Ejecución y compliance

- `Assignment`: asignación de un training a un usuario.
- `UserProcedureCompliance`: snapshot por usuario/procedimiento que resume:
  - versión requerida,
  - versión leída,
  - training derivado,
  - assignment asociado,
  - score,
  - estado de cumplimiento.

### 3.5. Incidencias y memoria operativa

- `Incident`: incidencia operativa con descripción, severidad, estado, rol y ubicación.
- `IncidentAnalysisRun`: corrida o análisis asociado a una incidencia.
- `IncidentAnalysisFinding`: hallazgo dentro de un análisis.
- `IncidentRelatedMatch`: vínculo hacia incidentes previos similares.
- `IncidentTrainingLink`: vínculo manual o sugerido entre una incidencia y un training.

Tipos actuales de hallazgo:

- `not_followed`: el procedimiento existía, pero no se respetó.
- `needs_redefinition`: el procedimiento existe, pero debe actualizarse o redefinirse.
- `missing_procedure`: falta estandarizar ese caso con un procedimiento nuevo.
- `contributing_factor`: factor contribuyente, pero no necesariamente causa raíz principal.

## 4. Relación entre entidades y lógica de negocio

### 4.1. Rol -> tarea -> procedimiento

La lógica operativa parte de que el usuario no “recibe un curso porque sí”, sino porque tiene un rol activo.

1. Un usuario recibe un `Role` mediante `UserRoleAssignment`.
2. Ese rol tiene `Task` requeridas mediante `RoleTaskLink`.
3. Cada tarea tiene `Procedure` asociados mediante `TaskProcedureLink`.
4. Para cada procedimiento se toma la versión más reciente (`latest version`).
5. Si esa versión tiene `Training`, el sistema puede asignarlo automáticamente.

### 4.2. Qué pasa cuando se crea o actualiza una versión

Cuando se crea una nueva `ProcedureVersion` del último procedimiento vigente:

1. La nueva versión pasa a ser la referencia más reciente.
2. Se recalcula el `ProcedureStepIndex`.
3. Se ejecuta `sync_procedure_rollout(...)`.
4. Ese proceso identifica todos los usuarios impactados por ese procedimiento a partir de sus roles activos.
5. Se actualiza `UserProcedureCompliance` apuntando a la versión más reciente.
6. Si todavía no existe training derivado, el compliance puede quedar en `missing_training`.
7. Si ya existe training, o cuando luego se genere/publishe, se crean `Assignment` para los usuarios impactados.

### 4.3. Qué pasa cuando un usuario tiene un rol

El rol no sólo clasifica al usuario; dispara requerimientos concretos:

- qué procedimientos debe conocer,
- qué versión vigente debe leer,
- qué training debe completar,
- y cuál es su estado de cumplimiento actual.

En otras palabras: la cadena `Role -> Task -> Procedure -> ProcedureVersion -> Training -> Assignment` termina impactando directamente en el usuario.

## 5. Pipeline conceptual de creación de un procedimiento

### 5.1. Creación inicial

Cuando se crea un procedimiento:

1. Se crea el `Procedure` como contenedor conceptual.
2. Se genera automáticamente un código único, por ejemplo `PROC-...`.
3. Se crea la `ProcedureVersion` inicial (`version_number = 1`).
4. Si se adjunta un video fuente, la versión queda con `source_processing_status = UPLOADED`.
5. Se genera un embedding inicial del `content_text` base.
6. Si hay archivo fuente, se dispara asincrónicamente el source processing.

## 6. Pipeline de source processing de una ProcedureVersion

Este es uno de los puntos más importantes para explicar el proyecto.

La idea es que, a partir de un video operativo, el sistema construye una representación estructurada del procedimiento.

### 6.1. Estado general

La `ProcedureVersion` atraviesa distintos estados como:

- `UPLOADED`
- `TRANSCRIBING`
- `INDEXING`
- `READY`
- `FAILED`

### 6.2. Paso 1: descarga del video fuente

El backend descarga el archivo desde storage (`MinIO` o `R2`) a un directorio temporal.

### 6.3. Paso 2: transcripción del video

Se corre el modelo de transcripción según el perfil activo:

- OpenAI: `whisper-1`
- Gemini: `gemini-2.5-flash`

Salida:

- lista de segmentos temporales con `start`, `end` y `text`
- y un `raw_transcript` consolidado

Conceptualmente:

“Transformar el video en una línea de tiempo textual.”

### 6.4. Paso 3: extracción de frames

Usando `ffmpeg`, el sistema toma capturas del video cada `3` segundos.

Conceptualmente:

“Tomar snapshots visuales del procedimiento.”

### 6.5. Paso 4: captioning de cada frame

Cada frame se envía al modelo visual/textual para obtener una descripción breve del contenido.

Modelos:

- OpenAI: `gpt-4o-mini`
- Gemini: `gemini-2.5-flash`

Salida:

- timestamp del frame
- caption en español
- storage key del frame

Conceptualmente:

“Convertir evidencia visual en texto utilizable.”

### 6.6. Paso 5: fusión transcript + visual

El sistema agrupa la información en ventanas de `10` segundos.

Para cada ventana:

- toma el texto transcripto que cae en ese tramo,
- toma captions de frames dentro de ese tramo,
- y genera un `text_fused`.

Ejemplo conceptual:

- transcripción: “validar ticket y revisar contenido”
- visual: “operador observa bandeja y ticket”
- segmento fusionado final:
  - “validar ticket y revisar contenido | Visual: operador observa bandeja y ticket”

Conceptualmente:

“Construir una representación multimodal de cada tramo del procedimiento.”

### 6.7. Paso 6: extracción de conocimiento estructurado

Con los segmentos fusionados, el sistema pide a un LLM que devuelva una estructura JSON del procedimiento.

Modelos:

- OpenAI: `gpt-4o`
- Gemini: `gemini-2.5-flash`

La salida incluye:

- `title`
- `objectives`
- `steps`
- `critical_points`
- referencias de tramo fuente, por ejemplo `10s-20s`

Conceptualmente:

“Convertir un video en una estructura canónica y explicable.”

### 6.8. Paso 7: persistencia de artefactos

Se guardan:

- transcript completo,
- chunks transcritos,
- frames captionados,
- semantic segments,
- structure JSON,
- embedding global de la versión.

### 6.9. Paso 8: embeddings para indexación

Se generan embeddings `3072` para:

- cada `SemanticSegment`
- y para el resumen global de la `ProcedureVersion`

Modelos:

- OpenAI: `text-embedding-3-large`
- Gemini: `gemini-embedding-001`

Conceptualmente:

“Volver la versión buscable por significado, no sólo por palabras exactas.”

### 6.10. Resultado final

Cuando todo termina bien:

- `source_processing_status = READY`
- la `ProcedureVersion` ya está lista para:
  - búsqueda semántica,
  - análisis de impacto,
  - análisis de incidentes,
  - y generación de training derivado.

## 7. Preview de source processing antes de guardar

El proyecto tiene además un flujo de preview:

1. se sube un video,
2. se corre `process_source_preview(...)`,
3. se obtiene una sugerencia de estructura y contenido,
4. y esa preview queda cacheada temporalmente (`ProcedureSourcePreview`) por `6` horas.

Esto permite revisar o ajustar el procedimiento antes de persistirlo como versión definitiva.

Conceptualmente:

“Primero simular y validar, después guardar.”

## 8. Pipeline conceptual de generación de training

Una vez que la `ProcedureVersion` quedó en `READY`, se puede generar su `Training`.

El training no vuelve a procesar el video desde cero. Reutiliza la inteligencia ya creada en la versión.

### 8.1. Precondición

La versión debe tener:

- video fuente,
- source processing completo,
- transcript,
- segments,
- structure.

### 8.2. Paso 1: crear o reutilizar Training

Se crea un `Training` 1:1 para esa versión si todavía no existe.

Además se crea un `Job` para seguir el progreso de generación.

### 8.3. Paso 2: carga de artifacts ya procesados

El sistema reutiliza:

- transcript segments,
- frames captionados,
- semantic segments,
- `raw_transcript`,
- `source_structure`.

Esto es importante en la presentación porque muestra una decisión de arquitectura muy valiosa:

“La inteligencia fuente vive en la `ProcedureVersion`; el training la consume, no la regenera.”

### 8.4. Paso 3: definición o ajuste de estructura pedagógica

Si no hay instrucción adicional:

- el training toma como base la estructura ya existente del procedimiento.

Si hay iteración del autor:

- se corre nuevamente un LLM sobre los segments y una instrucción extra para ajustar pedagógicamente la estructura.

Este paso usa el stage `EXTRACTING`.

### 8.5. Paso 4: coverage planning

El sistema corre un modelo para planificar qué temas deberían ser cubiertos por el quiz.

Salida:

- `topics_to_cover`
- `type`
- `target_segment_range`

Conceptualmente:

“Planificar cobertura antes de generar preguntas.”

### 8.6. Paso 5: generación de quiz

El sistema genera preguntas de tipo `mcq`.

El prompt exige:

- exactamente 4 opciones,
- una respuesta correcta,
- evidencia con `segment_range` y `quote`,
- respuesta JSON estricta.

Este paso usa structured outputs:

- OpenAI: `response_format` con `json_schema`
- Gemini: `responseMimeType = application/json` + `responseSchema`

Conceptualmente:

“No se genera texto libre; se genera un contrato estructurado validable.”

### 8.7. Paso 6: verificación

Cada pregunta se valida contra el transcript para marcar si la evidencia realmente aparece en el material fuente.

### 8.8. Paso 7: persistencia final

Se guardan:

- `TrainingStructure`
- `QuizQuestion`

Y el training queda en estado `ready`.

## 9. Iteración de training

El proyecto soporta iterar un training con instrucciones de autor.

Ejemplo conceptual:

- “reescribir la pregunta 2”
- “hacer más claro el paso 3”
- “agregar foco en puntos críticos”

La iteración:

- no vuelve a correr todo el source processing,
- reutiliza artifacts de la `ProcedureVersion`,
- y sólo ajusta estructura y quiz en el ámbito pedagógico.

Esto es importante para explicar eficiencia y costo.

## 10. ProcedureStepIndex y búsqueda por pasos

Además del indexado por segmentos fusionados, el sistema genera un índice por pasos (`ProcedureStepIndex`).

Para cada paso del procedimiento:

- guarda título,
- descripción,
- referencia al tramo fuente,
- texto de búsqueda enriquecido,
- embedding del paso.

Esto mejora muchísimo la recuperación porque permite encontrar:

- una versión del procedimiento,
- y además el paso exacto dentro de esa versión.

Conceptualmente:

“No sólo indexamos el procedimiento completo; indexamos cada paso como una unidad semántica.”

## 11. Búsqueda inteligente de procedimientos

Cuando un usuario hace una búsqueda semántica:

1. se genera embedding de la consulta,
2. se comparan embeddings contra:
   - `ProcedureStepIndex`
   - `SemanticSegment`
3. se toma la mejor coincidencia por `ProcedureVersion`,
4. y se devuelve:
   - procedimiento,
   - versión,
   - snippet,
   - paso si aplica,
   - training derivado si existe.

Conceptualmente:

“El sistema encuentra el procedimiento correcto aunque la consulta no use el nombre exacto.”

## 12. Cómo se vincula esto con incidencias

El valor más fuerte del proyecto aparece cuando el conocimiento estructurado del procedimiento se usa para analizar incidentes.

## 13. Pipeline conceptual de análisis de incidencias

### 13.1. Paso 1: creación de incidencia

Cuando se crea una `Incident`:

- se guarda descripción,
- severidad,
- rol,
- ubicación,
- estado,
- y se genera embedding de la descripción.

Conceptualmente:

“La incidencia queda lista para compararse semánticamente contra procedimientos e incidentes previos.”

### 13.2. Paso 2: recuperación semántica de procedimientos candidatos

Para analizar la incidencia:

1. se toma el embedding de la incidencia,
2. se buscan `ProcedureVersion` semánticamente parecidas,
3. se recuperan:
   - snippets,
   - paso relevante,
   - quote fuente,
   - training derivado si existe.

Conceptualmente:

“La incidencia se compara contra el conocimiento operativo vigente.”

### 13.3. Paso 3: recuperación de incidentes similares

El sistema también busca incidentes previos con embedding parecido.

De esos incidentes toma:

- el análisis previo,
- sus hallazgos,
- sus acciones sugeridas,
- y su training derivado cuando corresponde.

Conceptualmente:

“Cada incidente nuevo puede aprender de incidentes anteriores.”

### 13.4. Paso 4: preview de análisis

Actualmente, el endpoint `analyze-procedures` devuelve un preview analítico, no persiste automáticamente un análisis IA final.

Ese preview incluye:

- `procedure_matches`
- `similar_analyses`

Es decir:

- qué procedimientos parecen relevantes,
- y qué antecedentes similares existen.

### 13.5. Paso 5: consolidación humana del análisis

Luego el usuario puede guardar un `IncidentAnalysisRun` manual, con múltiples `IncidentAnalysisFinding`.

Esto es muy importante conceptualmente:

- la IA asiste,
- pero el análisis operativo puede quedar validado por una persona.

### 13.6. Tipos de hallazgo en el análisis

El análisis puede concluir, por ejemplo:

- `not_followed`: el personal no siguió el procedimiento vigente.
- `needs_redefinition`: el procedimiento vigente es insuficiente o confuso y requiere una nueva versión.
- `missing_procedure`: directamente no existía un procedimiento para ese caso.

## 14. Cómo usar la incidencia para vincular recapacitación

Si un hallazgo apunta a una `ProcedureVersion` que ya tiene `Training`, el sistema puede mostrar ese training como remediación sugerida.

Además existe `IncidentTrainingLink` para vincular explícitamente una incidencia con un training.

Conceptualmente:

“El incidente no queda como un dato aislado: puede activar recapacitación.”

## 15. Cómo impacta un cambio o una nueva versión en los usuarios

Esta es una de las secciones más importantes para la presentación porque conecta IA con operación real.

### Caso A: se crea una nueva versión de un procedimiento

1. La nueva `ProcedureVersion` pasa a ser la versión más reciente.
2. El sistema detecta qué usuarios están impactados por ese procedimiento según sus roles activos.
3. `UserProcedureCompliance` se actualiza apuntando a la nueva versión.
4. Si aún no existe training, el usuario puede quedar marcado como `missing_training`.
5. Cuando el training derivado existe y/o se publica, se generan `Assignment` para esos usuarios.
6. El usuario pasa a tener una nueva obligación de entrenamiento asociada a la nueva versión.

### Caso B: un usuario tiene un rol nuevo

1. Se crea o activa `UserRoleAssignment`.
2. Ese rol exige tareas.
3. Esas tareas exigen procedimientos.
4. Esos procedimientos tienen una última versión.
5. Si esa última versión tiene training, el usuario recibe assignment.
6. Si no lo tiene, el compliance igualmente refleja que hay una brecha.

### Caso C: un procedimiento cambia por una incidencia

1. La incidencia detecta que un procedimiento no fue respetado o debe redefinirse.
2. Se puede crear una nueva `ProcedureVersion`.
3. Esa nueva versión reinicia el rollout operativo sobre todos los usuarios afectados.
4. El sistema vuelve a sincronizar lectura, training y assignment.

Conceptualmente:

“Cada mejora del procedimiento puede desplegarse como una actualización operativa real sobre usuarios concretos.”

## 16. Flujo completo de punta a punta para explicar en una presentación

### Flujo A: crear procedimiento y volverlo utilizable

1. Un autor crea un `Procedure`.
2. Se crea la `ProcedureVersion` inicial.
3. Se sube un video fuente.
4. El sistema transcribe el video.
5. Extrae frames.
6. Captiona esos frames.
7. Fusiona texto + visual.
8. Extrae estructura del procedimiento.
9. Genera embeddings e índices.
10. La versión queda `READY`.

### Flujo B: generar training

1. Se toma una `ProcedureVersion` en `READY`.
2. Se crea o reutiliza un `Training` 1:1.
3. Se consume la estructura y los artifacts ya generados.
4. Se planifica cobertura pedagógica.
5. Se genera quiz estructurado.
6. Se verifica evidencia.
7. El training queda listo para asignar.

### Flujo C: desplegar sobre usuarios

1. Un rol tiene tareas.
2. Las tareas tienen procedimientos.
3. El sistema identifica usuarios activos con ese rol.
4. Toma la última versión del procedimiento.
5. Si existe training, crea assignments.
6. Actualiza `UserProcedureCompliance`.

### Flujo D: analizar una incidencia

1. Se crea la incidencia.
2. Se genera embedding de la descripción.
3. Se recuperan procedimientos semánticamente cercanos.
4. Se recuperan incidentes anteriores similares.
5. Se muestra preview analítico.
6. El analista guarda findings estructurados.
7. Esos findings pueden disparar:
   - recapacitación,
   - redefinición de procedimiento,
   - creación de un procedimiento faltante.

## 17. Qué hace valioso el proyecto frente a una solución tradicional

### No es sólo un LMS

Un LMS clásico distribuye contenido.

Huckathon:

- versiona procedimientos,
- transforma videos en conocimiento estructurado,
- permite búsqueda semántica,
- conecta roles, tareas y personas,
- analiza incidentes con memoria reutilizable,
- y traduce ese análisis en acciones concretas.

### No es sólo búsqueda

No se limita a “buscar un video”.

El sistema:

- entiende pasos,
- entiende estructura,
- recuerda hallazgos anteriores,
- y conecta conocimiento con ejecución operativa.

### No es sólo IA generativa

La IA no está usada sólo para redactar.

Se usa para:

- transcribir,
- captionar,
- estructurar conocimiento,
- embedir e indexar,
- buscar semánticamente,
- planificar cobertura,
- generar quiz validable,
- y asistir el análisis de incidencias.

## 18. Mensajes clave para una audiencia no técnica

- El video deja de ser un archivo suelto y pasa a ser conocimiento operativo estructurado.
- Cada procedimiento tiene versiones, por lo que el sistema sabe qué cambió y quién se ve afectado.
- El training no es un documento independiente: nace de una versión concreta del procedimiento.
- Cada incidencia puede convertirse en aprendizaje reutilizable.
- Cada actualización de procedimiento puede desplegarse sobre los usuarios correctos según su rol.

## 19. Mensajes clave para una audiencia técnica o inversores

- Arquitectura centrada en `ProcedureVersion` como fuente de verdad.
- Separación clara entre:
  - inteligencia de fuente,
  - capa pedagógica,
  - cumplimiento,
  - e inteligencia operativa sobre incidentes.
- Uso de embeddings de 3072 dimensiones sobre contenido textual y pasos.
- Structured outputs para robustez de JSON.
- Base preparada para evolucionar hacia análisis más sofisticado con LLM sobre evidencia recuperada.

## 20. Conclusión

Huckathon convierte procedimientos operativos en un sistema vivo.

Ese sistema:

- captura conocimiento,
- lo vuelve buscable,
- lo conecta con capacitación,
- lo despliega sobre las personas correctas,
- y aprende de incidentes reales.

La idea central del proyecto no es “generar cursos con IA”, sino construir una capa operativa donde procedimientos, trainings, usuarios, cambios e incidentes queden integrados en un único flujo de mejora continua.
