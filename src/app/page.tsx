import { Suspense } from "react";
import { ConsultView } from "@/components/consult/ConsultView";

export default function ConsultPage() {
  return (
    <Suspense>
      <ConsultView />
    </Suspense>
  );
}
