import type { Metadata } from "next";
import { AudiosView } from "@/components/pages/AudiosView";

export const metadata: Metadata = { title: "Audios" };

export default function Page() {
  return <AudiosView />;
}
