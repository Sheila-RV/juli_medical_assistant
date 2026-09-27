import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Comprobación optimista de sesión para las páginas: sin cookie válida → /login.
 * La API se protege en cada route handler (requireUser), no aquí.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = Boolean(verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value));

  if (pathname === "/login") {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!loggedIn) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Todo excepto la API, los recursos de Next y archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
