# API

Todos los endpoints viven en `src/app/api/` y responden JSON. Errores: `{ "error": "mensaje" }` con el código HTTP
correspondiente.

Cabecera opcional en `POST`: `x-access-code: <código>` (solo cuando la instancia define `ACCESS_CODE`).

Cada respuesta exitosa incluye `mode: "live" | "demo"` para que el cliente sepa si el resultado es real.

---

## `GET /api/status`

Estado público de la instancia.

```json
{ "structure": "live", "transcribe": "live", "accessCodeRequired": true, "model": "gpt-5.5" }
```

---

## `POST /api/transcribe`

Audio → texto.

- **Body**: `multipart/form-data` con el campo `audio` (webm, mp3, m4a, wav, ogg… máx. 4 MB).
- **Respuesta 200**:

```json
{ "text": "Paciente femenina de 34 años acude por…", "mode": "live" }
```

| Código | Causa |
|---|---|
| 400 | Falta el archivo o el proveedor no pudo procesarlo |
| 413 | Archivo mayor de 4 MB |
| 415 | Tipo MIME no soportado |
| 422 | No se detectó voz |
| 429 | Rate limit (incluye `Retry-After`) |
| 502 | Error del proveedor de transcripción |

```bash
curl -F "audio=@consulta.webm" http://localhost:3000/api/transcribe
```

---

## `POST /api/structure`

Transcripción + plantilla → nota estructurada.

- **Body** (`application/json`):

```jsonc
{
  "transcript": "Paciente femenina de 34 años…",   // 20–60 000 caracteres
  "context": "Paciente con marcapasos",             // opcional, ≤ 1000
  "encounter": {                                    // opcional; nunca incluye nombre ni ID del paciente
    "captureMode": "ambiental",                     // "ambiental" (conversación) | "dictado"
    "consultationType": "Consulta de seguimiento",
    "sex": "Masc",
    "age": "45"
  },
  "template": {
    "id": "soap",
    "name": "Nota SOAP",
    "description": "…",
    "specialty": "General",
    "fields": [
      { "key": "motivo_consulta", "label": "Motivo de consulta", "hint": "…", "type": "text", "section": "S · Subjetivo" },
      { "key": "diagnosticos", "label": "Diagnósticos", "hint": "…", "type": "list" }
    ]
  }
}
```

Reglas de la plantilla: `key` con el formato `^[a-z][a-z0-9_]{0,39}$` y única; entre 1 y 40 campos; `type` es `text`
o `list`.

- **Respuesta 200**:

```json
{
  "mode": "live",
  "ms": 8421,
  "note": {
    "fields": {
      "motivo_consulta": "Odinofagia y fiebre de 3 días de evolución.",
      "diagnosticos": ["Faringoamigdalitis aguda, probablemente estreptocócica"]
    },
    "warnings": ["Fiebre de 38.8 °C referida por la paciente, no medida en consulta."]
  }
}
```

| Código | Causa |
|---|---|
| 400 | Cuerpo inválido (el mensaje indica el campo) o la API rechazó la petición |
| 422 | El modelo declinó la petición o la salida excedió la longitud máxima |
| 429 | Rate limit propio o del proveedor |
| 502 | Error de la API o respuesta que no cumple la plantilla |

```bash
curl -X POST http://localhost:3000/api/structure \
  -H "Content-Type: application/json" \
  -d @ejemplo.json
```
