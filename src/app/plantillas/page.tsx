import type { Metadata } from "next";
import { TemplatesView } from "@/components/pages/TemplatesView";

export const metadata: Metadata = { title: "Plantillas" };

export default function Page() {
  return <TemplatesView />;
}
