import type { Metadata } from "next";
import { SettingsView } from "@/components/pages/SettingsView";

export const metadata: Metadata = { title: "Ajustes" };

export default function Page() {
  return <SettingsView />;
}
