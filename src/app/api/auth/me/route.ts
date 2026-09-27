import { userFromRequest } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const user = userFromRequest(request);
  if (!user) return jsonError("No has iniciado sesión.", 401);
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
