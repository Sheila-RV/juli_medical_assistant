import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";
import { findPreset } from "@/lib/templates/presets";

/** Cookie de sesión válida del usuario de demo (las rutas de IA exigen sesión). */
const AUTH = { cookie: `${SESSION_COOKIE}=${createSessionToken("dr-martinez")}` };

const soap = findPreset("soap")!;
const transcript = "Paciente masculino de 50 años con dolor torácico opresivo de 2 horas de evolución.";
let ipCounter = 0;

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/structure", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}`, ...AUTH, ...headers },
    body: JSON.stringify(body),
  });
}

/** Recarga los módulos para que lean las variables de entorno de cada test. */
async function loadRoutes(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return {
    structure: await import("@/app/api/structure/route"),
    transcribe: await import("@/app/api/transcribe/route"),
    status: await import("@/app/api/status/route"),
  };
}

const LIVE = { OPENAI_API_KEY: "sk-test", ACCESS_CODE: undefined, DEMO_MODE: undefined };
const ENV_KEYS = [
  "OPENAI_API_KEY",
  "STT_API_KEY",
  "STT_BASE_URL",
  "STT_MODEL",
  "ACCESS_CODE",
  "DEMO_MODE",
  "RATE_LIMIT_PER_MINUTE",
];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.restoreAllMocks();
});

/** Simula `client.responses.create` devolviendo un mensaje con texto o una negativa. */
async function mockOpenAIReply(payload: unknown, kind: "output_text" | "refusal" | "incomplete" = "output_text") {
  const { Responses } = await import("openai/resources/responses/responses");
  const content =
    kind === "refusal"
      ? [{ type: "refusal", refusal: "No puedo ayudar con eso." }]
      : [{ type: "output_text", text: JSON.stringify(payload), annotations: [] }];
  return vi.spyOn(Responses.prototype, "create").mockResolvedValue({
    status: kind === "incomplete" ? "incomplete" : "completed",
    incomplete_details: kind === "incomplete" ? { reason: "max_output_tokens" } : null,
    output: [{ type: "message", role: "assistant", content }],
  } as never);
}

