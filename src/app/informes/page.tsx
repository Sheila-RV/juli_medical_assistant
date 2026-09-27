import type { Metadata } from "next";
import { ReportsView } from "@/components/pages/ReportsView";

export const metadata: Metadata = { title: "Informes" };

export default function Page() {
  return <ReportsView />;
}
