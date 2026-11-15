import { notFound } from "next/navigation";
import { trovaAtto } from "@/db/atti";
import { idSettore } from "@/lib/settore";

// Atto indicato dall'indirizzo; 404 se l'id non è valido o non esiste.
export async function attoDaParams(params: Promise<{ id: string }>) {
  const id = idSettore((await params).id);
  if (id === null) notFound();
  const atto = await trovaAtto(id);
  if (!atto) notFound();
  return atto;
}