describe("POST /api/structure", () => {
  it("sin sesión responde 401", async () => {
    const { structure } = await loadRoutes({ OPENAI_API_KEY: undefined });
    const res = await structure.POST(jsonRequest({ template: soap, transcript }, { cookie: "" }));
    expect(res.status).toBe(401);
  });

  it("rechaza una cookie de sesión manipulada", async () => {
    const { structure } = await loadRoutes({ OPENAI_API_KEY: undefined });
    const forged = `${SESSION_COOKIE}=${createSessionToken("dr-martinez").slice(0, -2)}xx`;
    const res = await structure.POST(jsonRequest({ template: soap, transcript }, { cookie: forged }));
    expect(res.status).toBe(401);
  });

  it("sin claves responde en modo demo con una nota válida", async () => {
    const { structure } = await loadRoutes({ OPENAI_API_KEY: undefined, DEMO_MODE: undefined });
    const res = await structure.POST(jsonRequest({ template: soap, transcript }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe("demo");
    expect(Object.keys(data.note.fields)).toEqual(soap.fields.map((f) => f.key));
  });

  it("valida el cuerpo", async () => {
    const { structure } = await loadRoutes({ OPENAI_API_KEY: undefined });
    const res = await structure.POST(jsonRequest({ template: soap, transcript: "corta" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("transcript");
  });

  it("con clave llama a GPT con structured outputs estrictos y valida la respuesta", async () => {
    const { structure } = await loadRoutes(LIVE);
    const fields: Record<string, string | string[]> = Object.fromEntries(
      soap.fields.map((f) => [f.key, f.type === "list" ? [] : ""]),
    );
    fields.motivo_consulta = "Dolor torácico opresivo.";
    const create = await mockOpenAIReply({ fields, warnings: ["Verificar irradiación del dolor."] });

    const res = await structure.POST(jsonRequest({ template: soap, transcript }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.mode).toBe("live");
    expect(data.note.fields.motivo_consulta).toBe("Dolor torácico opresivo.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = create.mock.calls[0][0] as any;
    expect(params.model).toBe("gpt-5.5");
    expect(params.reasoning).toEqual({ effort: "low" });
    expect(params.store).toBe(false);
    expect(params.text.format.type).toBe("json_schema");
    expect(params.text.format.strict).toBe(true);
    expect(params.text.format.schema.properties.fields.required).toContain("plan_tratamiento");
    expect(params.instructions).toContain("Nunca inventes");
    expect(params.input).toContain(transcript);
  });

  it("rechaza una respuesta del modelo que no cumple la plantilla", async () => {
    const { structure } = await loadRoutes(LIVE);
    await mockOpenAIReply({ fields: { otro: "x" }, warnings: [] });
    const res = await structure.POST(jsonRequest({ template: soap, transcript }));
    expect(res.status).toBe(502);
  });

  it("traduce una negativa del modelo a un error 422", async () => {
    const { structure } = await loadRoutes(LIVE);
    await mockOpenAIReply({}, "refusal");
    const res = await structure.POST(jsonRequest({ template: soap, transcript }));
    expect(res.status).toBe(422);
  });

  it("informa cuando la respuesta queda incompleta por longitud", async () => {
    const { structure } = await loadRoutes(LIVE);
    await mockOpenAIReply({}, "incomplete");
    const res = await structure.POST(jsonRequest({ template: soap, transcript }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("límite de longitud");
  });

  it("con ACCESS_CODE, sin el código correcto cae a demo", async () => {
    const { structure } = await loadRoutes({ ...LIVE, ACCESS_CODE: "secreto" });
    const res = await structure.POST(jsonRequest({ template: soap, transcript }, { "x-access-code": "otro" }));
    expect((await res.json()).mode).toBe("demo");
  });

  it("aplica el límite de peticiones por IP", async () => {
    const { structure } = await loadRoutes({ OPENAI_API_KEY: undefined, RATE_LIMIT_PER_MINUTE: "2" });
    const headers = { "x-forwarded-for": "192.168.1.1" };
    await structure.POST(jsonRequest({ template: soap, transcript }, headers));
    await structure.POST(jsonRequest({ template: soap, transcript }, headers));
    const res = await structure.POST(jsonRequest({ template: soap, transcript }, headers));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("POST /api/transcribe", () => {
  function audioRequest(file?: File) {
    const form = new FormData();
    if (file) form.append("audio", file);
    return new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: form,
      headers: { "x-forwarded-for": `10.1.0.${++ipCounter}`, ...AUTH },
    });
  }

  const NO_KEYS = { STT_API_KEY: undefined, OPENAI_API_KEY: undefined };

  it("exige un archivo", async () => {
    const { transcribe } = await loadRoutes(NO_KEYS);
    expect((await transcribe.POST(audioRequest())).status).toBe(400);
  });

  it("rechaza formatos no soportados", async () => {
    const { transcribe } = await loadRoutes(NO_KEYS);
    const res = await transcribe.POST(audioRequest(new File(["x"], "a.pdf", { type: "application/pdf" })));
    expect(res.status).toBe(415);
  });

  it("sin clave devuelve la transcripción de ejemplo", async () => {
    const { transcribe } = await loadRoutes({ ...NO_KEYS, DEMO_MODE: undefined });
    const res = await transcribe.POST(audioRequest(new File(["audio"], "c.webm", { type: "audio/webm" })));
    expect((await res.json()).mode).toBe("demo");
  });

  it("con OPENAI_API_KEY transcribe con Whisper (whisper-1)", async () => {
    const { transcribe } = await loadRoutes({ ...LIVE, STT_API_KEY: undefined });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ text: " Paciente refiere tos. " }));
    const res = await transcribe.POST(audioRequest(new File(["audio"], "c.webm", { type: "audio/webm" })));
    expect(await res.json()).toEqual({ text: "Paciente refiere tos.", mode: "live" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer sk-test" });
    const body = (init as RequestInit).body as FormData;
    expect(body.get("model")).toBe("whisper-1");
    expect(body.get("response_format")).toBe("verbose_json");
    expect(body.get("language")).toBe("es");
  });

  it("STT_API_KEY y STT_BASE_URL permiten otro proveedor (Groq)", async () => {
    const { transcribe } = await loadRoutes({
      ...LIVE,
      STT_API_KEY: "gsk-test",
      STT_BASE_URL: "https://api.groq.com/openai/v1",
      STT_MODEL: "whisper-large-v3-turbo",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ text: "Hola" }));
    await transcribe.POST(audioRequest(new File(["audio"], "c.webm", { type: "audio/webm" })));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer gsk-test" });
  });
});

describe("GET /api/status", () => {
  it("informa el modo sin exponer secretos", async () => {
    const { status } = await loadRoutes({
      OPENAI_API_KEY: "sk-secret",
      STT_API_KEY: undefined,
      DEMO_MODE: "false",
      ACCESS_CODE: "abc",
    });
    const data = await (await status.GET()).json();
    expect(data).toEqual({ structure: "live", transcribe: "live", accessCodeRequired: true, model: "gpt-5.5" });
    expect(JSON.stringify(data)).not.toContain("sk-secret");
  });
});
