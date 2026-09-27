# Decisiones técnicas

Registro breve de decisiones (formato ADR simplificado): contexto, decisión y consecuencias.

## 1. Next.js full-stack en un solo proyecto

**Contexto**: MVP con un solo desarrollador, debe desplegarse rápido y sin infraestructura.
**Decisión**: Next.js App Router con Route Handlers como backend; despliegue en Vercel.
**Consecuencias**: un repositorio, un deploy, claves solo en el servidor. Hereda los límites de serverless (cuerpo
≤ 4.5 MB, estado en memoria no compartido).

## 2. Separar transcripción y estructuración en dos pasos

**Contexto**: se podría enviar el audio y recibir la nota en una sola llamada.
**Decisión**: dos endpoints; el médico ve y corrige la transcripción antes de estructurar.
**Consecuencias**: un error de reconocimiento de voz (p. ej. "15 mg" por "50 mg") se corrige en origen en lugar de
propagarse a la nota. También permite pegar texto dictado desde otra herramienta y cambiar de plantilla sin volver a
transcribir.

## 3. OpenAI para transcribir y estructurar, con una sola clave

**Contexto**: el MVP necesita voz → texto y texto → JSON; cuantos menos proveedores, más simple es desplegarlo.
**Decisión**: OpenAI para ambos pasos con `OPENAI_API_KEY`. La transcripción usa `fetch` a
`POST {STT_BASE_URL}/audio/transcriptions` con Whisper (`whisper-1`); `gpt-4o-transcribe` es una alternativa más
precisa cambiando `STT_MODEL`.
**Consecuencias**: una sola cuenta y una sola variable. Como el endpoint de audio es un estándar de facto, se puede
cambiar a Groq Whisper u otro proveedor con `STT_BASE_URL`, `STT_MODEL` y `STT_API_KEY`. Se envía un `prompt` con
vocabulario clínico para mejorar la ortografía de fármacos y unidades.

## 4. GPT con structured outputs estrictos y JSON Schema generado desde la plantilla

**Contexto**: las plantillas son configurables por el usuario; la salida debe encajar siempre en ellas.
**Decisión**: generar un JSON Schema por plantilla y enviarlo en `text.format` (`strict: true`) de la Responses API;
validar otra vez con Zod. Modelo por defecto `gpt-5.5` con `reasoning.effort: low` (configurable).
**Consecuencias**: no hay que parsear texto libre ni reintentar por JSON inválido; nuevas plantillas funcionan sin
código. El modo estricto exige que todos los campos sean obligatorios y sin propiedades extra, justo lo que se busca:
lo no mencionado llega como `""` o `[]`. `low` da buena calidad para extracción con tiempos cortos; se puede subir a
`medium` si hace falta más razonamiento clínico.

## 5. Manejo explícito de negativas y respuestas incompletas

**Contexto**: el modelo puede declinar una petición o cortarse por longitud.
**Decisión**: detectar bloques `refusal` y `status: "incomplete"` y devolver un 422 con un mensaje claro, en lugar de
intentar parsear una respuesta parcial.
**Consecuencias**: el médico nunca ve una nota a medias presentada como completa.

## 6. Sin base de datos: datos en el navegador

**Contexto**: datos de salud son sensibles; un MVP de portafolio no debe custodiar datos de pacientes.
**Decisión**: el servidor no persiste nada; historial y plantillas en `localStorage`; `store: false` en OpenAI.
**Consecuencias**: cero superficie de fuga en servidor y cero coste de infraestructura. A cambio, el historial no se
sincroniza entre dispositivos y se pierde al borrar datos del navegador.

## 7. Modo demo y código de acceso

**Contexto**: una URL pública de portafolio con IA real puede generar costos no controlados.
**Decisión**: sin claves o sin código válido, los endpoints devuelven resultados deterministas marcados como `demo`.
**Consecuencias**: cualquiera puede probar el flujo completo; la IA real queda para quien tenga el código. Los tests
también aprovechan este modo.

## 8. Grabación a 24 kbps Opus

**Contexto**: límite de 4.5 MB por petición en Vercel.
**Decisión**: `MediaRecorder` con `audioBitsPerSecond: 24000` y tope de 20 minutos.
**Consecuencias**: calidad suficiente para voz; ~180 KB/min. Consultas más largas requerirán subida directa a
almacenamiento (roadmap).

