import { publicStatus } from "@/lib/config";

export async function GET() {
  return Response.json(publicStatus(), { headers: { "Cache-Control": "no-store" } });
}
