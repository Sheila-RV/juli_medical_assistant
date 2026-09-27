import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";
import { findUserByCredentials, toPublicUser } from "@/lib/auth/users";

const BodySchema = z.object({
  email: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  // Frena intentos de fuerza bruta (mismo límite por IP que el resto de la API).
  const limited = enforceRateLimit(request, "login");
  if (limited) return limited;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Introduce tu correo y contraseña.", 400);

  const user = findUserByCredentials(parsed.data.email, parsed.data.password);
  if (!user) return jsonError("Correo o contraseña incorrectos.", 401);

  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(sessionCookie(createSessionToken(user.id)));
  return res;
}
