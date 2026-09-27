# Despliegue en Vercel

La app está pensada para **Vercel**; el plan gratuito (Hobby) es suficiente. No necesita base de datos.

## Resumen

1. Subir el código a GitHub.
2. Importar el repositorio en Vercel.
3. Configurar las variables de entorno.
4. Desplegar y verificar.

---

## 1. Subir el código a GitHub

1. En <https://github.com/new> crea un repositorio llamado `juli`. Déjalo **vacío**: sin README, sin
   .gitignore y sin licencia. Puede ser público, que es lo ideal para un portafolio.
2. En la carpeta del proyecto:

```bash
git add .
git status            # comprueba que NO aparezca .env.local
git commit -m "Juli: MVP de notas clínicas con IA"
git remote add origin https://github.com/<tu-usuario>/juli.git
git push -u origin main
```

> `.env.local` está en `.gitignore`: tus claves nunca se suben. Si `git status` lo mostrara, **detente** y no
> hagas commit.

## 2. Importar en Vercel

1. Entra a <https://vercel.com/signup> con **Continue with GitHub**.
2. Ve a <https://vercel.com/new>, busca `juli` y pulsa **Import**. Si no aparece, pulsa *Adjust GitHub App
   Permissions* y dale acceso al repositorio.
3. Framework Preset: **Next.js**, que se detecta solo. No cambies *Build Command* ni *Output Directory*.

## 3. Variables de entorno

En la misma pantalla, antes de desplegar, abre **Environment Variables** y añade:

| Variable | Valor | Para qué |
|---|---|---|
| `OPENAI_API_KEY` | tu clave `sk-proj-…` | GPT rellena las plantillas |
| `STT_BASE_URL` | `https://api.groq.com/openai/v1` | Transcribir con Groq |
| `STT_MODEL` | `whisper-large-v3-turbo` | Whisper gratis |
| `STT_API_KEY` | tu clave `gsk_…` de Groq | |
| `AUTH_SECRET` | un valor aleatorio largo (ver abajo) | Firma las sesiones del login |

Genera `AUTH_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> **No reutilices el valor de desarrollo.** Sin `AUTH_SECRET`, cualquiera que lea el código del repo podría
> fabricar una sesión válida.

Opcionales:

| Variable | Cuándo |
|---|---|
| `ACCESS_CODE` | Si quieres que la IA real solo funcione para quien introduzca un código en *Ajustes*. |
| `AUTH_USERS` | Si quieres cuentas propias en lugar de las de demo. El login dejará de mostrar credenciales. |
| `OPENAI_MODEL=gpt-5.4-mini` | Para abaratar el llenado de notas. |
| `RATE_LIMIT_PER_MINUTE` | Peticiones por minuto e IP (por defecto 10). |

Pulsa **Deploy**. En 1–2 minutos tendrás una URL tipo `https://juli-xxxx.vercel.app`.

> Si añades o cambias variables **después** del primer despliegue, ve a *Deployments → ⋯ → Redeploy* para que se
> apliquen.

## 4. Verificar

1. `https://<tu-app>.vercel.app/api/status` debe responder:

   ```json
   {"structure":"live","transcribe":"live","accessCodeRequired":false,"model":"gpt-5.5"}
   ```

2. Abre la URL: debe redirigir a **/login**. Entra con *Usar* → *Ingresar*.
3. Graba unos segundos en **Escucha Ambiental**: debe aparecer tu voz transcrita.
4. **Procesar con IA** → la nota se rellena y la insignia dice *Borrador IA*.
5. En la consola de Groq (*Usage*) y de OpenAI deberías ver las peticiones.

## Controlar el gasto (importante con la IA abierta)

Las cuentas de demo son públicas, así que cualquier visitante puede usar tu saldo de OpenAI. Tres medidas:

1. **Límite de gasto en OpenAI:** <https://platform.openai.com/settings/organization/limits> → pon un tope mensual
   (por ejemplo 5 USD). Es la protección más importante.
2. **Rate limit** incluido: 10 peticiones por minuto e IP en cada endpoint.
3. Si la URL empieza a circular: añade `ACCESS_CODE` y haz *Redeploy*.

Groq no cobra en su capa gratuita. Si se alcanza su límite, la app muestra "Servicio de transcripción saturado".

## Despliegues siguientes

Cada `git push` a `main` redespliega automáticamente. Cada Pull Request obtiene su propia URL de preview. La CI de
GitHub Actions ejecuta lint, tipos, tests y build en cada push.

## Dominio propio (opcional)

*Project → Settings → Domains → Add* y sigue las instrucciones DNS. Vercel emite el certificado HTTPS solo.

## Límites de la plataforma

- `maxDuration`: 60 s en `/api/transcribe` y 120 s en `/api/structure`. El plan Hobby lo admite con *Fluid Compute*,
  activo por defecto.
- Cuerpo de la petición ≤ 4.5 MB: por eso el audio se limita a 4 MB (~20 min grabando a 24 kbps).
- El micrófono requiere **HTTPS**, que Vercel ya da por defecto.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `/api/status` dice `"demo"` | Falta `OPENAI_API_KEY` / `STT_API_KEY`, o no hiciste *Redeploy* tras añadirlas |
| "Credenciales de transcripción inválidas" | `STT_API_KEY` mal copiada, o `STT_BASE_URL` apunta a otro proveedor |
| "El servicio de IA está saturado o sin saldo" | Sin saldo en OpenAI o límite de gasto alcanzado |
| Tras desplegar, todos vuelven al login | Cambiaste `AUTH_SECRET`: las sesiones anteriores dejan de ser válidas (normal) |
| El micrófono no pide permiso | Estás en `http://` en lugar de `https://`, o el navegador lo tiene bloqueado para el sitio |

## Otras plataformas

Cualquier host de Node.js 20+ sirve (`npm run build && npm start`): Railway, Render, Fly.io o un VPS con Docker. En
servidores propios no existe el límite de 4.5 MB; se puede subir `MAX_BYTES` en `src/app/api/transcribe/route.ts`.