## 9. Gestión de informes con estados y aprobación explícita

**Contexto**: un borrador generado por IA no debe confundirse con un documento validado.
**Decisión**: cada consulta es un informe con estado *Borrador* o *Aprobado*. Aprobar bloquea la edición y abre la
exportación; *Reabrir edición* vuelve a borrador.
**Consecuencias**: el flujo refleja la responsabilidad clínica (la IA propone, el médico firma). Los borradores
vacíos se purgan solos para no ensuciar el listado.

## 10. Audios en IndexedDB

**Contexto**: el médico necesita volver a escuchar o re-transcribir una grabación; `localStorage` no admite
binarios y se limita a ~5 MB.
**Decisión**: los audios se guardan como `Blob` en IndexedDB; sus metadatos (duración, tamaño, estado de
transcripción) van con los informes.
**Consecuencias**: cientos de MB disponibles sin servidor, reproducción inmediata y descarga. La vista *Audios*
muestra el uso de la cuota del navegador.

## 11. Dos modos de captura: escucha ambiental y dictado directo

**Contexto**: unos médicos graban la conversación completa; otros prefieren dictar un resumen al terminar.
**Decisión**: *Escucha ambiental* graba y transcribe con OpenAI al detener. *Dictado directo* usa la Web Speech API
del navegador para mostrar el texto en vivo y guarda el audio en paralelo. El modo se envía a la IA para que
interprete correctamente quién habla.
**Consecuencias**: el dictado funciona sin coste y sin latencia, también en modo demo. Depende del navegador, así que
la UI detecta el soporte y desactiva la pestaña cuando no lo hay.

## 12. Exportación FHIR R4 en lugar de integración directa

**Contexto**: "Exportar a EHR" es el paso final del flujo, pero cada expediente tiene su propia API y credenciales.
**Decisión**: generar un Bundle FHIR R4 de tipo `document` (Composition + Patient), el estándar de intercambio, además
de PDF, texto y Markdown.
**Consecuencias**: cualquier EHR compatible con FHIR puede importar el informe. El envío automático por API queda en
el roadmap.

## 13. Minimización de datos hacia la IA

**Contexto**: la IA necesita contexto clínico, no la identidad del paciente.
**Decisión**: el cliente envía solo sexo, edad, tipo de consulta y modo de captura (`encounter`); el nombre y el ID
nunca salen del navegador.
**Consecuencias**: la nota es igual de precisa y se reduce la exposición de datos personales ante el proveedor.

## 14. Login de demostración con sesión firmada sin estado

**Contexto**: el portafolio debe mostrar la experiencia completa de un médico (entrar, ver *sus* informes, salir),
pero sin montar una base de datos de usuarios.
**Decisión**: cuentas de demo con credenciales públicas y sesión en una cookie HttpOnly firmada con HMAC-SHA256.
`proxy.ts` protege las páginas y `requireUser()` protege cada endpoint de IA. Los datos del cliente se separan por
usuario.
**Consecuencias**: experiencia realista sin infraestructura extra, y la API deja de ser invocable de forma anónima.
Como las credenciales son públicas, esto **no** limita el gasto por sí solo; para eso están el rate limit, el límite
de gasto de OpenAI, `ACCESS_CODE` o `AUTH_USERS` con credenciales privadas. En un producto real se reemplazaría por
un proveedor de identidad (Auth.js, Clerk…) con contraseñas con hash.

## 15. Limpieza de la salida de Whisper

**Contexto**: en una prueba real con audio sin voz, Whisper devolvió como transcripción la pista de vocabulario que
se le envía (`prompt`). Es una alucinación conocida del modelo ante silencio o ruido.
**Decisión**: con modelos Whisper se pide `verbose_json` y se descartan los segmentos con `no_speech_prob` alto,
repeticiones anómalas (`compression_ratio`) y frases típicas de subtítulos. También se elimina el eco literal de la
pista. Si no queda nada, se responde "No se detectó voz".
**Consecuencias**: las pausas largas de una consulta real ya no introducen texto inventado en la nota.

