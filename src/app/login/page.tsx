import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";
import { getUsers, usingDemoUsers } from "@/lib/auth/users";

export const metadata: Metadata = { title: "Iniciar sesión" };

/** Solo rutas internas: evita redirecciones abiertas a otros dominios. */
function safeNext(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  // Las credenciales solo se muestran si son las de demo (públicas por diseño).
  const demoAccounts = usingDemoUsers()
    ? getUsers().map(({ email, password, name, specialty }) => ({ email, password, name, specialty }))
    : [];

  return <LoginView next={safeNext(params.next)} demoAccounts={demoAccounts} />;
}
