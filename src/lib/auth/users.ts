import { timingSafeEqual } from "node:crypto";

/**
 * Usuarios de la demo. Las credenciales son públicas a propósito: sirven para recorrer
 * la app como lo haría un médico. Para una instancia privada se pueden reemplazar con
 * la variable AUTH_USERS (JSON), y entonces la pantalla de login deja de mostrarlas.
 */
export interface AuthUser {
  id: string;
  email: string;
  password: string;
  name: string;
  specialty: string;
}

export type PublicUser = Omit<AuthUser, "password">;

export const DEMO_USERS: AuthUser[] = [
  {
    id: "dr-martinez",
    email: "dr.martinez@mediscribe.demo",
    password: "Demo2026!",
    name: "Dr. Carlos Martínez",
    specialty: "Cardiología",
  },
  {
    id: "dra-lopez",
    email: "dra.lopez@mediscribe.demo",
    password: "Demo2026!",
    name: "Dra. Ana López",
    specialty: "Medicina Familiar",
  },
];

function parseEnvUsers(): AuthUser[] | null {
  const raw = process.env.AUTH_USERS;
  if (!raw?.trim()) return null;
  try {
    const list = JSON.parse(raw) as AuthUser[];
    const valid = list.filter((u) => u && u.id && u.email && u.password && u.name);
    return valid.length ? valid.map((u) => ({ ...u, specialty: u.specialty ?? "" })) : null;
  } catch {
    console.error("AUTH_USERS no es un JSON válido; se usan los usuarios de demo.");
    return null;
  }
}

export function getUsers(): AuthUser[] {
  return parseEnvUsers() ?? DEMO_USERS;
}

/** Las credenciales solo se muestran en el login cuando son las de demo. */
export function usingDemoUsers(): boolean {
  return parseEnvUsers() === null;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function findUserByCredentials(email: string, password: string): AuthUser | null {
  const normalized = email.trim().toLowerCase();
  const user = getUsers().find((u) => u.email.toLowerCase() === normalized);
  // Se compara siempre (aunque no exista el usuario) para no filtrar por tiempo qué correos existen.
  const ok = safeEqual(password, user?.password ?? "\u0000invalid");
  return user && ok ? user : null;
}

export function findUserById(id: string): AuthUser | null {
  return getUsers().find((u) => u.id === id) ?? null;
}

export function toPublicUser({ id, email, name, specialty }: AuthUser): PublicUser {
  return { id, email, name, specialty };
}
