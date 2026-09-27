import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE, createSessionToken, readCookie, userFromToken, verifySessionToken } from "@/lib/auth/session";
import { DEMO_USERS, findUserByCredentials, toPublicUser, usingDemoUsers } from "@/lib/auth/users";

afterEach(() => {
  delete process.env.AUTH_USERS;
  vi.resetModules();
});

describe("sesión firmada", () => {
  it("un token válido devuelve el usuario sin la contraseña", () => {
    const user = userFromToken(createSessionToken("dr-martinez"));
    expect(user).toEqual({ id: "dr-martinez", email: "dr.martinez@juli.demo", name: "Dr. Carlos Martínez", specialty: "Cardiología" });
    expect(user).not.toHaveProperty("password");
  });

  it("rechaza tokens caducados, manipulados o mal formados", () => {
    const expired = createSessionToken("dr-martinez", 60, Date.now() - 2 * 60_000);
    expect(verifySessionToken(expired)).toBeNull();

    const [data, sig] = createSessionToken("dr-martinez").split(".");
    const otherUser = Buffer.from(JSON.stringify({ uid: "dra-lopez", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${otherUser}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${data}.`)).toBeNull();
    expect(verifySessionToken("basura")).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it("un usuario que ya no existe invalida la sesión", () => {
    expect(userFromToken(createSessionToken("borrado"))).toBeNull();
  });

  it("lee la cookie de la cabecera", () => {
    expect(readCookie(`a=1; ${SESSION_COOKIE}=abc.def; b=2`, SESSION_COOKIE)).toBe("abc.def");
    expect(readCookie(null, SESSION_COOKIE)).toBeUndefined();
  });
});

describe("usuarios", () => {
  it("valida credenciales sin distinguir mayúsculas en el correo", () => {
    expect(findUserByCredentials(" DR.MARTINEZ@juli.demo ", "Demo2026!")?.id).toBe("dr-martinez");
    expect(findUserByCredentials("dr.martinez@juli.demo", "otra")).toBeNull();
    expect(findUserByCredentials("nadie@x.com", "Demo2026!")).toBeNull();
  });

  it("AUTH_USERS reemplaza a los usuarios de demo y oculta las credenciales", () => {
    process.env.AUTH_USERS = JSON.stringify([{ id: "u1", email: "yo@clinica.mx", password: "secreta", name: "Dra. Ruiz", specialty: "Pediatría" }]);
    expect(usingDemoUsers()).toBe(false);
    expect(findUserByCredentials("yo@clinica.mx", "secreta")?.name).toBe("Dra. Ruiz");
    expect(findUserByCredentials(DEMO_USERS[0].email, DEMO_USERS[0].password)).toBeNull();
  });

  it("un AUTH_USERS inválido vuelve a los de demo", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.AUTH_USERS = "{no es json";
    expect(usingDemoUsers()).toBe(true);
  });

  it("toPublicUser elimina la contraseña", () => {
    expect(toPublicUser(DEMO_USERS[0])).not.toHaveProperty("password");
  });
});

describe("POST /api/auth/login", () => {
  async function login(body: unknown) {
    const { POST } = await import("@/app/api/auth/login/route");
    return POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `172.16.0.${Math.floor(Math.random() * 250)}` },
        body: JSON.stringify(body),
      }),
    );
  }

  it("con credenciales correctas crea una cookie HttpOnly", async () => {
    const res = await login({ email: "dra.lopez@juli.demo", password: "Demo2026!" });
    expect(res.status).toBe(200);
    expect((await res.json()).user.name).toBe("Dra. Ana López");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  it("con credenciales incorrectas responde 401 sin cookie", async () => {
    const res = await login({ email: "dra.lopez@juli.demo", password: "mal" });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});

describe("proxy", () => {
  async function run(path: string, token?: string) {
    const { proxy } = await import("@/proxy");
    const req = new NextRequest(`http://localhost${path}`, token ? { headers: { cookie: `${SESSION_COOKIE}=${token}` } } : undefined);
    return proxy(req);
  }

  it("redirige al login conservando la página pedida", async () => {
    const res = await run("/informes?x=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?next=%2Finformes%3Fx%3D1");
  });

  it("deja pasar con sesión y saca del login a quien ya entró", async () => {
    const token = createSessionToken("dr-martinez");
    expect((await run("/informes", token)).headers.get("x-middleware-next")).toBe("1");
    expect((await run("/login", token)).headers.get("location")).toBe("http://localhost/");
  });
});
