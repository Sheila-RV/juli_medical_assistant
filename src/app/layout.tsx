import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth/session";
import { AppProvider } from "@/lib/client/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Juli", template: "%s · Juli" },
  description:
    "Captura la consulta por voz y obtén la nota clínica estructurada en tu plantilla (SOAP, historia clínica, evolución…), con gestión de informes y audios.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = userFromToken((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* key: al cambiar de usuario se reinicia todo el estado del cliente */}
        <AppProvider key={user?.id ?? "anon"} user={user}>
          {user ? <AppShell>{children}</AppShell> : children}
        </AppProvider>
      </body>
    </html>
  );
}
